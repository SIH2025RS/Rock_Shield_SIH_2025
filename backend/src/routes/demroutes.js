const router = require('express').Router();
const controller = require('../controllers/demcontroller');

router.get('/', controller.getDem);

module.exports = router;
