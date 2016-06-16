let mongodb = require('mongodb');
let Collection = mongodb.Collection;

export default class MongoCollection {
  _mongoCollection: Collection;

  constructor(mongoCollection: Collection) {
    this._mongoCollection = mongoCollection; 
  }

  _ensureSparseUniqueIndexInBackground(indexRequest) {
    return new Promise((resolve, reject) => {
      this._mongoCollection.ensureIndex(indexRequest, { unique: true, background: true, sparse: true}, (error, indexName) => {
        if ( error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  drop() {
    return this._mongoCollection.drop();
  }
}