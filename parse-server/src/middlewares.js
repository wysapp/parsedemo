var Parse = require('parse/node').Parse;
// var auth = require('./Auth');
var Config = require('./Config');


function handleParseHeaders(req, res, next) {
  
}

var allowCrossDomain = function(req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'X-Parse-Master-Key, X-Parse-REST-API-Key, X-Parse-Javascript-Key, X-Parse-Application-Id, X-Parse-Client-Version, X-Parse-Session-Token, X-Requested-With, X-Parse-Revocable-Session, Content-Type');

  if ( 'OPTIONS' == req.method) {
    res.sendStatus(200);
  } else {
    next();
  }
};


var allowMethodOverride = function(req, res, next) {
  if ( req.method === 'POST' && req.body._method) {
    req.originalMethod = req.method;
    req.method = req.body._method;
    delete req.body._method;
  }
  next();
};

var handleParseErrors = function(err, req, res, next) {
  if ( err instanceof Parse.Error ) {
    var httpStatus;

    switch(err.code) {
      case Parse.Error.INTERNAL_SERVER_ERROR:
        httpStatus = 500;
        break;
      case Parse.Error.OBJECT_NOT_FOUND:
        httpStatus = 404;
        break;
      default:
        httpStatus = 400;
    }

    res.status(httpStatus);
    res.json({code: err.code, error: err.message});
  } else if ( err.status && err.message) {
    res.status(err.status);
    res.json({error: err.message});
  } else {
    log.error('Uncaught internal server error.', err, err.stack);
    res.status(500);
    res.json({code: Parse.Error.INTERNAL_SERVER_ERROR, message: 'Internal seerver error.'});
  }
};

function enforceMasterKeyAccess(req, res, next) {
  if ( !req.auth.isMaster) {
    res.status(403);
    res.end('{"error":"unauthorized: master key is required"}');
    return;
  }
  next();
}


function promiseEnforceMasterKeyAccess(request) {
  
  if (!request.auth.isMaster) {
    let error = new Error();
    error.status = 403;
    error.message = "unauthorized: master key is required";
    throw error;
  }
  return Promise.resolve();
}


module.exports = {
  allowCrossDomain: allowCrossDomain,
  allowMethodOverride: allowMethodOverride,
  handleParseErrors: handleParseErrors,
  handleParseHeaders: handleParseHeaders,
  enforceMasterKeyAccess: enforceMasterKeyAccess,
  promiseEnforceMasterKeyAccess
};