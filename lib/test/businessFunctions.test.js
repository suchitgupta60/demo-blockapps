const ba = require('blockapps-rest');
const rest = ba.rest;
const common = ba.common;
const config = common.config;
const util = common.util;
const fsutil = common.fsutil;
const should = common.should;
const assert = common.assert;
const expect = common.expect;
const Promise = common.Promise;

// ---------------------------------------------------
//   deploy the projects contracts
// ---------------------------------------------------
const deploy = fsutil.yamlSafeLoadSync(config.deployFilename, config.apiDebug);
assert.isDefined(deploy['AdminInterface'].address);

var ms = require('../demoapp')(config.contractsPath);
describe('Demo App - Business Functions - Users', function() {
  this.timeout(config.timeout);

  const scope = {};
  const adminName = util.uid('Admin');
  const adminPassword = '1234';

  before(function(done) {
    rest.setScope(scope)
      .then(rest.createUser(adminName, adminPassword))
      .then(ms.getAdminInterface(deploy.AdminInterface.address))
      .then(function(scope) {
        done();
      }).catch(done);
  });

  it('should add a user', function(done) {
    const userName = util.uid('User');
    const userPassword = '1234';

    ms.setScope(scope)
      // user does not exists yet
      .then(function(scope) {
        expect(scope.users[userName]).to.be.undefined;
        return scope;
      })
      // add user
      .then(ms.addUser(adminName, userName, userPassword))
      // get user
      .then(ms.getUser(adminName, userName))
      // exists
      .then(function(scope) {
        expect(scope.users[userName]).to.not.be.undefined;
        return scope;
      })
      .then(function(scope) {
        done();
      }).catch(done);
  });

  it('should add an ADMIN user', function(done) {
    const userName = util.uid('User');
    const userPassword = '1234';
    const IS_ADMIN = true;

    ms.setScope(scope)
      // add ADMIN user
      .then(ms.addUser(adminName, userName, userPassword, IS_ADMIN))
      // get user
      .then(ms.getUser(adminName, userName))
      // exists
      .then(function(scope) {
        const user = scope.users[userName];
        const isAdmin = user.isAdmin;
        assert.equal(isAdmin, IS_ADMIN, 'should be admin ' + JSON.stringify(user, null, 2));
        return scope;
      })
      .then(function(scope) {
        done();
      }).catch(done);
  });

  it('should validate login', function(done) {
    const userName = util.uid('User');
    const userPassword = '1234';

    ms.setScope(scope)
      .then(ms.addUser(adminName, userName, userPassword))
      .then(ms.validateUser(adminName, userName, userPassword))
      .then(function(scope) {
        expect(scope.users[userName].valid).to.be.true;
        return scope;
      })
      .then(function(scope) {
        done();
      }).catch(done);
  });

  it('should reject bad login', function(done) {
    const userName = util.uid('User');
    const userPassword = '1234';

    ms.setScope(scope)
      .then(ms.addUser(adminName, userName, userPassword))
      .then(ms.validateUser(adminName, userName, userPassword + 'X'))
      .then(function(scope) {
        expect(scope.users[userName].valid).to.not.be.true;
        return scope;
      })
      .then(ms.validateUser(adminName, userName + 'X', userPassword))
      .then(function(scope) {
        expect(scope.users[userName].valid).to.not.be.true;
        return scope;
      })
      .then(function(scope) {
        done();
      }).catch(done);
  });

  it('should return a list of all users', function(done) {
    const userPassword = '1234';

    var count = 1;
    const userNames = Array.apply(null, {
      length: count
    }).map(function(item, index) {
      return util.uid('User' + index);
    });

    ms.setScope(scope)
      // add all users
      .then(function(scope) {
        return Promise.each(userNames, function(userName) { // for each user
          return (ms.addUser(adminName, userName, userPassword)(scope)) // add user
        }).then(function() { // all done
          return scope;
        });
      })
      // get all the users one by one
      .then(function(scope) {
        return Promise.each(userNames, function(userName) { // for each user
          return (ms.getUser(adminName, userName)(scope)) // get user
        }).then(function() { // all done
          return scope;
        });
      })
      // get all users
      .then(ms.getUsers(adminName))
      // test that all the added were retrieved
      .then(function(scope) {
        const notIncluded = userNames.filter(function(userName) {
          return scope.userList.indexOf(userName) < 0;
        });
        assert.equal(notIncluded.length, 0, 'some users have not been added ' + JSON.stringify(notIncluded, null, 2));
        return scope;
      })
      .then(function(scope) {
        done();
      }).catch(done);
  });

  it('should return a list of all users using cirrus', function(done) {
    const userPassword = '1234';

    var count = 1;
    const userNames = Array.apply(null, {
      length: count
    }).map(function(item, index) {
      return util.uid('User' + index);
    });

    ms.setScope(scope)
      // add all users
      .then(function(scope) {
        return Promise.each(userNames, function(userName) { // for each user
          return (ms.addUser(adminName, userName, userPassword)(scope)) // add user
        }).then(function() { // all done
          return scope;
        });
      })
      // get all the users one by one
      .then(function(scope) {
        return Promise.each(userNames, function(userName) { // for each user
          return (ms.getUser(adminName, userName)(scope)) // get user
        }).then(function() { // all done
          return scope;
        });
      })
      // get all users
      .then(ms.getUsersQuery(adminName))
      // test that all the added were retrieved
      .then(function(scope) {
        scope.cirrusUsers = scope.query[0].map(i => {return i.username});
        //console.log("Comparing list1: " + userNames);
        //console.log("... and   list2: " + scope.cirrusUsers);
        const notIncluded = userNames.filter(function(userName) {
          var padded = String(Array(64).join('0')+util.hexEncode8(userName)).slice(-64);
          //console.log("Looking for " + padded);
          //console.log(scope.cirrusUsers.indexOf(padded))
          return scope.cirrusUsers.indexOf(padded) < 0;
        });
        assert.equal(notIncluded.length, 0, 'some users have not been added ' + JSON.stringify(notIncluded));
        return scope;
      })
      .then(function(scope) {
        done();
      }).catch(done);
  });


  it('should fetch data for the dashboard', function(done) {
    const userName = util.uid('User');
    const userPassword = '1234';

    ms.setScope(scope)
      .then(ms.addUser(adminName, userName, userPassword))
      .then(ms.getUser(adminName, userName))
      .then(ms.getHistory(adminName, userName))
      .then(function(scope) {
        const history = scope.users[userName].history;
        assert.deepEqual(history, [], 'history should be an empty array');
        return scope;
      })
      .then(ms.getBalance(adminName, userName))
      .then(function(scope) {
        assert.isAtLeast(scope.users[userName].balance, 0, 'balance must be 0 or positive');
        return scope;
      })
      .then(function(scope) {
        done();
      }).catch(done);
  });

  it('should fetch user state', function(done) {
    const userName = util.uid('User');
    const userPassword = '1234';

    ms.setScope(scope)
      .then(ms.addUser(adminName, userName, userPassword))
      .then(ms.getUserState(adminName, userName))
      .then(function(scope) {
        const history = scope.users[userName].history;
        assert.deepEqual(history, [], 'history should be an empty array');
        const balance = scope.users[userName].balance;
        assert.isAtLeast(balance, 0, 'balance must be 0 or positive');
        const summary = scope.users[userName].summary;
        assert.deepEqual(summary, {awarded:0, spent:0, revoked:0}, 'base summary');
        return scope;
      })
      .then(function(scope) {
        done();
      }).catch(done);
  });
});

describe('Demo App - Business Functions - Store', function() {
  this.timeout(config.timeout);

  const scope = {};
  const adminName = util.uid('Admin');
  const adminPassword = '1234';

  before(function(done) {
    rest.setScope(scope)
      .then(rest.createUser(adminName, adminPassword))
      .then(ms.getAdminInterface(deploy.AdminInterface.address))
      .then(function(scope) {
        done();
      }).catch(done);
  });

  const factory = require('./factory.js');
  const count = 3;
  const fakeItems = factory.createStoreItems(count);
  this.timeout(90000 + (count * 2 * 1000));

  // uploading the store
  it(`should upload ${count} fake store items`, function(done) {
    ms.setScope(scope)
      .then(ms.addStoreItems(adminName, fakeItems))
      .then(ms.getStoreItems())
      // test the retrieval of one complete item
      .then(function(scope) {
        const result = scope.store.items.slice(-1)[0];
        const item = fakeItems.slice(-1)[0];
        assert.equal(result.serial, item.serial, 'serial');
        assert.equal(result.name, item.name, 'name');
        assert.equal(result.price, item.price, 'price');
        assert.equal(result.desc, item.desc, 'desc');
        assert.equal(result.id, item.id, 'id');
        assert.deepEqual(result.imageUrls, item.imageUrls, 'image urls');
        return scope;
      })
      // make sure all uploaded items were retrieved
      .then(function(scope) {
        const storeItems = scope.store.items;
        const notIncluded = filterNotIncluded(fakeItems, storeItems);
        // if found any items in the source list, that are not included in the store
        assert.equal(notIncluded.length, 0, 'some items were not uploaded ' + JSON.stringify(notIncluded, null, 2));
      })
      .then(function(scope) {
        done();
      }).catch(done);
  });

  it(`should query store items with CIRRUS`, function(done) {
    ms.setScope(scope)
      .then(ms.getStoreItemsQuery())
      .then(function(scope) {
        const storeItems = scope.store.items;
        assert.notEqual(storeItems.length, 0, 'We should have store items');
        assert(storeItems[0].address !== undefined, 'Store items need to have an address property');
        return scope;
      })
      .then(function(scope) {
        done();
      }).catch(done);
  });

});

describe('Demo App - Business Functions - Rewards', function() {
  this.timeout(config.timeout);

  const scope = {};
  const adminName = util.uid('Admin');
  const adminPassword = '1234';

  const userName = util.uid('User');
  const userPassword = '1234';

  before(function(done) {
    rest.setScope(scope)
      .then(rest.createUser(adminName, adminPassword))
      .then(ms.getAdminInterface(deploy.AdminInterface.address))
      // add user
      .then(ms.addUser(adminName, userName, userPassword))
      .then(function(scope) {
        done();
      }).catch(done);
  });

  it(`should reward and test balance`, function(done) {
    ms.setScope(scope)
      .then(ms.getBalance(adminName, userName))
      .then(function(scope) {
        assert.equal(scope.users[userName].balance, 0, 'balance must be 0 on user creation');
        return scope;
      })
      .then(function(scope) {
        return new Promise(function(resolve, reject) {
          ms.reward(adminName, userName, -100)(scope)
          .then(function(){
            // not good - should have thrown
            reject(new Error('Should not allow negative reward'));
          })
          .catch(function(err) {
            // good - that should have thrown
            resolve(scope);
          });
        });
      })
      .then(ms.getBalance(adminName, userName))
      .then(function(scope) {
        assert.equal(scope.users[userName].balance, 0, 'balance must remain 0 after bad reward call');
        return scope;
      })
      .then(function(scope) {
        done();
      }).catch(done);
  });

  it(`should reward and test balance`, function(done) {
    ms.setScope(scope)
      .then(ms.getBalance(adminName, userName))
      .then(function(scope) {
        assert.equal(scope.users[userName].balance, 0, 'balance must be 0 on user creation');
        return scope;
      })
      .then(ms.reward(adminName, userName, 100000))
      .then(ms.getBalance(adminName, userName))
      .then(function(scope) {
        assert.equal(scope.users[userName].balance, 100000, 'balance must be 100000 after reward');
        return scope;
      })
      .then(ms.reward(adminName, userName, 9999))
      .then(ms.getBalance(adminName, userName))
      .then(function(scope) {
        assert.equal(scope.users[userName].balance, 109999, 'balance must be 109999 after reward');
        return scope;
      })
      .then(function(scope) {
        done();
      }).catch(done);
  });

  it(`should redeem and test balance`, function(done) {
    const itemId = 1;
    ms.setScope(scope)
      .then(ms.getBalance(adminName, userName))
      .then(function(scope) {
        assert.equal(scope.users[userName].balance, 109999, 'balance must be 109999 after 2 rewards');
        // store the balance for later
        scope.balances[userName] = [];
        scope.balances[userName].push(scope.users[userName].balance);
        return scope;
      })
      .then(ms.getStoreItems())
      .then(function(scope) {
        const price = scope.store.items[itemId].price;
        return ms.redeem(adminName, userName, price, itemId)(scope);
      })
      .then(ms.getBalance(adminName, userName))
      .then(function(scope) {
        const price = scope.store.items[itemId].price;
        const diff = scope.balances[userName].slice(-1)[0] - scope.users[userName].balance; // previous balance - current balance
        assert.equal(diff, price, 'balance must be decremented by the price after redeeming');
        return scope;
      })
      .then(function(scope) {
        done();
      }).catch(done);
  });

  it(`should revoke and test balance`, function(done) {
    const revokeReason = 'TOC violation';
    const revokeValue = 9;
    ms.setScope(scope)
      .then(ms.getBalance(adminName, userName))
      .then(function(scope) {
        assert.equal(scope.users[userName].balance, 55199, 'balance must be 55199');
        // store the balance for later
        scope.balances[userName] = [];
        scope.balances[userName].push(scope.users[userName].balance);
        return scope;
      })
      .then(ms.revoke(adminName, userName, revokeValue, revokeReason))
      .then(ms.getBalance(adminName, userName))
      .then(function(scope) {
        const diff = scope.balances[userName].slice(-1)[0] - scope.users[userName].balance; // previous balance - current balance
        assert.equal(diff, revokeValue, 'balance must be decremented by the revoked value');
        return scope;
      })
      .then(function(scope) {
        done();
      }).catch(done);
  });

  it(`should get summary`, function(done) {
    const price = 54800;
    const awarded = 109999;
    const revoked = 9;

    ms.setScope(scope)
      .then(ms.getUserState(adminName, userName))
      .then(function(scope) {

        console.log(scope.users[userName]);
        const history = scope.users[userName].history;
        assert.equal(history.length, 4, 'history should be 4');
        const balance = scope.users[userName].balance;
        assert.equal(balance, 55190, 'balance must be 55190');
        const summary = scope.users[userName].summary;
        assert.deepEqual(summary, {awarded:awarded, spent:price, revoked:revoked}, 'base summary');
        return scope;
      })
      .then(function(scope) {
        done();
      }).catch(done);
  });

});

describe('Demo App - Business Functions - History', function() {
  this.timeout(config.timeout);

  const scope = {};
  const adminName = util.uid('Admin');
  const adminPassword = '1234';

  const userName = util.uid('User');
  const userPassword = '1234';
  const contractName = 'User';

  before(function(done) {
    rest.setScope(scope)
      .then(rest.createUser(adminName, adminPassword))
      .then(ms.getAdminInterface(deploy.AdminInterface.address))
      // add user
      .then(ms.addUser(adminName, userName, userPassword))
      // get the user
      .then(ms.getUser(adminName, userName))
      .then(function(scope) {
        done();
      }).catch(done);
  });

  const s1 = 'abcd1234567890ABCD';
  const s2 = 'abcdefgh1234567890ABCDEFGH';
  const s3 = 'abcdefghijkl1234567890ABCDEFGHIJ'
  const v1 = 100;
  const v2 = 200;
  const v3 = 300;

  it(`should reward and test history`, function(done) {
    ms.setScope(scope)
      .then(ms.getBalance(adminName, userName))
      .then(function(scope) {
        assert.equal(scope.users[userName].balance, 0, 'balance must be 0 on user creation');
        return scope;
      })
      .then(ms.reward(adminName, userName, v1, s1))
      .then(ms.reward(adminName, userName, v2, s2))
      .then(ms.reward(adminName, userName, v3, s3))
      .then(ms.getBalance(adminName, userName))
      .then(function(scope) {
        const total = v1+v2+v3;
        assert.equal(scope.users[userName].balance, v1+v2+v3, 'balance must be 600 after reward');
        return scope;
      })
      .then(ms.getHistory(adminName, userName))
      .then(function(scope) {
        const H = ms.getEnums().HistoryTypeEnum;
        const history = scope.users[userName].history;
        assert.equal(history[0].value, 100);
        assert.equal(history[0].type, H[1]);
        assert.equal(history[0].desc, s1);
        assert.equal(history[1].value, 200);
        assert.equal(history[1].type, H[1]);
        assert.equal(history[1].desc, s2);
        assert.equal(history[2].value, 300);
        assert.equal(history[2].type, H[1]);
        assert.equal(history[2].desc, s3);
        return scope;
      })
      // redeem within available balance
      .then(ms.redeem(adminName, userName, 500, 123))
      .then(ms.getHistory(adminName, userName))
      .then(function(scope) {
        const H = ms.getEnums().HistoryTypeEnum;
        const history = scope.users[userName].history;
        const last = history.slice(-1)[0];
        assert.equal(last.value, 500);
        assert.equal(last.type, H[2]);
        assert.equal(last.desc, 123);
        return scope;
      })
      // try to redeem more then available balance
      .then(function(scope) {
        const redeemOverBalance = 500;
        const redeemItemId = 456;
        return new Promise(function(resolve, reject) {
          ms.redeem(adminName, userName, redeemOverBalance, redeemItemId)(scope)
          .then(function(){
            // not good - should have thrown
            reject(new Error('Should have failed on insufficiet balance'));
          })
          .catch(function(err) {
            // good - that should have thrown
            resolve(scope);
          });
        });
      })
      // history should remain the same
      .then(ms.getHistory(adminName, userName))
      .then(function(scope) {
        const H = ms.getEnums().HistoryTypeEnum;
        const history = scope.users[userName].history;
        const last = history.slice(-1)[0];
        assert.equal(last.value, 500);
        assert.equal(last.type, H[2]);
        assert.equal(last.desc, 123);
        return scope;
      })
      .then(ms.getBalance(adminName, userName))
      .then(function(scope) {
        done();
      }).catch(done);
  });
});

describe('Demo App - Business Functions - Rewards', function() {
  this.timeout(config.timeout);

  const scope = {};
  const adminName = util.uid('Admin');
  const adminPassword = '1234';

  const userName = util.uid('User');
  const userPassword = '1234';

  const s1 = 'abcd1234567890ABCD';
  const s2 = 'abcdefgh1234567890ABCDEFGH';
  const s3 = 'abcdefghijkl1234567890ABCDEFGHIJ';
  const s4 = 'abcdefghijkl1234567890ABCDEFGHIJ1234567890';
  const v1 = 100;
  const v2 = 200;
  const v3 = 300;
  const v4 = 50;

  before(function(done) {
    rest.setScope(scope)
      .then(rest.createUser(adminName, adminPassword))
      .then(ms.getAdminInterface(deploy.AdminInterface.address))
      // add user
      .then(ms.addUser(adminName, userName, userPassword))
      .then(function(scope) {
        done();
      }).catch(done);
  });

  it(`should reward and test balance`, function(done) {
    ms.setScope(scope)
      .then(ms.getUserState(adminName, userName))
      .then(function(scope) {
        const user = scope.users[userName];
        assert.deepEqual(user.history, [], 'history empty');
        assert.deepEqual(user.summary, {awarded:0, spent:0, revoked:0}, 'calculated summary');
        return scope;
      })
      .then(ms.reward(adminName, userName, v1, s1))
      .then(ms.reward(adminName, userName, v3, s3))
      .then(ms.redeem(adminName, userName, v2, s2))
      .then(ms.revoke(adminName, userName, v4, s4))
      .then(ms.getUserState(adminName, userName))
      .then(function(scope) {
        const user = scope.users[userName];
        const awarded = v1+v3;
        const spent = v2;
        const revoked = v4;
        assert.deepEqual(user.summary, {awarded:awarded, spent:spent, revoked:revoked}, 'calculated summary');
        return scope;
      })
      .then(function(scope) {
        done();
      }).catch(done);
  });
});


function filterNotIncluded(source, target) {
  // console.log('source', source);
  // console.log('target', target);
  return source.filter(function(sourceItem) {
    return !target.filter(function(targetItem) {
      // compare items
      if (sourceItem.serial != targetItem.serial) return false;
      if (sourceItem.name != targetItem.name) return false;
      if (sourceItem.desc != targetItem.desc) return false;
      if (sourceItem.price != targetItem.price) return false;
      if (sourceItem.imageUrl != targetItem.imageUrl) return false;
      return true;
    }).length > 0; // some items were found in the source that are not included in the target
  });
}
