const ba = require('blockapps-rest');
const rest = ba.rest;
const common = ba.common;
const config = common.config;
const util = common.util;
const should = common.should;
const assert = common.assert;
const expect = common.expect;

// ---------------------------------------------------
//   deploy the projects contracts
// ---------------------------------------------------

var ms = require('../demoapp')(config.contractsPath);
describe('Demo App - Admin Interface', function() {
  this.timeout(40 * 1000);
  it('should upload the contracts', function(done) {
    const scope = {};
    const adminName = util.uid('Admin');
    const adminPassword = '1234';

    ms.setScope(scope)
      // deploy the contracts
      .then(ms.setAdminInterface(adminName, adminPassword))
      // load the deployment
      .then(ms.getAdminInterface())
      // test the deployment
      .then(function(scope) {
        for (var name in ms.AI.subContrsctsNames) {
          expect(scope.contracts[name], name).to.not.be.undefined;
        };
        done();
      }).catch(done);
  });
});
