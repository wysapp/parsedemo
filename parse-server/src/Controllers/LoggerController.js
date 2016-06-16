import { Parse } from 'parse/node';
import PromiseRouter from '../PromiseRouter';
import AdaptableController from './AdaptableController';
import { LoggerAdapter } from '../Adapters/Logger/LoggerAdapter';

const MILLISECONDS_IN_A_DAY = 24 * 60 * 60 * 1000;

export const LogLevel = {
  INFO: 'info',
  ERROR: 'error'
}

export const LogOrder = {
  DESCENDING: 'desc',
  ASCENDING: 'asc'
};

export class LoggerController extends AdaptableController {


}


export default LoggerController;