// routes/QuestionRoutes.js
const express = require("express");
const Q = require("../controllers/QuestionController");
const router = express.Router();

/**
 * CRUD
 */
router.post("/create-question", Q.createQuestion);
router.put("/replace-question/:id", Q.replaceQuestion);
router.post("/bulk-create-questions", Q.bulkCreateQuestions);
router.post("/bulk-update-questions", Q.bulkUpdateQuestions);
router.post("/bulk-set-section", Q.bulkSetSection);
router.post("/bulk-set-marks", Q.bulkSetMarks);

router.get("/list-questions", Q.listQuestions);
router.get("/count-questions", Q.countQuestions);
router.get("/get-question/:id", Q.getQuestion);
router.patch("/update-question/:id", Q.updateQuestion);
router.delete("/delete-question/:id", Q.deleteQuestion);
router.post("/bulk-delete-questions", Q.bulkDeleteQuestions);

/**
 * Toggles / status / attachments / duplicate
 */
router.post("/toggle-active/:id", Q.toggleActive);
router.post("/set-status/:id", Q.setStatus);
router.post("/bulk-set-status", Q.bulkSetStatus);
router.post("/set-attachments/:id", Q.setAttachments);
router.post("/duplicate-question/:id", Q.duplicateQuestion);

/**
 * Exam associations
 */
router.post("/add-existing-to-exam/:examId", Q.addExistingToExam);
router.post("/remove-from-exam-and-delete/:examId", Q.removeFromExamAndDelete);
router.post("/detach-from-exam/:examId", Q.detachFromExam);
router.post("/reorder-within-exam", Q.reorderWithinExam);
router.post("/move-questions-to-exam", Q.moveQuestionsToExam);
router.post("/move-up-in-exam", Q.moveUpInExam);
router.post("/move-down-in-exam", Q.moveDownInExam);
router.get("/exam-stats/:examId", Q.examStats);

/**
 * Quiz associations
 */
router.post("/add-existing-to-quiz/:quizId", Q.addExistingToQuiz);
router.post("/remove-from-quiz-and-delete/:quizId", Q.removeFromQuizAndDelete);
router.post("/detach-from-quiz/:quizId", Q.detachFromQuiz);
router.post("/reorder-within-quiz", Q.reorderWithinQuiz);
router.post("/move-questions-to-quiz", Q.moveQuestionsToQuiz);
router.post("/move-up-in-quiz", Q.moveUpInQuiz);
router.post("/move-down-in-quiz", Q.moveDownInQuiz);
router.get("/quiz-stats/:quizId", Q.quizStats);

/**
 * Utilities
 */
router.get("/random-sample", Q.randomSample);

module.exports = router;
