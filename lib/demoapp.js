const ba = require('blockapps-rest');
const rest = ba.rest;
const util = ba.common.util;
const Promise = ba.common.Promise;

// FIXME move to rest
function MethodError(contract, method, result) { // FIXME move to rest
  return new Error('Call to ' + contract + '.' + method + '() returned ' + result);
}

// ========== Admin (chain super user) ==========

function setAdmin(adminName, adminPassword, aiAddress) {
  rest.verbose('setAdmin', arguments);
  return function(scope) {
    return nop(scope)
      .then(rest.createUser(adminName, adminPassword))
      .then(getAdminInterface(aiAddress))
      .then(function(scope) {
        for (var name in AI.subContractsNames) {
          if (scope.contracts[name] === undefined) throw new Error('setAdmin: AdminInterface: undefined: ' + name);
          if (scope.contracts[name] === 0) throw new Error('setAdmin: AdminInterface: 0: ' + name);
          if (scope.contracts[name].address == 0) throw new Error('setAdmin: AdminInterface: address 0: ' + name);
        };
        return scope;
      });
  }
}

// ========== Admin Interface ==========
const AI = {
  contractsPath: undefined,
  subContractsNames: {
    UserManager: 'UserManager',
    StoreManager: 'StoreManager',
  },
  contractName: 'AdminInterface',
  contractFilename: 'AdminInterface.sol',
};

function setAdminInterface(adminName, adminPassword) {
  rest.verbose('setAdminInterface', arguments);
  const contractName = AI.contractName;
  const contractFilename = AI.contractsPath + AI.contractFilename;
  return function(scope) {
    return nop(scope)
      .then(rest.createUser(adminName, adminPassword))
      .then(rest.getContractString(contractName, contractFilename))
      .then(rest.uploadContract(adminName, adminPassword, contractName))
      .then(function(scope) {
        const address = scope.contracts[contractName].address;
        if (!util.isAddress(address)) throw new Error('setAdminInterface: upload failed: address:', address);
        return scope;
      });
  }
}

function getAdminInterface(address) {
  rest.verbose('getAdminInterface', {address});
  return function(scope) {
    // if address not passed in, it is in the scope
    if (address === undefined) {
      address = scope.contracts[AI.contractName].address;
    }
    const contractName = 'AdminInterface';
    return rest.getState(contractName, address)(scope)
      .then(function(scope) {
        for (var name in scope.states[contractName]) {
          var address = scope.states[contractName][name];
          if (address == 0) throw new Error(`getAdminInterface: interface not set: ${name}`);
          // capitalize first letter to match the contract name on the chain
          var capName = name[0].toUpperCase() + name.substring(1);
          scope.contracts[capName] = {
            address: address
          };
        };
        return scope;
      });
  }
}

// ========== enums ==========
var enums;

function getEnums() {
  return enums || {
    // FIXME automate this
    ErrorCodesEnum: rest.getEnums(`${AI.contractsPath}/enums/ErrorCodes.sol`).ErrorCodesEnum,
    HistoryTypeEnum: rest.getEnums(`${AI.contractsPath}/user/HistoryType.sol`).HistoryTypeEnum,
  };
}

// ========== business functions ==========

function getUser(adminName, username) {
  rest.verbose('getUser', {username});
  return function(scope) {
    // function getUser(bytes32 username) constant returns (address)
    const method = 'getUserAttr';
    const args = {
      username: util.toBytes32(username)
    };
    return getUserAddress(adminName, username)(scope)
      .then(rest.callMethod(adminName, AI.subContractsNames.UserManager, method, args))
      .then(function(scope) {
        // returns a user's attributes
        const result = scope.contracts[AI.subContractsNames.UserManager].calls[method];
        const split = result.split(',');
        rest.verbose('getUser: attributes', split);
        if (scope.users[username] === undefined) scope.users[username] = {};
        scope.users[username].isAdmin = (split[3] == 'true');
        scope.users[username].balance = split[4];
        return scope;
      });
  }
}

function getUserAddress(adminName, username) {
  rest.verbose('getUserAddress', {adminName, username});
  return function(scope) {
    // function getUser(bytes32 username) constant returns (address)
    const method = 'getUser';
    const args = {
      username: util.toBytes32(username)
    };
    return rest.callMethod(adminName, AI.subContractsNames.UserManager, method, args)(scope)
      .then(function(scope) {
        // returns a user's attributes
        const result = scope.contracts[AI.subContractsNames.UserManager].calls[method];
        if (result == 0) {
          throw new Error('User not found ' + username); // not found
        }
        rest.verbose('getUser: address', result);
        if (scope.users[username] === undefined) scope.users[username] = {};
        scope.users[username].address = result;
        return scope;
      });
  }
}

function getUserState(adminName, username) {
  rest.verbose('getUserState', {username});
  const contractName = 'User';
  return function(scope) {
    return getUserAddress(adminName, username)(scope)
      .then(function(scope) {
        const address = scope.users[username].address;
        return rest.getState(contractName, address)(scope);
      })
      .then(function(scope) {
        scope.users[username].balance = scope.states[contractName].balance;
        scope.users[username].history = formatHistory(scope.states[contractName].history);
        scope.users[username].summary = getSummary(scope.states[contractName].history);
        return scope;
      });
  }
}

function getSummary(history) {
  const summary = {
    awarded: 0,
    spent: 0,
    revoked: 0,
  };
  history.forEach(function(historyEntry) {
    switch(historyEntry.htype.value) {
      case getEnums().HistoryTypeEnum.REWARD:
        summary.awarded += parseInt(historyEntry.value);
        break;
      case getEnums().HistoryTypeEnum.REDEEM:
        summary.spent += parseInt(historyEntry.value);
        break;
      case getEnums().HistoryTypeEnum.REVOKE:
        summary.revoked += parseInt(historyEntry.value);
        break;
    }
  });
  return summary;
}

function addUser(adminName, username, password, isAdmin) {
  rest.verbose('addUser', {username, password, isAdmin});
  return function(scope) {
    // function addUser(bytes32 username, bytes32 pwHash) returns (ErrorCodesEnum) {
    const contractName = AI.subContractsNames.UserManager;
    const method = 'addUser';
    const args = {
      username: util.toBytes32(username),
      pwHash: util.toBytes32(password), // FIXME this is not a hash !!
      isAdmin: isAdmin || false,
    };
    return rest.callMethod(adminName, contractName, method, args)(scope)
      .then(function(scope) {
        // returns ErrorCodesEnum
        const result = scope.contracts[contractName].calls[method];
        const E = getEnums().ErrorCodesEnum;
        if (result == E.SUCCESS) {
          if (scope.users[username] === undefined) scope.users[username] = {};
        } else if (result == E.USERNAME_EXISTS) {
          throw new Error("User exists: " + username); // TODO add a string conversion
        } else {
          throw new MethodError(contractName, method, result);
        }
        return scope;
      });
  }
}

function validateUser(adminName, username, password) {
  rest.verbose('validateUser', {username, password});
  return function(scope) {
    // function validateUser(bytes32 username, bytes32 pwHash) returns (ErrorCodesEnum) {
    const contractName = AI.subContractsNames.UserManager;
    const method = 'validate';
    const args = {
      username: util.toBytes32(username),
      pwHash: util.toBytes32(password) // FIXME this is not a hash !!
    };
    return rest.callMethod(adminName, contractName, method, args)(scope)
      .then(function(scope) {
        // returns ErrorCodesEnum
        const result = scope.contracts[contractName].calls[method];
        const E = getEnums().ErrorCodesEnum;
        if (result == E.SUCCESS) {
          //console.log('validateUser: SUCCESS');
          if (scope.users[username] === undefined) scope.users[username] = {};
          scope.users[username].valid = true;
        } else if (result == E.ERROR) {
          if (scope.users[username] === undefined) scope.users[username] = {};
          scope.users[username].valid = false;
        } else {
          throw new MethodError(contractName, method, result);
        }
        return scope;
      });
  }
}

function getUsers(adminName, searchTerm) {
  return function(scope) {
    rest.verbose('getUsers', searchTerm);

    const contractName = AI.subContractsNames.UserManager;

    return rest.getState(contractName)(scope)
      .then(function(scope) {
        const userAddresses = scope.states[contractName].users;
        scope.userList = [];
        return Promise.each(userAddresses, function(userAddress) { // for each user
          return rest.getState('User', userAddress)(scope) // get user contract by address
            .then(function(scope) {
              const userState = scope.states['User'];
              // fix the broken bytes32
              userState.username = util.trimNulls(userState.username); // FIXME #133766029
              userState.pwHash = util.fixBytes(userState.pwHash); // FIXME #133766029
              // if no search
              if (searchTerm === undefined) {
                // store the state
                scope.userList.push(userState.username);
              } else {
                // match the search term
                if (userState.username.indexOf(searchTerm) >= 0) {
                  scope.userList.push(userState.username);
                }
              }
          });
        }).then(function() { // all done
          return scope;
        });
      });
  }
}


function compileSearch() {
  return function(scope){
    const contractName = AI.contractName;
    const contractFilename = AI.contractsPath + AI.contractFilename;

    const compileList = [{
      searchable: ['User', 'StoreItem'],
      contractName: contractName,
    }];

    return nop(scope)
      .then(rest.getContractString(contractName, contractFilename))
      .then(rest.compile(compileList))
      .then(function() { // all done
        return scope;
        // console.log(scope);
      });
  }
}

function getUsersQuery(adminName, searchTerm) {
  return function(scope) {
    rest.verbose('getUsersQuery', searchTerm);

    return nop(scope)
      .then(rest.query('User'))
      .then(function(scope) {
        const result = scope.query.slice(-1)[0];
        //console.log('query', result);
        return scope;
      });
  }
}

function getHistory(adminName, username) {
  return function(scope) {
    rest.verbose('getHistory', {username});

    const contractName = 'User';

    return getUserAddress(adminName, username)(scope)
      .then( rest.getState(contractName, scope.users[username].address) )
      .then(function(scope) {
        if (scope.users[username] === undefined) scope.users[username] = {};
        scope.users[username].history = formatHistory(scope.states[contractName].history);
        return scope;
      });
  }

  function fromBytes32(history) {
    const goodHistory = [];
    history.forEach(function(entry) {
      entry.desc = util.fixBytes(entry.desc);  // FIXME #133766029
      entry.desc = util.fromBytes32(entry.desc);
      goodHistory.push(entry);
    });
    return goodHistory;
  }
}

function formatHistory(history) {
  const newHistory = [];
  history.forEach(function(entry) {
    var newEntry = {};
    newEntry.type = entry.htype.key;
    newEntry.timestamp = entry.timestamp;
    newEntry.date = new Date(entry.timestamp*1);
    newEntry.value = entry.value;
    entry.desc = util.fixBytes(entry.desc);  // FIXME #133766029
    newEntry.desc = util.fromBytes32(entry.desc);
    newHistory.push(newEntry);
  });
  return newHistory;
}


// FIXME: We need to actually save the balance
function getBalance(adminName, username, password) {
  rest.verbose('getBalance', {username, password});
  return function(scope) {
    // function getBalance(bytes32 username) returns (ErrorCodesEnum, uint)
    const contractName = AI.subContractsNames.UserManager;
    const method = 'getBalance';
    const args = {
      username: util.toBytes32(username),
      pwHash: util.toBytes32(password) // FIXME this is not a hash !!
    };
    return rest.callMethod(adminName, contractName, method, args)(scope)
      .then(function(scope) {
        const result = scope.contracts[contractName].calls[method];
        scope.users[username].balance = parseBalance(result);
        return scope;
      });
  }
}

function reward(adminName, username, value, desc) {
  return function(scope) {
    if (value <= 0 ) return Promise.reject(new Error('Positive numeric value required')); // FIXME this should go into the contract
    desc = desc || '';
    timestamp = new Date().getTime();
    rest.verbose('reward', {username, value});
    // function reward(bytes32 username, uint timestamp, uint value, bytes32 desc) returns (ErrorCodesEnum, uint)
    const contractName = AI.subContractsNames.UserManager;
    const method = 'reward';
    const args = {
      username: util.toBytes32(username),
      value: value,
      timestamp: timestamp,
      desc: util.toBytes32(desc),
    };
    // call method
    return rest.callMethod(adminName, contractName, method, args)(scope)
      .then(function(scope) {
        const result = scope.contracts[contractName].calls[method];
        scope.users[username].balance = parseBalance(result);
        return scope;
      });
  }
}

function redeem(adminName, username, value, itemId) {
  return function(scope) {
    if (value === undefined || value <= 0 ) throw new Error('Positive numeric value required');
    if (itemId === undefined || itemId <= 0 ) throw new Error('Positive numeric value required');
    timestamp = new Date().getTime();
    // function redeem(bytes32 username, uint value, uint itemId) returns (ErrorCodesEnum, uint)
    const contractName = AI.subContractsNames.UserManager;
    const method = 'redeem';
    const args = {
      username: util.toBytes32(username),
      value: value,
      timestamp: timestamp,
      desc: util.toBytes32(''+itemId), // itemId->bytes32
    };
    // call method
    return rest.callMethod(adminName, contractName, method, args)(scope)
      .then(function(scope) {
        const result = scope.contracts[contractName].calls[method];
        scope.users[username].balance = parseBalance(result);
        return scope;
      });
  }
}

function revoke(adminName, username, value, reason) {
  return function(scope) {
    rest.verbose('revoke', {username, value, reason});
    if (value <= 0 ) throw new Error('Positive numeric value required');
    timestamp = new Date().getTime();
    // function revoke(bytes32 username, uint value, uint resone) returns (ErrorCodesEnum, uint)
    const contractName = AI.subContractsNames.UserManager;
    const method = 'revoke';
    const args = {
      username: util.toBytes32(username),
      value: value,
      timestamp: timestamp,
      desc: util.toBytes32(reason),
    };
    // call method
    return rest.callMethod(adminName, contractName, method, args)(scope)
      .then(function(scope) {
        const result = scope.contracts[contractName].calls[method];
        scope.users[username].balance = parseBalance(result);
        return scope;
      });
  }
}

function parseBalance(result) {
  const split = result.split(',');
  const errorCode = split[0];
  const E = getEnums().ErrorCodesEnum;
  if (errorCode != E.SUCCESS) throw new Error(`result error code: ${errorCode} ${E[errorCode]}`);
  const balance = parseInt(split[1]);
  if (isNaN(balance)) throw new Error(`result balance: not a number ${balance}`);
  return balance;
}

function addStoreItems(adminName, items) {
  return function(scope) {
    return Promise.each(items, function(item) { // for each store items
      return addStoreItem(adminName, item)(scope); // add item
    }).then(function() { // all done
      return scope;
    });
  }
}

function addStoreItem(adminName, item) {
  return function(scope) {
    rest.verbose('addStoreItem', {item});
    // function addItem(bytes32 serial, string name, uint price, string desc) returns (ErrorCodesEnum) {
    const contractName = AI.subContractsNames.StoreManager;
    const method = 'addItem';
    const args = createStoreItemArgs(item);
    // call method to add item
    return rest.callMethod(adminName, contractName, method, args)(scope)
      .then(function(scope) {
        const E = getEnums().ErrorCodesEnum;
        var result = scope.contracts[contractName].calls[method];
        if (result != E.SUCCESS) throw new Error('addStoreItem: returned ' + E[result]);
        return scope;
      })
      // add the item's images
      .then(addStoreItemImages(adminName, item));
  }
}

function addStoreItemImages(adminName, item) {
  return function(scope) {
    return Promise.each(item.imageUrls, function(imageUrl) { // for each image
      return addStoreItemImage(adminName, util.toBytes32(item.serial), imageUrl)(scope) // add image url
        .then(function(scope) {
        });
    }).then(function() { // all done
      return scope;
    });
  }
}

function addStoreItemImage(adminName, serial, imageUrl) {
  return function(scope) {
    rest.verbose('addStoreItemImage', {imageUrl});
    // function addImageUrl(bytes32 serial, string imageUrl) constant returns (uint)
    const contractName = AI.subContractsNames.StoreManager;
    const method = 'addImageUrl';
    const args = {
      serial: serial,
      imageUrl: imageUrl,
    };
    // call method to add image url
    return rest.callMethod(adminName, contractName, method, args)(scope);
  }
}

function createStoreItemArgs(item) {
  // validate input
  if (item === undefined) throw new Error('Store Item: item undefined');
  if (item.serial === undefined) throw new Error('Store Item: serial undefined');
  if (item.name === undefined) throw new Error('Store Item: name undefined');
  if (item.price === undefined) throw new Error('Store Item: price undefined');
  if (item.desc === undefined) throw new Error('Store Item: desc undefined');
  // if (item.imageUrl === undefined) throw new Error('Store Item: imageUrl undefined');

  // create arg
  const args = {
    serial: util.toBytes32(item.serial),
    name: item.name,
    price: item.price,
    desc: item.desc,
    // imageUrl: item.imageUrl,
  };
  return args;
}

function createDisplayStoreItem(item) {
  return {
    serial: util.trimNulls(item.serial), // FIXME #133766029
    name: item.name,
    price: item.price,
    desc: item.desc,
    imageUrls: item.imageUrls,
    address: item.address,
  }
}

function getStoreItemsQuery() {
  return function(scope) {
    rest.verbose('getStoreItemsQuery');

    return nop(scope)
      .then(rest.query('StoreItem'))
      .then(function(scope) {
        const result = scope.query.slice(-1)[0];
        scope.store.items = result;
        return scope;
      });
  }
}

function getStoreItems() {
  return function(scope) {
    rest.verbose('getStoreItems');

    const contractName = AI.subContractsNames.StoreManager;

    return rest.getState(contractName)(scope)
      .then(function(scope) {
        const itemAddresses = scope.states[contractName].items;
        scope.store.items = [];

        return Promise.each(itemAddresses, function(itemAddress) { // for each store items
          return getStoreItem(itemAddress)(scope) // get item
            .then(function(scope) { // save it to the store object
              var item = scope.states['StoreItem'];
              item.address = itemAddress; // we need item addresses to be on the object
              scope.store.items.push(createDisplayStoreItem(item));
            });
        }).then(function() { // all done
          return scope;
        });
      });
  }
}

function getStoreItem(address) {
  const contractName = 'StoreItem';
  return rest.getState(contractName, address);
}

// ========== util ==========

// setup the common containers in the scope
function setScope(scope) {
  if (scope === undefined) scope = {};
  return new Promise(function(resolve, reject) {
    rest.setScope(scope).then(function(scope) {
      // add project specific scope items here
      scope.name = 'demo-app';
      scope.store = {};
      resolve(scope);
    });
  });
}

function nop(scope) {
  return new Promise(function(resolve, reject) {
    resolve(scope);
  });
}

module.exports = function(contractsPath) {
  rest.verbose('construct', {contractsPath});
  AI.contractsPath = contractsPath;

  return {
    AI: AI,
    addUser: addUser,
    addStoreItem: addStoreItem,
    addStoreItems: addStoreItems,
    createStoreItemArgs: createStoreItemArgs,
    compileSearch: compileSearch,
    getAdminInterface: getAdminInterface,
    getEnums: getEnums,
    getUser: getUser,
    getUserState: getUserState,
    getUsers: getUsers,
    getUsersQuery: getUsersQuery,
    getHistory: getHistory,
    getBalance: getBalance,
    getStoreItems: getStoreItems,
    getStoreItemsQuery: getStoreItemsQuery,
    getStoreItem: getStoreItem,
    reward: reward,
    redeem: redeem,
    revoke: revoke,
    setAdmin: setAdmin,
    setAdminInterface: setAdminInterface,
    setScope: setScope,
    validateUser: validateUser,
  };
};
