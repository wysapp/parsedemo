import PromiseRouter from '../PromiseRouter';
import express from 'express';
import Config from '../Config';
import path from 'path';
import fs from 'fs';
import qs from 'querystring';


let public_html = path.resolve(__dirname, "../../public_html");
let views = path.resolve(__dirname, '../../views');

export class PublicAPIRouter extends PromiseRouter {

  expressApp() {
    let router = express();
    router.use('/apps', express.static(public_html));
    router.use('/', super.expressApp());
    return router;
  }
}

export default PublicAPIRouter;