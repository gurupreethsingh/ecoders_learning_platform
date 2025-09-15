// routes/StudentAdmissionRoutes.js
const express = require("express");
const router = express.Router();

const admission = require("../controllers/StudentAdmissionController");

/* ----------------------------- CRUD & actions ------------------------------ */
// CREATE
router.post("/create-admission", admission.createAdmission);
// LIST + GET
router.get("/list-admissions", admission.listAdmissions);
router.get("/get-admission/:id", admission.getAdmissionById);
// UPDATE
router.patch("/update-admission/:id", admission.updateAdmission);
// DELETE (hard)
router.delete("/delete-admission/:id", admission.deleteAdmission);
// CANCEL (soft delete + withdrawn)
router.patch("/cancel-admission/:id", admission.cancelAdmission);

/* ----------------------------- Counts & Facets ----------------------------- */

router.get("/counts-summary", admission.countsSummary);
router.get("/counts-by-degree", admission.countsByDegree);
router.get("/counts-by-academic-year", admission.countsByAcademicYear);
router.get("/get-facets", admission.getFacets);

/* ----------------------------- Transfers & Bulk ---------------------------- */

// Single transfer
router.patch("/transfer-admission/:id", admission.transferAdmission);
// Bulk ops
router.post("/bulk-set-status", admission.bulkSetStatus);
router.post("/bulk-delete", admission.bulkDelete);
router.post("/bulk-cancel", admission.bulkCancel);
router.post("/bulk-transfer", admission.bulkTransfer);

// Duplicate/replicate
router.post("/duplicate-admission/:id", admission.duplicateAdmission);

/* ----------------------------- Workflow helpers --------------------------- */
router.post("/submit/:id", admission.submit);
router.post("/approve/:id", admission.approve);
router.post("/reject/:id", admission.reject);

/* ----------------------------- Export ------------------------------------- */
router.get("/export-csv", admission.exportCsv);

module.exports = router;
