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
console.log(JSON.stringify(demoData, null, 2));

describe('Store item tests', function() {
  this.timeout(90 * 1000);

  const scope = {};
  const adminName = util.uid('Admin');
  const adminPassword = '1234';
  const contractName = 'StoreItem';
  const contractFilename = config.contractsPath + '/store/StoreItem.sol';

  it('should read the item content', function(done) {

    const item = demoData.store.items[0];
    const ITEM_ID = 1;
    const args = {
      _serial: util.toBytes32(item.serial),
      _name: item.name,
      _price: item.price,
      _desc: item.desc,
      _id: ITEM_ID,
    };
    const method = 'get';

    // create the item with constructor args
    rest.setScope(scope)
      .then(rest.createUser(adminName, adminPassword))
      .then(rest.getContractString(contractName, contractFilename))
      .then(rest.uploadContract(adminName, adminPassword, contractName, args))
      // function getSerial() constant returns (bytes32)
      .then(rest.callMethod(adminName, contractName, 'getSerial'))
      .then(function(scope) {
        // returns serial - byte32
        const result = scope.contracts[contractName].calls['getSerial'];
        const expected = util.toBytes32(item.serial);
        assert.equal(result, expected, 'serial should be a bytes32');
        return scope;
      })
      // function get() constant returns (string, uint, string, uint)
      .then(rest.callMethod(adminName, contractName, method))
      .then(function(scope) {
        // returns concatenated string
        const result = scope.contracts[contractName].calls[method];
        // const expected = item.name + ',' + item.price + ',' + item.desc + ',' + item.imageUrl + ',' + ITEM_ID;
        const expected = item.name + ',' + item.price + ',' + item.desc + ',' + ITEM_ID;
        assert.equal(result, expected, 'item data should be the same as written');
        return scope;
      })
      .then(function(scope) {
        const method = 'addImageUrl';
        const args = {
          imageUrl: item.imageUrls[0],
        };
        return rest.callMethod(adminName, contractName, method, args)(scope);
      })
      .then(function(scope) {
        const method = 'addImageUrl';
        const args = {
          imageUrl: item.imageUrls[1],
        };
        return rest.callMethod(adminName, contractName, method, args)(scope);
      })
      .then(rest.getState(contractName))
      .then(function(scope) {
        // returns vars
        const result = scope.states[contractName];
        const serial = util.trimNulls(result.serial); // FIXME #133766029
        assert.equal(serial, item.serial, 'serial');
        assert.equal(result.name, item.name, 'name');
        assert.equal(result.price, item.price, 'price');
        assert.equal(result.desc, item.desc, 'desc');
        assert.equal(result.id, ITEM_ID, 'id');
        assert.equal(result.imageUrls[0], item.imageUrls[0], 'image 0');
        assert.equal(result.imageUrls[1], item.imageUrls[1], 'image 1');
        return scope;
      })
      .then(function(scope) {
        const method = 'getImageUrl';
        const args = {
          index: 1,
        };
        return rest.callMethod(adminName, contractName, method, args)(scope)
          .then(function(scope) {
            const result = scope.contracts[contractName].calls[method];
            assert.equal(result, item.imageUrls[1], 'image 1');
          });
      })
      .then(function(scope) {
        done();
      }).catch(done);
  });
});
