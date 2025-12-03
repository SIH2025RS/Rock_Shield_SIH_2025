const router = require('express').Router();
const controller = require('../controllers/iotcontroller');

router.post('/', controller.postData);
router.get('/', controller.getData);
router.get('/latest/:sensor_id', controller.getLatest);

module.exports = router;
