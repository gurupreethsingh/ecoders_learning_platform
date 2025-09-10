// controllers/DashboardController.js
const User = require("../models/UserModel");
const Category = require("../models/CategoryModel");
const SubCategory = require("../models/SubCategoryModel");
const Blog = require("../models/BlogModel");
const Course = require("../models/CourseModel");
const Contact = require("../models/ContactModel");
// ⬇️ FIX: destructure the models you need from NotificationModel.js
const {
  Notification: NotificationModel /*, NotificationDelivery */,
} = require("../models/NotificationModel");
const Degree = require("../models/DegreeModel");
// your file is SemisterModel; we’ll expose it as “semesters” key in the API
const Semister = require("../models/SemisterModel");
const Exam = require("../models/ExamModel");

// Optional (guard if not present)
let Quiz, Question;
try {
  Quiz = require("../models/QuizModel");
} catch {}
try {
  Question = require("../models/QuestionModel");
} catch {}

// Defaults so every key is present
const DEFAULT_COUNTS = {
  blogs: 0,
  categories: 0,
  contacts: 0,
  courses: 0,
  degrees: 0,
  exams: 0,
  instructors: 0,
  notifications: 0,
  questions: 0,
  quizzes: 0,
  semesters: 0,
  subcategories: 0,
  users: 0,
  students: 0,
};

const safeCount = async (fn) => {
  try {
    const n = await fn();
    return Number.isFinite(Number(n)) ? Number(n) : 0;
  } catch (err) {
    console.error("[dashboard-counts] count failed:", err?.message || err);
    return 0;
  }
};

exports.getDashboardCounts = async (req, res) => {
  const tasks = {
    users: () => User.countDocuments({}),
    categories: () => Category.countDocuments({}),
    subcategories: () => SubCategory.countDocuments({}),
    blogs: () => Blog.countDocuments({}),
    courses: () => Course.countDocuments({}),
    contacts: () => Contact.countDocuments({}),
    notifications: () => NotificationModel.countDocuments({}), // ⬅️ use the real model
    degrees: () => Degree.countDocuments({}),
    semesters: () => Semister.countDocuments({}), // from SemisterModel
    exams: () => Exam.countDocuments({}),
    quizzes: () => (Quiz ? Quiz.countDocuments({}) : 0),
    questions: () => (Question ? Question.countDocuments({}) : 0),
    students: () => User.countDocuments({ role: "student" }),
    instructors: () => User.countDocuments({ role: "instructor" }),
  };

  try {
    const entries = await Promise.all(
      Object.entries(tasks).map(async ([k, fn]) => [k, await safeCount(fn)])
    );
    const data = { ...DEFAULT_COUNTS };
    for (const [k, v] of entries) data[k] = v;
    res.status(200).json(data);
  } catch (err) {
    console.error("[dashboard-counts] unexpected:", err);
    res.status(200).json({ ...DEFAULT_COUNTS });
  }
};
