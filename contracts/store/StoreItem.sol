/**
  * StoreItem data contract
*/
contract StoreItem {
  bytes32 serial;
  string name;
  uint price;
  string desc;
  uint id;
  string[] imageUrls;

  function StoreItem(bytes32 _serial, string _name, uint _price, string _desc, uint _id) {
    serial = _serial;
    name = _name;
    price = _price;
    desc = _desc;
    id = _id;
  }

  function stringToBytes32(string memory source) returns (bytes32 result) {
    assembly {
        result := mload(add(source, 32))
    }
  }

  function getSerial() constant returns (bytes32) {
    return (serial);
  }

  function get() constant returns (string, uint, string, uint) {
    return (name, price, desc, id);
  }

  function addImageUrl(string imageUrl) constant returns (uint) {
    imageUrls.push(imageUrl);
    return imageUrls.length;
  }

  function getImageUrl(uint index) constant returns (string) {
    return imageUrls[index];
  }

}
