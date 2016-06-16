var _adapter = Symbol();
import Config from '../Config';

export class AdaptableController {
  constructor(adapter, appId, options) {
    this.options = options;
    this.appId = appId;
    this.adapter = adapter;
  }
}

export default AdaptableController;