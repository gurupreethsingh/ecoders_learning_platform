// routes/questionRoutes.js
const express = require("express");
const ctrl = require("../controllers/QuestionController");
// const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

/**
 * Create
 */
router.post("/create-question", /*requireAuth,*/ ctrl.createQuestion);
router.post(
  "/bulk-create-questions",
  /*requireAuth,*/ ctrl.bulkCreateQuestions
);

/**
 * Read
 */
router.get("/list-questions", ctrl.listQuestions);
router.get("/count-questions", ctrl.countQuestions);
router.get("/get-question/:id", ctrl.getQuestion);

/**
 * Update
 */
router.patch("/update-question/:id", /*requireAuth,*/ ctrl.updateQuestion);
router.post("/duplicate-question/:id", /*requireAuth,*/ ctrl.duplicateQuestion);

/**
 * Delete
 */
router.delete("/delete-question/:id", /*requireAuth,*/ ctrl.deleteQuestion);
router.post(
  "/bulk-delete-questions",
  /*requireAuth,*/ ctrl.bulkDeleteQuestions
);

/**
 * Exam operations
 */
router.post(
  "/exams/:examId/add-existing-questions",
  /*requireAuth,*/ ctrl.addExistingToExam
);
router.post(
  "/exams/:examId/remove-questions",
  /*requireAuth,*/ ctrl.removeFromExamAndDelete
);
router.post(
  "/move-questions-to-exam",
  /*requireAuth,*/ ctrl.moveQuestionsToExam
);
router.post("/reorder-questions", /*requireAuth,*/ ctrl.reorderWithinExam);

/**
 * Flags / status
 */
router.post("/toggle-question-active/:id", /*requireAuth,*/ ctrl.toggleActive);
router.post("/set-question-status/:id", /*requireAuth,*/ ctrl.setStatus);
router.post("/bulk-set-question-status", /*requireAuth,*/ ctrl.bulkSetStatus);

/**
 * Stats / utility
 */
router.get("/exams/:examId/question-stats", ctrl.examStats);
router.get("/random-sample-questions", ctrl.randomSample);

/**
 * Media helper
 */
router.post(
  "/set-question-attachments/:id",
  /*requireAuth,*/ ctrl.setAttachments
);

module.exports = router;
