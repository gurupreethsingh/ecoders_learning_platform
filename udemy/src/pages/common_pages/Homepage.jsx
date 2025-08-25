import React from "react";
import Breadcrumb from "../../components/common_components/Breadcrumb";
import AllCategories from "../../components/category_components/AllCategories";

const Homepage = () => {
  return (
    <div>
      <div className="homepage_header_section">
        <Breadcrumb pageTitle="Home" />
        <AllCategories />
      </div>
    </div>
  );
};

export default Homepage;
