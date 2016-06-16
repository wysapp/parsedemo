import MongoCollection from './MongoCollection';
import MongoSchemaCollection from './MongoSchemaCollection';
import {
  parse as parseUrl,
  format as formatUrl,
} from '../../../vendor/mongodbUrl';

import {
  parseObjectToMongoObjectForCreate,
  mongoObjectToParseObject,
  transformKey,
  transformWhere,
  transformUpdate,
} from './MongoTransform';

import _ from 'lodash';

let mongodb = require('mongodb');
let MongoClient = mongodb.MongoClient;

const MongoSchemaCollectionName = '_SCHEMA';
const DefaultMongoURI = 'mongodb://localhost:27017/parse';

export class MongoStorageAdapter {
  _uri: string;
  _collectionPrefix: string;
  _mongoOptions: Object;
  connectionPromise;
  database;
  
  constructor({
    uri=DefaultMongoURI,
    collectionPrefix = '',
    mongoOptions = {},
  }) {
    this._uri = uri;
    this._collectionPrefix = collectionPrefix;
    this._mongoOptions = mongoOptions;
  }

  connect() {
    if ( this.connectionPromise) {
      return this.connectionPromise;
    }

    const encodeUri = formatUrl(parseUrl(this._uri));

    this.connectionPromise = MongoClient.connect(encodeUri, this._mongoOptions)
      .then(database => {
        this.database = database;
      });

    return this.connectionPromise;
  }


  adaptiveCollection(name: string) {
    return this.connect()
      .then(() => this.database.collection(this._collectionPrefix + name))
      .then( rawCollection => new MongoCollection(rawCollection));
  }


  ensureUniqueness(className, fieldNames, schema) {
    
    let indexCreationRequest = {};
    let mongoFieldNames = fieldNames.map(fieldName => transformKey(className, fieldName, schema));
    mongoFieldNames.forEach(fieldName => {
      indexCreationRequest[fieldName] = 1;
    });

    
    return this.adaptiveCollection(className)
    .then(collection => collection._ensureSparseUniqueIndexInBackground(indexCreationRequest))
    .catch(error => {
      if (error.code === 11000) {
        throw new Parse.Error(Parse.Error.DUPLICATE_VALUE, 'Tried to ensure field uniqueness for a class that already has duplicates.');
      } else {
        throw error;
      }
    });
  }


}

export default MongoStorageAdapter;
module.exports = MongoStorageAdapter;