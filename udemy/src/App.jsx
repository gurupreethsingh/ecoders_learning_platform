import React, { useState, useEffect } from "react";
import "./App.css";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import {
  PrivateRoute,
  PublicRoute,
} from "./components/auth_components/AuthManager";

import TopArrow from "./components/common_components/TopArrow";

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

// notification pages
import AllUserNotifications from "./pages/notification_pages/AllUserNotifications";
import SingleUserNotification from "./pages/notification_pages/SingleUserNotification";

// attendance pages. 
import MarkAttendance from "./pages/attendance_pages/MarkAttendance";
import MyAttendance from "./pages/attendance_pages/MyAttendance";

// chat bot pages. 
import ChatBot from "./components/chatbot_component/ChatBot";
import AITutor from "./pages/chatbot_pages/AITutor";
import CodeGenerator from "./pages/chatbot_pages/CodeGenerator";
import CodeSummary from "./pages/chatbot_pages/CodeSummary";
import RoadmapGenerator from "./pages/chatbot_pages/RoadmapGenerator";
import DashboardGenerator from "./pages/chatbot_pages/DashboardGenerator";


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
        <div id="app-scroll" className="min-h-screen overflow-y-auto">
          <Header />
          <div id="scroll-sentinel" style={{ height: 1 }} />
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

            {/* notification pages.  */}
            <Route
              path="/my-notifications"
              element={
                <PrivateRoute
                  allowedRoles={[
                    "superadmin",
                    "student",
                    "instructor",
                    "teacher",
                    "admin",
                    "user",
                  ]}
                >
                  <PageTitle title="My Notifications">
                    <AllUserNotifications />
                  </PageTitle>
                </PrivateRoute>
              }
            />

            <Route
              path="/my-notification/:slug/:notificationId/:deliveryId"
              element={
                <PrivateRoute
                  allowedRoles={[
                    "superadmin",
                    "student",
                    "instructor",
                    "teacher",
                    "admin",
                    "user",
                  ]}
                >
                  <PageTitle title="Notification">
                    <SingleUserNotification />
                  </PageTitle>
                </PrivateRoute>
              }
            />

// in your routes file
<Route
  path="/mark-attendance"
  element={
    <PrivateRoute
      allowedRoles={["superadmin", "student", "instructor", "teacher", "admin", "user"]}
    >
      <PageTitle title="Mark Attendance">
        <MarkAttendance />
      </PageTitle>
    </PrivateRoute>
  }
/>

<Route
  path="/mark-attendance/:code"
  element={
    <PrivateRoute
      allowedRoles={["superadmin", "student", "instructor", "teacher", "admin", "user"]}
    >
      <PageTitle title="Mark Attendance">
        <MarkAttendance />
      </PageTitle>
    </PrivateRoute>
  }
/>

<Route
  path="/my-attendance"
  element={
    <PrivateRoute
      allowedRoles={["superadmin", "student", "instructor", "teacher", "admin", "user"]}
    >
      <PageTitle title="My Attendance">
        <MyAttendance />
      </PageTitle>
    </PrivateRoute>
  }
/>

{/* Optional: deep-link with a code (keep this if you need it) */}
<Route
  path="/my-attendance/:code"
  element={
    <PrivateRoute
      allowedRoles={["superadmin", "student", "instructor", "teacher", "admin", "user"]}
    >
      <PageTitle title="My Attendance">
        <MyAttendance />
      </PageTitle>
    </PrivateRoute>
  }
/>


{/* chat bot pages.  */}

<Route
  path="/ai-tutor"
  element={
    <PrivateRoute allowedRoles={[
      "superadmin","student","instructor","teacher","admin","user"
    ]}>
      <PageTitle title="AI Tutor">
        <AITutor />
      </PageTitle>
    </PrivateRoute>
  }
/>

<Route
  path="/code-generator"
  element={
    <PrivateRoute allowedRoles={[
      "superadmin","student","instructor","teacher","admin","user"
    ]}>
      <PageTitle title="Code Generator">
        <CodeGenerator />
      </PageTitle>
    </PrivateRoute>
  }
/>

<Route
  path="/code-summary"
  element={
    <PrivateRoute allowedRoles={[
      "superadmin","student","instructor","teacher","admin","user"
    ]}>
      <PageTitle title="Code Summary">
        <CodeSummary />
      </PageTitle>
    </PrivateRoute>
  }
/>

<Route
  path="/roadmap-generator"
  element={
    <PrivateRoute allowedRoles={[
      "superadmin","student","instructor","teacher","admin","user"
    ]}>
      <PageTitle title="Roadmap Generator">
        <RoadmapGenerator />
      </PageTitle>
    </PrivateRoute>
  }
/>

<Route
  path="/dashboard-generator"
  element={
    <PrivateRoute allowedRoles={[
      "superadmin","student","instructor","teacher","admin","user"
    ]}>
      <PageTitle title="Dashboard Generator">
        <DashboardGenerator />
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
        </div>

         <ChatBot />
        <TopArrow scrollTargetId="app-scroll" />
      </Router>
    </AuthProvider>
  );
}

export default App;
