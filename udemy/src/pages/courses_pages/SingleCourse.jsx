import React from "react";
import Breadcrumb from "../../components/common_components/Breadcrumb";
import Course from "../../components/course_components/Course";

const SingleCourse = () => {
  return (
    <div>
      <div className="singlecourse_header_section">
        <Breadcrumb pageTitle="Single Course" />
        <Course />
      </div>
    </div>
  );
};

export default SingleCourse;
