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
// contact page.
import ContactUs from "../../pages/contact_pages/ContactUs";
import AllMessages from "../../pages/contact_pages/AllMessages";
import ReplyMessage from "../../pages/contact_pages/ReplyMessage";
import AllReplies from "../../pages/contact_pages/AllReplies";
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
// category pages.
import AddCategory from "../../pages/category_pages/AddCategory";
import AllCategories from "../../pages/category_pages/AllCategories";
import SingleCategory from "../../pages/category_pages/SingleCategory";
import CategoryAllProducts from "../../pages/category_pages/CategoryAllProducts";
// subcategory pages.
import AddSubCategory from "../../pages/subcategory_pages/AddSubcategory";
// all subcategory pages.
import AllSubCategories from "../../pages/subcategory_pages/AllSubCategories";
import SingleSubCategory from "../../pages/subcategory_pages/SingleSubCategory";

// blog pages.
import AddBlog from "../../pages/blog_pages/AddBlog";
import AllBlogs from "../../pages/blog_pages/AllBlogs";
import SingleBlog from "../../pages/blog_pages/SingleBlog";
import UpdateBlog from "../../pages/blog_pages/UpdateBlog";

// course routes. pages.
import CreateCourse from "../../pages/course_pages/CreateCourse";
import AllCourses from "../../pages/course_pages/AllCourses";
// defree routes, pages.
import CreateDegree from "../../pages/degree_pages/CreateDegree";
import AllDegrees from "../../pages/degree_pages/AllDegrees";
import SingleDegree from "../../pages/degree_pages/SingleDegree";
import UpdateDegree from "../../pages/degree_pages/UpdateDegree";
// semister routes, pages.
import CreateSemister from "../../pages/semister_pages/CreateSemister";
import AllSemisters from "../../pages/semister_pages/AllSemisters";
import SingleSemister from "../../pages/semister_pages/SingleSemister";
import UpdateSemister from "../../pages/semister_pages/UpdateSemister";
import SingleCourse from "../../pages/course_pages/SingleCourse";
import UpdateCourse from "../../pages/course_pages/UpdateCourse";

// exam routes / pages.
import CreateExam from "../../pages/exam_pages/CreateExam";
import AllExams from "../../pages/exam_pages/AllExams";
import SingleExam from "../../pages/exam_pages/SingleExam";
import UpdateExam from "../../pages/exam_pages/UpdateExam";

const MainLayout = () => {
  return (
    <div className="min-h-screen text-gray-900">
      <Header />
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
            path="/all-replies"
            element={
              <PrivateRoute allowedRoles={["superadmin"]}>
                <PageTitle title="All-replies">
                  <AllReplies />
                </PageTitle>
              </PrivateRoute>
            }
          />

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

          {/* category routes.  */}
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

          {/* blog routes.  */}
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

          {/* Degree pages.  */}
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

          {/* LIST (GET /api/semisters) */}
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

          {/* CREATE (POST /api/semisters) */}
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

          {/* course pages.  */}
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

          {/* exam routes.  */}
          {/* course pages.  */}
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
