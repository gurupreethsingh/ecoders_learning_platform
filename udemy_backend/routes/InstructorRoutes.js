// routes/instructorRoutes.js
const express = require("express");
const ctrl = require("../controllers/InstructorController");
const router = express.Router();

// Create / Apply
router.post("/apply", ctrl.apply);

// Reads / Queries
router.get("/list", ctrl.list);
router.get("/counts", ctrl.counts);
router.get("/get-by-email", ctrl.getByEmail);
router.get("/quick-search", ctrl.quickSearch);
router.get("/get-by-id/:id", ctrl.getById);

// Updates
router.patch("/update/:id", ctrl.update);
router.patch("/set-profile/:id", ctrl.setProfile);
router.patch("/set-address/:id", ctrl.setAddress);

// Verifications
router.post("/verify-email/:id", ctrl.verifyEmail);
router.post("/verify-kyc/:id", ctrl.verifyKyc);

// Status / Moderation
router.post("/approve/:id", ctrl.approve);
router.post("/reject/:id", ctrl.reject);
router.post("/toggle-active/:id", ctrl.toggleActive);
router.post("/set-status/:id", ctrl.setStatus);

// Assignments
router.post("/update-assignments/:id", ctrl.updateAssignments);
router.post("/assign-add/:id", ctrl.assignAdd);
router.post("/assign-remove/:id", ctrl.assignRemove);

// Bulk
router.post("/bulk-action", ctrl.bulkAction);

// Deletes
router.delete("/remove/:id", ctrl.remove);
router.delete("/hard-delete/:id", ctrl.hardDelete);

module.exports = router;
