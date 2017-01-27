'use strict';
const ba = require('blockapps-rest');
const rest = ba.rest;
const common = ba.common;
const config = common.config;
const util = common.util;
const fsutil = common.fsutil;
const path = require('path');
const libPath = './lib';
const ms = require(`${path.join(process.cwd(), libPath)}/demoapp`)(config.contractsPath); // FIXME move to package

/**
 * @api {get} /users/ Get all users in the system.
 * @apiName GetUsers
 * @apiGroup User
 *
 *
 * @apiSuccess {Object[]} List of all users.
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *       "success": true,
 *       "data": {
 *           users: [],
 *        }
 *     }
 * @apiError Users not found in the system.
 *
 * @apiErrorExample Error-Response:
 *     HTTP/1.1 404 Not Found
 *     {
 *       "success": false,
 *       "error": "Users Not Found"
 *     }
 */
exports.getUsers = (req, res) => {
  const deploy = req.app.get('deploy');
  const searchTerm = req.query.term;

  ms.setScope()
    .then(ms.setAdmin(deploy.adminName, deploy.adminPassword, deploy.AdminInterface.address))
    .then(ms.getUsers(deploy.adminName, searchTerm))
    .then(scope => {
      util.response.status200(res, {users: scope.userList});
    })
    .catch(err => {
      util.response.status500(res, err);
    });
}

/**
 * @api {post} /users/validate User Login
 * @apiName ValidateUser
 * @apiGroup User
 *
 * @apiParam {String} username Username of registered user.
 *
 * @apiParam {String} password Password for registered user.
 *
 *
 * @apiSuccess {Boolean} Username and password match.
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *       "success": true,
 *     }
 * @apiError .
 *
 * @apiErrorExample Error-Response:
 *     HTTP/1.1 400 Bad Request
 *     {
 *       "success": false,
 *       "error": "Invalid request"
 *     }
 */
exports.validate = (req, res) => {
  const username = req.body.username;
  const password = req.body.password;
  const deploy = req.app.get('deploy');

  if (!username || !password){
    const message = "Username and password required";
    util.response.status400(res, message);
  } else {
    ms.setScope()
      .then(ms.setAdmin(deploy.adminName, deploy.adminPassword, deploy.AdminInterface.address))
      .then(ms.validateUser(deploy.adminName, username, password))
      .then(ms.getUser(deploy.adminName, username))
      .then(function(scope) {
        const data = {pubKey: scope.users[username].address};
        if (scope.users[username].valid){
          util.response.status200(res, data);
        } else {
          util.response.status400(res, "Bad Request");
        }
      })
      .catch(function(err) {
        util.response.status500(res, err);
      });
  }
}

/**
 * @api {post} /users/:username Create New User
 * @apiName CreateUser
 * @apiGroup User
 *
 * @apiParam {String} password Password for registered user.
 *
 *
 * @apiSuccess {Boolean} Username and password match.
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *       "success": true,
 *       "data": {
 *          "pubkey": '0xKJSDHFKSDJHF982398'
 *        }
 *     }
 * @apiError .
 *
 * @apiErrorExample Error-Response:
 *     HTTP/1.1 403 Forbidden
 *     {
 *       "success": false,
 *       "error": "User Exists"
 *     }
 */
exports.create = (req, res) => {
  const password = req.body.password;
  const username = req.params.username;
  if (!password || !username) {
    util.response.status400(res, "Bad arguments."); // FIXME global string
  } else {

    const deploy = req.app.get('deploy');

    ms.setScope()
      .then(ms.setAdmin(deploy.adminName, deploy.adminPassword, deploy.AdminInterface.address))
      .then(ms.addUser(deploy.adminName, username, password))
      .then(ms.getUser(deploy.adminName, username))
      .then(function(scope) {
        const data = {pubKey: scope.users[username].address};
        util.response.status200(res, data);
      })
      .catch(function(err) {
        console.log(err);
        util.response.status500(res, err);
      });
  }
}

/**
 * @api {post} /users/history Get User History
 * @apiName GetUserHistory
 * @apiGroup User
 *
 * @apiParam {String} username Username for registered user.
 *
 *
 * @apiSuccess {Array} History objects.
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *       "success": true,
 *       "data": {
 *          "history": []
 *        }
 *     }
 * @apiError .
 *
 * @apiErrorExample Error-Response:
 *     HTTP/1.1 400 Invalid request
 *     {
 *       "success": false,
 *       "error": "Forbidden"
 *     }
 */
exports.history = (req, res) => {
  const user = req.body.username;
  const deploy = req.app.get('deploy');

  ms.setScope()
    .then(ms.setAdmin(deploy.adminName, deploy.adminPassword, deploy.AdminInterface.address))
    .then(ms.getUserState(deploy.adminName, user))
    .then(function(scope) {
      const data = {history: scope.users[user].history}
      util.response.status200(res, data);
    })
    .catch(function(err) {
      util.response.status500(res, err);
    });
}


/**
 * @api {post} /users/reward Reward the user with tokens
 * @apiName RewardUsers
 * @apiGroup User
 *
 * @apiParam {Number} value Value user will be rewarded with.
 *
 *
 * @apiSuccess {Number} The users new balance
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *       "success": true,
 *       "data": 100 // New balance
 *     }
 * @apiError .
 *
 * @apiErrorExample Error-Response:
 *     HTTP/1.1 500 Internal server error
 *     {
 *       "success": false,
 *       "error": "Forbidden"
 *     }
 */
exports.reward = (req, res) => {
  const username = req.body.username;
  const value = req.body.value;

  const deploy = req.app.get('deploy');

  ms.setScope()
    .then(ms.setAdmin(deploy.adminName, deploy.adminPassword, deploy.AdminInterface.address))
    .then(ms.getUser(deploy.adminName, username))
    .then(ms.reward(deploy.adminName, username, value))
    .then(function(scope) {
      console.log(scope.users[username].balance);
      util.response.status200(res, scope.users[username].balance);
    })
    .catch(function(err) {
      util.response.status500(res, err);
    });
}

/**
 * @api {post} /users/redeem Redeem an award with tokens
 * @apiName Redeem
 * @apiGroup User
 *
 * @apiParam {Number} value Value user will be rewarded with.
 * @apiParam {String} itemId Item ID of the item being redeemed.
 * @apiParam {String} username Username of person redeeming token.
 *
 *
 * @apiSuccess {Number} The users new balance
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *       "success": true,
 *       "data": 100 // New balance
 *     }
 * @apiError .
 *
 * @apiErrorExample Error-Response:
 *     HTTP/1.1 500 Internal server error
 *     {
 *       "success": false,
 *       "error": "Forbidden"
 *     }
 */
exports.redeem = (req, res) => {
  const username = req.body.username;
  const password = req.body.password;
  const value = req.body.value;
  const itemId = req.body.itemId;

  const deploy = req.app.get('deploy');
  ms.setScope()
    .then(ms.setAdmin(deploy.adminName, deploy.adminPassword, deploy.AdminInterface.address))
    .then(ms.getUser(deploy.adminName, username))
    .then(ms.redeem(deploy.adminName, username, value, itemId))
    .then(function(scope) {
      console.log(scope.users[username].balance);
      util.response.status200(res, scope.users[username].balance);
    })
    .catch(function(err) {
      util.response.status500(res, err);
    });
}

/**
 * @api {post} /users/revoke Revoke tokens from a user.
 * @apiName Revoke
 * @apiGroup User
 *
 * @apiParam {Number} value Number of tokens to revoke.
 * @apiParam {String} reason Reason the tokens were revoked.
 * @apiParam {String} username Username of user having tokens revoked.
 *
 *
 * @apiSuccess {Number} data Users new balance
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *       "success": true,
 *       "data": 100 // New balance
 *     }
 * @apiError .
 *
 * @apiErrorExample Error-Response:
 *     HTTP/1.1 500 Internal server error
 *     {
 *       "success": false,
 *       "error": "Forbidden"
 *     }
 */
exports.revoke = (req, res) => {
  const username = req.body.username;
  const password = req.body.password;
  const value = req.body.value;
  const reason = req.body.reason;

  const deploy = req.app.get('deploy');
  ms.setScope()
    .then(ms.setAdmin(deploy.adminName, deploy.adminPassword, deploy.AdminInterface.address))
    .then(ms.getUser(deploy.adminName, username))
    .then(ms.revoke(deploy.adminName, username, value, reason))
    .then(function(scope) {
      console.log(scope.users[username].balance);
      util.response.status200(res, scope.users[username].balance);
    })
    .catch(function(err) {
      util.response.status500(res, err);
    });
}

/**
 * @api {post} /users/balance Get User's Current Balance
 * @apiName GetUserBalance
 * @apiGroup User
 *
 * @apiParam {String} password Password for registered user.
 *
 *
 * @apiSuccess {Boolean} Username and password match.
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *       "success": true,
 *       "data": {
 *          {
 *            "balance": 150, // current balance
 *            "spent": 20, // spent up to date
 *            "awarded": 170, // awarded up to date
 *          }
 *        }
 *     }
 * @apiError .
 *
 * @apiErrorExample Error-Response:
 *     HTTP/1.1 403 Forbidden
 *     {
 *       "success": false,
 *       "error": "Forbidden"
 *     }
 */
exports.balance = (req, res) => {
  const user = req.body.username;
    const deploy = req.app.get('deploy');

    ms.setScope()
      .then(ms.setAdmin(deploy.adminName, deploy.adminPassword, deploy.AdminInterface.address))
      .then(ms.getUserState(deploy.adminName, user))
      .then(function(scope) {
        const data = {
          balance: scope.users[user].balance,
          summary: scope.users[user].summary,
          history: scope.users[user].history,
        };
        util.response.status200(res, data);
      })
      .catch(function(err) {
        util.response.status500(res, err);
      });
}
