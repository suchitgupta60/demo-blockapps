const express = require('express');
const controller = require('./store.controller');
const router = express.Router();

router.get('/', controller.getItems)
router.get('/:id', controller.getItemDetails);

module.exports = router;
