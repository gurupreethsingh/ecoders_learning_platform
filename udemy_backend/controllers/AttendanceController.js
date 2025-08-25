const Attendance = require("../models/AttendanceModel");

// ✅ Create attendance (by user)
exports.createAttendance = async (req, res) => {
  try {
    const {
      user,
      date,
      loginTime,
      logoutTime,
      totalHours,
      enteredHours,
    } = req.body;

    const newAttendance = new Attendance({
      user,
      date,
      loginTime,
      logoutTime,
      totalHours,
      enteredHours,
    });

    const saved = await newAttendance.save();
    res.status(201).json(saved);
  } catch (error) {
    res.status(400).json({ error: "Failed to create attendance", details: error.message });
  }
};

// ✅ Get all attendance records (optional filters: user, date, status)
exports.getAllAttendance = async (req, res) => {
  try {
    const filters = {};
    if (req.query.user) filters.user = req.query.user;
    if (req.query.date) filters.date = req.query.date;
    if (req.query.status) filters.status = req.query.status;

    const attendance = await Attendance.find(filters)
      .populate("user", "name email role")
      .populate("reviewedBy", "name email role")
      .sort({ createdAt: -1 });

    res.status(200).json(attendance);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch attendance", details: error.message });
  }
};

// ✅ Get single attendance by ID
exports.getAttendanceById = async (req, res) => {
  try {
    const attendance = await Attendance.findById(req.params.id)
      .populate("user", "name email role")
      .populate("reviewedBy", "name email role");

    if (!attendance) {
      return res.status(404).json({ error: "Attendance record not found" });
    }

    res.status(200).json(attendance);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch attendance", details: error.message });
  }
};

// ✅ Update attendance (general update)
exports.updateAttendance = async (req, res) => {
  try {
    const updated = await Attendance.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });

    if (!updated) {
      return res.status(404).json({ error: "Attendance not found" });
    }

    res.status(200).json(updated);
  } catch (error) {
    res.status(400).json({ error: "Failed to update attendance", details: error.message });
  }
};

// ✅ Approve or Reject attendance (by admin/reviewer)
exports.reviewAttendance = async (req, res) => {
  try {
    const { status, approvedHours, remarks, reviewedBy } = req.body;

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ error: "Invalid status. Must be 'approved' or 'rejected'." });
    }

    const updated = await Attendance.findByIdAndUpdate(
      req.params.id,
      {
        status,
        approvedHours,
        remarks,
        reviewedBy,
      },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ error: "Attendance not found" });
    }

    res.status(200).json(updated);
  } catch (error) {
    res.status(500).json({ error: "Failed to review attendance", details: error.message });
  }
};

// ✅ Delete attendance
exports.deleteAttendance = async (req, res) => {
  try {
    const deleted = await Attendance.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: "Attendance not found" });
    }

    res.status(200).json({ message: "Attendance deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete attendance", details: error.message });
  }
};

// ✅ Count attendance
exports.countAttendance = async (req, res) => {
  try {
    const total = await Attendance.countDocuments();
    const pending = await Attendance.countDocuments({ status: "pending" });
    const approved = await Attendance.countDocuments({ status: "approved" });
    const rejected = await Attendance.countDocuments({ status: "rejected" });

    res.status(200).json({ total, pending, approved, rejected });
  } catch (error) {
    res.status(500).json({ error: "Failed to count attendance", details: error.message });
  }
};
