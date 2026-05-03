const express = require("express");
const router = express.Router();

const { generateSystem } = require("../controllers/systemController");
const { improveSystem } = require("../controllers/improveController");

router.post("/generate", generateSystem);
router.post("/improve", improveSystem);

module.exports = router;