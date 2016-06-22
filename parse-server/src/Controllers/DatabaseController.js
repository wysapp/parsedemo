import intersect from 'intersect';
import _ from 'lodash';

var mongodb = require('mongodb');

var Parse = require('parse/node').Parse;

function DatabaseController(adapter, { skipValidation } = {}) {
  this.adapter = adapter;

  this.schemaPromise = null;
  this.skipValidation = !!skipValidation;
}


DatabaseController.prototype.loadSchema = function() {
  if ( !this.schemaPromise) {
    this.schemaPromise = this.schemaCollection().then(collection => {
      delete this.schemaPromise;
      return SchemaController.load(collection, this.adapter);
    });
  }
  return this.schemaPromise;
};


DatabaseController.prototype.find = function(className, query, {
  skip,
  limit,
  acl,
  sort = {},
  count,
} = {}) {
  let isMaster = acl === undefined;
  let aclGroup = acl || [];
  let op = typeof query.objectId == 'string' && Object.keys(query).length === 1 ? 'get' : 'find';

  return this.loadSchema()
    .then(schemaController => {
      return schemaController.getOneSchema(className)
        .catch(error=> {
          if ( error === undefined) {
            return {fields: {}};
          }
          throw error;
        })
        .then(schema => {
          if ( sort._created_at) {
            sort.createdAt = sort._created_at;
            delete sort._created_at;
          }

          if ( sort._updated_at) {
            sort.updatedAt = sort._updated_at;
            delete sort._updated_at;
          }

          Object.keys(sort).forEach(fieldName => {
            if( fieldName.match(/^authData\.([a-zA-Z0-9_]+)\.id$/)) {
              throw new Parse.Error(Parse.Error.INVALID_KEY_NAME, `Cannot sort by ${fieldName}`);
            }

            if ( !SchemaController.fieldNameIsValid(fieldName)) {
              throw new Parse.Error(Parse.Error.INVALID_KEY_NAME, `Invalid field name: ${fieldName}.`);
            }
          });

          return (isMaster ? Promise.resolve() : schemaController.validatePermission(className, aclGroup, op))
            .then(() => this.reduceRelationKeys(className, query))
            .then(() => this.reduceInRelation(className, query, schemaController))
            .then(() => {
              if ( !isMaster) {
                query = this.addPointerPermissions(schemaController, className, op, query, aclGroup);
              }

              if ( !query) {
                if ( op == 'get') {
                  return Promise.reject(new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, 'Object not found.'));
                } else {
                  return Promise.resolve([]);
                }
              }

              if ( !isMaster) {
                query = addReadACL(query, aclGroup);
              }

              validateQuery(query);
              if ( count) {
                return this.adapter.count(className, query, schema);
              } else {
                return this.adapter.find(className, query, schema, {skip, limit, sort})
                  .then(objects => objects.map(object => filterSensitiveData(isMaster, aclGroup, className, object)));
              }
            });
        });
    });
};


module.exports = DatabaseController;