let mongodb = require('mongodb');
let Collection = mongodb.Collection;

export default class MongoCollection {
  _mongoCollection: Collection;

  constructor(mongoCollection: Collection) {
    this._mongoCollection = mongoCollection; 
  }



  _rawFind(query, {skip, limit, sort} = {}) {
    return this._mongoCollection
      .find(query, { skip, limit, sort})
      .toArray();
  }


  count(query, {skip, limit, sort} = {}) {
    return this._mongoCollection.count(query, {skip, limit, sort});
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