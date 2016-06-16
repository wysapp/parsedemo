import { version } from '../../package.json';
import PromiseRouter from '../PromiseRouter';
import * as middlewares from '../middlewares';

export class FeaturesRouter extends PromiseRouter {
  mountRoutes() {
    this.route('GET', '/serverInfo', middlewares.promiseEnforceMasterKeyAccess, req => {
      const features = {
        globalConfig: {
          create: true,
          read: true,
          update: true,
          delete: true,
        },
        hooks: {
          create: false,
          read: false,
          update: false,
          delete: false,
        },
        logs: {
          level: true,
          size: true,
          order: true,
          until: true,
          from: true,
        },
        push: {

        }
      };

      return { response: {
        features: features,
        parseServerVersion: version,
      }};
    });
  }
}