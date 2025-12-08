const router = require("express").Router();
const controller = require("../controllers/demcontroller");

router.get("/", controller.getDem);
router.get("/image", controller.getDemImage);
router.get("/patches", controller.getDemPatches);
router.get("/tiles/:z/:x/:y.png", controller.getTilePng);
router.get("/geotiff", controller.getGeoTiff);

module.exports = router;
