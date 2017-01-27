import "./User.sol";
import "./enums/ErrorCodes.sol";

/**
  * Interface for User data contracts
*/
contract UserManager is ErrorCodes {
  User[] users;
  mapping (bytes32 => uint) usernameToIdMap;
  address[] history;


  /**
  * Constructor
  */
  function UserManager() {
    users.length = 1;
    history.push(12345678);
  }

  function exists(bytes32 username) returns (bool) {
    return usernameToIdMap[username] != 0;
  }

  function validate(bytes32 username, bytes32 pwHash) returns (ErrorCodesEnum) {
    // does not exists
    if (!exists(username)) return ErrorCodesEnum.ERROR;
    // get the id
    uint id = usernameToIdMap[username];
    User user = User(users[id]);
    var (, userPwHash, , ,) = user.get();
    if (userPwHash != pwHash)
      return ErrorCodesEnum.ERROR;
    // match
    return ErrorCodesEnum.SUCCESS;
  }

  function getUser(bytes32 username) returns (address) {
    uint userId = usernameToIdMap[username];
    return users[userId];
  }

  function getUsers() returns (User[]) {
    return users;
  }

  function getHistory(bytes32 username)  returns (address[]) {
    return history;
  }

  function getBalance(bytes32 username) returns (ErrorCodesEnum, uint) {
    uint userId = usernameToIdMap[username];
    User user = users[userId];
    return (ErrorCodesEnum.SUCCESS, user.getBalance());
  }

  function getUserAttr(bytes32 username) returns (bytes32, bytes32, uint, bool, uint) {
    uint userId = usernameToIdMap[username];
    User user = users[userId];
    return user.get();
  }

  function reward(bytes32 username, uint timestamp, uint value, bytes32 desc) returns (ErrorCodesEnum, uint) {
    uint userId = usernameToIdMap[username];
    if (userId == 0) return (ErrorCodesEnum.NOT_FOUND, 0);
    User user = users[userId];
    return (ErrorCodesEnum.SUCCESS, user.reward(timestamp, value, desc));
  }

  function redeem(bytes32 username, uint timestamp, uint value, bytes32 desc) returns (ErrorCodesEnum, uint) {
    uint userId = usernameToIdMap[username];
    if (userId == 0) return (ErrorCodesEnum.NOT_FOUND, 0);
    User user = users[userId];
    return user.redeem(timestamp, value, desc);
  }

  function revoke(bytes32 username, uint timestamp, uint value, bytes32 desc) returns (ErrorCodesEnum, uint) {
    uint userId = usernameToIdMap[username];
    if (userId == 0) return (ErrorCodesEnum.NOT_FOUND, 0);
    User user = users[userId];
    return user.revoke(timestamp, value, desc);
  }

  function addUser(bytes32 username, bytes32 pwHash, bool isAdmin) returns (ErrorCodesEnum) {
    // fail if username exists
    if (exists(username)) return ErrorCodesEnum.USERNAME_EXISTS;
    // add user
    uint userId = users.length;
    usernameToIdMap[username] = userId;
    users.push(new User(username, pwHash, userId, isAdmin));
    return ErrorCodesEnum.SUCCESS;
  }
}
