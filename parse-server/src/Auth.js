var deepcopy = require('deepcopy');
var Parse = require('parse/node').Parse;
var RestQuery = require('./RestQuery');


function Auth({config, isMaster = false, user, installationId} = {}) {
  
  this.config = config;
  this.installationId = installationId;
  this.isMaster = isMaster;
  this.user = user;

  this.userRoles = [];
  this.fetchRoles = false;
  this.rolePromise = null;  

}


module.exports = {
  Auth: Auth
};