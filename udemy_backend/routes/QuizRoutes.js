// routes/QuizRoutes.js
const express = require("express");
const router = express.Router();
const QuizCtrl = require("../controllers/QuizController");

// Optional auth/role middleware placeholders:
// const { requireAuth, requireAdmin } = require("../middleware/auth");

// CREATE
router.post(
  "/create-quiz",
  /* requireAuth, requireAdmin, */ QuizCtrl.createQuiz
);

// READ
router.get("/get-quiz/:id", /* requireAuth, */ QuizCtrl.getQuizById);

// LIST (filters + sort + pagination)
router.get("/list-quizzes", /* requireAuth, */ QuizCtrl.listQuizzes);

// UPDATE
router.patch(
  "/update-quiz/:id",
  /* requireAuth, requireAdmin, */ QuizCtrl.updateQuiz
);

// DELETE
router.delete(
  "/delete-quiz/:id",
  /* requireAuth, requireAdmin, */ QuizCtrl.deleteQuiz
);

// PUBLISH / UNPUBLISH
router.patch(
  "/publish-quiz/:id",
  /* requireAuth, requireAdmin, */ QuizCtrl.publishQuiz
);
router.patch(
  "/unpublish-quiz/:id",
  /* requireAuth, requireAdmin, */ QuizCtrl.unpublishQuiz
);

// DUPLICATE
router.post(
  "/duplicate-quiz/:id",
  /* requireAuth, requireAdmin, */ QuizCtrl.duplicateQuiz
);

// COUNTS
router.get(
  "/count-quizzes",
  /* requireAuth, requireAdmin, */ QuizCtrl.countQuizzes
);
router.get(
  "/count-quizzes-by-course/:courseId",
  /* requireAuth, requireAdmin, */ QuizCtrl.countByCourse
);
router.get(
  "/count-quizzes-by-difficulty",
  /* requireAuth, requireAdmin, */ QuizCtrl.countByDifficulty
);
router.get(
  "/count-published-quizzes",
  /* requireAuth, requireAdmin, */ QuizCtrl.countPublished
);
router.get(
  "/count-paid-quizzes",
  /* requireAuth, requireAdmin, */ QuizCtrl.countPaid
);

// CONVENIENCE LISTS
router.get("/active-quizzes", /* requireAuth, */ QuizCtrl.listActiveQuizzes);
router.get(
  "/upcoming-quizzes",
  /* requireAuth, */ QuizCtrl.listUpcomingQuizzes
);
router.get(
  "/list-quizzes-by-course/:courseId",
  /* requireAuth, */ QuizCtrl.listQuizzesByCourse
);

// BULK OPS
router.patch(
  "/bulk-publish",
  /* requireAuth, requireAdmin, */ QuizCtrl.bulkPublish
);
router.delete(
  "/bulk-delete",
  /* requireAuth, requireAdmin, */ QuizCtrl.bulkDelete
);

// IMPORT / EXPORT (JSON)
router.get(
  "/export-quizzes",
  /* requireAuth, requireAdmin, */ QuizCtrl.exportQuizzes
);
router.post(
  "/import-quizzes",
  /* requireAuth, requireAdmin, */ QuizCtrl.importQuizzes
);

module.exports = router;
