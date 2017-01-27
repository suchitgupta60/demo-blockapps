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

var da = require('./demoapp')(config.contractsPath);

assert.isDefined(config.dataFilename, 'Data argument missing. Set in config, or use --data <path>');
const demoData = fsutil.yamlSafeLoadSync(config.dataFilename);
assert.isDefined(demoData, 'Demo data read failed');
assert.isDefined(demoData.store, 'Store data undefined');
console.log('Demo data', JSON.stringify(demoData, null, 2));

const enums = da.getEnums();
assert.isDefined(enums);
const AI = da.AI;
assert.isDefined(AI.subContractsNames['UserManager']);

describe('Demo App - deploy contracts', function() {
  this.timeout(900 * 1000);

  const scope = {};
  const adminName = util.uid('Admin');
  const adminPassword = '1234';

  // uploading the admin contract and dependencies
  it('should upload the contracts', function(done) {
    da.setScope(scope)
      .then(da.compileSearch())
      .then(da.setAdminInterface(adminName, adminPassword))
      .then(function(scope) {
        const address = scope.contracts[AI.contractName].address;
        scope.contracts[da.AI.contractName].string = 'removed to save screen space -LS';
        return da.getAdminInterface(address)(scope);
      })
      // create the MS admin user
      .then(da.addUser(adminName, demoData.admin.name, demoData.admin.password, true))
      .then(da.getUser(adminName, demoData.admin.name))
      .then(function(scope) {
        const user = scope.users[demoData.admin.name];
        const isAdmin = user.isAdmin;
        expect(isAdmin).to.be.true;
        return scope;
      })
      // create the store
      .then(da.addStoreItems(adminName, demoData.store.items))
      // create the search
      // write the deployment data to file
      .then(function(scope) {
        const object = {
          url: config.getBlocUrl(),
          adminName: adminName,
          adminPassword: adminPassword,
          AdminInterface: {
            address: scope.contracts['AdminInterface'].address
          },
        };
        console.log(config.deployFilename);
        console.log(fsutil.yamlSafeDumpSync(object));
        fsutil.yamlWrite(object, config.deployFilename);
        done();
      }).catch(done);
  });
});
