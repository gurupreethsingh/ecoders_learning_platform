// routes/SemesterRoutes.js
const express = require("express");
const router = express.Router();
const semesterController = require("../controllers/SemesterController");

router.post("/semesters", semesterController.createSemester);
router.get("/semesters", semesterController.listSemesters);
router.get("/semesters/:id", semesterController.getSemesterById);
router.get(
  "/semesters/by-slug/:degreeId/:slug",
  semesterController.getSemesterBySlug
);
router.patch("/semesters/:id", semesterController.updateSemester);
router.delete("/semesters/:id", semesterController.deleteSemester);

router.post("/semesters/:id/toggle-active", semesterController.toggleActive);
router.post(
  "/semesters/bulk/toggle-active",
  semesterController.bulkToggleActive
);

router.get("/semesters/counts/summary", semesterController.countsSummary);
router.get("/semesters/counts/by-degree", semesterController.countsByDegree);
router.get(
  "/semesters/counts/by-academic-year",
  semesterController.countsByAcademicYear
);
router.get("/semesters/facets", semesterController.getFacets);

router.patch("/semesters/:id/move-degree", semesterController.moveToDegree);
router.patch("/semesters/:id/renumber", semesterController.renumber);
router.patch("/semesters/reorder", semesterController.reorderWithinDegree);
router.post(
  "/semesters/bulk/clone-to-degrees",
  semesterController.cloneToDegrees
);

/* ✅ NEW: list by degree for CreateAttendance */
router.get(
  "/semesters/list-by-degree/:degreeId",
  semesterController.listByDegree
);

module.exports = router;
