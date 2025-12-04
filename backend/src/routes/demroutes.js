const router = require('express').Router();
const controller = require('../controllers/demcontroller');

router.get('/', controller.getDem);
router.get('/tiles/:z/:x/:y.png', controller.getTilePng);
router.get('/geotiff', controller.getGeoTiff);

module.exports = router;
