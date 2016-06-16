
const DefaultHooksCollectionName = "_Hooks";

export class HooksController {
  _applicationId: string;

  constructor(applicationId: string, databaseController, webhookKey) {
    this._applicationId = applicationId;
    this._webhookKey = webhookKey;
    this.database = databaseController;
  }

  load() {
    return this._getHooks().then(hooks => {
      hooks = hooks || [];
      hooks.forEach((hook) => {
        this.addHookToTriggers(hook);
      });
    });
  }

  _getHooks(query = {}, limit) {
    let options = limit ? { limit: limit} : undefined;
    return this.database.find(DefaultHooksCollectionName, query).then((results) => {
      return results.map((result) => {
        delete result.objectId;
        return result;
      });
    });
  }
}


export default HooksController;