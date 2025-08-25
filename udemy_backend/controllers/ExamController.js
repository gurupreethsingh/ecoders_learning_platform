const Exam = require("../models/ExamModel");

// Create a new exam
const addExam = async (req, res) => {
  try {
    const exam = new Exam(req.body);
    await exam.save();
    res.status(201).json({
      message: "Exam created successfully",
      exam,
    });
  } catch (error) {
    console.error("Error adding exam:", error);
    res.status(500).json({ message: "Error adding exam" });
  }
};

// Get all exams
const getAllExams = async (req, res) => {
  try {
    const exams = await Exam.find()
      .populate("course", "title")
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json(exams);
  } catch (error) {
    console.error("Error fetching exams:", error);
    res.status(500).json({ message: "Error fetching exams" });
  }
};

// Get exam by ID
const getExamById = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id)
      .populate("course", "title description")
      .populate("createdBy", "name email");

    if (!exam) {
      return res.status(404).json({ message: "Exam not found" });
    }
    res.status(200).json(exam);
  } catch (error) {
    console.error("Error fetching exam:", error);
    res.status(500).json({ message: "Error fetching exam" });
  }
};

// Update exam
const updateExam = async (req, res) => {
  try {
    const exam = await Exam.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!exam) {
      return res.status(404).json({ message: "Exam not found" });
    }
    res.status(200).json({
      message: "Exam updated successfully",
      exam,
    });
  } catch (error) {
    console.error("Error updating exam:", error);
    res.status(500).json({ message: "Error updating exam" });
  }
};

// Delete exam
const deleteExam = async (req, res) => {
  try {
    const exam = await Exam.findByIdAndDelete(req.params.id);
    if (!exam) {
      return res.status(404).json({ message: "Exam not found" });
    }
    res.status(200).json({ message: "Exam deleted successfully" });
  } catch (error) {
    console.error("Error deleting exam:", error);
    res.status(500).json({ message: "Error deleting exam" });
  }
};

/* ---------- COUNT FUNCTIONS ---------- */
const countAllExams = async (req, res) => {
  try {
    const totalExams = await Exam.countDocuments();
    res.status(200).json({ totalExams });
  } catch (error) {
    console.error("Error counting exams:", error);
    res.status(500).json({ message: "Error counting exams" });
  }
};

const countExamsByCourse = async (req, res) => {
  try {
    const totalExams = await Exam.countDocuments({ course: req.params.courseId });
    res.status(200).json({ courseId: req.params.courseId, totalExams });
  } catch (error) {
    console.error("Error counting exams by course:", error);
    res.status(500).json({ message: "Error counting exams by course" });
  }
};

const countExamsByInstructor = async (req, res) => {
  try {
    const totalExams = await Exam.countDocuments({ createdBy: req.params.instructorId });
    res.status(200).json({ instructorId: req.params.instructorId, totalExams });
  } catch (error) {
    console.error("Error counting exams by instructor:", error);
    res.status(500).json({ message: "Error counting exams by instructor" });
  }
};

const countPublishedExams = async (req, res) => {
  try {
    const published = await Exam.countDocuments({ isPublished: true });
    const unpublished = await Exam.countDocuments({ isPublished: false });
    res.status(200).json({ published, unpublished });
  } catch (error) {
    console.error("Error counting published exams:", error);
    res.status(500).json({ message: "Error counting published exams" });
  }
};

const countPaidFreeExams = async (req, res) => {
  try {
    const paid = await Exam.countDocuments({ isPaid: true });
    const free = await Exam.countDocuments({ isPaid: false });
    res.status(200).json({ paid, free });
  } catch (error) {
    console.error("Error counting paid/free exams:", error);
    res.status(500).json({ message: "Error counting paid/free exams" });
  }
};

/* ---------- FILTER FUNCTIONS ---------- */
const getExamsByCourse = async (req, res) => {
  try {
    const exams = await Exam.find({ course: req.params.courseId }).populate("course", "title");
    res.status(200).json(exams);
  } catch (error) {
    console.error("Error fetching exams by course:", error);
    res.status(500).json({ message: "Error fetching exams by course" });
  }
};

const getExamsByInstructor = async (req, res) => {
  try {
    const exams = await Exam.find({ createdBy: req.params.instructorId })
      .populate("course", "title")
      .populate("createdBy", "name");
    res.status(200).json(exams);
  } catch (error) {
    console.error("Error fetching exams by instructor:", error);
    res.status(500).json({ message: "Error fetching exams by instructor" });
  }
};

const getPublishedExams = async (req, res) => {
  try {
    const exams = await Exam.find({ isPublished: true }).populate("course", "title");
    res.status(200).json(exams);
  } catch (error) {
    console.error("Error fetching published exams:", error);
    res.status(500).json({ message: "Error fetching published exams" });
  }
};

const getFreeExams = async (req, res) => {
  try {
    const exams = await Exam.find({ isPaid: false }).populate("course", "title");
    res.status(200).json(exams);
  } catch (error) {
    console.error("Error fetching free exams:", error);
    res.status(500).json({ message: "Error fetching free exams" });
  }
};

module.exports = {
  addExam,
  getAllExams,
  getExamById,
  updateExam,
  deleteExam,
  countAllExams,
  countExamsByCourse,
  countExamsByInstructor,
  countPublishedExams,
  countPaidFreeExams,
  getExamsByCourse,
  getExamsByInstructor,
  getPublishedExams,
  getFreeExams,
};
