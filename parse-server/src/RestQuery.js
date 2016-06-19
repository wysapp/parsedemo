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


}


module.exports = RestQuery;