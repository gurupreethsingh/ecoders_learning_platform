// src/components/common_components/Header.jsx
import React, { useEffect, useMemo, useRef, useState, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FaSearch,
  FaChevronDown,
  FaBars,
  FaTimes,
  FaChevronRight,
  FaBookOpen,
  FaLayerGroup,
  FaUserCircle,
} from "react-icons/fa";
import { FiShoppingCart } from "react-icons/fi";
import { AiOutlineHeart } from "react-icons/ai";
import { IoMdNotificationsOutline } from "react-icons/io";
import axios from "axios";
import TopHeader from "./TopHeader";
import globalBackendRoute from "../../config/Config";
import { AuthContext } from "../auth_components/AuthManager";

const Header = () => {
  const navigate = useNavigate();
  const { isLoggedIn, user, logout } = useContext(AuthContext);

  const [menuOpen, setMenuOpen] = useState(false);
  const [tutorialsOpen, setTutorialsOpen] = useState(false);
  const [selectedCatId, setSelectedCatId] = useState(null);
  const [selectedSubId, setSelectedSubId] = useState(null);

  // Data
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [courses, setCourses] = useState([]);

  // UI
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const userMenuRef = useRef(null);

  // Badges (placeholders)
  const wishlistCount = 3;
  const cartCount = 2;
  const notificationCount = 5;

  // Close dropdown on outside click
  useEffect(() => {
    const onDocClick = (e) => {
      if (!userMenuRef.current) return;
      if (!userMenuRef.current.contains(e.target)) setUserDropdownOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  // Helper: fetch ALL pages of /api/list-courses (default backend limit=20)
  const fetchAllCourses = async () => {
    const limit = 200; // your backend caps at 200, perfect
    let page = 1;
    let all = [];
    // you can also add filters here if you only want visible ones:
    // const baseParams = { published: true, isArchived: false };
    const baseParams = {};
    // stop after 50 pages as a hard guard (10k rows) to avoid infinite loops
    while (page <= 50) {
      const res = await axios.get(`${globalBackendRoute}/api/list-courses`, {
        params: { page, limit, ...baseParams },
      });
      const rows = Array.isArray(res.data?.data)
        ? res.data.data
        : Array.isArray(res.data)
        ? res.data
        : [];
      all = all.concat(rows);
      // if we got less than a full page, we're done
      if (rows.length < limit) break;
      page += 1;
    }
    return all;
  };

  // Fetch categories, subcategories, courses (ALL pages)
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [catRes, subRes, allCourses] = await Promise.all([
          axios.get(`${globalBackendRoute}/api/all-categories`),
          axios.get(`${globalBackendRoute}/api/all-subcategories`),
          fetchAllCourses(),
        ]);
        if (!alive) return;

        setCategories(Array.isArray(catRes.data) ? catRes.data : []);
        setSubcategories(Array.isArray(subRes.data) ? subRes.data : []);
        setCourses(allCourses);
      } catch (err) {
        console.error("Header fetch failed:", err);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Build category -> subcategories map
  const byCategory = useMemo(() => {
    const map = new Map();
    subcategories.forEach((sub) => {
      const catRaw =
        sub?.category?._id ?? sub?.category ?? sub?.categoryId ?? "";
      const catId = String(catRaw || "");
      if (!catId) return;
      if (!map.has(catId)) map.set(catId, []);
      map.get(catId).push(sub);
    });
    return map;
  }, [subcategories]);

  // Build subcategory -> courses map (supports subcategory/subCategory and id/_id)
  const coursesBySubcategory = useMemo(() => {
    const map = new Map();
    courses.forEach((c) => {
      const subRaw =
        c?.subcategory?._id ??
        c?.subcategory ??
        c?.subCategory?._id ??
        c?.subCategory ??
        "";
      const subId = String(subRaw || "");
      if (!subId) return;
      if (!map.has(subId)) map.set(subId, []);
      map.get(subId).push(c);
    });
    map.forEach((arr) =>
      arr.sort((a, b) =>
        String(a.title || "").localeCompare(String(b.title || ""))
      )
    );
    return map;
  }, [courses]);

  // Selections
  const catSubs = selectedCatId
    ? byCategory.get(String(selectedCatId)) || []
    : [];
  const subCourses = selectedSubId
    ? coursesBySubcategory.get(String(selectedSubId)) || []
    : [];

  // User derived
  const userId = user?._id || user?.id || "guest";
  const userName = user?.name || user?.fullName || user?.firstName || "";

  // Dashboard route by role
  const dashboardRoute = useMemo(() => {
    const r = user?.role;
    const map = {
      admin: "/admin-dashboard",
      superadmin: "/superadmin-dashboard",
      student: "/student-dashboard",
      instructor: "/instructor-dashboard",
      user: "/user-dashboard",
    };
    return map[r] || "/dashboard";
  }, [user?.role]);

  // Actions
  const navigateToCourse = (course) => {
    const id = course?._id || course?.id;
    if (!id) return;
    navigate(`/user-course/${userId}/${id}`);
    setTutorialsOpen(false);
    setSelectedSubId(null);
    setSelectedCatId(null);
  };

  // HARD redirect after clearing auth to avoid any guard pushing to /login
  const handleLogout = () => {
    logout();
    window.location.replace("/home");
  };

  const goToProfile = () => {
    const id = user?._id || user?.id;
    if (!id) return;
    setUserDropdownOpen(false);
    navigate(`/profile/${id}`);
  };

  const goToDashboard = () => {
    setUserDropdownOpen(false);
    navigate(dashboardRoute);
  };

  const goToMyCourses = () => {
    if (!isLoggedIn) return navigate("/login");
    const id = user?._id || user?.id;
    navigate(`/my-courses/${id}`);
  };

  // UI helpers
  const itemBase =
    "w-full text-left px-3 py-1.5 rounded hover:bg-gray-50 flex items-center justify-between";
  const itemText =
    "truncate text-[13px] font-medium tracking-tight text-gray-800";
  const lightHint = "text-[12px] text-gray-500 px-2 py-1";

  const CategoryItem = ({ cat }) => {
    const catId = cat?._id || cat?.id;
    return (
      <button
        className={`${itemBase} ${
          String(selectedCatId) === String(catId)
            ? "bg-purple-50 text-purple-700"
            : ""
        }`}
        onMouseEnter={() => {
          setSelectedCatId(catId);
          setSelectedSubId(null);
        }}
        onFocus={() => {
          setSelectedCatId(catId);
          setSelectedSubId(null);
        }}
      >
        <span className={itemText}>{cat.category_name || "Untitled"}</span>
        <FaChevronRight className="ml-2 text-[10px] opacity-70" />
      </button>
    );
  };

  const SubcategoryItem = ({ sub }) => {
    const subId = sub?._id || sub?.id;
    return (
      <button
        className={`${itemBase} ${
          String(selectedSubId) === String(subId)
            ? "bg-indigo-50 text-indigo-700"
            : ""
        }`}
        onMouseEnter={() => setSelectedSubId(subId)}
        onFocus={() => setSelectedSubId(subId)}
      >
        <span className={itemText}>{sub.subcategory_name || "Untitled"}</span>
        <FaChevronRight className="ml-2 text-[10px] opacity-70" />
      </button>
    );
  };

  return (
    <>
      <TopHeader />

      <header className="z-50 w-full bg-white shadow">
        <div className="max-w-screen-3xl mx-auto px-4 flex items-center justify-between py-2">
          {/* Logo */}
          <div className="text-xl font-bold text-purple-700">
            <Link to="/home">Ecoders</Link>
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
              {/* Tutorials Nested Mega Menu */}
              <div
                className="relative"
                onMouseEnter={() => setTutorialsOpen(true)}
                onMouseLeave={() => {
                  setTutorialsOpen(false);
                  setSelectedCatId(null);
                  setSelectedSubId(null);
                }}
              >
                <button
                  className="flex items-center gap-1 text-sm font-semibold hover:text-purple-600"
                  onFocus={() => setTutorialsOpen(true)}
                >
                  Tutorials <FaChevronDown className="text-xs" />
                </button>

                {tutorialsOpen && (
                  <div className="absolute left-0 top-full bg-white shadow-lg rounded-md p-3 w-[780px] z-30 border">
                    <div className="grid grid-cols-3 gap-3">
                      {/* Categories */}
                      <div className="border rounded p-2">
                        <div className="flex items-center gap-2 text-[12px] font-semibold mb-1 tracking-tight text-gray-700">
                          <FaLayerGroup /> Categories
                        </div>
                        <div className="space-y-1">
                          {categories.length === 0 ? (
                            <div className={lightHint}>No categories found</div>
                          ) : (
                            categories.map((cat) => (
                              <CategoryItem
                                key={String(cat._id || cat.id)}
                                cat={cat}
                              />
                            ))
                          )}
                        </div>
                      </div>

                      {/* Subcategories */}
                      <div className="border rounded p-2">
                        <div className="flex items-center gap-2 text-[12px] font-semibold mb-1 tracking-tight text-gray-700">
                          <FaLayerGroup /> Subcategories
                        </div>
                        <div className="space-y-1">
                          {!selectedCatId ? (
                            <div className={lightHint}>Hover a category…</div>
                          ) : catSubs.length === 0 ? (
                            <div className={lightHint}>No subcategories</div>
                          ) : (
                            catSubs.map((sub) => (
                              <SubcategoryItem
                                key={String(sub._id || sub.id)}
                                sub={sub}
                              />
                            ))
                          )}
                        </div>
                      </div>

                      {/* Courses */}
                      <div className="border rounded p-2">
                        <div className="flex items-center gap-2 text-[12px] font-semibold mb-1 tracking-tight text-gray-700">
                          <FaBookOpen /> Courses
                        </div>
                        <div className="space-y-1">
                          {!selectedSubId ? (
                            <div className={lightHint}>
                              Hover a subcategory…
                            </div>
                          ) : subCourses.length === 0 ? (
                            <div className={lightHint}>
                              No courses for this subcategory
                            </div>
                          ) : (
                            subCourses.map((course) => (
                              <button
                                key={String(course._id || course.id)}
                                className="block w-full text-left px-3 py-1.5 rounded hover:bg-gray-50 text-[13px] font-medium tracking-tight text-gray-800"
                                onClick={() => navigateToCourse(course)}
                              >
                                {course.title || "Untitled Course"}
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
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
              <Link
                to="/apply-to-become-instructor"
                className="text-sm font-semibold text-gray-600 hover:text-purple-600"
              >
                Become an Instructor
              </Link>

              <button
                onClick={goToMyCourses}
                className="text-sm font-semibold text-gray-600 hover:text-purple-600"
              >
                My Courses
              </button>

              <Link
                to="/all-degrees"
                className="text-sm font-semibold text-gray-600 hover:text-purple-600"
              >
                Certification/Degree
              </Link>

              <Link
                to="/all-blogs"
                className="text-sm font-semibold text-gray-600 hover:text-purple-600"
              >
                Blogs
              </Link>

              {/* Wishlist */}
              <button
                onClick={() => navigate("/wishlist")}
                className="relative"
                aria-label="Wishlist"
              >
                <AiOutlineHeart className="text-xl hover:text-purple-600" />
                {wishlistCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full px-1.5">
                    {wishlistCount}
                  </span>
                )}
              </button>

              {/* Cart */}
              <button
                onClick={() => navigate("/cart")}
                className="relative"
                aria-label="Cart"
              >
                <FiShoppingCart className="text-xl hover:text-purple-600" />
                {cartCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full px-1.5">
                    {cartCount}
                  </span>
                )}
              </button>

              {/* Notifications */}
              <button
                onClick={() => navigate("/notifications")}
                className="relative"
                aria-label="Notifications"
              >
                <IoMdNotificationsOutline className="text-xl hover:text-purple-600" />
                {notificationCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full px-1.5">
                    {notificationCount}
                  </span>
                )}
              </button>

              {/* Login / User menu (desktop) */}
              <div className="relative" ref={userMenuRef}>
                {!isLoggedIn ? (
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => navigate("/login")}
                      className="rounded-full h-8 w-8 flex items-center justify-center"
                      title="Login"
                    >
                      <FaUserCircle className="h-6 w-6 text-purple-600" />
                    </button>
                    <Link
                      to="/login"
                      className="text-sm font-semibold text-gray-600 hover:text-purple-600"
                    >
                      Login
                    </Link>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => setUserDropdownOpen((v) => !v)}
                      className="flex items-center gap-2"
                      aria-haspopup="menu"
                      aria-expanded={userDropdownOpen}
                    >
                      <FaUserCircle className="h-8 w-8 text-purple-600" />
                      <span className="text-sm font-semibold text-gray-700 max-w-[140px] truncate">
                        {userName || "User"}
                      </span>
                      <FaChevronDown className="text-xs" />
                    </button>

                    {userDropdownOpen && (
                      <div
                        role="menu"
                        className="absolute right-0 mt-2 w-56 bg-white border rounded shadow-md z-20"
                      >
                        <button
                          onClick={goToProfile}
                          className="block w-full text-left px-4 py-2 hover:bg-gray-100 text-sm"
                          role="menuitem"
                        >
                          Profile
                        </button>
                        <button
                          onClick={goToDashboard}
                          className="block w-full text-left px-4 py-2 hover:bg-gray-100 text-sm"
                          role="menuitem"
                        >
                          Dashboard
                        </button>
                        <button
                          onClick={handleLogout}
                          className="block w-full text-left px-4 py-2 text-red-600 hover:bg-gray-100 text-sm font-semibold"
                          role="menuitem"
                        >
                          Logout
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {menuOpen && (
          <div className="md:hidden px-4 py-4 space-y-4 bg-white shadow">
            <details className="border rounded">
              <summary className="px-3 py-2 cursor-pointer font-medium">
                Tutorials
              </summary>
              <div className="p-2 space-y-2">
                {categories.map((cat) => {
                  const catId = String(cat?._id || cat?.id || "");
                  const subs = byCategory.get(catId) || [];
                  return (
                    <details key={catId} className="ml-2">
                      <summary className="px-2 py-1 cursor-pointer text-sm font-semibold">
                        {cat.category_name || "Untitled"}
                      </summary>
                      <div className="pl-3 py-1 space-y-1">
                        {subs.length === 0 && (
                          <div className="text-xs text-gray-500 px-2">
                            No subcategories
                          </div>
                        )}
                        {subs.map((sub) => {
                          const subId = String(sub?._id || sub?.id || "");
                          const cs = coursesBySubcategory.get(subId) || [];
                          return (
                            <details key={subId} className="ml-2">
                              <summary className="px-2 py-1 cursor-pointer text-sm font-semibold">
                                {sub.subcategory_name || "Untitled"}
                              </summary>
                              <div className="pl-3 py-1 space-y-1">
                                {cs.length === 0 && (
                                  <div className="text-xs text-gray-500 px-2">
                                    No courses
                                  </div>
                                )}
                                {cs.map((course) => (
                                  <button
                                    key={String(course._id || course.id)}
                                    className="block w-full text-left text-sm px-2 py-1 rounded hover:bg-gray-50 font-medium"
                                    onClick={() => {
                                      setMenuOpen(false);
                                      navigateToCourse(course);
                                    }}
                                  >
                                    {course.title || "Untitled Course"}
                                  </button>
                                ))}
                              </div>
                            </details>
                          );
                        })}
                      </div>
                    </details>
                  );
                })}
              </div>
            </details>

            <Link
              to="/apply-to-become-instructor"
              className="block text-sm text-gray-800"
            >
              Become an Instructor
            </Link>
            <button
              onClick={goToMyCourses}
              className="block text-sm text-gray-800"
            >
              My Courses
            </button>

            <div className="relative">
              <input
                type="text"
                placeholder="Search"
                className="w-full rounded-full border px-4 py-1.5 pr-10 text-sm"
              />
              <FaSearch className="absolute right-4 top-2.5 text-gray-500 text-sm" />
            </div>

            <div className="flex items-center justify-around">
              <button onClick={() => navigate("/wishlist")}>
                <AiOutlineHeart className="text-xl" />
              </button>
              <button onClick={() => navigate("/cart")}>
                <FiShoppingCart className="text-xl" />
              </button>
              <button onClick={() => navigate("/notifications")}>
                <IoMdNotificationsOutline className="text-xl" />
              </button>
              {!isLoggedIn ? (
                <button
                  onClick={() => navigate("/login")}
                  className="flex items-center gap-1 text-sm font-semibold text-purple-600 hover:text-purple-700"
                >
                  <FaUserCircle className="h-5 w-5" />
                  Login
                </button>
              ) : (
                <button
                  onClick={goToDashboard}
                  className="flex items-center gap-1 text-purple-600"
                  title="Dashboard"
                >
                  <FaUserCircle className="h-7 w-7" />
                </button>
              )}
            </div>
          </div>
        )}
      </header>
    </>
  );
};

export default Header;
