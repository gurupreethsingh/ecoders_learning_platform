const express = require("express");
const router = express.Router();
const { getDashboardCounts } = require("../controllers/DashboardController");

router.get("/dashboard-counts", getDashboardCounts);

module.exports = router;
