import { LoggerAdapter } from './LoggerAdapter';
import winston from 'winston';
import fs from 'fs';
import { Parse } from 'parse/node';
import { logger, configure } from '../../logger';

const MILLISECONDS_IN_A_DAY = 24 * 60 * 60 * 1000;
const CACHE_TIME = 1000 * 60;

let LOGS_FOLDER = './logs/';

if (typeof process !== 'undefined' && process.env.NODE_ENV === 'test') {
  LOGS_FOLDER = './test_logs/';
}


let currentDate = new Date();
let simpleCache = {
  timestamp: null,
  from: null,
  until: null,
  order: null,
  data: [],
  level: 'info',
};


export class FileLoggerAdapter extends LoggerAdapter {
  
  info() {
    return logger.info.apply(undefined, arguments);
  }
}

export default FileLoggerAdapter;