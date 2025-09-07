// components/common_components/MainLayout.jsx
import React from "react";
import Header from "../header_components/Header";
import Footer from "../footer_components/Footer";
import { Routes, Route } from "react-router-dom";
import { PrivateRoute, PublicRoute } from "../auth_components/AuthManager";
import PageTitle from "./PageTitle";

// Pages
import Homepage from "../../pages/common_pages/Homepage";
import PageNotFound from "../../pages/common_pages/PageNotFound";

// contact pages
import ContactUs from "../../pages/contact_pages/ContactUs";
import AllMessages from "../../pages/contact_pages/AllMessages";
import ReplyMessage from "../../pages/contact_pages/ReplyMessage";
import AllReplies from "../../pages/contact_pages/AllReplies";
import Trash from "../../pages/contact_pages/Trash";
import Messages from "../../pages/contact_pages/Messages";

// common pages
import AboutUs from "../../pages/common_pages/AboutUs";
import Register from "../../pages/user_pages/Register";
import Login from "../../pages/user_pages/Login";
import Dashboard from "../../pages/user_pages/Dashboard";
import SuperAdminDashboard from "../../pages/superadmin_pages/SuperAdminDashboard";
import Profile from "../../pages/user_pages/Profile";
import UpdateProfile from "../../pages/user_pages/UpdateProfile";
import AllUsers from "../../pages/superadmin_pages/AllUsers";
import SingleUser from "../../pages/superadmin_pages/SingleUser";
import ForgotPassword from "../../pages/user_pages/ForgotPassword";
import ResetPassword from "../../pages/user_pages/ResetPassword";

// category pages
import AddCategory from "../../pages/category_pages/AddCategory";
import AllCategories from "../../pages/category_pages/AllCategories";
import SingleCategory from "../../pages/category_pages/SingleCategory";
import CategoryAllProducts from "../../pages/category_pages/CategoryAllProducts";

// subcategory pages
import AddSubCategory from "../../pages/subcategory_pages/AddSubcategory";
import AllSubCategories from "../../pages/subcategory_pages/AllSubCategories";
import SingleSubCategory from "../../pages/subcategory_pages/SingleSubCategory";

// blog pages
import AddBlog from "../../pages/blog_pages/AddBlog";
import AllBlogs from "../../pages/blog_pages/AllBlogs";
import SingleBlog from "../../pages/blog_pages/SingleBlog";
import UpdateBlog from "../../pages/blog_pages/UpdateBlog";

// course pages
import CreateCourse from "../../pages/course_pages/CreateCourse";
import AllCourses from "../../pages/course_pages/AllCourses";
import SingleCourse from "../../pages/course_pages/SingleCourse";
import UpdateCourse from "../../pages/course_pages/UpdateCourse";

// degree pages
import CreateDegree from "../../pages/degree_pages/CreateDegree";
import AllDegrees from "../../pages/degree_pages/AllDegrees";
import SingleDegree from "../../pages/degree_pages/SingleDegree";
import UpdateDegree from "../../pages/degree_pages/UpdateDegree";

// semister pages
import CreateSemister from "../../pages/semister_pages/CreateSemister";
import AllSemisters from "../../pages/semister_pages/AllSemisters";
import SingleSemister from "../../pages/semister_pages/SingleSemister";
import UpdateSemister from "../../pages/semister_pages/UpdateSemister";

// exam pages
import CreateExam from "../../pages/exam_pages/CreateExam";
import AllExams from "../../pages/exam_pages/AllExams";
import SingleExam from "../../pages/exam_pages/SingleExam";
import UpdateExam from "../../pages/exam_pages/UpdateExam";

// instructor pages
import AllInstructorsApplications from "../../pages/instructor_pages/AllInstructorsApplications";
import AllInstructors from "../../pages/instructor_pages/AllInstructors";
import SingleInstructor from "../../pages/instructor_pages/SingleInstructor";
import UpdateInstructor from "../../pages/instructor_pages/UpdateInstructor";
import InstructorApproval from "../../pages/instructor_pages/InstructorApproval";

// student pages
import CreateStudent from "../../pages/student_pages/CreateStudent";
import AllStudents from "../../pages/student_pages/AllStudents";

const MainLayout = () => {
  return (
    <div id="app-scroll" className="h-full overflow-y-auto">
      <Header />
      {/* Sentinel for the TopArrow observer (keep this directly under Header) */}
      <div id="scroll-sentinel" style={{ height: 1 }} />

      <main className="flex-grow py-6">
        <Routes>
          <Route
            path="/"
            element={
              <PrivateRoute>
                <PageTitle title="Home">
                  <Homepage />
                </PageTitle>
              </PrivateRoute>
            }
          />
          <Route
            path="/home"
            element={
              <PrivateRoute>
                <PageTitle title="Home">
                  <Homepage />
                </PageTitle>
              </PrivateRoute>
            }
          />
          <Route
            path="/homepage"
            element={
              <PrivateRoute>
                <PageTitle title="Home">
                  <Homepage />
                </PageTitle>
              </PrivateRoute>
            }
          />

          {/* contact pages */}
          <Route
            path="/contact-us"
            element={
              <PageTitle title="Contact Us">
                <ContactUs />
              </PageTitle>
            }
          />
          <Route
            path="/all-messages"
            element={
              <PrivateRoute allowedRoles={["superadmin"]}>
                <PageTitle title="All-messages">
                  <AllMessages />
                </PageTitle>
              </PrivateRoute>
            }
          />

          <Route
            path="/all-contacts"
            element={
              <PrivateRoute allowedRoles={["superadmin"]}>
                <PageTitle title="All-messages">
                  <AllMessages />
                </PageTitle>
              </PrivateRoute>
            }
          />
          <Route
            path="/messages"
            element={
              <PrivateRoute allowedRoles={["superadmin"]}>
                <PageTitle title="Messages">
                  <Messages />
                </PageTitle>
              </PrivateRoute>
            }
          />
          <Route
            path="/reply-message/:id"
            element={
              <PrivateRoute allowedRoles={["superadmin"]}>
                <PageTitle title="Reply-message">
                  <ReplyMessage />
                </PageTitle>
              </PrivateRoute>
            }
          />
          <Route
            path="/trash"
            element={
              <PrivateRoute allowedRoles={["superadmin"]}>
                <PageTitle title="Trash">
                  <Trash />
                </PageTitle>
              </PrivateRoute>
            }
          />
          <Route
            path="/all-replies"
            element={
              <PrivateRoute allowedRoles={["superadmin"]}>
                <PageTitle title="All-replies">
                  <AllReplies />
                </PageTitle>
              </PrivateRoute>
            }
          />

          {/* common */}
          <Route
            path="/about-us"
            element={
              <PrivateRoute>
                <PageTitle title="About Us">
                  <AboutUs />
                </PageTitle>
              </PrivateRoute>
            }
          />
          <Route
            path="/login"
            element={
              <PublicRoute>
                <PageTitle title="Login">
                  <Login />
                </PageTitle>
              </PublicRoute>
            }
          />
          <Route
            path="/register"
            element={
              <PublicRoute>
                <PageTitle title="Register">
                  <Register />
                </PageTitle>
              </PublicRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <PrivateRoute allowedRoles={["user", "superadmin"]}>
                <PageTitle title="User Dashboard">
                  <Dashboard />
                </PageTitle>
              </PrivateRoute>
            }
          />
          <Route
            path="/forgot-password"
            element={
              <PageTitle title="User Dashboard">
                <ForgotPassword />
              </PageTitle>
            }
          />
          <Route
            path="/reset-password"
            element={
              <PageTitle title="User Dashboard">
                <ResetPassword />
              </PageTitle>
            }
          />
          <Route
            path="/superadmin-dashboard"
            element={
              <PrivateRoute allowedRoles={["superadmin"]}>
                <PageTitle title="SuperAdmin Dashboard">
                  <SuperAdminDashboard />
                </PageTitle>
              </PrivateRoute>
            }
          />
          <Route
            path="/profile/:id"
            element={
              <PrivateRoute>
                <PageTitle title="Profile">
                  <Profile />
                </PageTitle>
              </PrivateRoute>
            }
          />
          <Route
            path="/update-profile/:id"
            element={
              <PrivateRoute>
                <PageTitle title="Update Profile">
                  <UpdateProfile />
                </PageTitle>
              </PrivateRoute>
            }
          />

          {/* user pages. all-users, single-user  */}
          <Route
            path="/all-users"
            element={
              <PrivateRoute allowedRoles={["superadmin"]}>
                <PageTitle title="All Users">
                  <AllUsers />
                </PageTitle>
              </PrivateRoute>
            }
          />

          <Route
            path="/single-user/:id"
            element={
              <PrivateRoute allowedRoles={["superadmin"]}>
                <PageTitle title="Single User">
                  <SingleUser />
                </PageTitle>
              </PrivateRoute>
            }
          />

          {/* categories & subcategories */}
          <Route
            path="/add-category"
            element={
              <PrivateRoute allowedRoles={["superadmin"]}>
                <PageTitle title="Add Category">
                  <AddCategory />
                </PageTitle>
              </PrivateRoute>
            }
          />
          <Route
            path="/add-sub-category"
            element={
              <PrivateRoute allowedRoles={["superadmin"]}>
                <PageTitle title="Add Sub Category">
                  <AddSubCategory />
                </PageTitle>
              </PrivateRoute>
            }
          />
          <Route
            path="/all-categories"
            element={
              <PrivateRoute allowedRoles={["superadmin"]}>
                <PageTitle title="All Categories">
                  <AllCategories />
                </PageTitle>
              </PrivateRoute>
            }
          />
          <Route
            path="/all-subcategories"
            element={
              <PrivateRoute allowedRoles={["superadmin"]}>
                <PageTitle title="All Sub Categories">
                  <AllSubCategories />
                </PageTitle>
              </PrivateRoute>
            }
          />
          <Route
            path="/single-category/:id"
            element={
              <PrivateRoute allowedRoles={["superadmin"]}>
                <PageTitle title="Single Category">
                  <SingleCategory />
                </PageTitle>
              </PrivateRoute>
            }
          />
          <Route
            path="/single-subcategory/:id"
            element={
              <PrivateRoute allowedRoles={["superadmin"]}>
                <PageTitle title="Single SubCategory">
                  <SingleSubCategory />
                </PageTitle>
              </PrivateRoute>
            }
          />
          <Route
            path="/single-category-all-products/:id"
            element={
              <PrivateRoute allowedRoles={["superadmin"]}>
                <PageTitle title="Category All Products">
                  <CategoryAllProducts />
                </PageTitle>
              </PrivateRoute>
            }
          />

          {/* blogs */}
          <Route
            path="/add-blog"
            element={
              <PrivateRoute allowedRoles={["superadmin"]}>
                <PageTitle title="Add Blog">
                  <AddBlog />
                </PageTitle>
              </PrivateRoute>
            }
          />
          <Route
            path="/all-blogs"
            element={
              <PrivateRoute allowedRoles={["superadmin"]}>
                <PageTitle title="All Blogs">
                  <AllBlogs />
                </PageTitle>
              </PrivateRoute>
            }
          />
          <Route
            path="/single-blog/:slug/:id"
            element={
              <PrivateRoute allowedRoles={["superadmin"]}>
                <PageTitle title="Single Blog">
                  <SingleBlog />
                </PageTitle>
              </PrivateRoute>
            }
          />
          <Route
            path="/update-blog/:id"
            element={
              <PrivateRoute allowedRoles={["superadmin"]}>
                <PageTitle title="Update Blog">
                  <UpdateBlog />
                </PageTitle>
              </PrivateRoute>
            }
          />

          {/* degrees */}
          <Route
            path="/create-degree"
            element={
              <PrivateRoute allowedRoles={["superadmin"]}>
                <PageTitle title="Create Degree">
                  <CreateDegree />
                </PageTitle>
              </PrivateRoute>
            }
          />
          <Route
            path="/all-degrees"
            element={
              <PrivateRoute allowedRoles={["superadmin"]}>
                <PageTitle title="All Degrees">
                  <AllDegrees />
                </PageTitle>
              </PrivateRoute>
            }
          />
          <Route
            path="/single-degree/:slug/:id"
            element={
              <PrivateRoute allowedRoles={["superadmin"]}>
                <PageTitle title="Single Degree">
                  <SingleDegree />
                </PageTitle>
              </PrivateRoute>
            }
          />
          <Route
            path="/update-degree/:slug/:id"
            element={
              <PrivateRoute allowedRoles={["superadmin"]}>
                <PageTitle title="Update Degree">
                  <UpdateDegree />
                </PageTitle>
              </PrivateRoute>
            }
          />

          {/* semisters */}
          <Route
            path="/all-semisters"
            element={
              <PrivateRoute allowedRoles={["superadmin"]}>
                <PageTitle title="All Semisters">
                  <AllSemisters />
                </PageTitle>
              </PrivateRoute>
            }
          />
          <Route
            path="/create-semister"
            element={
              <PrivateRoute allowedRoles={["superadmin"]}>
                <PageTitle title="Create Semister">
                  <CreateSemister />
                </PageTitle>
              </PrivateRoute>
            }
          />
          {/* READ BY ID (GET /api/semisters/:id)
              URL keeps a user-friendly slug first, like your Degree routes */}
          <Route
            path="/single-semister/:slug/:id"
            element={
              <PrivateRoute allowedRoles={["superadmin"]}>
                <PageTitle title="Semister Details">
                  <SingleSemister />
                </PageTitle>
              </PrivateRoute>
            }
          />
          <Route
            path="/single-semister/by-slug/:degreeId/:slug"
            element={
              <PrivateRoute allowedRoles={["superadmin"]}>
                <PageTitle title="Semister Details">
                  <SingleSemister />
                </PageTitle>
              </PrivateRoute>
            }
          />
          {/* UPDATE BY ID (PATCH /api/semisters/:id) */}
          <Route
            path="/update-semister/:slug/:id"
            element={
              <PrivateRoute allowedRoles={["superadmin"]}>
                <PageTitle title="Update Semister">
                  <UpdateSemister />
                </PageTitle>
              </PrivateRoute>
            }
          />

          {/* courses */}
          <Route
            path="/create-course"
            element={
              <PrivateRoute allowedRoles={["superadmin"]}>
                <PageTitle title="Create Course">
                  <CreateCourse />
                </PageTitle>
              </PrivateRoute>
            }
          />
          <Route
            path="/all-courses"
            element={
              <PrivateRoute allowedRoles={["superadmin"]}>
                <PageTitle title="All Courses">
                  <AllCourses />
                </PageTitle>
              </PrivateRoute>
            }
          />
          <Route
            path="/single-course/:slug/:id"
            element={
              <PrivateRoute allowedRoles={["superadmin"]}>
                <PageTitle title="Single Course Details">
                  <SingleCourse />
                </PageTitle>
              </PrivateRoute>
            }
          />
          <Route
            path="/update-course/:slug/:id"
            element={
              <PrivateRoute allowedRoles={["superadmin"]}>
                <PageTitle title="Update Course">
                  <UpdateCourse />
                </PageTitle>
              </PrivateRoute>
            }
          />

          {/* exams */}
          <Route
            path="/create-exam"
            element={
              <PrivateRoute allowedRoles={["superadmin"]}>
                <PageTitle title="Create Exam">
                  <CreateExam />
                </PageTitle>
              </PrivateRoute>
            }
          />
          <Route
            path="/all-exams"
            element={
              <PrivateRoute allowedRoles={["superadmin"]}>
                <PageTitle title="All Exams">
                  <AllExams />
                </PageTitle>
              </PrivateRoute>
            }
          />
          <Route
            path="/single-exam/:slug/:id"
            element={
              <PrivateRoute allowedRoles={["superadmin"]}>
                <PageTitle title="Single Exam Details">
                  <SingleExam />
                </PageTitle>
              </PrivateRoute>
            }
          />
          <Route
            path="/update-exam/:slug/:id"
            element={
              <PrivateRoute allowedRoles={["superadmin"]}>
                <PageTitle title="Update Exam">
                  <UpdateExam />
                </PageTitle>
              </PrivateRoute>
            }
          />

          {/* instructors */}
          <Route
            path="/all-instructors-applications"
            element={
              <PrivateRoute allowedRoles={["superadmin"]}>
                <PageTitle title="All Instructors Applications">
                  <AllInstructorsApplications />
                </PageTitle>
              </PrivateRoute>
            }
          />
          <Route
            path="/all-instructors"
            element={
              <PrivateRoute allowedRoles={["superadmin"]}>
                <PageTitle title="All Instructors">
                  <AllInstructors />
                </PageTitle>
              </PrivateRoute>
            }
          />
          {/* Single + Update Instructor routes */}
          <Route
            path="/single-instructor/:instructorId/:slug"
            element={
              <PrivateRoute allowedRoles={["superadmin"]}>
                <PageTitle title="Instructor Details">
                  <SingleInstructor />
                </PageTitle>
              </PrivateRoute>
            }
          />

          <Route
            path="/update-instructor/:slug/:id"
            element={
              <PrivateRoute allowedRoles={["superadmin"]}>
                <PageTitle title="Update Instructor">
                  <UpdateInstructor />
                </PageTitle>
              </PrivateRoute>
            }
          />
          <Route
            path="/instructor-approval"
            element={
              <PrivateRoute allowedRoles={["superadmin"]}>
                <PageTitle title="Instructor Approval">
                  <InstructorApproval />
                </PageTitle>
              </PrivateRoute>
            }
          />

          {/* students */}
          <Route
            path="/student-register"
            element={
              <PrivateRoute allowedRoles={["superadmin"]}>
                <PageTitle title="Create Student">
                  <CreateStudent />
                </PageTitle>
              </PrivateRoute>
            }
          />
          <Route
            path="/all-students"
            element={
              <PrivateRoute allowedRoles={["superadmin"]}>
                <PageTitle title="All Students">
                  <AllStudents />
                </PageTitle>
              </PrivateRoute>
            }
          />

          {/* 404s */}
          <Route
            path="/page-not-found"
            element={
              <PageTitle title="404 Not Found">
                <PageNotFound />
              </PageTitle>
            }
          />
          <Route
            path="/*"
            element={
              <PageTitle title="404 Not Found">
                <PageNotFound />
              </PageTitle>
            }
          />
        </Routes>
      </main>

      <Footer />
    </div>
  );
};

export default MainLayout;
