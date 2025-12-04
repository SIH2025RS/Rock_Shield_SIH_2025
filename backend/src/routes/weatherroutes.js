const router = require('express').Router();
const controller = require('../controllers/weathercontroller');

router.get('/', controller.getWeather);
router.get('/latest', controller.getLatestWeather);

module.exports = router;
