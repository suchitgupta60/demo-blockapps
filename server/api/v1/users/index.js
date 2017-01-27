const express = require('express');
const controller = require('./users.controller');
const router = express.Router();

router.get('/', controller.getUsers)
router.post('/validate', controller.validate);
router.post('/history', controller.history);
router.post('/reward', controller.reward);
router.post('/redeem', controller.redeem);
router.post('/revoke', controller.revoke);
router.post('/balance', controller.balance);
router.post('/:username', controller.create);

module.exports = router;
