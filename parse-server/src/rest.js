var Parse = require('parse/node').Parse;

import Auth from './Auth';

var RestQuery = require('./RestQuery');


function find(config, auth, className, restWhere, restOptions) {
  enforceRoleSecurity('find', className, auth);
  let query = new RestQuery(config, auth, className, restWhere, restOptions);
  return query.execute();
}


// Disallowing access to the _Role collection except by master key
function enforceRoleSecurity(method, className, auth) {
  if (className === '_Installation' && !auth.isMaster) {
    if (method === 'delete' || method === 'find') {
      let error = `Clients aren't allowed to perform the ${method} operation on the installation collection.`
      throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, error);
    }
  }
}

module.exports = {
  find,
}