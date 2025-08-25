import React, { useState, useEffect } from "react";
import "./App.css";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Header from "./components/header_components/Header";
import Footer from "./components/footer_components/Footer";
import Homepage from "./pages/common_pages/Homepage";
import AllBlogs from "./pages/blog_pages/AllBlogs";
import SingleBlog from "./pages/blog_pages/SingleBlog";
import MyCourses from "./pages/courses_pages/MyCourses";
import SingleCourse from "./pages/courses_pages/SingleCourse";
import DummyDashboard from "./pages/dummy_pages/DummyDashboard";
import AllDegrees from "./pages/degree_pages/AllDegrees";
import SingleDegree from "./pages/degree_pages/SingleDegree";

const PageTitle = ({ title, children }) => {
  useEffect(() => {
    document.title = title ? `${title} | ECODERS` : "ECODERS";
  }, [title]);

  return children;
};

function App() {
  return (
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
      </Routes>
      <Footer />
    </Router>
  );
}

export default App;
