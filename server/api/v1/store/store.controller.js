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
 * @api {get} / Request list of all items
 * @apiName GetItems
 * @apiGroup Store
 *
 *
 * @apiSuccess {Array} List of all items.
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *       "success": true,
 *       "data": [
 *         {
 *          "serial": "00000000000000003434353631343838",
 *          "name": "test 2 44561488",
 *          "price": "2",
 *          "desc": "test item 2",
 *          "imageUrls": ["http://0","http://1","http://2","http://3"],
 *          "address": "a54c367de69702e3b86161d795158cf88103d875"
 *         }
 *       ]
 *     }
 * @apiError error Product lookup failed.
 *
 * @apiErrorExample Error-Response:
 *     HTTP/1.1 500 Internal Server Error
 *     {
 *       "success": false,
 *       "error": "Product lookup failed."
 *     }
 */
exports.getItems = (req, res) => {
  const deploy = req.app.get('deploy');
  ms.setScope()
    .then(ms.setAdmin(deploy.adminName, deploy.adminPassword, deploy.AdminInterface.address))
    .then(ms.getStoreItemsQuery())
    .then(scope => {
      const items = scope.store.items;
      util.response.status200(res, items);
    })
    .catch(err => {
      util.response.status500(res, err);
    });
}

/**
 * @api {get} /:id Get item details by item ID.
 * @apiName GetItemDetail
 * @apiGroup Store
 *
 * @apiParam {String} itemId Smart contract id for item.
 *
 * @apiSuccess {Object} .
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *       "success": true,
 *        "data": [
 *         {
 *          "serial": "00000000000000003434353631343838",
 *          "name": "test 2 44561488",
 *          "price": "2",
 *          "desc": "test item 2",
 *          "imageUrls": ["http://0","http://1","http://2","http://3"],
 *          "address": "a54c367de69702e3b86161d795158cf88103d875"
 *         }
 *       ]
 *     }
 * @apiError .
 *
 * @apiErrorExample Error-Response:
 *     HTTP/1.1 400 Bad Request
 *     {
 *       "success": false,
 *       "error": "Item does not exist."
 *     }
 */
exports.getItemDetails = (req, res) => {
  const deploy = req.app.get('deploy');
  const itemId = req.params.id;
  if (!itemId){
    const msg = "Item ID required.";
    util.response.status400(res, msg);
  } else {
    ms.setScope()
      .then(ms.setAdmin(deploy.adminName, deploy.adminPassword, deploy.AdminInterface.address))
      .then(ms.getStoreItems())
      .then(scope => {
        // Filter out our required item
        const items = scope.store.items;
        let item = null;
        for(let i = 0; i < items.length; i++) {
          if (items[i].address == itemId){
            item = items[i];
          }
        }
        // If the item is not found tell the frontend
        if (item === null) {
          util.response.status400(res, 'Item not found: ${itemId}');
        } else {
          util.response.status200(res, item);
        }
      })
      .catch(err => {
        util.response.status500(res, err);
      });
  }
}
