// const User = require("../models/UserModel");
// const Product = require("../models/ProductModel");
// const Category = require("../models/CategoryModel");
// const SubCategory = require("../models/SubCategoryModel");
// const Blog = require("../models/BlogModel");
// const Course = require("../models/CourseModel");
// const Order = require("../models/OrderModel");
// const Contact = require("../models/ContactModel");
// const Attendance = require("../models/AttendanceModel");
// const Wishlist = require("../models/WishlistModel");
// const Notification = require("../models/NotificationModel");
// const Address = require("../models/AddressModel");
// const Subscription = require("../models/SubscriptionModel");
// const Cart = require("../models/CartModel");

// // 🧠 Add your models here:
// const collections = {
//   users: User,
//   products: Product,
//   categories: Category,
//   subcategories: SubCategory,
//   blogs: Blog,
//   courses: Course,
//   orders: Order,
//   contacts: Contact,
//   attendances: Attendance,
//   wishlists: Wishlist,
//   notifications: Notification,
//   addresses: Address,
//   subscriptions: Subscription,
//   carts: Cart,
// };

// exports.getDashboardCounts = async (req, res) => {
//   try {
//     const counts = {};

//     // Loop through each model and count
//     for (const [key, model] of Object.entries(collections)) {
//       counts[key] = await model.countDocuments();
//     }

//     res.status(200).json(counts);
//   } catch (error) {
//     res.status(500).json({
//       error: "Failed to fetch dashboard counts",
//       details: error.message,
//     });
//   }
// };
//

//

//

// controllers/DashboardController.js
const User = require("../models/UserModel");
const Product = require("../models/ProductModel");
const Category = require("../models/CategoryModel");
const SubCategory = require("../models/SubCategoryModel");
const Blog = require("../models/BlogModel");
const Course = require("../models/CourseModel");
const Order = require("../models/OrderModel");
const Contact = require("../models/ContactModel");
const Attendance = require("../models/AttendanceModel");
const Wishlist = require("../models/WishlistModel");
const Notification = require("../models/NotificationModel");
const Address = require("../models/AddressModel");
const Subscription = require("../models/SubscriptionModel");
const Cart = require("../models/CartModel");

// ADD THESE
const Degree = require("../models/DegreeModel");
const Semister = require("../models/SemisterModel");
const Exam = require("../models/ExamModel");

const collections = {
  users: User,
  products: Product,
  categories: Category,
  subcategories: SubCategory,
  blogs: Blog,
  exams: Exam,
  courses: Course,
  orders: Order,
  contacts: Contact,
  attendances: Attendance,
  wishlists: Wishlist,
  notifications: Notification,
  addresses: Address,
  subscriptions: Subscription,
  carts: Cart,

  // ADD THESE TWO KEYS
  degrees: Degree,
  semisters: Semister,
};

exports.getDashboardCounts = async (req, res) => {
  try {
    const entries = Object.entries(collections);
    const results = await Promise.all(
      entries.map(([_, model]) => model.countDocuments())
    );

    const counts = {};
    entries.forEach(([key], i) => {
      counts[key] = results[i];
    });

    // Optional: separate instructors count for your dashboard
    counts.instructors = await User.countDocuments({ role: "instructor" });

    res.status(200).json(counts);
  } catch (error) {
    res.status(500).json({
      error: "Failed to fetch dashboard counts",
      details: error.message,
    });
  }
};
