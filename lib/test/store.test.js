const ba = require('blockapps-rest');
const rest = ba.rest;
const common = ba.common;
const config = common.config;
const util = common.util;
const fsutil = common.fsutil;
const should = common.should;
const assert = common.assert;
const expect = common.expect;

const demoData = fsutil.yamlSafeLoadSync(config.dataFilename);
assert.isDefined(demoData, 'demo Data read failed');
assert.isDefined(demoData.store, 'demo Data read failed');
var ms = require('../demoapp')(config.contractsPath);

describe('Store tests', function() {
  this.timeout(90 * 1000);

  const scope = {};
  const adminName = util.uid('Admin');
  const adminPassword = '1234';
  const contractName = 'StoreManager';
  const contractFilename = config.contractsPath + '/store/StoreManager.sol';

  const items = demoData.store.items;
  const E = ms.getEnums().ErrorCodesEnum;

  // upload the store-manager contract
  before(function(done) {
    rest.setScope(scope)
      .then(rest.createUser(adminName, adminPassword))
      .then(rest.getContractString(contractName, contractFilename))
      .then(rest.uploadContract(adminName, adminPassword, contractName))
      .then(function(scope) {
        done();
      }).catch(done);
  });

  it('should create the store and add items', function(done) {

    // function addItem(bytes32 serial, string name, uint price, string desc) returns (ErrorCodesEnum)
    const method = 'addItem';

    rest.setScope(scope)
      // add new item
      .then(rest.callMethod(adminName, contractName, method, ms.createStoreItemArgs(items[0])))
      .then(function(scope) {
        // returns ErrorCodesEnum
        const result = scope.contracts[contractName].calls[method];
        assert.equal(result, E.SUCCESS, 'addItem should retuen' + E[E.SUCCESS]);
        return scope;
      })
      // add same item
      .then(rest.callMethod(adminName, contractName, method, ms.createStoreItemArgs(items[0])))
      .then(function(scope) {
        // returns ErrorCodesEnum
        const result = scope.contracts[contractName].calls[method];
        assert.equal(result, E.STOREITEM_EXISTS, 'addItem should retuen ' + E[E.STOREITEM_EXISTS]);
        return scope;
      })
      // add new item
      .then(rest.callMethod(adminName, contractName, method, ms.createStoreItemArgs(items[1])))
      .then(function(scope) {
        // returns ErrorCodesEnum
        const result = scope.contracts[contractName].calls[method];
        assert.equal(result, E.SUCCESS, 'addItem should retuen' + E[E.SUCCESS]);
        return scope;
      })
      // get the items addresses
      .then(rest.getState(contractName))
      .then(function(scope) {
        const items = scope.states[contractName].items;
        // get 1 item
        return rest.getState('StoreItem', items[1])(scope);
      })
      .then(function(scope) {
        const result = scope.states['StoreItem'];
        const item = items[0];
        // assert.equal(result.serial, util.toBytes32(item.serial), 'serial');
        assert.equal(result.name, item.name, 'name');
        assert.equal(result.price, item.price, 'price');
        assert.equal(result.desc, item.desc, 'desc');
        assert.equal(result.imageUrl, item.imageUrl, 'imageUrl');
        assert.equal(result.id, 1, 'id');
        return scope;
      })
      .then(function(scope) {
        done();
      }).catch(done);
  });
});
