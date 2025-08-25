import React from "react";
import { Link } from "react-router-dom";

const Breadcrumb = ({ pageTitle }) => {
  return (
    <nav
      className="bg-transparent px-4 py-3 text-sm font-medium text-white"
      aria-label="Breadcrumb"
    >
      <ol className="flex items-center space-x-2">
        <li>
          <Link to="/" className="hover:text-purple-600 text-purple-600">
            Ecoders
          </Link>
        </li>
        <li className="text-purple-600">|</li>
        <li className="text-purple-600">{pageTitle}</li>
      </ol>
    </nav>
  );
};

export default Breadcrumb;
