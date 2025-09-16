const ctrl = require("../controllers/AttendanceController");
const router = require("express").Router();

/* ------------------------------ Attendance ------------------------------ */
router.post("/create-attendance", ctrl.createAttendance);
router.get("/list-attendance", ctrl.listAttendance);
router.get("/get-attendance-by-id/:id", ctrl.getAttendanceById);
router.patch("/update-attendance/:id", ctrl.updateAttendance);
router.delete("/delete-attendance/:id", ctrl.deleteAttendance);

router.post("/mark-manual", ctrl.markManual);
router.post("/mark-via-link/:code", ctrl.markViaLink);

/* -------------------------------- Counts -------------------------------- */
router.get("/count-by-status", ctrl.countByStatus);
router.get("/count-by-course", ctrl.countByCourse);
router.get("/count-by-student", ctrl.countByStudent);
router.get("/daily-counts", ctrl.dailyCounts);

/* -------------------------------- Filters ------------------------------- */
router.get("/list-by-method/:method", ctrl.listByMethod);
router.get("/list-late", ctrl.listLate);

/* ------------------------------- Bulk Ops ------------------------------- */
router.post("/bulk-mark", ctrl.bulkMark);
router.post("/bulk-delete", ctrl.bulkDelete);
router.post("/bulk-import", ctrl.bulkImport);
router.post("/bulk-mark-for-session", ctrl.bulkMarkForSession);
router.post("/clear-course-day", ctrl.clearCourseDay);
router.get("/export-attendance", ctrl.exportAttendance);

/* --------------------------------- Links -------------------------------- */
router.post("/create-link", ctrl.createLink);
router.get("/list-links", ctrl.listLinks);
router.get("/get-link/:id", ctrl.getLink);
router.get("/get-link-by-code/:code", ctrl.getLinkByCode);
router.patch("/update-link/:id", ctrl.updateLink);
router.delete("/delete-link/:id", ctrl.deleteLink);
router.post("/bulk-generate-links", ctrl.bulkGenerateLinks);
router.post("/deactivate-expired-links", ctrl.deactivateExpiredLinks);

/* ----------------------------- Calculations ----------------------------- */
router.get("/calc-student-course-percent", ctrl.calcStudentCoursePercent);
router.get("/calc-student-semester-percent", ctrl.calcStudentSemesterPercent);
router.get("/calc-monthly-breakdown", ctrl.calcMonthlyBreakdown);
router.get("/calc-course-coverage", ctrl.calcCourseCoverage);
router.get("/calc-streak", ctrl.calcStreak);
router.get("/calc-eligibility", ctrl.calcEligibility);
router.get("/calc-leaderboard", ctrl.calcLeaderboard);

/* ---------------------------- Notifications ----------------------------- */
router.post("/send-reminder-for-active-link", ctrl.sendReminderForActiveLink);
router.post("/notify-low-attendance", ctrl.notifyLowAttendance);
router.post("/notify-instructor-summary", ctrl.notifyInstructorSummary);

module.exports = router;
