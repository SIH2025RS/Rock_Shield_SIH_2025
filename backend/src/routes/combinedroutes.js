const router = require('express').Router();
const controller = require('../controllers/combinedcontroller');

router.get('/', controller.getCombined);

module.exports = router;
