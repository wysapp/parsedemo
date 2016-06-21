var SchemaController = require('./Controllers/SchemaController');
var Parse = require('parse/node').Parse;

import { default as FilesController } from './Controllers/FilesController';

function RestQuery(config, auth, className, restWhere = {}, restOptions = {}) {
  this.config = config;
  this.auth = auth;
  this.className = className;
  this.restWhere = restWhere;
  this.response = null;
  this.findOptions = {};

  if ( !this.auth.isMaster) {
    this.findOptions.acl = this.auth.user ? [this.auth.user.id] : null;
    if ( this.className == '_Session') {
      if ( !this.findOptions.acl) {
        throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, 'This session token is invalid.');
      }

      this.restWhere = {
        '$and': [this.restWhere, {
          'user': {
            __type: 'Pointer',
            className: '_User',
            objectId: this.auth.user.id
          }
        }]
      }
    }
  }

  this.doCount = false;
  
  this.include = [];

  for (var option in restOptions) {
    switch(option) {
    case 'keys':
      this.keys = new Set(restOptions.keys.split(','));
      this.keys.add('objectId');
      this.keys.add('createdAt');
      this.keys.add('updatedAt');
      break;
    case 'count':
      this.doCount = true;
      break;
    case 'skip':
    case 'limit':
      this.findOptions[option] = restOptions[option];
      break;
    case 'order':
      var fields = restOptions.order.split(',');
    }
  }

}


module.exports = RestQuery;