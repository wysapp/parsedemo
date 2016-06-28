import log from '../../../logger';
import _ from 'lodash';

var mongodb = require('mongodb');
var Parse = require('parse/node').Parse;

const transformKey = (className, fieldName, schema) => {
  switch(fieldName) {
    case 'objectId': return '_id';
    case 'createdAt': return '_created_at';
    case 'updatedAt': return '_updated_at';
    case 'sessionToken': return '_session_token';
  }

  if ( schema.fields[fieldName] && schema.fields[fieldName].__type == 'Pointer') {
    fieldName = '_p_' + fieldName;
  }

  return fieldName;
}


function transformQueryKeyValue(className, key, value, schema) {
  switch(key) {
  case 'createdAt':
    if (valueAsDate(value)) {
      return {key: '_created_at', value: valueAsDate(value)}
    }
    key = '_created_at';
    break;
  case 'updatedAt':
    if (valueAsDate(value)) {
      return {key: '_updated_at', value: valueAsDate(value)}
    }
    key = '_updated_at';
    break;
  case 'expiresAt':
    if (valueAsDate(value)) {
      return {key: 'expiresAt', value: valueAsDate(value)}
    }
    break;
  case 'objectId': return {key: '_id', value}
  case 'sessionToken': return {key: '_session_token', value}
  case '_rperm':
  case '_wperm':
  case '_perishable_token':
  case '_email_verify_token': return {key, value}
  case '$or':
    return {key: '$or', value: value.map(subQuery => transformWhere(className, subQuery, schema))};
  case '$and':
    return {key: '$and', value: value.map(subQuery => transformWhere(className, subQuery, schema))};
  default:
    // Other auth data
    const authDataMatch = key.match(/^authData\.([a-zA-Z0-9_]+)\.id$/);
    if (authDataMatch) {
      const provider = authDataMatch[1];
      // Special-case auth data.
      return {key: `_auth_data_${provider}.id`, value};
    }
  }

  const expectedTypeIsArray =
    schema &&
    schema.fields[key] &&
    schema.fields[key].type === 'Array';

  const expectedTypeIsPointer =
    schema &&
    schema.fields[key] &&
    schema.fields[key].type === 'Pointer';

  if (expectedTypeIsPointer || !schema && value && value.__type === 'Pointer') {
    key = '_p_' + key;
  }

  // Handle query constraints
  if (transformConstraint(value, expectedTypeIsArray) !== CannotTransform) {
    return {key, value: transformConstraint(value, expectedTypeIsArray)};
  }

  if (expectedTypeIsArray && !(value instanceof Array)) {
    return {key, value: { '$all' : [value] }};
  }

  // Handle atomic values
  if (transformTopLevelAtom(value) !== CannotTransform) {
    return {key, value: transformTopLevelAtom(value)};
  } else {
    throw new Parse.Error(Parse.Error.INVALID_JSON, `You cannot use ${value} as a query parameter.`);
  }
}


function transformWhere(className, restWhere, schema) {
  let mongoWhere = {};
  for (let restKey in restWhere) {
    let out = transformQueryKeyValue(className, restKey, restWhere[restKey], schema);
    mongoWhere[out.key] = out.value;
  }

  return mongoWhere;
}


module.exports = {
  transformKey,
  transformWhere
};