import express from 'express';
import url from 'url';
import log from './logger';

export default class PromiseRouter {

  constructor(routes = []) {
    this.routes = routes;
    this.mountRoutes();
  }


  mountRoutes() {}

  merge(router) {
    for (var route of router.routes) {
      this.routes.push(route);
    }
  }


  route(method, path, ...handlers) {
    switch(method) {
      case 'POST':
      case 'GET':
      case 'PUT':
      case 'DELETE':
        break;
      default:
        throw 'cannot route method: ' + method;
    }

    let handler = handlers[0];
    if ( handlers.length > 1) {
      const length = handlers.length;
      handler = function(req) {
        return handlers.reduce((promise, handler) => {
          return promise.then((result) => {
            return handler(req);
          });
        }, Promise.resolve());
      }
    }

    this.routes.push({
      path: path,
      method: method,
      handler: handler
    });
  }

  expressApp() {
    var expressApp = express();
    for (var route of this.routes) {
      switch(route.method) {
      case 'POST':
        expressApp.post(route.path, makeExpressHandler(route.handler));
        break;
      case 'GET':
        expressApp.get(route.path, makeExpressHandler(route.handler));
        break;
      case 'PUT':
        expressApp.put(route.path, makeExpressHandler(route.handler));
        break;
      case 'DELETE':
        expressApp.delete(route.path, makeExpressHandler(route.handler));
        break;
      default:
        throw 'unexpected code branch';
      }
    }

    
    return expressApp;
  }

}
// A helper function to make an express handler out of a a promise
// handler.
// Express handlers should never throw; if a promise handler throws we
// just treat it like it resolved to an error.
function makeExpressHandler(promiseHandler) {
  return function(req, res, next) {

    
    try {
      log.verbose(req.method, maskSensitiveUrl(req), req.headers,
                  JSON.stringify(maskSensitiveBody(req), null, 2));
      promiseHandler(req).then((result) => {
        if (!result.response && !result.location && !result.text) {
          log.error('the handler did not include a "response" or a "location" field');
          throw 'control should not get here';
        }
        log.verbose(JSON.stringify(result, null, 2));

        var status = result.status || 200;
        res.status(status);

        if (result.text) {
          return res.send(result.text);
        }

        if (result.location) {
          res.set('Location', result.location);
          // Override the default expressjs response
          // as it double encodes %encoded chars in URL
          if (!result.response) {
            return res.send('Found. Redirecting to '+result.location);
          }
        }
        if (result.headers) {
          Object.keys(result.headers).forEach((header) => {
            res.set(header, result.headers[header]);
          })
        }
        res.json(result.response);
      }, (e) => {
        log.verbose('error:', e);
        next(e);
      });
    } catch (e) {
      log.verbose('exception:', e);
      next(e);
    }
  }
}

function maskSensitiveBody(req) {
  let maskBody = Object.assign({}, req.body);
  let shouldMaskBody = (req.method === 'POST' && req.originalUrl.endsWith('/users')
                       && !req.originalUrl.includes('classes')) ||
                       (req.method === 'PUT' && /users\/\w+$/.test(req.originalUrl)
                       && !req.originalUrl.includes('classes')) ||
                       (req.originalUrl.includes('classes/_User'));
  if (shouldMaskBody) {
    for (let key of Object.keys(maskBody)) {
      if (key == 'password') {
        maskBody[key] = '********';
        break;
      }
    }
  }
  return maskBody;
}

function maskSensitiveUrl(req) {
  let maskUrl = req.originalUrl.toString();
  let shouldMaskUrl = req.method === 'GET' && req.originalUrl.includes('/login')
                      && !req.originalUrl.includes('classes');
  if (shouldMaskUrl) {
    let password = url.parse(req.originalUrl, true).query.password;
    if (password) {
      maskUrl = maskUrl.replace('password=' + password, 'password=********')
    }
  }
  return maskUrl;
}
