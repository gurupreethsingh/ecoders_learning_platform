// routes/DegreeRoutes.js
const express = require("express");
const router = express.Router();

// ✅ import the correct file
const DegreeController = require("../controllers/DegreeController");

// CRUD
router.post("/create-degree", DegreeController.createDegree);
router.get("/list-degrees", DegreeController.listDegrees);
router.get("/get-degree-by-id/slug/:id", DegreeController.getDegreeById);
router.get("/get-degree-by-slug/slug/:slug", DegreeController.getDegreeBySlug);
router.patch("/update-degree/slug/:id", DegreeController.updateDegree);
router.delete("/delete-degree/:id", DegreeController.deleteDegree);

// Status toggle
router.post("/degrees/:id/toggle-active", DegreeController.toggleActive);

// Counts & facets
router.get("/degrees/counts/summary", DegreeController.countsSummary);
router.get("/degrees/counts/by-level", DegreeController.countsByLevel);
router.get("/degrees/counts/by-department", DegreeController.countsByDepartment);
router.get("/degrees/facets", DegreeController.getFacets);

module.exports = router;

