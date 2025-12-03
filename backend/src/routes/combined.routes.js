const router = require('express').Router();
const controller = require('../controllers/combined.controller');

router.get('/', controller.getCombined);

module.exports = router;
