var Parse = require('parse/node').Parse;

var batchPath = '/batch';

function mountOnto(router) {
  console.log(router, 'ssssssssssssssss');
  router.route('POST', batchPath, (req) => {
    return handleBatch(router, req);
  });
}

module.exports = {
  mountOnto: mountOnto
};