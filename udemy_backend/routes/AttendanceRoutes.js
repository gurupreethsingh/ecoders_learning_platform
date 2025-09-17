const express = require("express");
const router = express.Router();

// Make sure this path is correct
const ctrl = require("../controllers/AttendanceController");

// No-op auth stubs (swap with real middleware if you have it)
const authRequired = (_req, _res, next) => next();
const adminOnly = (_req, _res, next) => next();

/* ============================ ATTENDANCE LINKS ============================ */
// Canonical REST paths
router.post("/links", adminOnly, ctrl.createLink);
router.get("/links", adminOnly, ctrl.listLinks);
router.get("/links/:id", adminOnly, ctrl.getLink);
router.patch("/links/:id", adminOnly, ctrl.updateLink);
router.delete("/links/:id", adminOnly, ctrl.deleteLink);
router.get("/links/code/:code", adminOnly, ctrl.getLinkByCode);

// Legacy aliases you were calling from the UI earlier
router.post("/create-link", adminOnly, ctrl.createLink);

// Mark via link (student)
router.post("/mark/link/:code", authRequired, ctrl.markViaLink);
// Legacy alias for previews
router.post("/mark-via-link/:code", authRequired, ctrl.markViaLink);

/* ============================ ATTENDANCE RECORDS ========================== */
// CRUD (manual attendance rows)
router.post("/attendance", adminOnly, ctrl.createAttendance);
router.get("/attendance", adminOnly, ctrl.listAttendance);
router.get("/attendance/:id", adminOnly, ctrl.getAttendanceById);
router.patch("/attendance/:id", adminOnly, ctrl.updateAttendance);
router.delete("/attendance/:id", adminOnly, ctrl.deleteAttendance);

// Marking (manual)
router.post("/mark/manual", authRequired, ctrl.markManual);

/* ============================== BULK OPERATIONS =========================== */
router.post("/attendance/bulk/mark", adminOnly, ctrl.bulkMark);
router.post("/attendance/bulk/delete", adminOnly, ctrl.bulkDelete);
router.post("/attendance/bulk/import", adminOnly, ctrl.bulkImport);
router.post(
  "/attendance/bulk/generate-links",
  adminOnly,
  ctrl.bulkGenerateLinks
);
router.post(
  "/attendance/deactivate-expired-links",
  adminOnly,
  ctrl.deactivateExpiredLinks
);
router.post("/attendance/clear-course-day", adminOnly, ctrl.clearCourseDay);

/* ================================ ANALYTICS =============================== */
router.get("/attendance/count-by-status", adminOnly, ctrl.countByStatus);
router.get("/attendance/count-by-course", adminOnly, ctrl.countByCourse);
router.get("/attendance/count-by-student", adminOnly, ctrl.countByStudent);
router.get("/attendance/daily-counts", adminOnly, ctrl.dailyCounts);
router.get(
  "/attendance/calc/monthly-breakdown",
  adminOnly,
  ctrl.calcMonthlyBreakdown
);
router.get(
  "/attendance/calc/course-coverage",
  adminOnly,
  ctrl.calcCourseCoverage
);
router.get("/attendance/calc/streak", adminOnly, ctrl.calcStreak);
router.get("/attendance/calc/eligibility", adminOnly, ctrl.calcEligibility);
router.get(
  "/attendance/calc/student-course-percent",
  adminOnly,
  ctrl.calcStudentCoursePercent
);
router.get(
  "/attendance/calc/student-semester-percent",
  adminOnly,
  ctrl.calcStudentSemesterPercent
);
router.get("/attendance/calc/leaderboard", adminOnly, ctrl.calcLeaderboard);

/* ============================== NOTIFICATIONS ============================= */
router.post("/notify/send-reminder", adminOnly, ctrl.sendReminderForActiveLink);
router.post("/notify/low-attendance", adminOnly, ctrl.notifyLowAttendance);
router.post(
  "/notify/instructor-summary",
  adminOnly,
  ctrl.notifyInstructorSummary
);

/* ================================= EXPORTS ================================= */
router.get("/attendance/export", adminOnly, ctrl.exportAttendance); // JSON export

module.exports = router;
