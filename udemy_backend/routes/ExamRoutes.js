const express = require("express");
const router = express.Router();

const ExamController = require("../controllers/ExamController"); 

/* -------------------- CRUD ROUTES -------------------- */
// Create a new exam
router.post("/create-exam", ExamController.addExam);

// Get all exams (supports pagination, search, filter)
router.get("/get-all-exams", ExamController.getAllExams);

// Get a single exam by ID
router.get("/get-exam/:id", ExamController.getExamById);

// Update an exam
router.put("/update-exam/:id", ExamController.updateExam);

// Delete an exam
router.delete("/delete-exam/:id", ExamController.deleteExam);

/* -------------------- COUNT ROUTES -------------------- */
// Count all exams
router.get("/count-all-exams", ExamController.countAllExams);

// Count exams by course
router.get("/count-exams-by-course/:courseId", ExamController.countExamsByCourse);

// Count exams by instructor
router.get("/count-exams-by-instructor/:instructorId", ExamController. countExamsByInstructor);

// Count published and unpublished exams
router.get("/count-published-exams", ExamController.countPublishedExams);

// Count paid and free exams
router.get("/count-paid-free-exams", ExamController.countPaidFreeExams);

/* -------------------- FILTER / GET BY ATTRIBUTE -------------------- */
// Get exams by course
router.get("/get-exams-by-course/:courseId", ExamController.getExamsByCourse);

// Get exams by instructor
router.get("/get-exams-by-instructor/:instructorId", ExamController.getExamsByInstructor);

// Get all published exams
router.get("/get-published-exams", ExamController.getPublishedExams);

// Get all free exams
router.get("/get-free-exams", ExamController.getFreeExams);

module.exports = router;
