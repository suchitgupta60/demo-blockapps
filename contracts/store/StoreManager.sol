import "./StoreItem.sol";
import "../enums/ErrorCodes.sol";

/**
  * Interface for User data contracts
*/
contract StoreManager is ErrorCodes {
  StoreItem[] items;
  mapping (bytes32 => uint) serialToIdMap;

  /**
  * Constructor
  */
  function StoreManager() {
    items.length = 1;
  }

  function exists(bytes32 serial) returns (bool) {
    return serialToIdMap[serial] != 0;
  }

  function addItem(bytes32 serial, string name, uint price, string desc) returns (ErrorCodesEnum) {
    // fail if serial exists
    if (exists(serial)) return ErrorCodesEnum.STOREITEM_EXISTS;
    // add item
    uint itemId = items.length;
    serialToIdMap[serial] = itemId;
    items.push(new StoreItem(serial, name, price, desc, itemId));
    return ErrorCodesEnum.SUCCESS;
  }

  function addImageUrl(bytes32 serial, string imageUrl) constant returns (uint) {
    var itemId = serialToIdMap[serial];
    var item = items[itemId];
    return item.addImageUrl(imageUrl);
  }

  function getItems() returns (StoreItem[]) {
    return items;
  }
}
