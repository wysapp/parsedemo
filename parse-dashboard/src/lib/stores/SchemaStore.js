import { get, post } from 'lib/AJAX';
import keyMirror from 'lib/keyMirror';
import Parse from 'parse';
import { Map } from 'immutable';
import {registerStore } from 'lib/stores/StoreManager';

export const ActionTypes = keyMirror([
  'FETCH',
  'CREATE_CLASS',
  'DROP_CLASS',
  'ADD_COLUMN',
  'DROP_COLUMN',
  'SET_CLP',
]);



function SchemaStore(state, action) {
  switch(action.type) {
    case ActionTypes.FETCH:
      if (state && new Date() - state.get('lastFetch') < 60000) {
        return Parse.Promise.as(state);
      }

      return action.app.apiRequest(
        'GET',
        'schemas',
        {},
        { useMasterKey: true }
      ).then(({results}) => {
        
        let classes = {};
        let CLPs = {};
        if ( results) {
          results.forEach(({className, fields, classLevelPermissions}) => {
            classes[className] = Map(fields);
            CLPs[className] = Map(classLevelPermissions);
          });
        }

        return Map({
          lastFetch: new Date(),
          classes: Map(classes),
          CLPs: Map(CLPs),
        });

      });

  }
}

registerStore('Schema', SchemaStore);
