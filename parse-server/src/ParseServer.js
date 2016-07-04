var batch = require('./batch'),
    bodyParser = require('body-parser'),
    DatabaseAdapter = require('./DatabaseAdapter'),
    express = require('express'),
    middlewares = require('./middlewares'),
    morgan = require('morgan'),
    multer = require('multer'),
    Parse = require('parse/node').Parse,
    path = require('path'),
    authDataManager = require('./authDataManager');
    
if ( !global._babelPolyfill) {
  require('babel-polyfill');
}

import { logger, configureLogger } from './logger';
import AppCache from './cache';
import Config from './Config';
import PromiseRouter from './PromiseRouter';

import {ClassesRouter } from './Routers/ClassesRouter';
import { FeaturesRouter } from './Routers/FeaturesRouter';

import { InMemoryCacheAdapter} from './Adapters/Cache/InMemoryCacheAdapter';
import { FileLoggerAdapter } from './Adapters/Logger/FileLoggerAdapter';

import { FilesRouter } from './Routers/FilesRouter';

import { GridStoreAdapter } from './Adapters/Files/GridStoreAdapter';
import { HooksController } from './Controllers/HooksController';

import { loadAdapter } from './Adapters/AdapterLoader';
import { LoggerController } from './Controllers/LoggerController';

import { PublicAPIRouter } from './Routers/PublicAPIRouter';

import { SchemasRouter } from './Routers/SchemasRouter';

import DatabaseController from './Controllers/DatabaseController';
const SchemaController = require('./Controllers/SchemaController');
import MongoStorageAdapter from './Adapters/Storage/Mongo/MongoStorageAdapter';

const requiredUserFields = { fields: { ...SchemaController.defaultColumns._Default, ...SchemaController.defaultColumns._User}};


class ParseServer {
  constructor({
    appId = requiredParameter('You must provide an appId!'),
    masterKey = requiredParameter('You must provide a masterKey!'),
    appName,
    filesAdapter,
    push,
    loggerAdapter,
    logsFolder,
    databaseURI,
    databaseOptions,
    databaseAdapter,
    cloud,
    collectionPrefix = '',
    clientKey,
    javascriptKey,
    dotNetKey,
    restAPIKey,
    webhookKey,
    fileKey = 'invalid-file-key',
    facebookAppIds = [],
    enableAnonymousUsers = true,
    allowClientClassCreation = true,
    oauth = {},
    serverURL = requiredParameter('You must provide a serverURL!'),
    maxUploadSize = '20mb',
    verifyUserEmails = false,
    cacheAdapter,
    emailAdapter,
    publicServerURL,
    customPages = {
      invalidLink: undefined,
      verifyEmailSuccess: undefined,
      choosePassword: undefined,
      passwordResetSuccess: undefined
    },
    liveQuery = {},
    sessionLength = 31536000,
    expireInactiveSessions = true,
    verbose = false,
    revokeSessionOnPasswordReset = true,
    __indexBuildCompletionCallbackForTests = () => {},
  }) {
    Parse.initialize(appId, javascriptKey || 'unused', masterKey);
    Parse.serverURL = serverURL;
    
    if ((databaseOptions || databaseURI || collectionPrefix !== '') && databaseAdapter) {
      throw 'You cannot specify both a databaseAdapter and a databaseURI/databaseOptions/connectionPrefix.';
    } else if (!databaseAdapter) {
      databaseAdapter = new MongoStorageAdapter({
        uri: databaseURI,
        collectionPrefix,
        mongoOptions: databaseOptions,
      });
    } else {
      databaseAdapter = loadAdapter(databaseAdapter);
    }
    
    if (!filesAdapter && !databaseURI) {
      throw 'When using an explicit database adapter, you must also use and explicit filesAdapter.';
    }
    
    if (logsFolder) {
      configureLogger({
        logsFolder
      });
    }
    
    if ( cloud) {
      addParseCloud();
      if ( typeof cloud === 'function') {
        cloud(Parse);
      } else if (typeof cloud === 'string') {
        require(path.resolve(process.cwd(), cloud));
      } else {
        throw "argument 'cloud' must either be a string or a function";
      }
    }
    
    if (verbose || process.env.VERBOSE || process.env.VERBOSE_PARSE_SERVER) {
      configureLogger({level: 'silly'});
    }

    const filesControllerAdapter = loadAdapter(filesAdapter, () => {
      return new GridStoreAdapter(databaseURI);
    });
    
    const loggerControllerAdapter = loadAdapter(loggerAdapter, FileLoggerAdapter);
    const cacheControllerAdapter = loadAdapter(cacheAdapter, InMemoryCacheAdapter, {appId: appId});
    
    const filesController = {};
    const pushController = {};
    const userController = {};
    const liveQueryController = {};
    const cacheController = {};
    const loggerController = new LoggerController(loggerControllerAdapter, appId);
    const databaseController = new DatabaseController(databaseAdapter);
    const hooksController = new HooksController(appId, databaseController, webhookKey);
    
    let usernameUniqueness = databaseController.adapter.ensureUniqueness('_User', ['username'], requiredUserFields)
    .catch(error => {
      logger.warn('Unable to ensure uniqueness for usernames: ', error);
      return Promise.reject();
    });

    let emailUniqueness = databaseController.adapter.ensureUniqueness('_User', ['email'], requiredUserFields)
    .catch(error => {
      logger.warn('Unabled to ensure uniqueness for user email addresses: ', error);
      return Promise.reject();
    })
    
    AppCache.put(appId, {
      
      masterKey: masterKey,
      serverURL: serverURL,
      collectionPrefix: collectionPrefix,
      clientKey: clientKey,
      javascriptKey: javascriptKey,
      dotNetKey: dotNetKey,
      restAPIKey: restAPIKey,
      webhookKey: webhookKey,
      fileKey: fileKey,
      facebookAppIds: facebookAppIds,
      cacheController: cacheController,
      filesController: filesController,
      pushController: pushController,
      loggerController: loggerController,
      hooksController: hooksController,
      userController: userController,
      verifyUserEmails: verifyUserEmails,
      allowClientClassCreation: allowClientClassCreation,
      authDataManager: authDataManager(oauth, enableAnonymousUsers),
      appName: appName,
      publicServerURL: publicServerURL,
      customPages: customPages,
      maxUploadSize: maxUploadSize,
      liveQueryController: liveQueryController,
      sessionLength: Number(sessionLength),
      expireInactiveSessions: expireInactiveSessions,
      revokeSessionOnPasswordReset,
      databaseController,
    });
    
    if ( process.env.FACEBOOK_APP_ID) {
      AppCache.get(appId)['facebookAppIds'].push(process.env.FACEBOOK_APP_ID);
    }
    
    Config.validate(AppCache.get(appId));
    this.config = AppCache.get(appId);
    
    // hooksController.load();    
    
    if ( process.env.TESTING) {
      __indexBuildCompletionCallbackForTests(Promise.all([usernameUniqueness, emailUniqueness]));
    }
  }
  
  
  get app() {
    return ParseServer.app(this.config);
  }
  
  static app({maxUploadSize = '20mb'}) {
    var api = express();
    
    api.use(morgan('dev'));
    
    api.use('/', middlewares.allowCrossDomain, new FilesRouter().getExpressRouter({
      maxUploadSize: maxUploadSize
    }));
    
    api.use('/', bodyParser.urlencoded({extended: false}), new PublicAPIRouter().expressApp());
    
    if (process.env.TESTING == 1) {
      api.use('/', require('./testing-routes').router);
    }

    api.use(bodyParser.json({'type': '*/*', limit: maxUploadSize}));
    api.use(middlewares.allowCrossDomain);
    api.use(middlewares.allowMethodOverride);
    api.use(middlewares.handleParseHeaders);

    let routers = [
      new ClassesRouter(),
      new SchemasRouter(),
      new FeaturesRouter(),
    ];

    if (process.env.PARSE_EXPERIMENTAL_HOOKS_ENABLED || process.env.TESTING) {
      routers.push(new HooksRouter());
    }

    let routes = routers.reduce((memo, router) => {
      return memo.concat(router.routes);
    }, []);

    let appRouter = new PromiseRouter(routes);

    batch.mountOnto(appRouter);

    api.use(appRouter.expressApp());
    api.use(middlewares.handleParseErrors);

    if (!process.env.TESTING) {
      process.on('uncaughtException', (err) => {
        if ( err.code === "EADDRINUSE" ) { // user-friendly message for this common error
          console.error(`Unable to listen on port ${err.port}. The port is already in use.`);
          process.exit(0);
        } else {
          throw err;
        }
      });
    }

    return api;
    
    
  }
  
  
  static createLiveQueryServer(httpServer, config) {
    return new ParseLiveQueryServer(httpServer, config);
  }
}

export default ParseServer;