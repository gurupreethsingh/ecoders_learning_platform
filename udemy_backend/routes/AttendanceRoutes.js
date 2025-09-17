// routes/AttendanceRoutes.js
const express = require("express");
const router = express.Router();

// IMPORTANT: make sure the path is correct
const ctrl = require("../controllers/AttendanceController");

// --- auth stubs (replace with your real middlewares) ---
const authRequired = (_req, _res, next) => next();
const adminOnly = (_req, _res, next) => next();

/* ============================ ATTENDANCE (CRUD) ============================ */
// createAttendance, getAttendanceById, updateAttendance, deleteAttendance, listAttendance
router.post("/create-attendance", adminOnly, ctrl.createAttendance);
router.get("/get-attendance-by-id/:id", adminOnly, ctrl.getAttendanceById);
router.patch("/update-attendance/:id", adminOnly, ctrl.updateAttendance);
router.delete("/delete-attendance/:id", adminOnly, ctrl.deleteAttendance);
router.get("/list-attendance", adminOnly, ctrl.listAttendance);

/* =============================== MARK ATTENDANCE =========================== */
// markViaLink, markManual
router.post("/mark-via-link/:code", authRequired, ctrl.markViaLink);
router.post("/mark-manual", authRequired, ctrl.markManual);

/* =============================== LINKS (CRUD) ============================== */
// createLink, getLink, getLinkByCode, updateLink, deleteLink, listLinks
router.post("/create-link", adminOnly, ctrl.createLink);
router.get("/get-link/:id", adminOnly, ctrl.getLink);
router.get("/get-link-by-code/:code", adminOnly, ctrl.getLinkByCode);
router.patch("/update-link/:id", adminOnly, ctrl.updateLink);
router.delete("/delete-link/:id", adminOnly, ctrl.deleteLink);
router.get("/list-links", adminOnly, ctrl.listLinks);

/* ============================= LINK UTILITIES ============================== */
// duplicateLink, activateLink, deactivateLink
router.post("/duplicate-link/:id", adminOnly, ctrl.duplicateLink);
router.post("/activate-link/:id", adminOnly, ctrl.activateLink);
router.post("/deactivate-link/:id", adminOnly, ctrl.deactivateLink);

/* ================================ ANALYTICS ================================ */
// countByStatus, countByCourse, countByStudent, dailyCounts,
// calcMonthlyBreakdown, calcCourseCoverage, calcStreak, calcEligibility, calcLeaderboard
router.get("/count-by-status", adminOnly, ctrl.countByStatus);
router.get("/count-by-course", adminOnly, ctrl.countByCourse);
router.get("/count-by-student", adminOnly, ctrl.countByStudent);
router.get("/daily-counts", adminOnly, ctrl.dailyCounts);

router.get("/calc-monthly-breakdown", adminOnly, ctrl.calcMonthlyBreakdown);
router.get("/calc-course-coverage", adminOnly, ctrl.calcCourseCoverage);
router.get("/calc-streak", adminOnly, ctrl.calcStreak);
router.get("/calc-eligibility", adminOnly, ctrl.calcEligibility);
router.get("/calc-leaderboard", adminOnly, ctrl.calcLeaderboard);

/* =============================== BULK OPERATIONS =========================== */
// bulkMark, bulkDelete, bulkImport, bulkGenerateLinks, deactivateExpiredLinks
router.post("/bulk-mark", adminOnly, ctrl.bulkMark);
router.post("/bulk-delete", adminOnly, ctrl.bulkDelete);
router.post("/bulk-import", adminOnly, ctrl.bulkImport);
router.post("/bulk-generate-links", adminOnly, ctrl.bulkGenerateLinks);
router.post("/deactivate-expired-links", adminOnly, ctrl.deactivateExpiredLinks);

/* ================================ NOTIFICATIONS ============================ */
// sendReminderForActiveLink, notifyLowAttendance, notifyInstructorSummary
router.post("/send-reminder-for-active-link", adminOnly, ctrl.sendReminderForActiveLink);
router.post("/notify-low-attendance", adminOnly, ctrl.notifyLowAttendance);
router.post("/notify-instructor-summary", adminOnly, ctrl.notifyInstructorSummary);

/* ================================== EXPORTS ================================= */
// exportAttendanceJSON, exportAttendanceCSV
router.get("/export-attendance-json", adminOnly, ctrl.exportAttendanceJSON);
router.get("/export-attendance-csv", adminOnly, ctrl.exportAttendanceCSV);

/* =========================== SELF SERVICE (STUDENT) ======================== */
// overall summary for the logged-in student (or explicit studentId in query)
router.get("/my-attendance-summary", authRequired, ctrl.myAttendanceSummary);
// detailed list for the selected scope (used by CSV export / fallback)
router.get("/my-attendance-list", authRequired, ctrl.myAttendanceList);


module.exports = router;
