// routes/SemisterRoutes.js
const express = require("express");
const router = express.Router();
const SemisterController = require("../controllers/SemisterController");

// CRUD
router.post("/semisters", SemisterController.createSemister);                 // Create
router.get("/semisters", SemisterController.listSemisters);                  // List (search/filter)
router.get("/semisters/:id", SemisterController.getSemisterById);            // Read by id
router.get(
  "/semisters/by-slug/:degreeId/:slug",
  SemisterController.getSemisterBySlug
);                                                                           
router.patch("/semisters/:id", SemisterController.updateSemister);           
router.delete("/semisters/:id", SemisterController.deleteSemister);          

// Status toggle & bulk status
router.post("/semisters/:id/toggle-active", SemisterController.toggleActive);
router.post("/semisters/bulk/toggle-active", SemisterController.bulkToggleActive);

// Counts & facets
router.get("/semisters/counts/summary", SemisterController.countsSummary);
router.get("/semisters/counts/by-degree", SemisterController.countsByDegree);
router.get("/semisters/counts/by-academic-year", SemisterController.countsByAcademicYear);
router.get("/semisters/facets", SemisterController.getFacets);

// Advanced ops
router.patch("/semisters/:id/move-degree", SemisterController.moveToDegree);
router.patch("/semisters/:id/renumber", SemisterController.renumber);
router.patch("/semisters/reorder", SemisterController.reorderWithinDegree);
router.post("/semisters/bulk/clone-to-degrees", SemisterController.cloneToDegrees);

module.exports = router;
