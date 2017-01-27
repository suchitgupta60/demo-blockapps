const ba = require('blockapps-rest');
const rest = ba.rest;
const common = ba.common;
const config = common.config;

var should = require('chai').should();
var expect = require('chai').expect;

var ms = require('../demoapp')(config.contractsPath);

describe('Setup all contracts', function() {
  // read all the enums and make them available as JS arrays
  it('gets all the enums', function(done) {
    var enums = ms.getEnums();
    expect(enums.ErrorCodesEnum, 'enums.ErrorCodesEnum').to.not.be.undefined;
    expect(enums.HistoryTypeEnum, 'enums.HistoryTypeEnum').to.not.be.undefined;
    console.log(JSON.stringify(enums, null, 2));
    done();
  });
});
