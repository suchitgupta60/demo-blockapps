import "./HistoryType.sol";
import "../enums/ErrorCodes.sol";

/**
 * User data contract
 */
contract User is ErrorCodes, HistoryType {
  // note: using byte32 for username, since Solidity can't return variable length strings
  bytes32 username;
  bytes32 pwHash;
  uint id;
  bool isAdmin = false;
  uint balance;

  struct historyItem {
    HistoryTypeEnum htype; // note: type is reserved word
    uint timestamp;
    uint value;
    bytes32 desc;
  }

  historyItem[] history;

  function User(bytes32 _username, bytes32 _pwHash, uint _id, bool _isAdmin) {
    username = _username;
    pwHash = _pwHash;
    id = _id;
    isAdmin = _isAdmin;
    balance = 0;
  }

  function get() constant returns (bytes32, bytes32, uint, bool, uint) {
    return (username, pwHash, id, isAdmin, balance);
  }

  function reward(uint timestamp, uint value, bytes32 desc) returns(uint) {
    addHistory(HistoryTypeEnum.REWARD, timestamp, value, desc);
    balance += value;
    return balance;
  }

  function redeem(uint timestamp, uint value, bytes32 desc) returns (ErrorCodesEnum, uint) {
    if (balance < value) return (ErrorCodesEnum.INSUFFICIENT_BALANCE, 0);
    addHistory(HistoryTypeEnum.REDEEM, timestamp, value, desc);
    balance -= value;
    return (ErrorCodesEnum.SUCCESS, balance);
  }

  function revoke(uint timestamp, uint value, bytes32 desc) returns (ErrorCodesEnum, uint) {
    if (balance < value) return (ErrorCodesEnum.INSUFFICIENT_BALANCE, 0);
    addHistory(HistoryTypeEnum.REVOKE, timestamp, value, desc);
    balance -= value;
    return (ErrorCodesEnum.SUCCESS, balance);
  }

  function getBalance() returns(uint) {
    return balance;
  }

  function addHistory(HistoryTypeEnum htype, uint timestamp, uint value, bytes32 desc) {
    history.push(historyItem(htype, timestamp, value, desc));
  }
}
