import MongoCollection from './MongoCollection';
import * as transform from './MongoTransform';

class MongoSchemaCollection {
  _collection: MongoCollection;

  constructor(collection: MongoCollection) {
    this._collection = collection;
  }
}

export default MongoSchemaCollection;