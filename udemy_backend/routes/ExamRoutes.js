// routes/ExamRoutes.js
const router = require("express").Router();
const C = require("../controllers/ExamController");

// ---------- CRUD ----------
router.post("/create-exam", C.createExam);
router.get("/list-exams", C.listExams);
router.get("/get-exam/:id", C.getExamById);
router.patch("/update-exam/:id", C.updateExamById);
router.delete("/delete-exam/:id", C.deleteExamById);

// ---------- Counts ----------
router.get("/count-all", C.countAll);
router.get("/count-by", C.countBy);

// ---------- Search & Filter ----------
router.get("/search-exams", C.searchExams);
// examples
router.get(
  "/get-by-degree-semester-course/:degreeId/:semesterId/:courseId",
  C.getByDegreeSemesterCourse
);

router.get(
  "/get-published-by-dsc/:degreeId/:semesterId/:courseId",
  C.getPublishedByDegreeSemesterCourse
);

// ---------- Status ----------
router.get("/upcoming-exams", C.upcomingExams);
router.get("/past-exams", C.pastExams);
router.get("/exam-stats", C.stats);

// ---------- Actions ----------
router.post("/toggle-publish/:id", C.togglePublish);
router.post("/increment-attempt/:id", C.incrementAttemptCount);

module.exports = router;
