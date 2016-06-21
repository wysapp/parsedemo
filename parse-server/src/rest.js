var Parse = require('parse/node').Parse;

import Auth from './Auth';

var RestQuery = require('./RestQuery');


function find(config, auth, className, restWhere, restOptions) {
  enforceRoleSecurity('find', className, auth);
  let query = new RestQuery(config, auth, className, restWhere, restOptions);
  return query.execute();
}

module.exports = {
  find,
}