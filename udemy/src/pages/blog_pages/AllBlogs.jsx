import React from "react";
import Breadcrumb from "../../components/common_components/Breadcrumb";
import Blogs from "../../components/blog_components/Blogs";

const AllBlogs = () => {
  return (
    <div>
      <div className="blog_header_section">
        <Breadcrumb pageTitle="Blogs" />
        <Blogs />
      </div>
    </div>
  );
};

export default AllBlogs;
