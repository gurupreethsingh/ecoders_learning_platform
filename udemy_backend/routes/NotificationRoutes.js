const express = require("express");
const router = express.Router();
const {
  createNotification,
  getAllNotifications,
  getNotificationById,
  updateNotification,
  markAsSeen,
  replyToNotification,
  deleteNotification,
  countNotifications,
} = require("../controllers/NotificationController");

// ✅ Create a new notification
router.post("/create-notification", createNotification);

// ✅ Get all notifications (supports ?recipientId=...&seen=true/false&companyId=...)
router.get("/get-all-notifications", getAllNotifications);

// ✅ Get single notification by ID
router.get("/get-notification-by-id/:id", getNotificationById);

// ✅ Update a notification (Admin/system use)
router.put("/update-notification/:id", updateNotification);

// ✅ Mark notification as seen
router.put("/mark-seen/:id", markAsSeen);

// ✅ Reply to a notification
router.put("/reply-notification/:id", replyToNotification);

// ✅ Delete notification
router.delete("/delete-notification/:id", deleteNotification);

// ✅ Count total / seen / unseen notifications
router.get("/count-notifications/all", countNotifications);

module.exports = router;
