const Notification = require("../models/NotificationModel");

// ✅ CREATE a new notification
exports.createNotification = async (req, res) => {
  try {
    const {
      title,
      message,
      type,
      recipientId,
      senderId,
      priority,
      isActionRequired,
      actionLink,
      relatedCourse,
      relatedAssignment,
      relatedProject,
      tags,
      companyId,
      expiresAt,
    } = req.body;

    const newNotification = new Notification({
      title,
      message,
      type,
      recipientId,
      senderId,
      priority,
      isActionRequired,
      actionLink,
      relatedCourse,
      relatedAssignment,
      relatedProject,
      tags,
      companyId,
      expiresAt,
    });

    const savedNotification = await newNotification.save();
    res.status(201).json(savedNotification);
  } catch (error) {
    res.status(400).json({ error: "Failed to create notification", details: error.message });
  }
};

// ✅ GET ALL notifications (with optional filters)
exports.getAllNotifications = async (req, res) => {
  try {
    const filters = {};

    if (req.query.recipientId) filters.recipientId = req.query.recipientId;
    if (req.query.companyId) filters.companyId = req.query.companyId;
    if (req.query.seen) filters.seen = req.query.seen === "true";
    if (req.query.type) filters.type = req.query.type;

    const notifications = await Notification.find(filters)
      .sort({ createdAt: -1 })
      .populate("recipientId", "name email role")
      .populate("senderId", "name email role")
      .populate("relatedCourse", "title")
      .populate("relatedAssignment", "title")
      .populate("relatedProject", "name");

    res.status(200).json(notifications);
  } catch (error) {
    res.status(500).json({ error: "Failed to get notifications", details: error.message });
  }
};

// ✅ GET a single notification by ID
exports.getNotificationById = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id)
      .populate("recipientId", "name email role")
      .populate("senderId", "name email role")
      .populate("relatedCourse", "title")
      .populate("relatedAssignment", "title")
      .populate("relatedProject", "name");

    if (!notification) {
      return res.status(404).json({ error: "Notification not found" });
    }

    res.status(200).json(notification);
  } catch (error) {
    res.status(500).json({ error: "Failed to get notification", details: error.message });
  }
};

// ✅ UPDATE a notification (for admin/system use)
exports.updateNotification = async (req, res) => {
  try {
    const {
      title,
      message,
      type,
      recipientId,
      senderId,
      priority,
      isActionRequired,
      actionLink,
      relatedCourse,
      relatedAssignment,
      relatedProject,
      tags,
      companyId,
      expiresAt,
    } = req.body;

    const updated = await Notification.findByIdAndUpdate(
      req.params.id,
      {
        title,
        message,
        type,
        recipientId,
        senderId,
        priority,
        isActionRequired,
        actionLink,
        relatedCourse,
        relatedAssignment,
        relatedProject,
        tags,
        companyId,
        expiresAt,
      },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ error: "Notification not found" });
    }

    res.status(200).json(updated);
  } catch (error) {
    res.status(400).json({ error: "Failed to update notification", details: error.message });
  }
};

// ✅ MARK as seen
exports.markAsSeen = async (req, res) => {
  try {
    const updated = await Notification.findByIdAndUpdate(
      req.params.id,
      { seen: true, seenAt: new Date() },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ error: "Notification not found" });
    }

    res.status(200).json(updated);
  } catch (error) {
    res.status(500).json({ error: "Failed to mark as seen", details: error.message });
  }
};

// ✅ REPLY to a notification
exports.replyToNotification = async (req, res) => {
  try {
    const { replyMessage } = req.body;

    const updated = await Notification.findByIdAndUpdate(
      req.params.id,
      {
        replied: true,
        replyMessage,
        repliedAt: new Date(),
      },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ error: "Notification not found" });
    }

    res.status(200).json(updated);
  } catch (error) {
    res.status(500).json({ error: "Failed to reply to notification", details: error.message });
  }
};

// ✅ DELETE notification
exports.deleteNotification = async (req, res) => {
  try {
    const deleted = await Notification.findByIdAndDelete(req.params.id);

    if (!deleted) {
      return res.status(404).json({ error: "Notification not found" });
    }

    res.status(200).json({ message: "Notification deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete notification", details: error.message });
  }
};

// ✅ COUNT notifications (total, seen, unseen)
exports.countNotifications = async (req, res) => {
  try {
    const total = await Notification.countDocuments();
    const seen = await Notification.countDocuments({ seen: true });
    const unseen = await Notification.countDocuments({ seen: false });

    res.status(200).json({ total, seen, unseen });
  } catch (error) {
    res.status(500).json({ error: "Failed to count notifications", details: error.message });
  }
};
