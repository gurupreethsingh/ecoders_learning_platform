import React, { useState } from "react";
import { FaSearch, FaChevronDown, FaBars, FaTimes } from "react-icons/fa";
import { FiShoppingCart } from "react-icons/fi";
import { AiOutlineHeart } from "react-icons/ai";
import { IoMdNotificationsOutline } from "react-icons/io";
import TopHeader from "./TopHeader";

const Header = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [courseDropdownOpen, setCourseDropdownOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const userInitials = "JS";
  const wishlistCount = 3;
  const cartCount = 2;
  const notificationCount = 5;

  return (
    <>
      <TopHeader />

      <header className=" z-50 w-full bg-white shadow">
        <div className="max-w-screen-3xl mx-auto px-4 flex items-center justify-between py-2">
          {/* Logo */}
          <div className="text-xl font-bold text-purple-700">
            <a href="/home">Ecoders</a>
          </div>

          {/* Hamburger */}
          <div className="md:hidden">
            <button onClick={() => setMenuOpen(!menuOpen)}>
              {menuOpen ? (
                <FaTimes className="text-2xl" />
              ) : (
                <FaBars className="text-2xl" />
              )}
            </button>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex flex-1 justify-between items-center ml-10">
            {/* Left Group */}
            <div className="flex items-center gap-4">
              {/* Tutorials Dropdown */}
              <div
                className="relative"
                onMouseEnter={() => setCourseDropdownOpen(true)}
                onMouseLeave={() => setCourseDropdownOpen(false)}
              >
                <button className="flex items-center gap-1 text-sm font-medium hover:text-purple-600">
                  Tutorials <FaChevronDown className="text-xs" />
                </button>
                {courseDropdownOpen && (
                  <div className="absolute left-0 top-full bg-white shadow-md rounded-md p-3 w-48 z-10">
                    <ul className="space-y-1">
                      <li>
                        <a href="#" className="hover:text-purple-600">
                          React
                        </a>
                      </li>
                      <li>
                        <a href="#" className="hover:text-purple-600">
                          Node.js
                        </a>
                      </li>
                      <li>
                        <a href="#" className="hover:text-purple-600">
                          Python
                        </a>
                      </li>
                      <li>
                        <a href="#" className="hover:text-purple-600">
                          Java
                        </a>
                      </li>
                    </ul>
                  </div>
                )}
              </div>

              {/* Search */}
              <div className="relative w-80">
                <input
                  type="text"
                  placeholder="Search for Any Course"
                  className="w-full rounded-full border px-4 py-1.5 pr-10 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                />
                <FaSearch className="absolute right-4 top-2.5 text-gray-500 text-sm" />
              </div>
            </div>

            {/* Right Group */}
            <div className="flex items-center gap-4">
              <a
                href="#"
                className="text-sm font-semibold text-gray-600 hover:text-purple-600"
              >
                Become an Instructor
              </a>
              <a
                href="#"
                className="text-sm font-semibold  text-gray-600 hover:text-purple-600"
              >
                My Courses
              </a>
              <a
                href="/all-degrees"
                className="text-sm font-semibold  text-gray-600 hover:text-purple-600"
              >
                Certification/Degree
              </a>
              <a
                href="/all-blogs"
                className="text-sm font-semibold  text-gray-600 hover:text-purple-600"
              >
                Blogs
              </a>

              {/* Wishlist */}
              <div className="relative">
                <AiOutlineHeart className="text-xl hover:text-purple-600" />
                {wishlistCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full px-1.5">
                    {wishlistCount}
                  </span>
                )}
              </div>

              {/* Cart */}
              <div className="relative">
                <FiShoppingCart className="text-xl hover:text-purple-600" />
                {cartCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full px-1.5">
                    {cartCount}
                  </span>
                )}
              </div>

              {/* Notifications */}
              <div className="relative">
                <IoMdNotificationsOutline className="text-xl hover:text-purple-600" />
                {notificationCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full px-1.5">
                    {notificationCount}
                  </span>
                )}
              </div>

              {/* User Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-2"
                >
                  <div className="bg-purple-600 text-white rounded-full h-8 w-8 flex items-center justify-center uppercase text-sm">
                    {userInitials}
                  </div>
                  <FaChevronDown className="text-xs" />
                </button>
                {userDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white border rounded shadow-md z-10">
                    <a href="#" className="block px-4 py-2 hover:bg-gray-100">
                      Profile
                    </a>
                    <a href="#" className="block px-4 py-2 hover:bg-gray-100">
                      Settings
                    </a>
                    <a
                      href="#"
                      className="block px-4 py-2 text-red-600 hover:bg-gray-100"
                    >
                      Logout
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {menuOpen && (
          <div className="md:hidden px-4 py-4 space-y-4 bg-white shadow">
            <a href="#" className="block text-sm text-gray-800">
              Tutorials
            </a>
            <a href="#" className="block text-sm text-gray-800">
              Become an Instructor
            </a>
            <a href="#" className="block text-sm text-gray-800">
              My Courses
            </a>
            <div className="relative">
              <input
                type="text"
                placeholder="Search"
                className="w-full rounded-full border px-4 py-1.5 pr-10 text-sm"
              />
              <FaSearch className="absolute right-4 top-2.5 text-gray-500 text-sm" />
            </div>
            <div className="flex items-center justify-around">
              <AiOutlineHeart className="text-xl" />
              <FiShoppingCart className="text-xl" />
              <IoMdNotificationsOutline className="text-xl" />
              <div className="bg-purple-600 text-white rounded-full h-8 w-8 flex items-center justify-center text-sm">
                {userInitials}
              </div>
            </div>
          </div>
        )}
      </header>
    </>
  );
};

export default Header;
