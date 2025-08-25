import React from "react";

const CustomeLink = ({ linkAddress, linkName }) => {
  const isExternal = linkAddress.startsWith("http");

  return (
    <a
      href={linkAddress}
      className="text-sm font-bold hover:text-indigo-600 transition-colors"
      target={isExternal ? "_blank" : "_self"}
      rel={isExternal ? "noopener noreferrer" : ""}
    >
      {linkName}
    </a>
  );
};

export default CustomeLink;
