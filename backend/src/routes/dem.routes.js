const router = require('express').Router();
const controller = require('../controllers/dem.controller');

router.get('/', controller.getDem);

module.exports = router;
