// // src/components/common_components/Header.jsx
// import React, { useEffect, useMemo, useRef, useState, useContext } from "react";
// import { Link, useNavigate } from "react-router-dom";
// import {
//   FaSearch,
//   FaChevronDown,
//   FaBars,
//   FaTimes,
//   FaChevronRight,
//   FaBookOpen,
//   FaLayerGroup,
//   FaUserCircle,
// } from "react-icons/fa";
// import { FiShoppingCart } from "react-icons/fi";
// import { AiOutlineHeart } from "react-icons/ai";
// import { IoMdNotificationsOutline } from "react-icons/io";
// import axios from "axios";
// import TopHeader from "./TopHeader";
// import globalBackendRoute from "../../config/Config";
// import { AuthContext } from "../auth_components/AuthManager";

// /* ---------------- helpers ---------------- */
// const sid = (v) => (v == null ? "" : String(v));

// const normalizeCourseSubId = (c) =>
//   sid(
//     c?.subcategory?._id ??
//       c?.subcategory ??
//       c?.subCategory?._id ??
//       c?.subCategory ??
//       ""
//   );

// const normalizeCourseCatId = (c) =>
//   sid(c?.category?._id ?? c?.category ?? c?.categoryId ?? "");

// const arr = (payload) => {
//   const d = payload?.data;
//   if (Array.isArray(payload)) return payload;
//   if (Array.isArray(d)) return d;
//   if (Array.isArray(d?.data)) return d.data;
//   if (Array.isArray(d?.items)) return d.items;
//   if (Array.isArray(payload?.items)) return payload.items;
//   if (Array.isArray(payload?.results)) return payload.results;
//   return [];
// };
// /* ----------------------------------------- */

// const Header = () => {
//   const navigate = useNavigate();
//   const { isLoggedIn, user, logout } = useContext(AuthContext);

//   // top-level UI
//   const [menuOpen, setMenuOpen] = useState(false);
//   const [tutorialsOpen, setTutorialsOpen] = useState(false);
//   const [selectedCatId, setSelectedCatId] = useState(null);
//   const [selectedSubId, setSelectedSubId] = useState(null);

//   // data
//   const [categories, setCategories] = useState([]);
//   const [courses, setCourses] = useState([]);

//   // subcategories per category (cache: catId -> [subs])
//   const [subCache, setSubCache] = useState(new Map());
//   const [subsLoading, setSubsLoading] = useState(false);

//   // user dropdown popup
//   const [userDropdownOpen, setUserDropdownOpen] = useState(false);
//   const userMenuRef = useRef(null);

//   // badges (placeholder)
//   const wishlistCount = 3;
//   const cartCount = 2;
//   const notificationCount = 5;

//   // close user dropdown on outside click
//   useEffect(() => {
//     const onDocClick = (e) => {
//       if (!userMenuRef.current) return;
//       if (!userMenuRef.current.contains(e.target)) setUserDropdownOpen(false);
//     };
//     document.addEventListener("mousedown", onDocClick);
//     return () => document.removeEventListener("mousedown", onDocClick);
//   }, []);

//   // fetch categories + all courses (paged)
//   const fetchAllCourses = async () => {
//     const limit = 200; // backend cap
//     let page = 1;
//     let all = [];
//     while (page <= 50) {
//       const res = await axios.get(`${globalBackendRoute}/api/list-courses`, {
//         params: { page, limit },
//       });
//       const rows = arr(res);
//       all = all.concat(rows);
//       if (rows.length < limit) break;
//       page += 1;
//     }
//     return all;
//   };

//   useEffect(() => {
//     let alive = true;
//     (async () => {
//       try {
//         const [catRes, allCourses] = await Promise.all([
//           axios.get(`${globalBackendRoute}/api/all-categories`),
//           fetchAllCourses(),
//         ]);
//         if (!alive) return;
//         setCategories(arr(catRes));
//         setCourses(allCourses);
//       } catch (err) {
//         console.error("Header initial fetch failed:", err);
//       }
//     })();
//     return () => {
//       alive = false;
//     };
//   }, []);

//   // when hovering/focusing a category, fetch its subcategories (if not cached)
//   const ensureSubsForCategory = async (catId) => {
//     if (!catId) return;
//     if (subCache.has(catId)) return; // already cached
//     try {
//       setSubsLoading(true);
//       // support both param names for compatibility
//       const url = `${globalBackendRoute}/api/get-subcategories-by-category?category=${encodeURIComponent(
//         catId
//       )}&categoryId=${encodeURIComponent(catId)}`;
//       const res = await axios.get(url);
//       const subs = arr(res);
//       setSubCache((prev) => {
//         const next = new Map(prev);
//         next.set(catId, subs);
//         return next;
//       });
//     } catch (err) {
//       console.error("Load subcategories failed:", err);
//       setSubCache((prev) => {
//         const next = new Map(prev);
//         next.set(catId, []); // cache empty to avoid refetch storms
//         return next;
//       });
//     } finally {
//       setSubsLoading(false);
//     }
//   };

//   // groups
//   const coursesBySub = useMemo(() => {
//     const map = new Map();
//     courses.forEach((c) => {
//       const sId = normalizeCourseSubId(c);
//       if (!sId) return; // course without subCategory is not shown in header
//       if (!map.has(sId)) map.set(sId, []);
//       map.get(sId).push(c);
//     });
//     map.forEach((list) =>
//       list.sort((a, b) => sid(a.title).localeCompare(sid(b.title)))
//     );
//     return map;
//   }, [courses]);

//   // selected category -> subcategories (ONLY real ones we fetched)
//   const catSubs = selectedCatId ? subCache.get(selectedCatId) || [] : [];

//   // selected subcategory -> courses
//   const subCourses = selectedSubId
//     ? coursesBySub.get(String(selectedSubId)) || []
//     : [];

//   // user info
//   const userId = user?._id || user?.id || "guest";
//   const userName = user?.name || user?.fullName || user?.firstName || "";

//   // dashboard route by role
//   const dashboardRoute = useMemo(() => {
//     const r = user?.role;
//     const map = {
//       admin: "/admin-dashboard",
//       superadmin: "/superadmin-dashboard",
//       student: "/student-dashboard",
//       instructor: "/instructor-dashboard",
//       user: "/user-dashboard",
//     };
//     return map[r] || "/dashboard";
//   }, [user?.role]);

//   // actions
//   const navigateToCourse = (course) => {
//     const id = course?._id || course?.id;
//     if (!id) return;
//     navigate(`/user-course/${userId}/${id}`);
//     setTutorialsOpen(false);
//     setSelectedSubId(null);
//     setSelectedCatId(null);
//   };

//   const handleLogout = () => {
//     logout();
//     window.location.replace("/home");
//   };

//   const goToProfile = () => {
//     const id = user?._id || user?.id;
//     if (!id) return;
//     setUserDropdownOpen(false);
//     navigate(`/profile/${id}`);
//   };

//   const goToDashboard = () => {
//     setUserDropdownOpen(false);
//     navigate(dashboardRoute);
//   };

//   const goToMyCourses = () => {
//     if (!isLoggedIn) return navigate("/login");
//     const id = user?._id || user?.id;
//     navigate(`/my-courses/${id}`);
//   };

//   // UI helpers
//   const itemBase =
//     "w-full text-left px-3 py-1.5 rounded hover:bg-gray-50 flex items-center justify-between";
//   const itemText =
//     "truncate text-[13px] font-medium tracking-tight text-gray-800";
//   const lightHint = "text-[12px] text-gray-500 px-2 py-1";

//   const CategoryItem = ({ cat }) => {
//     const catId = cat?._id || cat?.id;
//     return (
//       <button
//         className={`${itemBase} ${
//           String(selectedCatId) === String(catId)
//             ? "bg-purple-50 text-purple-700"
//             : ""
//         }`}
//         onMouseEnter={async () => {
//           setSelectedCatId(catId);
//           setSelectedSubId(null);
//           await ensureSubsForCategory(String(catId));
//         }}
//         onFocus={async () => {
//           setSelectedCatId(catId);
//           setSelectedSubId(null);
//           await ensureSubsForCategory(String(catId));
//         }}
//       >
//         <span className={itemText}>
//           {cat.category_name || cat.name || "Untitled"}
//         </span>
//         <FaChevronRight className="ml-2 text-[10px] opacity-70" />
//       </button>
//     );
//   };

//   const SubcategoryItem = ({ sub }) => {
//     const subId = sub?._id || sub?.id;
//     const label =
//       sub?.subcategory_name || sub?.name || sub?.title || "Untitled";
//     return (
//       <button
//         className={`${itemBase} ${
//           String(selectedSubId) === String(subId)
//             ? "bg-indigo-50 text-indigo-700"
//             : ""
//         }`}
//         onMouseEnter={() => setSelectedSubId(subId)}
//         onFocus={() => setSelectedSubId(subId)}
//       >
//         <span className={itemText}>{label}</span>
//         <FaChevronRight className="ml-2 text-[10px] opacity-70" />
//       </button>
//     );
//   };

//   return (
//     <>
//       <TopHeader />

//       <header className="z-50 w-full bg-white shadow">
//         <div className="max-w-screen-3xl mx-auto px-4 flex items-center justify-between py-2">
//           {/* Logo */}
//           <div className="text-xl font-bold text-purple-700">
//             <Link to="/home">Ecoders</Link>
//           </div>

//           {/* Hamburger */}
//           <div className="md:hidden">
//             <button onClick={() => setMenuOpen(!menuOpen)}>
//               {menuOpen ? (
//                 <FaTimes className="text-2xl" />
//               ) : (
//                 <FaBars className="text-2xl" />
//               )}
//             </button>
//           </div>

//           {/* Desktop Navigation */}
//           <div className="hidden md:flex flex-1 justify-between items-center ml-10">
//             {/* Left Group */}
//             <div className="flex items-center gap-4">
//               {/* Tutorials Mega Menu */}
//               <div
//                 className="relative"
//                 onMouseEnter={() => setTutorialsOpen(true)}
//                 onMouseLeave={() => {
//                   setTutorialsOpen(false);
//                   setSelectedCatId(null);
//                   setSelectedSubId(null);
//                 }}
//               >
//                 <button
//                   className="flex items-center gap-1 text-sm font-semibold hover:text-purple-600"
//                   onFocus={() => setTutorialsOpen(true)}
//                 >
//                   Tutorials <FaChevronDown className="text-xs" />
//                 </button>

//                 {tutorialsOpen && (
//                   <div className="absolute left-0 top-full bg-white shadow-lg rounded-md p-3 w-[780px] z-30 border">
//                     <div className="grid grid-cols-3 gap-3">
//                       {/* Categories */}
//                       <div className="border rounded p-2">
//                         <div className="flex items-center gap-2 text-[12px] font-semibold mb-1 tracking-tight text-gray-700">
//                           <FaLayerGroup /> Categories
//                         </div>
//                         <div className="space-y-1">
//                           {categories.length === 0 ? (
//                             <div className={lightHint}>No categories found</div>
//                           ) : (
//                             categories.map((cat) => (
//                               <CategoryItem
//                                 key={String(cat._id || cat.id)}
//                                 cat={cat}
//                               />
//                             ))
//                           )}
//                         </div>
//                       </div>

//                       {/* Subcategories (REAL — fetched per category) */}
//                       <div className="border rounded p-2">
//                         <div className="flex items-center gap-2 text-[12px] font-semibold mb-1 tracking-tight text-gray-700">
//                           <FaLayerGroup /> Subcategories
//                         </div>
//                         <div className="space-y-1">
//                           {!selectedCatId ? (
//                             <div className={lightHint}>Hover a category…</div>
//                           ) : subsLoading &&
//                             !subCache.get(selectedCatId)?.length ? (
//                             <div className={lightHint}>Loading…</div>
//                           ) : (subCache.get(selectedCatId) || []).length ===
//                             0 ? (
//                             <div className={lightHint}>No subcategories</div>
//                           ) : (
//                             (subCache.get(selectedCatId) || []).map((sub) => (
//                               <SubcategoryItem
//                                 key={String(sub._id || sub.id)}
//                                 sub={sub}
//                               />
//                             ))
//                           )}
//                         </div>
//                       </div>

//                       {/* Courses in the selected REAL subcategory */}
//                       <div className="border rounded p-2">
//                         <div className="flex items-center gap-2 text-[12px] font-semibold mb-1 tracking-tight text-gray-700">
//                           <FaBookOpen /> Courses
//                         </div>
//                         <div className="space-y-1">
//                           {!selectedSubId ? (
//                             <div className={lightHint}>
//                               Hover a subcategory…
//                             </div>
//                           ) : subCourses.length === 0 ? (
//                             <div className={lightHint}>
//                               No courses for this subcategory
//                             </div>
//                           ) : (
//                             subCourses.map((course) => (
//                               <button
//                                 key={String(course._id || course.id)}
//                                 className="block w-full text-left px-3 py-1.5 rounded hover:bg-gray-50 text-[13px] font-medium tracking-tight text-gray-800"
//                                 onClick={() => navigateToCourse(course)}
//                               >
//                                 {course.title || "Untitled Course"}
//                               </button>
//                             ))
//                           )}
//                         </div>
//                       </div>
//                     </div>
//                   </div>
//                 )}
//               </div>

//               {/* Search */}
//               <div className="relative w-80">
//                 <input
//                   type="text"
//                   placeholder="Search for Any Course"
//                   className="w-full rounded-full border px-4 py-1.5 pr-10 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
//                 />
//                 <FaSearch className="absolute right-4 top-2.5 text-gray-500 text-sm" />
//               </div>
//             </div>

//             {/* Right Group */}
//             <div className="flex items-center gap-4">
//               <Link
//                 to="/apply-to-become-instructor"
//                 className="text-sm font-semibold text-gray-600 hover:text-purple-600"
//               >
//                 Become an Instructor
//               </Link>

//               <button
//                 onClick={goToMyCourses}
//                 className="text-sm font-semibold text-gray-600 hover:text-purple-600"
//               >
//                 My Courses
//               </button>

//               <Link
//                 to="/all-degrees"
//                 className="text-sm font-semibold text-gray-600 hover:text-purple-600"
//               >
//                 Certification/Degree
//               </Link>

//               <Link
//                 to="/all-blogs"
//                 className="text-sm font-semibold text-gray-600 hover:text-purple-600"
//               >
//                 Blogs
//               </Link>

//               {/* Wishlist */}
//               <button
//                 onClick={() => navigate("/wishlist")}
//                 className="relative"
//                 aria-label="Wishlist"
//               >
//                 <AiOutlineHeart className="text-xl hover:text-purple-600" />
//                 {wishlistCount > 0 && (
//                   <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full px-1.5">
//                     {wishlistCount}
//                   </span>
//                 )}
//               </button>

//               {/* Cart */}
//               <button
//                 onClick={() => navigate("/cart")}
//                 className="relative"
//                 aria-label="Cart"
//               >
//                 <FiShoppingCart className="text-xl hover:text-purple-600" />
//                 {cartCount > 0 && (
//                   <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full px-1.5">
//                     {cartCount}
//                   </span>
//                 )}
//               </button>

//               {/* Notifications */}
//               <button
//                 onClick={() => navigate("/notifications")}
//                 className="relative"
//                 aria-label="Notifications"
//               >
//                 <IoMdNotificationsOutline className="text-xl hover:text-purple-600" />
//                 {notificationCount > 0 && (
//                   <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full px-1.5">
//                     {notificationCount}
//                   </span>
//                 )}
//               </button>

//               {/* Login / User menu (desktop) */}
//               <div className="relative" ref={userMenuRef}>
//                 {!isLoggedIn ? (
//                   <div className="flex items-center gap-3">
//                     <button
//                       onClick={() => navigate("/login")}
//                       className="rounded-full h-8 w-8 flex items-center justify-center"
//                       title="Login"
//                     >
//                       <FaUserCircle className="h-6 w-6 text-purple-600" />
//                     </button>
//                     <Link
//                       to="/login"
//                       className="text-sm font-semibold text-gray-600 hover:text-purple-600"
//                     >
//                       Login
//                     </Link>
//                   </div>
//                 ) : (
//                   <>
//                     <button
//                       onClick={() => setUserDropdownOpen((v) => !v)}
//                       className="flex items-center gap-2"
//                       aria-haspopup="menu"
//                       aria-expanded={userDropdownOpen}
//                     >
//                       <FaUserCircle className="h-8 w-8 text-purple-600" />
//                       <span className="text-sm font-semibold text-gray-700 max-w-[140px] truncate">
//                         {userName || "User"}
//                       </span>
//                       <FaChevronDown className="text-xs" />
//                     </button>

//                     {userDropdownOpen && (
//                       <div
//                         role="menu"
//                         className="absolute right-0 mt-2 w-56 bg-white border rounded shadow-md z-20"
//                       >
//                         <button
//                           onClick={goToProfile}
//                           className="block w-full text-left px-4 py-2 hover:bg-gray-100 text-sm"
//                           role="menuitem"
//                         >
//                           Profile
//                         </button>
//                         <button
//                           onClick={goToDashboard}
//                           className="block w-full text-left px-4 py-2 hover:bg-gray-100 text-sm"
//                           role="menuitem"
//                         >
//                           Dashboard
//                         </button>
//                         <button
//                           onClick={handleLogout}
//                           className="block w-full text-left px-4 py-2 text-red-600 hover:bg-gray-100 text-sm font-semibold"
//                           role="menuitem"
//                         >
//                           Logout
//                         </button>
//                       </div>
//                     )}
//                   </>
//                 )}
//               </div>
//             </div>
//           </div>
//         </div>

//         {/* Mobile Menu */}
//         {menuOpen && (
//           <div className="md:hidden px-4 py-4 space-y-4 bg-white shadow">
//             <details className="border rounded">
//               <summary className="px-3 py-2 cursor-pointer font-medium">
//                 Tutorials
//               </summary>
//               <div className="p-2 space-y-2">
//                 {categories.map((cat) => {
//                   const catId = String(cat?._id || cat?.id || "");
//                   const subs = subCache.get(catId) || [];
//                   return (
//                     <details
//                       key={catId}
//                       className="ml-2"
//                       onToggle={(e) => {
//                         if (e.target.open) ensureSubsForCategory(catId);
//                       }}
//                     >
//                       <summary className="px-2 py-1 cursor-pointer text-sm font-semibold">
//                         {cat.category_name || cat.name || "Untitled"}
//                       </summary>
//                       <div className="pl-3 py-1 space-y-1">
//                         {subs.length === 0 && !subsLoading && (
//                           <div className="text-xs text-gray-500 px-2">
//                             No subcategories
//                           </div>
//                         )}
//                         {subsLoading && subs.length === 0 && (
//                           <div className="text-xs text-gray-500 px-2">
//                             Loading…
//                           </div>
//                         )}
//                         {subs.map((sub) => {
//                           const subId = String(sub?._id || sub?.id || "");
//                           const cs = coursesBySub.get(subId) || [];
//                           const label =
//                             sub?.subcategory_name ||
//                             sub?.name ||
//                             sub?.title ||
//                             "Untitled";
//                           return (
//                             <details key={subId} className="ml-2">
//                               <summary className="px-2 py-1 cursor-pointer text-sm font-semibold">
//                                 {label}
//                               </summary>
//                               <div className="pl-3 py-1 space-y-1">
//                                 {cs.length === 0 && (
//                                   <div className="text-xs text-gray-500 px-2">
//                                     No courses
//                                   </div>
//                                 )}
//                                 {cs.map((course) => (
//                                   <button
//                                     key={String(course._id || course.id)}
//                                     className="block w-full text-left text-sm px-2 py-1 rounded hover:bg-gray-50 font-medium"
//                                     onClick={() => {
//                                       setMenuOpen(false);
//                                       navigateToCourse(course);
//                                     }}
//                                   >
//                                     {course.title || "Untitled Course"}
//                                   </button>
//                                 ))}
//                               </div>
//                             </details>
//                           );
//                         })}
//                       </div>
//                     </details>
//                   );
//                 })}
//               </div>
//             </details>

//             <Link
//               to="/apply-to-become-instructor"
//               className="block text-sm text-gray-800"
//             >
//               Become an Instructor
//             </Link>
//             <button
//               onClick={goToMyCourses}
//               className="block text-sm text-gray-800"
//             >
//               My Courses
//             </button>

//             <div className="relative">
//               <input
//                 type="text"
//                 placeholder="Search"
//                 className="w-full rounded-full border px-4 py-1.5 pr-10 text-sm"
//               />
//               <FaSearch className="absolute right-4 top-2.5 text-gray-500 text-sm" />
//             </div>

//             <div className="flex items-center justify-around">
//               <button onClick={() => navigate("/wishlist")}>
//                 <AiOutlineHeart className="text-xl" />
//               </button>
//               <button onClick={() => navigate("/cart")}>
//                 <FiShoppingCart className="text-xl" />
//               </button>
//               <button onClick={() => navigate("/notifications")}>
//                 <IoMdNotificationsOutline className="text-xl" />
//               </button>
//               {!isLoggedIn ? (
//                 <button
//                   onClick={() => navigate("/login")}
//                   className="flex items-center gap-1 text-sm font-semibold text-purple-600 hover:text-purple-700"
//                 >
//                   <FaUserCircle className="h-5 w-5" />
//                   Login
//                 </button>
//               ) : (
//                 <button
//                   onClick={goToDashboard}
//                   className="flex items-center gap-1 text-purple-600"
//                   title="Dashboard"
//                 >
//                   <FaUserCircle className="h-7 w-7" />
//                 </button>
//               )}
//             </div>
//           </div>
//         )}
//       </header>
//     </>
//   );
// };

// export default Header;

// with search feature.

//

// src/components/common_components/Header.jsx
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

/* ---------------- helpers ---------------- */
const sid = (v) => (v == null ? "" : String(v));

const normalizeCourseSubId = (c) =>
  sid(
    c?.subcategory?._id ??
      c?.subcategory ??
      c?.subCategory?._id ??
      c?.subCategory ??
      ""
  );

const normalizeCourseCatId = (c) =>
  sid(c?.category?._id ?? c?.category ?? c?.categoryId ?? "");

const arr = (payload) => {
  const d = payload?.data;
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(d)) return d;
  if (Array.isArray(d?.data)) return d.data;
  if (Array.isArray(d?.items)) return d.items;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
};
/* ----------------------------------------- */

const Header = () => {
  const navigate = useNavigate();
  const { isLoggedIn, user, logout } = useContext(AuthContext);

  // top-level UI
  const [menuOpen, setMenuOpen] = useState(false);
  const [tutorialsOpen, setTutorialsOpen] = useState(false);
  const [selectedCatId, setSelectedCatId] = useState(null);
  const [selectedSubId, setSelectedSubId] = useState(null);

  // data
  const [categories, setCategories] = useState([]);
  const [courses, setCourses] = useState([]);

  // subcategories per category (cache: catId -> [subs])
  const [subCache, setSubCache] = useState(new Map());
  const [subsLoading, setSubsLoading] = useState(false);

  // user dropdown popup
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const userMenuRef = useRef(null);

  // badges (placeholder)
  const wishlistCount = 3;
  const cartCount = 2;
  const notificationCount = 5;

  // --- search state (no navigation; emits a global event) ---
  const [q, setQ] = useState("");
  const debRef = useRef(null);
  const emitSearch = (value) => {
    window.dispatchEvent(new CustomEvent("ecoders:search", { detail: value }));
  };

  // Debounce input -> emit global filter event
  useEffect(() => {
    if (debRef.current) clearTimeout(debRef.current);
    debRef.current = setTimeout(() => emitSearch(q.trim()), 200);
    return () => clearTimeout(debRef.current);
  }, [q]);

  // close user dropdown on outside click
  useEffect(() => {
    const onDocClick = (e) => {
      if (!userMenuRef.current) return;
      if (!userMenuRef.current.contains(e.target)) setUserDropdownOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  // fetch categories + all courses (paged)
  const fetchAllCourses = async () => {
    const limit = 200; // backend cap
    let page = 1;
    let all = [];
    while (page <= 50) {
      const res = await axios.get(`${globalBackendRoute}/api/list-courses`, {
        params: { page, limit },
      });
      const rows = arr(res);
      all = all.concat(rows);
      if (rows.length < limit) break;
      page += 1;
    }
    return all;
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [catRes, allCourses] = await Promise.all([
          axios.get(`${globalBackendRoute}/api/all-categories`),
          fetchAllCourses(),
        ]);
        if (!alive) return;
        setCategories(arr(catRes));
        setCourses(allCourses);
      } catch (err) {
        console.error("Header initial fetch failed:", err);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // when hovering/focusing a category, fetch its subcategories (if not cached)
  const ensureSubsForCategory = async (catId) => {
    if (!catId) return;
    if (subCache.has(catId)) return; // already cached
    try {
      setSubsLoading(true);
      const url = `${globalBackendRoute}/api/get-subcategories-by-category?category=${encodeURIComponent(
        catId
      )}&categoryId=${encodeURIComponent(catId)}`;
      const res = await axios.get(url);
      const subs = arr(res);
      setSubCache((prev) => {
        const next = new Map(prev);
        next.set(catId, subs);
        return next;
      });
    } catch (err) {
      console.error("Load subcategories failed:", err);
      setSubCache((prev) => {
        const next = new Map(prev);
        next.set(catId, []); // cache empty to avoid refetch storms
        return next;
      });
    } finally {
      setSubsLoading(false);
    }
  };

  // groups (only for mega menu, not for search)
  const coursesBySub = useMemo(() => {
    const map = new Map();
    courses.forEach((c) => {
      const sId = normalizeCourseSubId(c);
      if (!sId) return; // course without subCategory is not shown in header
      if (!map.has(sId)) map.set(sId, []);
      map.get(sId).push(c);
    });
    map.forEach((list) =>
      list.sort((a, b) => sid(a.title).localeCompare(sid(b.title)))
    );
    return map;
  }, [courses]);

  const catSubs = selectedCatId ? subCache.get(selectedCatId) || [] : [];
  const subCourses = selectedSubId
    ? coursesBySub.get(String(selectedSubId)) || []
    : [];

  // user info
  const userId = user?._id || user?.id || "guest";
  const userName = user?.name || user?.fullName || user?.firstName || "";

  // dashboard route by role
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

  // actions
  const navigateToCourse = (course) => {
    const id = course?._id || course?.id;
    if (!id) return;
    navigate(`/user-course/${userId}/${id}`);
    setTutorialsOpen(false);
    setSelectedSubId(null);
    setSelectedCatId(null);
  };

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
        onMouseEnter={async () => {
          setSelectedCatId(catId);
          setSelectedSubId(null);
          await ensureSubsForCategory(String(catId));
        }}
        onFocus={async () => {
          setSelectedCatId(catId);
          setSelectedSubId(null);
          await ensureSubsForCategory(String(catId));
        }}
      >
        <span className={itemText}>
          {cat.category_name || cat.name || "Untitled"}
        </span>
        <FaChevronRight className="ml-2 text-[10px] opacity-70" />
      </button>
    );
  };

  const SubcategoryItem = ({ sub }) => {
    const subId = sub?._id || sub?.id;
    const label =
      sub?.subcategory_name || sub?.name || sub?.title || "Untitled";
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
        <span className={itemText}>{label}</span>
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
              {/* Tutorials Mega Menu */}
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

                      {/* Subcategories (REAL — fetched per category) */}
                      <div className="border rounded p-2">
                        <div className="flex items-center gap-2 text-[12px] font-semibold mb-1 tracking-tight text-gray-700">
                          <FaLayerGroup /> Subcategories
                        </div>
                        <div className="space-y-1">
                          {!selectedCatId ? (
                            <div className={lightHint}>Hover a category…</div>
                          ) : subsLoading &&
                            !subCache.get(selectedCatId)?.length ? (
                            <div className={lightHint}>Loading…</div>
                          ) : (subCache.get(selectedCatId) || []).length ===
                            0 ? (
                            <div className={lightHint}>No subcategories</div>
                          ) : (
                            (subCache.get(selectedCatId) || []).map((sub) => (
                              <SubcategoryItem
                                key={String(sub._id || sub.id)}
                                sub={sub}
                              />
                            ))
                          )}
                        </div>
                      </div>

                      {/* Courses in the selected REAL subcategory */}
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

              {/* Search (emits global event; no navigation) */}
              <div className="relative w-80">
                <input
                  type="text"
                  placeholder="Search for Any Course"
                  className="w-full rounded-full border px-4 py-1.5 pr-10 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault(); // avoid form submit or page jumps
                      emitSearch(q.trim());
                    }
                  }}
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
                  const subs = subCache.get(catId) || [];
                  return (
                    <details
                      key={catId}
                      className="ml-2"
                      onToggle={(e) => {
                        if (e.target.open) ensureSubsForCategory(catId);
                      }}
                    >
                      <summary className="px-2 py-1 cursor-pointer text-sm font-semibold">
                        {cat.category_name || cat.name || "Untitled"}
                      </summary>
                      <div className="pl-3 py-1 space-y-1">
                        {subs.length === 0 && !subsLoading && (
                          <div className="text-xs text-gray-500 px-2">
                            No subcategories
                          </div>
                        )}
                        {subsLoading && subs.length === 0 && (
                          <div className="text-xs text-gray-500 px-2">
                            Loading…
                          </div>
                        )}
                        {subs.map((sub) => {
                          const subId = String(sub?._id || sub?.id || "");
                          const cs = new Map().get(subId) || []; // not used on mobile list
                          const label =
                            sub?.subcategory_name ||
                            sub?.name ||
                            sub?.title ||
                            "Untitled";
                          return (
                            <details key={subId} className="ml-2">
                              <summary className="px-2 py-1 cursor-pointer text-sm font-semibold">
                                {label}
                              </summary>
                              <div className="pl-3 py-1 space-y-1">
                                {cs.length === 0 && (
                                  <div className="text-xs text-gray-500 px-2">
                                    No courses
                                  </div>
                                )}
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

            {/* Mobile search also emits global filter event */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search"
                className="w-full rounded-full border px-4 py-1.5 pr-10 text-sm"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    emitSearch(q.trim());
                  }
                }}
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
