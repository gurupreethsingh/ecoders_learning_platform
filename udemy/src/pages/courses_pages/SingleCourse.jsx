import React from "react";
import Breadcrumb from "../../components/common_components/Breadcrumb";
import Course from "../../components/course_components/Course";

const SingleCourse = () => {
  // If Breadcrumb can't receive course title from <Course/>,
  // leave as-is or change Breadcrumb to read from location.
  return (
    <div>
      <div className="singlecourse_header_section">
        <Breadcrumb pageTitle="Course" />
        <Course />
      </div>
    </div>
  );
};

export default SingleCourse;
