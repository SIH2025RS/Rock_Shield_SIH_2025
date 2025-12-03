const router = require('express').Router();
const controller = require('../controllers/weathercontroller');

router.get('/', controller.getWeather);

module.exports = router;
