var express = require('express'),
  Parse = require('parse/node').Parse,
  SchemaController = require('../Controllers/SchemaController');

import PromiseRouter from '../PromiseRouter';
import * as middleware from '../middlewares';

function getAllSchemas(req) {
  return req.config.database.loadSchema()
    .then(schemaController => schemaController.getAllSchemas())
    .then(schemas => ({response: {results: schemas}}));
}


export class SchemasRouter extends PromiseRouter {
  mountRoutes() {
    this.route('GET', '/schemas', middleware.promiseEnforceMasterKeyAccess, getAllSchemas);
    
  }
}