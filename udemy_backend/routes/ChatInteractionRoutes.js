// routes/ChatInteractionRoutes.js
// Map function names -> kebab-case routes (e.g., startInteraction => /start-interaction)

const express = require("express");
const router = express.Router();

const ctrl = require("../controllers/ChatbotInteractionController");

/* ----------------------------- Create / Update ---------------------------- */
// Log question + response together
router.post("/log-interaction", ctrl.logInteraction);

// Create question-only record (returns _id); attach response later
router.post("/start-interaction", ctrl.startInteraction);

// Attach or update AI response by interaction id
router.post("/attach-response/:id", ctrl.attachResponse);

/* --------------------------------- Read ----------------------------------- */
// Get single interaction by id
router.get("/get-by-id/:id", ctrl.getById);

// List interactions with filters/sort/paging
router.get("/list", ctrl.list);

// Full-text search over question/response
router.get("/text-search", ctrl.textSearch);

/* ------------------------------ Analytics --------------------------------- */
// Counts by response.status
router.get("/count-by-status", ctrl.countByStatus);

// Daily counts (askedAt/respondedAt) with optional ?tz=Asia/Kolkata
router.get("/count-daily", ctrl.countDaily);

// Distribution by meta.channel
router.get("/count-by-channel", ctrl.countByChannel);

// Average & percentile response times
router.get("/avg-response-time", ctrl.avgResponseTime);

// Top repeated questions
router.get("/top-questions", ctrl.topQuestions);

/* ----------------------- Feedback / Moderation Ops ------------------------ */
// Rate interaction (1..5) and optional thumb/comment
router.post("/rate-interaction/:id", ctrl.rateInteraction);

// Mark resolved
router.post("/mark-resolved/:id", ctrl.markResolved);

// Escalate to a human (escalatedTo, escalationNotes)
router.post("/escalate/:id", ctrl.escalate);

/* ------------------------------ Bulk Actions ------------------------------ */
router.post("/bulk-update-status", ctrl.bulkUpdateStatus);
router.post("/bulk-set-resolved", ctrl.bulkSetResolved);
router.post("/bulk-delete", ctrl.bulkDelete);

/* -------------------------------- Export ---------------------------------- */
// CSV export (supports ?fields=...&limit=... and all list filters)
router.get("/export-csv", ctrl.exportCSV);

module.exports = router;

/* Usage (in your main server file, e.g., app.js / index.js):
   const chatRoutes = require("./routes/ChatInteractionRoutes");
   app.use("/api/chat-interactions", chatRoutes);
*/
