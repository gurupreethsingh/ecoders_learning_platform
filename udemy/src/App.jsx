import React, { useState, useEffect } from "react";
import "./App.css";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import {
  PrivateRoute,
  PublicRoute,
} from "./components/auth_components/AuthManager";

import { AuthProvider } from "./components/auth_components/AuthManager";

import Header from "./components/header_components/Header";
import Footer from "./components/footer_components/Footer";
import Homepage from "./pages/common_pages/Homepage";
import PageNotFound from "./pages/common_pages/PageNotFound";

import AllBlogs from "./pages/blog_pages/AllBlogs";
import SingleBlog from "./pages/blog_pages/SingleBlog";
import MyCourses from "./pages/courses_pages/MyCourses";
import SingleCourse from "./pages/courses_pages/SingleCourse";
import DummyDashboard from "./pages/dummy_pages/DummyDashboard";
import AllDegrees from "./pages/degree_pages/AllDegrees";
import SingleDegree from "./pages/degree_pages/SingleDegree";

// user pages.
import Register from "./pages/user_pages/Register";
import Login from "./pages/user_pages/Login";
import Dashboard from "./pages/user_pages/Dashboard";
import Profile from "./pages/user_pages/Profile";
import UpdateProfile from "./pages/user_pages/UpdateProfile";
import ForgotPassword from "./pages/user_pages/ForgotPassword";
import ResetPassword from "./pages/user_pages/ResetPassword";

// instructor pages.
import ApplyToBecomeInstructor from "./pages/instructor_pages/ApplyToBecomeInstructor";
import InstructorDashBoard from "./pages/instructor_pages/InstructorDashboard";

// student pages.
import StudentDashboard from "./pages/student_pages/StudentDashboard";

const PageTitle = ({ title, children }) => {
  useEffect(() => {
    document.title = title ? `${title} | ECODERS` : "ECODERS";
  }, [title]);

  return children;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Header />
        <Routes>
          <Route
            path="/"
            element={
              <PageTitle title="Home">
                <Homepage />
              </PageTitle>
            }
          />
          <Route
            path="/home"
            element={
              <PageTitle title="Home">
                <Homepage />
              </PageTitle>
            }
          />
          <Route
            path="/homepage"
            element={
              <PageTitle title="Home">
                <Homepage />
              </PageTitle>
            }
          />
          <Route
            path="/all-blogs"
            element={
              <PageTitle title="All Blogs">
                <AllBlogs />
              </PageTitle>
            }
          />

          <Route
            path="/single-blog/:slug/:id"
            element={
              <PageTitle title="Blog Details">
                <SingleBlog />
              </PageTitle>
            }
          />

          <Route
            path="/my-courses/:userid"
            element={
              <PageTitle title="My Courses">
                <MyCourses />
              </PageTitle>
            }
          />

          <Route
            path="/user-course/:userid/:courseid"
            element={
              <PageTitle title="Course">
                <SingleCourse />
              </PageTitle>
            }
          />

          <Route
            path="/dummy-dashboard"
            element={
              <PageTitle title="Dummy Dashboard">
                <DummyDashboard />
              </PageTitle>
            }
          />

          <Route
            path="/all-degrees"
            element={
              <PageTitle title="All Degrees">
                <AllDegrees />
              </PageTitle>
            }
          />

          <Route
            path="/single-degree/:slug/:id"
            element={
              <PageTitle title="Degree Details">
                <SingleDegree />
              </PageTitle>
            }
          />

          {/* /**instructor pages route.   */}
          <Route
            path="/apply-to-become-instructor"
            element={
              <PageTitle title="Apply To Become Instructor">
                <ApplyToBecomeInstructor />
              </PageTitle>
            }
          />

          <Route
            path="/instructor-dashboard"
            element={
              <PrivateRoute allowedRoles={["superadmin", "instructor"]}>
                <PageTitle title="Instructor Dashboard">
                  <InstructorDashBoard />
                </PageTitle>
              </PrivateRoute>
            }
          />

          {/* user pages.  */}

          <Route
            path="/login"
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            }
          />

          <Route
            path="/register"
            element={
              <PageTitle title="Register">
                <Register />
              </PageTitle>
            }
          />

          <Route
            path="/user-dashboard"
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
              <PageTitle title="Forgot Password">
                <ForgotPassword />
              </PageTitle>
            }
          />

          <Route
            path="/reset-password"
            element={
              <PageTitle title="Reset Password">
                <ResetPassword />
              </PageTitle>
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

          {/* student dashbaord.  */}
          <Route
            path="/student-dashboard"
            element={
              <PrivateRoute>
                <PageTitle title="Student Dashboard">
                  <StudentDashboard />
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
        <Footer />
      </Router>
    </AuthProvider>
  );
}

export default App;
