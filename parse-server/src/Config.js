import AppCache from './cache';

export class Config {

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

}

export default Config;
module.exports = Config;