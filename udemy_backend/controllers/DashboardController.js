// controllers/DashboardController.js
const User = require("../models/UserModel");
const Category = require("../models/CategoryModel");
const SubCategory = require("../models/SubCategoryModel");
const Blog = require("../models/BlogModel");
const Course = require("../models/CourseModel");
const Contact = require("../models/ContactModel");
const { Activity } = require("../models/ActivityModel");
const StudentAdmission = require("../models/StudentAdmissionModel");

// Notification model may export a named "Notification"
const {
  Notification: NotificationModel,
} = require("../models/NotificationModel");
const Degree = require("../models/DegreeModel");
const Semister = require("../models/SemesterModel");
const Exam = require("../models/ExamModel");

let Quiz, Question;
try {
  Quiz = require("../models/QuizModel");
} catch {}
try {
  Question = require("../models/QuestionModel");
} catch {}

// ✅ Use colons in object literals (not equals)
const DEFAULT_COUNTS = {
  activities: 0,
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
  admissions: 0,
};

const safeCount = async (fn) => {
  try {
    const n = await fn();
    const v = Number(n);
    return Number.isFinite(v) ? v : 0;
  } catch (err) {
    console.error("[dashboard-counts] count failed:", err?.message || err);
    return 0;
  }
};

exports.getDashboardCounts = async (req, res) => {
  const activityCounter =
    Activity && typeof Activity.countDocuments === "function"
      ? () => Activity.countDocuments({})
      : async () => 0;
  const tasks = {
    activities: () => Activity.countDocuments({}),
    users: () => User.countDocuments({}),
    categories: () => Category.countDocuments({}),
    subcategories: () => SubCategory.countDocuments({}),
    blogs: () => Blog.countDocuments({}),
    courses: () => Course.countDocuments({}),
    contacts: () => Contact.countDocuments({}),
    notifications: () => NotificationModel.countDocuments({}),
    degrees: () => Degree.countDocuments({}),
    semesters: () => Semister.countDocuments({}), // built from SemisterModel
    exams: () => Exam.countDocuments({}),
    quizzes: () => (Quiz ? Quiz.countDocuments({}) : 0),
    questions: () => (Question ? Question.countDocuments({}) : 0),
    students: () => User.countDocuments({ role: "student" }),
    instructors: () => User.countDocuments({ role: "instructor" }),
    admissions: () => StudentAdmission.countDocuments({ isDeleted: { $ne: true } }),
  };

  try {
    const entries = await Promise.all(
      Object.entries(tasks).map(async ([k, fn]) => [k, await safeCount(fn)])
    );
    const data = { ...DEFAULT_COUNTS };
    for (const [k, v] of entries) data[k] = v;
    return res.status(200).json(data);
  } catch (err) {
    console.error("[dashboard-counts] unexpected:", err);
    return res.status(200).json({ ...DEFAULT_COUNTS });
  }
};
