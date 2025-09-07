// 1. Import all libraries
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");
const dotenv = require("dotenv");
const path = require("path");

// 2. Load environment variables
dotenv.config();

// 3. Route imports
const addressRoutes = require("./routes/AddressRoutes");
const attendanceRoutes = require("./routes/AttendanceRoutes");
const blogRoutes = require("./routes/BlogRoutes");
const cartRoutes = require("./routes/cartRoutes");
const categoryRoutes = require("./routes/CategoryRoutes");
const contactRoutes = require("./routes/ContactRoutes");
const courseRoutes = require("./routes/CourseRoutes");
const examRoutes = require("./routes/ExamRoutes.js");
const notificationRoutes = require("./routes/NotificationRoutes");
const orderRoutes = require("./routes/OrderRoutes");
const subCategoryRoutes = require("./routes/SubCategoryRoutes");
const subscriptionRoutes = require("./routes/SubscriptionRoutes");
const userRoutes = require("./routes/UserRoutes");
const wishlistRoutes = require("./routes/WishlistRoutes");
const dashboardRoutes = require("./routes/DashboardRoutes");
const degreeRoutes = require("./routes/DegreeRoutes");
const semisterRoutes = require("./routes/SemisterRoutes");
const QuizRoutes = require("./routes/QuizRoutes.js");
const questionRoutes = require("./routes/QuestionRoutes");
const instructorRoutes = require("./routes/InstructorRoutes");

// 4. Initialize Express
const app = express();

// 5. Middlewares
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
      "http://localhost:5175",
      "http://localhost:5176",
    ],
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Authorization, Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
});

// 6. Register routes
app.use("/api", addressRoutes);
app.use("/api", attendanceRoutes);
app.use("/api", blogRoutes);
app.use("/api", cartRoutes);
app.use("/api", categoryRoutes);
app.use("/api", contactRoutes);
app.use("/api", courseRoutes);
app.use("/api", dashboardRoutes);
app.use("/api", degreeRoutes);
app.use("/api", examRoutes);
app.use("/api", notificationRoutes);
app.use("/api", orderRoutes);
app.use("/api", subCategoryRoutes);
app.use("/api", subscriptionRoutes);
app.use("/api", userRoutes);
app.use("/api", wishlistRoutes);
app.use("/api", semisterRoutes);
app.use("/api", questionRoutes);
app.use("/api", QuizRoutes);
app.use("/api/instructors", instructorRoutes);

// 7. Connect to MongoDB using .env
const DATABASE_URI = process.env.DATABASE;
mongoose
  .connect(DATABASE_URI)
  .then(() => {
    console.log("✅ Connected to MongoDB.");
  })
  .catch((err) => {
    console.error("MongoDB connection failed:", err);
  });

// 8. Start server
const PORT = process.env.PORT || 3011;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
