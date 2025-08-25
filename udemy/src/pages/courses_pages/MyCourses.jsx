import React from "react";
import Breadcrumb from "../../components/common_components/Breadcrumb";
import AllOptedCourses from "../../components/course_components/AllOptedCourses";

const MyCourses = () => {
  return (
    <div>
      <div className="allcourses_header_section">
        <Breadcrumb pageTitle="My Courses" />
        <AllOptedCourses />
      </div>
    </div>
  );
};

export default MyCourses;
