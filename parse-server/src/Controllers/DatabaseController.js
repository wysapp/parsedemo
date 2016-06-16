import intersect from 'intersect';
import _ from 'lodash';

var mongodb = require('mongodb');

var Parse = require('parse/node').Parse;

function DatabaseController(adapter, { skipValidation } = {}) {
  this.adapter = adapter;

  this.schemaPromise = null;
  this.skipValidation = !!skipValidation;
}


module.exports = DatabaseController;