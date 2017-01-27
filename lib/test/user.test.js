const ba = require('blockapps-rest');
const rest = ba.rest;
const common = ba.common;
const config = common.config;
const util = common.util;
const fsutil = common.fsutil;
const should = common.should;
const assert = common.assert;
const expect = common.expect;


describe('User tests', function() {
  this.timeout(90 * 1000);

  const scope = {};
  const adminName = util.uid('Admin');
  const adminPassword = '1234';
  const contractName = 'User';
  const contractFilename = config.contractsPath + '/user/User.sol';

  it('should read the user', function(done) {
    const username = util.toBytes32(util.uid('User')); // FIXME #133766029
    const userPwHash = util.toBytes32('1234'); // FIXME this is not a hash
    const USER_ID = 1;
    const IS_ADMIN = true;

    const args = {
      _username: username,
      _pwHash: userPwHash,
      _id: USER_ID,
      _isAdmin: IS_ADMIN,
    };
    const method = 'get';

    // create the user with constructor args
    rest.setScope(scope)
      .then(rest.createUser(adminName, adminPassword))
      // upload the User contract
      .then(rest.getContractString(contractName, contractFilename))
      .then(rest.uploadContract(adminName, adminPassword, contractName, args))
      // function get() constant returns (bytes32, bytes32, uint, bool)
      .then(rest.callMethod(adminName, contractName, method))
      .then(function(scope) {
        // returns concatenated string
        const result = scope.contracts[contractName].calls[method];
        const split = result.split(',');
        const usernameFixed = util.fixBytes(split[0]); // FIXME #133766029
        const pwhashFixed = util.fixBytes(split[1]); // FIXME #133766029
        const id = split[2];
        const isAdmin = split[3] === 'true';
        const balance = split[4];

        assert.equal(usernameFixed, username, 'username');
        assert.equal(pwhashFixed, userPwHash, 'pwHash');
        assert.equal(id, USER_ID, 'id');
        assert.equal(isAdmin, IS_ADMIN, 'isAdmin');
        assert.equal(balance,0, 'balance');
        return scope;
      })
      .then(rest.getState(contractName))
      .then(function(scope) {
        // returns vars
        const result = scope.states[contractName];
        const usernameFixed = util.fixBytes(result.username); // FIXME #133766029
        const pwhashFixed = util.fixBytes(result.pwHash); // FIXME #133766029

        assert.equal(usernameFixed, username, 'username');
        assert.equal(pwhashFixed, userPwHash, 'pwHash');
        assert.equal(result.id, USER_ID, 'id');
        assert.equal(result.isAdmin, IS_ADMIN, 'isAdmin');
        assert.equal(result.balance, 0, 'balance');
        assert.deepEqual(result.history, [], 'history');
        return scope;
      })
      .then(function(scope) {
        done();
      }).catch(done);
  });
});

describe('User - history', function() {
  this.timeout(90 * 1000);

  const scope = {};
  const adminName = util.uid('Admin');
  const adminPassword = '1234';
  const contractName = 'User';
  const contractFilename = config.contractsPath + '/user/User.sol';

  before(function(done) {
    const username = util.toBytes32(util.uid('User')); // FIXME #133766029
    const userPwHash = util.toBytes32('1234'); // FIXME this is not a hash
    const USER_ID = 1;
    const IS_ADMIN = true;

    const args = {
      _username: username,
      _pwHash: userPwHash,
      _id: USER_ID,
      _isAdmin: IS_ADMIN,
    };

    rest.setScope(scope)
      .then(rest.createUser(adminName, adminPassword))
      // upload the User contract
      .then(rest.getContractString(contractName, contractFilename))
      // create the user with constructor args
      .then(rest.uploadContract(adminName, adminPassword, contractName, args))
      .then(function(scope) {
        done();
      }).catch(done);
  });

  const value = 1234;

  it('should test reward history', function(done) {
    const timestamp = new Date().getTime();
    const desc = util.toBytes32('12345678901234567890123456789012'); // 32 bytes
    const args = {value: value, timestamp: timestamp, desc: desc};

    const method = 'reward';
    rest.setScope(scope)
      .then(rest.getState(contractName))
      .then(function(scope) {
        const result = scope.states[contractName];
        assert.deepEqual(result.history, [], 'history should be an empty array');
        return scope;
      })
      // function reward(uint value, uint timestamp) returns(uint)
      .then(rest.callMethod(adminName, contractName, method, args))
      .then(function(scope) {
        const result = scope.contracts[contractName].calls[method];
        return scope;
      })
      .then(rest.getState(contractName))
      .then(function(scope) {
        // returns vars
        const result = scope.states[contractName];
        assert.deepEqual(result.history.length, 1, 'history should have 1 entry');
        const entry = result.history[0];
        assert.equal(entry.timestamp, timestamp, 'history timestamp');
        assert.equal(entry.value, value, 'history value');
        assert.equal(entry.htype.key, 'REWARD', 'history type reward');
        assert.equal(util.fixBytes(entry.desc), desc, 'history desc'); //FIXME #133766029
        return scope;
      })
      .then(function(scope) {
        done();
      }).catch(done);
  });

  it('should test REDEEM history', function(done) {
    const timestamp = new Date().getTime();
    const itemId = 12;
    const args = {value: value/2, timestamp: timestamp, desc: util.toBytes32(''+itemId)};

    const method = 'redeem';
    rest.setScope(scope)
      .then(rest.getState(contractName))
      .then(function(scope) {
        const result = scope.states[contractName];
        assert.deepEqual(result.history.length, 1, 'history should have 1 entry');
        return scope;
      })
      // function redeem(uint timestamp, uint value, bytes32 itemId) returns(ErrorCodesEnum, uint)
      .then(rest.callMethod(adminName, contractName, method, args))
      .then(function(scope) {
        const result = scope.contracts[contractName].calls[method];
        const split = result.split(',');
        assert.equal(split[0], 1, 'Should return SUCCESS ' + result);
        assert.equal(split[1], value/2, 'Should return balance ' + value/2);
        return scope;
      })
      .then(rest.getState(contractName))
      .then(function(scope) {
        // returns vars
        const result = scope.states[contractName];
        assert.deepEqual(result.history.length, 2, 'history should have 2 entries');
        const entry = result.history[1];
        assert.equal(entry.timestamp, timestamp, 'history timestamp');
        assert.equal(entry.value, value/2, 'history value');
        assert.equal(entry.htype.key, 'REDEEM', 'history type redem');
        assert.equal(util.fromBytes32(util.fixBytes(entry.desc)), itemId, 'history itemid: ' + JSON.stringify(entry, null, 2)); //FIXME #133766029
        return scope;
      })
      .then(function(scope) {
        done();
      }).catch(done);
  });

  it('should test REVOKE history', function(done) {
    const timestamp = new Date().getTime();
    const desc = 'TOC violation'
    const valueLeft = 10;
    const valueRevoked = value/2-valueLeft;
    const args = {value: valueRevoked, timestamp: timestamp, desc: util.toBytes32(desc)};

    const method = 'revoke';
    rest.setScope(scope)
      .then(rest.getState(contractName))
      .then(function(scope) {
        const result = scope.states[contractName];
        assert.deepEqual(result.history.length, 2, 'history should have 2 entries');
        return scope;
      })
      // function revoke(uint timestamp, uint value, bytes32 desc) returns(ErrorCodesEnum, uint)
      .then(rest.callMethod(adminName, contractName, method, args))
      .then(function(scope) {
        const result = scope.contracts[contractName].calls[method];
        const split = result.split(',');
        assert.equal(split[0], 1, 'Should return SUCCESS ' + result);
        assert.equal(split[1], valueLeft, 'Should return balance ' + valueLeft);
        return scope;
      })
      .then(rest.getState(contractName))
      .then(function(scope) {
        // returns vars
        const result = scope.states[contractName];
        assert.deepEqual(result.history.length, 3, 'history should have 3 entries');
        const entry = result.history[2];
        assert.equal(entry.timestamp, timestamp, 'history timestamp');
        assert.equal(entry.value, valueRevoked, 'history value');
        assert.equal(entry.htype.key, 'REVOKE', 'history type revoke');
        assert.equal(util.fromBytes32(util.fixBytes(entry.desc)), desc, 'history desc: ' + JSON.stringify(entry, null, 2)); //FIXME #133766029
        return scope;
      })
      .then(function(scope) {
        done();
      }).catch(done);
  });

});
