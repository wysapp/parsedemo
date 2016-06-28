import intersect from 'intersect';
import _ from 'lodash';

var mongodb = require('mongodb');

var Parse = require('parse/node').Parse;

var SchemaController = require('../Controllers/SchemaController');
const deepcopy = require('deepcopy');


const specialQuerykeys = ['$and', '$or', '_rperm', '_wperm', '_perishable_token', '_email_verify_token'];

const validateQuery = query => {
  if ( query.ACL) {
    throw new Parse.Error(Parse.Error.INVALID_QUERY, 'Cannot query on ACL.');
  }

  if ( query.$or) {
    if ( query.$or instanceof Array) {
      query.$or.forEach(validateQuery);
    } else {
      throw new Parse.Error(Parse.Error.INVALID_QUERY, 'Bad $or format - use an array value.');
    }
  }

  if ( query.$and) {
    if ( query.$and instanceof Array) {
      query.$and.forEach(validateQuery);
    } else {
      throw new Parse.Error(Parse.Error.INVALID_QUERY, 'Bad $and format - use an array value.');
    }
  }

  Object.keys(query).forEach(key => {
    if ( !specialQueryKeys.includes(key) && !key.match(/^[a-zA-Z][a-zA-Z0-9_\.]*$/)) {
      throw new Parse.Error(Parse.Error.INVALID_KEY_NAME, `Invalid key name: ${key}`);
    }
  });
}


function DatabaseController(adapter, { skipValidation } = {}) {
  this.adapter = adapter;

  this.schemaPromise = null;
  this.skipValidation = !!skipValidation;
}


DatabaseController.prototype.schemaCollection = function() {
  return this.adapter.schemaCollection();
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



// Modifies query so that it no longer has $in on relation fields, or
// equal-to-pointer constraints on relation fields.
// Returns a promise that resolves when query is mutated
DatabaseController.prototype.reduceInRelation = function(className, query, schema) {

  // Search for an in-relation or equal-to-relation
  // Make it sequential for now, not sure of paralleization side effects
  if (query['$or']) {
    let ors = query['$or'];
    return Promise.all(ors.map((aQuery, index) => {
      return this.reduceInRelation(className, aQuery, schema).then((aQuery) => {
        query['$or'][index] = aQuery;
      })
    }));
  }

  let promises = Object.keys(query).map((key) => {
    if (query[key] && (query[key]['$in'] || query[key]['$ne'] || query[key]['$nin'] || query[key].__type == 'Pointer')) {
      let t = schema.getExpectedType(className, key);
      if (!t || t.type !== 'Relation') {
        return Promise.resolve(query);
      }
      let relatedClassName = t.targetClass;
      // Build the list of queries
      let queries = Object.keys(query[key]).map((constraintKey) => {
        let relatedIds;
        let isNegation = false;
        if (constraintKey === 'objectId') {
          relatedIds = [query[key].objectId];
        } else if (constraintKey == '$in') {
          relatedIds = query[key]['$in'].map(r => r.objectId);
        } else if (constraintKey == '$nin') {
          isNegation = true;
          relatedIds = query[key]['$nin'].map(r => r.objectId);
        } else if (constraintKey == '$ne') {
          isNegation = true;
          relatedIds = [query[key]['$ne'].objectId];
        } else {
          return;
        }
        return {
          isNegation,
          relatedIds
        }
      });

      // remove the current queryKey as we don,t need it anymore
      delete query[key];
      // execute each query independnently to build the list of
      // $in / $nin
      let promises = queries.map((q) => {
        if (!q) {
          return Promise.resolve();
        }
        return this.owningIds(className, key, q.relatedIds).then((ids) => {
          if (q.isNegation) {
            this.addNotInObjectIdsIds(ids, query);
          } else {
            this.addInObjectIdsIds(ids, query);
          }
          return Promise.resolve();
        });
      });

      return Promise.all(promises).then(() => {
        return Promise.resolve();
      })

    }
    return Promise.resolve();
  })

  return Promise.all(promises).then(() => {
    return Promise.resolve(query);
  })
};



// Modifies query so that it no longer has $relatedTo
// Returns a promise that resolves when query is mutated
DatabaseController.prototype.reduceRelationKeys = function(className, query) {

  if (query['$or']) {
    return Promise.all(query['$or'].map((aQuery) => {
      return this.reduceRelationKeys(className, aQuery);
    }));
  }

  var relatedTo = query['$relatedTo'];
  if (relatedTo) {
    return this.relatedIds(
      relatedTo.object.className,
      relatedTo.key,
      relatedTo.object.objectId).then((ids) => {
        delete query['$relatedTo'];
        this.addInObjectIdsIds(ids, query);
        return this.reduceRelationKeys(className, query);
      });
  }
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