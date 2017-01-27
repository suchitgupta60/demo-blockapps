const ba = require('blockapps-rest');
const rest = ba.rest;
const common = ba.common;
const util = common.util;

function createStoreItems(count) {
  const items = [];
  for (var i = 0; i < count; i++) {
    items.push(createStoreItem(i));
  }
  return items;
}

function createStoreItem(index) {
  var time = process.hrtime().toString();
  time = time.replace(',', '');
  time = time.substring(7);

  return {
    serial: time,
    name: `test ${index} ${time}`,
    price: index,
    desc: `test item ${index}`,
    imageUrls: [
      `http://blockapps.net/images/header_logo.png&${index}_0`,
      `http://blockapps.net/images/header_logo.png&${index}_1`,
    ],
  }
}

module.exports = {
  createStoreItems: createStoreItems,
  createStoreItem: createStoreItem,
}
