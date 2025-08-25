import React from "react";
import Blog from "../../components/blog_components/Blog";
import Breadcrumb from "../../components/common_components/Breadcrumb";

const SingleBlog = () => {
  return (
    <div>
      <div className="singleblog_header_section">
        <Breadcrumb pageTitle="Single Blog" />
        <Blog />
      </div>
    </div>
  );
};

export default SingleBlog;
