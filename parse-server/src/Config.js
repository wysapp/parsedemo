import AppCache from './cache';

function removeTrailingSlash(str) {
  if ( !str) {
    return str;
  }

  if ( str.endsWith('/')) {
    str = str.substr(0, str.length - 1);
  }
  return str;
}


export class Config {

  constructor(applicationId: string, mount: string) {
    let cacheInfo = AppCache.get(applicationId);
    
    if ( !cacheInfo) {
      return;
    }

    this.applicationId = applicationId;
    this.masterKey = cacheInfo.masterKey;
    this.clientKey = cacheInfo.clientKey;
    this.javascriptKey = cacheInfo.javascriptKey;
    this.dotNetKey = cacheInfo.dotNetKey;
    this.restAPIKey = cacheInfo.restAPIKey;
    this.webhookKey = cacheInfo.webhookKey;
    this.fileKey = cacheInfo.fileKey;
    this.facebookAppIds = cacheInfo.facebookAppIds;
    this.allowClientClassCreation = cacheInfo.allowClientClassCreation;
    this.database = cacheInfo.databaseController;

    this.serverURL = cacheInfo.serverURL;
    this.publicServerURL = removeTrailingSlash(cacheInfo.publicServerURL);
    this.verifyUserEmails = cacheInfo.verifyUserEmails;
    this.appName = cacheInfo.appName;

    this.cacheController = cacheInfo.cacheController;
    this.hooksController = cacheInfo.hooksController;
    this.filesController = cacheInfo.filesController;
    this.pushController = cacheInfo.pushController;
    this.loggerController = cacheInfo.loggerController;
    this.userController = cacheInfo.userController;
    this.authDataManager = cacheInfo.authDataManager;
    this.customPages = cacheInfo.customPages || {};
    this.mount = removeTrailingSlash(mount);
    this.liveQueryController = cacheInfo.liveQueryController;
    this.sessionLength = cacheInfo.sessionLength;
    this.expireInactiveSessions = cacheInfo.expireInactiveSessions;
    this.generateSessionExpiresAt = this.generateSessionExpiresAt.bind(this);
    this.revokeSessionOnPasswordReset = cacheInfo.revokeSessionOnPasswordReset;

  }


  static validate({
    verifyUserEmails,
    appName,
    publicServerURL,
    revokeSessionOnPasswordReset,
    expireInactiveSessions,
    sessionLength,
  }) {
    this.validateEmailConfiguration({
      verifyUserEmails: verifyUserEmails,
      appName: appName,
      publicServerURL: publicServerURL
    });

    if ( typeof revokeSessionOnPasswordReset !== 'boolean') {
      throw 'revokeSessionOnPasswordReset must be a boolean value';
    }

    if ( publicServerURL) {
      if ( !publicServerURL.startsWith('http://') && !publicServerURL.startsWith("https://")) {
        throw "publicServerURL should be a valid HTTPS URL starting with https://";
      }
    }

    this.validateSessionConfiguration(sessionLength, expireInactiveSessions);
  }


  static validateEmailConfiguration({verifyUserEmails, appName, publicServerURL}) {
    if (verifyUserEmails) {
      if (typeof appName !== 'string') {
        throw 'An app name is required when using email verification.';
      }
      if (typeof publicServerURL !== 'string') {
        throw 'A public server url is required when using email verification.';
      }
    }
  }

  static validateSessionConfiguration(sessionLength, expireInactiveSessions) {
    if (expireInactiveSessions) {
      if (isNaN(sessionLength)) {
        throw 'Session length must be a valid number.';
      }
      else if (sessionLength <= 0) {
        throw 'Session length must be a value greater than 0.'
      }
    }
  }


  generateSessionExpiresAt() {
    if ( !this.expireInactiveSessions) {
      return undefined;
    }
    var now = new Date();
    return new Date(now.getTime() + (this.sessionLength * 1000));
  }

}

export default Config;
module.exports = Config;