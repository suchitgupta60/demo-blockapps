const chai = require('chai');
const chaiHttp = require('chai-http');
const server = require('../../../server');
const ba = require('blockapps-rest');
const common = ba.common;
const should = ba.common.should;
const assert = ba.common.assert;
const expect = ba.common.expect;
const config = common.config;
const util = common.util;
const path = require('path');
const libPath = './lib';
const ms = require(`${path.join(process.cwd(), libPath)}/demoapp`)(config.contractsPath); // FIXME move to package

chai.use(chaiHttp);

function assert_noerr(err) {
  assert.equal(err, null, JSON.stringify(err, null, 2));
}

function assert_apiError(res, status, mustContain) {
  res.should.be.json;
  assert.notStrictEqual(res.body.success, undefined, 'Malformed body: success undefined');
  assert.notOk(res.body.success, `API success should be false: ${JSON.stringify(res.body, null, 2)}`);
  assert.equal(res.status, status, `HTTP status should be ${status} ${JSON.stringify(res.body.error)}`);
  assert.notStrictEqual(res.body.error, undefined, 'Malformed body: error undefined');
  const message = res.body.error.toLowerCase();
  assert.isAtLeast(message.indexOf(mustContain.toLowerCase()), 0, `error '${message}' must contain '${mustContain}' `);
}

function assert_apiSuccess(res) {
  res.should.be.json;
  assert.notStrictEqual(res.body.success, undefined, 'Malformed body: success undefined');
  assert.ok(res.body.success, `API success should be true ${JSON.stringify(res.body, null, 2)}`);
  assert.equal(res.status, 200, `HTTP status should be 200`);
  assert.strictEqual(res.body.error, undefined, `Error should be undefined `);
}

describe('Rewards Program - Balance', function() {
  const userName = util.uid('User');
  const userPassword = "1234";

  before(function(done) {
    this.timeout(config.timeout);
    chai.request(server)
      .post(`/api/v1/users/${userName}`)
      .send({
        'password': userPassword
      })
      .end((err, res) => {
        assert_noerr(err);
        assert_apiSuccess(res);
        done();
      });
  });

  it('should fetch a users balance POST', function(done) {
    this.timeout(config.timeout);
    chai.request(server)
      .post('/api/v1/users/balance')
      .send({
        'username': userName
      })
      .end((err, res) => {
        assert_noerr(err);
        assert_apiSuccess(res);
        res.body.should.have.property('data');
        const data = res.body.data;
        const balance = res.body.data.balance;
        assert.notStrictEqual(balance, undefined, `Balance should be defined ${JSON.stringify(res.body, null, 2)}`);
        const summary = res.body.data.summary;
        assert.notStrictEqual(summary, undefined, `Summary should be defined ${JSON.stringify(res.body, null, 2)}`);
        const history = res.body.data.history;
        assert.notStrictEqual(history, undefined, `History should be defined ${JSON.stringify(res.body, null, 2)}`);
        done();
      });
  });


  it('should fetch a users history POST', function(done) {
    this.timeout(config.timeout);
    chai.request(server)
      .post('/api/v1/users/history')
      .send({
        'username': userName
      })
      .end((err, res) => {
        assert_noerr(err);
        assert_apiSuccess(res);
        res.body.should.have.property('data');
        const data = res.body.data;
        const history = res.body.data.history;
        assert.notStrictEqual(history, undefined, `History should be defined ${JSON.stringify(res.body, null, 2)}`);
        done();
      });
  });

});

describe('Rewards Program', function() {
  const userName = util.uid('User');
  const userPassword = "1234";

  it('should create a new user POST', function(done) {
    this.timeout(config.timeout);
    chai.request(server)
      .post(`/api/v1/users/${userName}`)
      .send({
        'password': userPassword
      })
      .end((err, res) => {
        assert.equal(err, null, JSON.stringify(err, null, 2));
        res.should.have.status(200);
        res.body.should.have.property('data');
        const data = res.body.data;
        assert.address(data.pubKey, 'pubKey should be valid address:' + data.pubKey);
        done();
      });
  });

  it('should get all users registered in the system GET', function(done) {
    this.timeout(config.timeout);
    chai.request(server)
      .get(`/api/v1/users/`)
      .end((err, res) => {
        assert.equal(err, null, JSON.stringify(err, null, 2));
        res.should.have.status(200);
        res.body.should.have.property('data');
        const data = res.body.data;
        expect(res.body.data).to.not.be.empty;
        done();
      });
  });

  it('should validate a users login credentials POST', function(done) {
    this.timeout(config.timeout);
    chai.request(server)
      .post('/api/v1/users/validate')
      .send({
        'username': userName,
        'password': userPassword
      })
      .end((err, res) => {
        assert.equal(err, null, JSON.stringify(err, null, 2));
        res.should.have.status(200);
        res.body.should.have.property('data');
        const data = res.body.data;
        assert.address(data.pubKey, 'pubKey should be valid address:' + data.pubKey);
        done();
      });
  });

  it('should reject invalid user password POST', function(done) {
    this.timeout(config.timeout);
    chai.request(server)
      .post('/api/v1/users/validate')
      .send({
        'username': userName,
        'password': userPassword + 'X'
      })
      .end((err, res) => {
        assert_apiError(res, 400, 'Bad Request');
        res.should.have.status(400);
        done();
      });
  });

  it('should reject invalid username POST', function(done) {
    this.timeout(config.timeout);
    chai.request(server)
      .post('/api/v1/users/validate')
      .send({
        'username': userName + 'X',
        'password': userPassword
      })
      .end((err, res) => {
        assert_apiError(res, 500, 'User not found');
        res.should.have.status(500);
        done();
      });
  });

  describe('Rewards tests', function() {
    this.timeout(config.timeout);

    it('user undefined', function(done) {
      const userName = undefined;
      const value = 123;
      chai.request(server)
        .post('/api/v1/users/reward')
        .send({
          'username': userName,
          'value': value
        })
        .end((err, res) => {
          assert_noerr(err);
          assert_apiError(res, 500, '\\\"username\\\"');
          done();
        });
    });

    it('value undefined', function(done) {
      const value = undefined;
      chai.request(server)
        .post('/api/v1/users/reward')
        .send({
          'username': userName,
          'value': value
        })
        .end((err, res) => {
          assert_noerr(err);
          assert_apiError(res, 500, '\\\"value\\\"');
          done();
        });
    });

    it('value negative', function(done) {
      const value = -9;
      chai.request(server)
        .post('/api/v1/users/reward')
        .send({
          'username': userName,
          'value': value
        })
        .end((err, res) => {
          assert_noerr(err);
          assert_apiError(res, 500, 'positive numeric');
          done();
        });
    });

    it('should award a user POST', function(done) {
      this.timeout(config.timeout);
      const value = 123;
      chai.request(server)
        .post('/api/v1/users/reward')
        .send({
          'username': userName,
          'value': value
        })
        .end((err, res) => {
          assert_noerr(err);
          assert_apiSuccess(res);
          done();
        });
    });

    it('user undefined', function(done) {
      const userName = undefined;
      const value = 123;
      const itemId = 1;
      chai.request(server)
        .post('/api/v1/users/redeem')
        .send({
          'username': userName,
          'value': value,
          'itemId': itemId
        })
        .end((err, res) => {
          assert_noerr(err);
          assert_apiError(res, 500, '\\\"username\\\"');
          done();
        });
    });

    it('value undefined', function(done) {
      const value = undefined;
      const itemId = 1;
      chai.request(server)
        .post('/api/v1/users/redeem')
        .send({
          'username': userName,
          'value': value,
          'itemId': itemId
        })
        .end((err, res) => {
          assert_noerr(err);
          assert_apiError(res, 500, 'positive numeric');
          done();
        });
    });

    it('itemId undefined', function(done) {
      const value = 123;
      const itemId = undefined;
      chai.request(server)
        .post('/api/v1/users/redeem')
        .send({
          'username': userName,
          'value': value,
          'itemId': itemId
        })
        .end((err, res) => {
          assert_noerr(err);
          assert_apiError(res, 500, 'positive numeric');
          done();
        });
    });

    // OK
    it('should let a user redeem an award POST', function(done) {
      this.timeout(config.timeout);
      const value = 12;
      const itemId = 1;
      chai.request(server)
        .post('/api/v1/users/redeem')
        .send({
          'username': userName,
          'value': value,
          'itemId': itemId
        })
        .end((err, res) => {
          assert_noerr(err);
          assert_apiSuccess(res);
          done();
        });
    });

    // revoke
    it('user undefined', function(done) {
      const userName = undefined;
      const value = 123;
      const reason = 'violation';
      chai.request(server)
        .post('/api/v1/users/revoke')
        .send({
          'username': userName,
          'value': value,
          'reason': reason
        })
        .end((err, res) => {
          assert_noerr(err);
          assert_apiError(res, 500, '\\\"username\\\"');
          done();
        });
    });

    it('value undefined', function(done) {
      const value = undefined;
      const reason = 'violation';
      chai.request(server)
        .post('/api/v1/users/revoke')
        .send({
          'username': userName,
          'value': value,
          'reason': reason
        })
        .end((err, res) => {
          assert_noerr(err);
          assert_apiError(res, 500, '\\\"value\\\"');
          done();
        });
    });

    it('should revoke POST', function(done) {
      this.timeout(config.timeout);
      const value = 34;
      const reason = 'violation';
      chai.request(server)
        .post('/api/v1/users/revoke')
        .send({
          'username': userName,
          'value': value,
          'reason': reason
        })
        .end((err, res) => {
          assert_noerr(err);
          assert_apiSuccess(res);
          done();
        });
    });
  });

  describe('History tests', function() {
    this.timeout(config.timeout);

    it('user undefined', function(done) {
      const userName = undefined;
      chai.request(server)
        .post('/api/v1/users/history')
        .send({
          'username': userName,
        })
        .end((err, res) => {
          assert_noerr(err);
          assert_apiError(res, 500, '\\\"username\\\"');
          done();
        });
    });

    it('should list a users history POST', function(done) {
      this.timeout(config.timeout);
      chai.request(server)
        .post('/api/v1/users/history')
        .send({
          'username': userName
        })
        .end((err, res) => {
          assert_noerr(err);
          assert_apiSuccess(res);
          assert.notStrictEqual(res.body.data, undefined, `Data should be defined ${JSON.stringify(res.body, null, 2)}`);
          const history = res.body.data.history;
          assert.notStrictEqual(history, undefined, `History should be defined ${JSON.stringify(res.body, null, 2)}`);
          assert.ok(Array.isArray(history), `History should be an array ${JSON.stringify(res.body, null, 2)}`);
          done();
        });
    });
  });

  it('should fetch a users balance POST', function(done) {
    this.timeout(config.timeout);
    chai.request(server)
      .post('/api/v1/users/balance')
      .send({
        'username': userName
      })
      .end((err, res) => {
        assert_noerr(err);
        assert_apiSuccess(res);
        done();
      });
  });

});

describe('Rewards Program - store', function() {

  it('should list ALL items in the store GET', function(done) {
    this.timeout(config.timeout);
    chai.request(server)
      .get('/api/v1/store')
      .end((err, res) => {
        res.should.have.status(200);
        res.should.be.json;
        done();
      });
  });

  it('should get details for store item by address GET', function(done) {
    this.timeout(config.timeout);
    // get all items
    chai.request(server)
      .get('/api/v1/store/')
      .end((err, res) => {
        // get the middle array item
        const middle = Math.round((res.body.data.length - 1) / 2);
        const item = res.body.data[middle];
        chai.request(server)
          .get(`/api/v1/store/${item.address}`)
          .end((err, res) => {
            res.should.have.status(200);
            res.should.be.json;
            done();
          });
      });
  });

  it('should get details non existing item', function(done) {
    this.timeout(config.timeout);
    // get all items
    chai.request(server)
      .get(`/api/v1/store/DEAD`)
      .end((err, res) => {
        res.should.have.status(400);
        done();
      });
  });
});

describe('Rewards Program - search', function() {
  const userName = util.uid();
  const userNames = [userName + 'AB-CD', userName + 'AB-EF', userName + 'GH-EF'];
  const userPassword = "1234";

  it('should create a new user', function(done) {
    this.timeout(config.timeout);
    chai.request(server)
      .post(`/api/v1/users/${userName}AB-CD`)
      .send({
        'password': userPassword
      })
      .end((err, res) => {
        assert.equal(err, null, JSON.stringify(err, null, 2));
        res.should.have.status(200);
        done();
      });
  });

  it('should create a new user', function(done) {
    this.timeout(config.timeout);
    chai.request(server)
      .post(`/api/v1/users/${userName}AB-EF`)
      .send({
        'password': userPassword
      })
      .end((err, res) => {
        assert.equal(err, null, JSON.stringify(err, null, 2));
        res.should.have.status(200);
        done();
      });
  });

  it('should create a new user', function(done) {
    this.timeout(config.timeout);
    chai.request(server)
      .post(`/api/v1/users/${userName}GH-EF`)
      .send({
        'password': userPassword
      })
      .end((err, res) => {
        assert.equal(err, null, JSON.stringify(err, null, 2));
        res.should.have.status(200);
        done();
      });
  });

  it('should get all users', function(done) {
    this.timeout(config.timeout);
    chai.request(server)
      .get(`/api/v1/users/`)
      .end((err, res) => {
        assert.equal(err, null, JSON.stringify(err, null, 2));
        res.should.have.status(200);
        res.body.should.have.property('data');
        const data = res.body.data;
        expect(data).to.not.be.empty;
        // all users must be found
        userNames.forEach(function(item) {
          if (data.users.indexOf(item) < 0) {
            assert.ok(false, 'user not found ' + item);
          }
        });
        done();
      });
  });

  const term1 = 'AB';
  it('should search', function(done) {
    this.timeout(config.timeout);
    chai.request(server)
      .get(`/api/v1/users/?term=${term1}`)
      .end((err, res) => {
        assert.equal(err, null, JSON.stringify(err, null, 2));
        res.should.have.status(200);
        res.body.should.have.property('data');
        const data = res.body.data;
        expect(data).to.not.be.empty;
        expect(data.users).to.not.be.undefined;

        assert.isAtLeast(data.users.length, 2, 'should return only 2');
        done();
      });
  });

  const term2 = 'EF';
  it('should search', function(done) {
    this.timeout(config.timeout);
    chai.request(server)
      .get(`/api/v1/users/?term=${term2}`)
      .end((err, res) => {
        assert.equal(err, null, JSON.stringify(err, null, 2));
        res.should.have.status(200);
        res.body.should.have.property('data');
        const data = res.body.data;
        expect(data).to.not.be.empty;
        expect(data.users).to.not.be.undefined;

        assert.isAtLeast(data.users.length, 2, 'should return only 2');
        done();
      });
  });

  const term3 = '-';
  it('should search', function(done) {
    this.timeout(config.timeout);
    chai.request(server)
      .get(`/api/v1/users/?term=${term3}`)
      .end((err, res) => {
        assert.equal(err, null, JSON.stringify(err, null, 2));
        res.should.have.status(200);
        res.body.should.have.property('data');
        const data = res.body.data;
        expect(data).to.not.be.empty;
        expect(data.users).to.not.be.undefined;

        assert.isAtLeast(data.users.length, 3, 'should return only 3');
        done();
      });
  });

});
