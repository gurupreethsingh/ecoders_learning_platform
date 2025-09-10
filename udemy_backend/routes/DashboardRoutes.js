// routes/DashboardRoutes.js
const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/DashboardController");
router.get("/dashboard-counts", ctrl.getDashboardCounts);
module.exports = router;
