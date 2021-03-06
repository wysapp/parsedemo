import express from 'express';
import BodyParser from 'body-parser';
import * as Middlewares from '../middlewares';

import Config from '../Config';
import mime from 'mime';

export class FilesRouter {

  getExpressRouter(options = {}) {
    var router = express.Router();
    router.get('/files/:appId/:filename', this.getHandler);

    router.post('/files', function(req, res, next) {
      next(new Parse.Error(Parse.Error.INVALID_FILE_NAME,
        'Filename not provided.'));
    });

    router.post('/files/:filename',
      Middlewares.allowCrossDomain,
      BodyParser.raw({type: () => { return true; }, limit: options.maxUploadSize || '20mb'}), // Allow uploads without Content-Type, or with any Content-Type.
      Middlewares.handleParseHeaders,
      this.createHandler
    );

    router.delete('/files/:filename',
      Middlewares.allowCrossDomain,
      Middlewares.handleParseHeaders,
      Middlewares.enforceMasterKeyAccess,
      this.deleteHandler
    );
    return router;
  }


  getHandler(req, res) {
    const config = new Config(req.params.appId);
    const filesController = config.filesController;
    const filename = req.params.filename;
    
  }

  createHandler(req, res, next) {

  }

  deleteHandler(req, res, next) {
    
  }
}