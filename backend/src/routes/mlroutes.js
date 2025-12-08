const router = require('express').Router();
const controller = require('../controllers/mlcontroller');

router.get('/ml/health', controller.health);
// Ensemble ML endpoints
router.post('/ml/predict', controller.predict);
router.get('/ml/locations', controller.getLocations);
router.get('/ml/historical', controller.getHistoricalData);

module.exports = router;
