const express = require("express");
const router = express.Router();
const {
  createAttendance,
  getAllAttendance,
  getAttendanceById,
  updateAttendance,
  reviewAttendance,
  deleteAttendance,
  countAttendance,
} = require("../controllers/AttendanceController");

// ✅ Create attendance
router.post("/create-attendance", createAttendance);

// ✅ Get all attendance (filters: ?user=...&date=...&status=...)
router.get("/get-all-attendance", getAllAttendance);

// ✅ Get single attendance
router.get("/get-attendance-by-id/:id", getAttendanceById);

// ✅ Update attendance
router.put("/update-attendance/:id", updateAttendance);

// ✅ Review attendance (approve/reject)
router.put("/review-attendance/:id", reviewAttendance);

// ✅ Delete attendance
router.delete("/delete-attendance/:id", deleteAttendance);

// ✅ Count attendance stats
router.get("/count-attendance", countAttendance);

module.exports = router;
