const ContactModel = require("../models/ContactModel");
const nodemailer = require("nodemailer");

// Function to send a reply notification email
const sendReplyEmail = (userEmail, userName, originalMessage, replyContent) => {
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: process.env.EMAIL,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  const mailOptions = {
    from: process.env.EMAIL,
    to: userEmail,
    subject: "New Reply to Your Message",
    text: `Dear ${userName},\n\nWe have responded to your message: "${originalMessage}".\n\nReply from our team:\n"${replyContent}"\n\nThank you for reaching out to us.\n\nBest regards,\nEcoders Team`,
  };

  transporter.sendMail(mailOptions, (err, info) => {
    if (err) {
      console.error("Error sending reply email:", err);
      return;
    }
    console.log("Reply email sent successfully:", info.response);
  });
};

// Controller to add a contact message
exports.addContactMessage = async (req, res) => {
  // Change made here
  try {
    const { firstName, lastName, email, phone, message_text, agreeToLicense } =
      req.body;

    if (!email || !firstName || !lastName || !message_text) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const newContactMessage = new ContactModel({
      firstName,
      lastName,
      email,
      phone,
      message_text,
      agreeToLicense,
    });

    await newContactMessage.save();
    res
      .status(201)
      .json({ message: "Contact message successfully submitted!" });
  } catch (error) {
    console.error("Error saving contact message:", error);
    res.status(500).json({
      error: "An error occurred while submitting the contact message.",
    });
  }
};

// Get all messages
exports.getAllMessages = async (req, res) => {
  try {
    const messages = await ContactModel.find().sort({ createdAt: -1 }).lean();
    res.status(200).json(messages);
  } catch (error) {
    console.error("Error retrieving messages:", error.message);
    res
      .status(500)
      .json({ error: "An error occurred while fetching messages." });
  }
};

// Controller to get a single message by ID
exports.getMessageById = async (req, res) => {
  try {
    const message = await ContactModel.findById(req.params.id);
    if (!message) return res.status(404).json({ error: "Message not found" });
    res.status(200).json(message);
  } catch (error) {
    console.error("Error retrieving message:", error);
    res
      .status(500)
      .json({ error: "An error occurred while retrieving the message." });
  }
};

// controllers/ContactController.js
exports.addReplyToMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const msgDoc = await ContactModel.findById(id);
    if (!msgDoc) return res.status(404).json({ error: "Message not found" });

    const bodyMsg = (req.body.message || "").trim();
    if (!bodyMsg) return res.status(400).json({ error: "Reply message is required" });

    // Frontend doesn't send name/email — provide safe fallbacks:
    const replyName  = (req.body.name  || "Support").trim();
    const replyEmail = (req.body.email || msgDoc.email || "").trim();

    const newReply = {
      name: replyName,
      email: replyEmail,
      message: bodyMsg,
      timestamp: new Date(),
    };

    msgDoc.replies.push(newReply);
    msgDoc.isRead = true;
    await msgDoc.save();

    // fire-and-forget email (optional)
    try {
      sendReplyEmail(msgDoc.email, msgDoc.firstName || "there", msgDoc.message_text || "", newReply.message);
    } catch (e) {
      console.error("sendReplyEmail failed:", e?.message || e);
    }

    // Return the updated message so your UI can refresh the thread
    return res.status(200).json(msgDoc);
  } catch (error) {
    console.error("Error adding reply:", error);
    return res.status(500).json({ error: "An error occurred while adding the reply." });
  }
};


// Controller to get the count of unread messages
exports.getUnreadMessagesCount = async (req, res) => {
  try {
    const unreadCount = await ContactModel.countDocuments({ isRead: false });
    res.json({ unreadCount });
  } catch (error) {
    console.error("Error fetching unread messages count:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// Controller to mark a message as read
exports.markMessageAsRead = async (req, res) => {
  try {
    const { messageId } = req.body;

    if (!messageId) {
      return res.status(400).json({ error: "Message ID is required" });
    }

    const result = await ContactModel.updateOne(
      { _id: messageId },
      { $set: { isRead: true } }
    );

    if (result.nModified === 0) {
      return res
        .status(404)
        .json({ error: "Message not found or already marked as read" });
    }

    res.status(200).json({ success: true, message: "Message marked as read" });
  } catch (error) {
    console.error("Error marking message as read:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Controller to get the count of all messages (read and unread)
exports.getMessagesCount = async (req, res) => {
  try {
    // Get the count of all messages
    const totalMessagesCount = await ContactModel.countDocuments();

    // Get the count of unread messages
    const unreadMessagesCount = await ContactModel.countDocuments({
      isRead: false,
    });

    // Get the count of read messages
    const readMessagesCount = totalMessagesCount - unreadMessagesCount;

    res.status(200).json({
      totalMessages: totalMessagesCount,
      unreadMessages: unreadMessagesCount,
      readMessages: readMessagesCount,
    });
  } catch (error) {
    console.error("Error fetching message counts:", error);
    res.status(500).json({ error: "An error occurred while fetching counts." });
  }
};

// --- TRASH / SOFT DELETE FEATURES ---

// Move one message to trash (soft delete)
exports.moveMessageToTrash = async (req, res) => {
  try {
    const { id } = req.params;
    // allow unknown fields by using strict:false
    const result = await ContactModel.findByIdAndUpdate(
      id,
      { $set: { isTrashed: true, trashedAt: new Date() } },
      { new: true, strict: false, lean: true }
    );
    if (!result) return res.status(404).json({ error: "Message not found" });
    return res
      .status(200)
      .json({ success: true, message: "Moved to trash", result });
  } catch (error) {
    console.error("moveMessageToTrash error:", error);
    return res.status(500).json({ error: "Server error" });
  }
};

// Get trashed messages (auto-purge older than 30 days first)
exports.getTrashedMessages = async (req, res) => {
  try {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    // purge silently
    await ContactModel.deleteMany(
      { isTrashed: true, trashedAt: { $lt: cutoff } },
      { strict: false }
    );

    const trashed = await ContactModel.find({ isTrashed: true })
      .sort({ trashedAt: -1 })
      .lean();
    return res.status(200).json(trashed);
  } catch (error) {
    console.error("getTrashedMessages error:", error);
    return res.status(500).json({ error: "Server error" });
  }
};

// Explicit purge endpoint: delete all trashed older than 30 days
exports.purgeOldTrashed = async (req, res) => {
  try {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const result = await ContactModel.deleteMany(
      { isTrashed: true, trashedAt: { $lt: cutoff } },
      { strict: false }
    );
    return res
      .status(200)
      .json({ success: true, deletedCount: result.deletedCount || 0 });
  } catch (error) {
    console.error("purgeOldTrashed error:", error);
    return res.status(500).json({ error: "Server error" });
  }
};

// Permanently delete a single message
exports.deleteMessagePermanently = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await ContactModel.deleteOne({ _id: id });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Message not found" });
    }
    return res
      .status(200)
      .json({ success: true, message: "Deleted permanently" });
  } catch (error) {
    console.error("deleteMessagePermanently error:", error);
    return res.status(500).json({ error: "Server error" });
  }
};

// Restore a trashed message back to active list
exports.restoreMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await ContactModel.findByIdAndUpdate(
      id,
      { $set: { isTrashed: false }, $unset: { trashedAt: "" } },
      { new: true, strict: false, lean: true }
    );
    if (!result) return res.status(404).json({ error: "Message not found" });
    return res
      .status(200)
      .json({ success: true, message: "Message restored", result });
  } catch (error) {
    console.error("restoreMessage error:", error);
    return res.status(500).json({ error: "Server error" });
  }
};
