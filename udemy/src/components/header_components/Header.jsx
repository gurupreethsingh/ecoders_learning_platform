// // import React, { useState, useEffect, useMemo } from "react";
// // import {
// //   FaSearch,
// //   FaChevronDown,
// //   FaBars,
// //   FaTimes,
// //   FaChevronRight,
// //   FaBookOpen,
// //   FaLayerGroup,
// // } from "react-icons/fa";
// // import { FiShoppingCart } from "react-icons/fi";
// // import { AiOutlineHeart } from "react-icons/ai";
// // import { IoMdNotificationsOutline } from "react-icons/io";
// // import { useNavigate } from "react-router-dom";
// // import axios from "axios";
// // import { jwtDecode } from "jwt-decode";
// // import TopHeader from "./TopHeader";
// // import globalBackendRoute from "../../config/Config";

// // const Header = () => {
// //   const navigate = useNavigate();

// //   const [menuOpen, setMenuOpen] = useState(false);
// //   const [tutorialsOpen, setTutorialsOpen] = useState(false);

// //   const [selectedCatId, setSelectedCatId] = useState(null);
// //   const [selectedSubId, setSelectedSubId] = useState(null);

// //   // Data
// //   const [categories, setCategories] = useState([]);
// //   const [subcategories, setSubcategories] = useState([]);
// //   const [courses, setCourses] = useState([]);

// //   // Auth (for /user-course/:userid/:courseid)
// //   const [userId, setUserId] = useState("guest");

// //   // Basic UI
// //   const [userDropdownOpen, setUserDropdownOpen] = useState(false);
// //   const userInitials = "JS";
// //   const wishlistCount = 3;
// //   const cartCount = 2;
// //   const notificationCount = 5;

// //   // Read user id from token if present
// //   useEffect(() => {
// //     try {
// //       const token = localStorage.getItem("token");
// //       if (!token) return;
// //       const decoded = jwtDecode(token);
// //       if (decoded?.id) setUserId(decoded.id);
// //     } catch {
// //       setUserId("guest");
// //     }
// //   }, []);

// //   // Fetch categories, subcategories, courses
// //   useEffect(() => {
// //     let alive = true;

// //     (async () => {
// //       try {
// //         const [catRes, subRes, courseRes] = await Promise.all([
// //           axios.get(`${globalBackendRoute}/api/all-categories`),
// //           axios.get(`${globalBackendRoute}/api/all-subcategories`),
// //           axios.get(`${globalBackendRoute}/api/list-courses`),
// //         ]);

// //         if (!alive) return;

// //         setCategories(Array.isArray(catRes.data) ? catRes.data : []);
// //         setSubcategories(Array.isArray(subRes.data) ? subRes.data : []);

// //         const coursePayload = Array.isArray(courseRes.data?.data)
// //           ? courseRes.data.data
// //           : Array.isArray(courseRes.data)
// //           ? courseRes.data
// //           : [];
// //         setCourses(coursePayload);
// //       } catch (err) {
// //         console.error("Header fetch failed:", err);
// //       }
// //     })();

// //     return () => {
// //       alive = false;
// //     };
// //   }, []);

// //   // Build maps
// //   const byCategory = useMemo(() => {
// //     const map = new Map();
// //     subcategories.forEach((sub) => {
// //       const catId = String(sub.category?._id || sub.category || "");
// //       if (!catId) return;
// //       if (!map.has(catId)) map.set(catId, []);
// //       map.get(catId).push(sub);
// //     });
// //     return map;
// //   }, [subcategories]);

// //   const coursesBySubcategory = useMemo(() => {
// //     const map = new Map();
// //     courses.forEach((c) => {
// //       const subId = String(
// //         c.subcategory?._id ||
// //           c.subcategory ||
// //           c.subCategory?._id ||
// //           c.subCategory ||
// //           ""
// //       );
// //       if (!subId) return;
// //       if (!map.has(subId)) map.set(subId, []);
// //       map.get(subId).push(c);
// //     });
// //     map.forEach((arr) =>
// //       arr.sort((a, b) =>
// //         String(a.title || "").localeCompare(String(b.title || ""))
// //       )
// //     );
// //     return map;
// //   }, [courses]);

// //   const catSubs = selectedCatId
// //     ? byCategory.get(String(selectedCatId)) || []
// //     : [];
// //   const subCourses = selectedSubId
// //     ? coursesBySubcategory.get(String(selectedSubId)) || []
// //     : [];

// //   // 🧭 Updated navigation: /user-course/:userid/:courseid
// //   const navigateToCourse = (course) => {
// //     const id = course?._id || course?.id;
// //     if (!id) return;
// //     navigate(`/user-course/${userId}/${id}`);
// //     setTutorialsOpen(false);
// //     setSelectedSubId(null);
// //     setSelectedCatId(null);
// //   };

// //   const CategoryItem = ({ cat }) => (
// //     <button
// //       className={`w-full text-left px-3 py-2 rounded hover:bg-gray-50 flex items-center justify-between ${
// //         String(selectedCatId) === String(cat._id)
// //           ? "bg-purple-50 text-purple-700"
// //           : "text-gray-800"
// //       }`}
// //       onMouseEnter={() => {
// //         setSelectedCatId(cat._id);
// //         setSelectedSubId(null);
// //       }}
// //       onFocus={() => {
// //         setSelectedCatId(cat._id);
// //         setSelectedSubId(null);
// //       }}
// //     >
// //       <span className="truncate">{cat.category_name || "Untitled"}</span>
// //       <FaChevronRight className="ml-2 text-xs opacity-70" />
// //     </button>
// //   );

// //   const SubcategoryItem = ({ sub }) => (
// //     <button
// //       className={`w-full text-left px-3 py-2 rounded hover:bg-gray-50 flex items-center justify-between ${
// //         String(selectedSubId) === String(sub._id)
// //           ? "bg-indigo-50 text-indigo-700"
// //           : "text-gray-800"
// //       }`}
// //       onMouseEnter={() => setSelectedSubId(sub._id)}
// //       onFocus={() => setSelectedSubId(sub._id)}
// //     >
// //       <span className="truncate">{sub.subcategory_name || "Untitled"}</span>
// //       <FaChevronRight className="ml-2 text-xs opacity-70" />
// //     </button>
// //   );

// //   return (
// //     <>
// //       <TopHeader />

// //       <header className="z-50 w-full bg-white shadow">
// //         <div className="max-w-screen-3xl mx-auto px-4 flex items-center justify-between py-2">
// //           {/* Logo */}
// //           <div className="text-xl font-bold text-purple-700">
// //             <a href="/home">Ecoders</a>
// //           </div>

// //           {/* Hamburger */}
// //           <div className="md:hidden">
// //             <button onClick={() => setMenuOpen(!menuOpen)}>
// //               {menuOpen ? (
// //                 <FaTimes className="text-2xl" />
// //               ) : (
// //                 <FaBars className="text-2xl" />
// //               )}
// //             </button>
// //           </div>

// //           {/* Desktop Navigation */}
// //           <div className="hidden md:flex flex-1 justify-between items-center ml-10">
// //             {/* Left Group */}
// //             <div className="flex items-center gap-4">
// //               {/* Tutorials Nested Mega Menu */}
// //               <div
// //                 className="relative"
// //                 onMouseEnter={() => setTutorialsOpen(true)}
// //                 onMouseLeave={() => {
// //                   setTutorialsOpen(false);
// //                   setSelectedCatId(null);
// //                   setSelectedSubId(null);
// //                 }}
// //               >
// //                 <button
// //                   className="flex items-center gap-1 text-sm font-medium hover:text-purple-600"
// //                   onFocus={() => setTutorialsOpen(true)}
// //                 >
// //                   Tutorials <FaChevronDown className="text-xs" />
// //                 </button>

// //                 {tutorialsOpen && (
// //                   <div className="absolute left-0 top-full bg-white shadow-lg rounded-md p-3 w-[780px] z-30">
// //                     <div className="grid grid-cols-3 gap-3">
// //                       {/* Col 1: Categories */}
// //                       <div className="border rounded p-2">
// //                         <div className="flex items-center gap-2 text-sm font-semibold mb-2">
// //                           <FaLayerGroup /> Categories
// //                         </div>
// //                         <div className="max-h-72 overflow-auto pr-1">
// //                           {categories.length === 0 ? (
// //                             <div className="text-xs text-gray-500 px-2 py-1">
// //                               No categories found
// //                             </div>
// //                           ) : (
// //                             categories.map((cat) => (
// //                               <CategoryItem key={cat._id} cat={cat} />
// //                             ))
// //                           )}
// //                         </div>
// //                       </div>

// //                       {/* Col 2: Subcategories */}
// //                       <div className="border rounded p-2">
// //                         <div className="flex items-center gap-2 text-sm font-semibold mb-2">
// //                           <FaLayerGroup /> Subcategories
// //                         </div>
// //                         <div className="max-h-72 overflow-auto pr-1">
// //                           {!selectedCatId ? (
// //                             <div className="text-xs text-gray-500 px-2 py-1">
// //                               Hover a category…
// //                             </div>
// //                           ) : catSubs.length === 0 ? (
// //                             <div className="text-xs text-gray-500 px-2 py-1">
// //                               No subcategories
// //                             </div>
// //                           ) : (
// //                             catSubs.map((sub) => (
// //                               <SubcategoryItem key={sub._id} sub={sub} />
// //                             ))
// //                           )}
// //                         </div>
// //                       </div>

// //                       {/* Col 3: Courses */}
// //                       <div className="border rounded p-2">
// //                         <div className="flex items-center gap-2 text-sm font-semibold mb-2">
// //                           <FaBookOpen /> Courses
// //                         </div>
// //                         <div className="max-h-72 overflow-auto pr-1">
// //                           {!selectedSubId ? (
// //                             <div className="text-xs text-gray-500 px-2 py-1">
// //                               Hover a subcategory…
// //                             </div>
// //                           ) : subCourses.length === 0 ? (
// //                             <div className="text-xs text-gray-500 px-2 py-1">
// //                               No courses for this subcategory
// //                             </div>
// //                           ) : (
// //                             subCourses.map((course) => (
// //                               <button
// //                                 key={course._id || course.id}
// //                                 className="block w-full text-left px-3 py-2 rounded hover:bg-gray-50 text-gray-800"
// //                                 onClick={() => navigateToCourse(course)}
// //                               >
// //                                 {course.title || "Untitled Course"}
// //                               </button>
// //                             ))
// //                           )}
// //                         </div>
// //                       </div>
// //                     </div>
// //                   </div>
// //                 )}
// //               </div>

// //               {/* Search */}
// //               <div className="relative w-80">
// //                 <input
// //                   type="text"
// //                   placeholder="Search for Any Course"
// //                   className="w-full rounded-full border px-4 py-1.5 pr-10 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
// //                 />
// //                 <FaSearch className="absolute right-4 top-2.5 text-gray-500 text-sm" />
// //               </div>
// //             </div>

// //             {/* Right Group */}
// //             <div className="flex items-center gap-4">
// //               <a
// //                 href="/apply-to-become-instructor"
// //                 className="text-sm font-semibold text-gray-600 hover:text-purple-600"
// //               >
// //                 Become an Instructor
// //               </a>
// //               <a
// //                 href="#"
// //                 className="text-sm font-semibold text-gray-600 hover:text-purple-600"
// //               >
// //                 My Courses
// //               </a>
// //               <a
// //                 href="/all-degrees"
// //                 className="text-sm font-semibold text-gray-600 hover:text-purple-600"
// //               >
// //                 Certification/Degree
// //               </a>
// //               <a
// //                 href="/all-blogs"
// //                 className="text-sm font-semibold text-gray-600 hover:text-purple-600"
// //               >
// //                 Blogs
// //               </a>

// //               {/* Wishlist */}
// //               <div className="relative">
// //                 <AiOutlineHeart className="text-xl hover:text-purple-600" />
// //                 {wishlistCount > 0 && (
// //                   <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full px-1.5">
// //                     {wishlistCount}
// //                   </span>
// //                 )}
// //               </div>

// //               {/* Cart */}
// //               <div className="relative">
// //                 <FiShoppingCart className="text-xl hover:text-purple-600" />
// //                 {cartCount > 0 && (
// //                   <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full px-1.5">
// //                     {cartCount}
// //                   </span>
// //                 )}
// //               </div>

// //               {/* Notifications */}
// //               <div className="relative">
// //                 <IoMdNotificationsOutline className="text-xl hover:text-purple-600" />
// //                 {notificationCount > 0 && (
// //                   <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full px-1.5">
// //                     {notificationCount}
// //                   </span>
// //                 )}
// //               </div>

// //               {/* User Dropdown */}
// //               <div className="relative">
// //                 <button
// //                   onClick={() => setUserDropdownOpen(!userDropdownOpen)}
// //                   className="flex items-center gap-2"
// //                 >
// //                   <div className="bg-purple-600 text-white rounded-full h-8 w-8 flex items-center justify-center uppercase text-sm">
// //                     {userInitials}
// //                   </div>
// //                   <FaChevronDown className="text-xs" />
// //                 </button>
// //                 {userDropdownOpen && (
// //                   <div className="absolute right-0 mt-2 w-48 bg-white border rounded shadow-md z-10">
// //                     <a href="#" className="block px-4 py-2 hover:bg-gray-100">
// //                       Profile
// //                     </a>
// //                     <a href="#" className="block px-4 py-2 hover:bg-gray-100">
// //                       Settings
// //                     </a>
// //                     <a
// //                       href="#"
// //                       className="block px-4 py-2 text-red-600 hover:bg-gray-100"
// //                     >
// //                       Logout
// //                     </a>
// //                   </div>
// //                 )}
// //               </div>
// //             </div>
// //           </div>
// //         </div>

// //         {/* Mobile Menu (simplified) */}
// //         {menuOpen && (
// //           <div className="md:hidden px-4 py-4 space-y-4 bg-white shadow">
// //             <details className="border rounded">
// //               <summary className="px-3 py-2 cursor-pointer font-medium">
// //                 Tutorials
// //               </summary>
// //               <div className="p-2 space-y-2">
// //                 {categories.map((cat) => {
// //                   const subs = byCategory.get(String(cat._id)) || [];
// //                   return (
// //                     <details key={cat._id} className="ml-2">
// //                       <summary className="px-2 py-1 cursor-pointer text-sm">
// //                         {cat.category_name || "Untitled"}
// //                       </summary>
// //                       <div className="pl-3 py-1 space-y-1">
// //                         {subs.length === 0 && (
// //                           <div className="text-xs text-gray-500 px-2">
// //                             No subcategories
// //                           </div>
// //                         )}
// //                         {subs.map((sub) => {
// //                           const cs =
// //                             coursesBySubcategory.get(String(sub._id)) || [];
// //                           return (
// //                             <details key={sub._id} className="ml-2">
// //                               <summary className="px-2 py-1 cursor-pointer text-sm">
// //                                 {sub.subcategory_name || "Untitled"}
// //                               </summary>
// //                               <div className="pl-3 py-1 space-y-1">
// //                                 {cs.length === 0 && (
// //                                   <div className="text-xs text-gray-500 px-2">
// //                                     No courses
// //                                   </div>
// //                                 )}
// //                                 {cs.map((course) => (
// //                                   <button
// //                                     key={course._id || course.id}
// //                                     className="block w-full text-left text-sm px-2 py-1 rounded hover:bg-gray-50"
// //                                     onClick={() => {
// //                                       setMenuOpen(false);
// //                                       navigateToCourse(course);
// //                                     }}
// //                                   >
// //                                     {course.title || "Untitled Course"}
// //                                   </button>
// //                                 ))}
// //                               </div>
// //                             </details>
// //                           );
// //                         })}
// //                       </div>
// //                     </details>
// //                   );
// //                 })}
// //               </div>
// //             </details>

// //             <a
// //               href="/apply-to-become-instructor"
// //               className="block text-sm text-gray-800"
// //             >
// //               Become an Instructor
// //             </a>
// //             <a href="#" className="block text-sm text-gray-800">
// //               My Courses
// //             </a>
// //             <div className="relative">
// //               <input
// //                 type="text"
// //                 placeholder="Search"
// //                 className="w-full rounded-full border px-4 py-1.5 pr-10 text-sm"
// //               />
// //               <FaSearch className="absolute right-4 top-2.5 text-gray-500 text-sm" />
// //             </div>
// //             <div className="flex items-center justify-around">
// //               <AiOutlineHeart className="text-xl" />
// //               <FiShoppingCart className="text-xl" />
// //               <IoMdNotificationsOutline className="text-xl" />
// //               <div className="bg-purple-600 text-white rounded-full h-8 w-8 flex items-center justify-center text-sm">
// //                 {userInitials}
// //               </div>
// //             </div>
// //           </div>
// //         )}
// //       </header>
// //     </>
// //   );
// // };

// // export default Header;

// //

// // src/components/common_components/Header.jsx
// import React, { useState, useEffect, useMemo } from "react";
// import {
//   FaSearch,
//   FaChevronDown,
//   FaBars,
//   FaTimes,
//   FaChevronRight,
//   FaBookOpen,
//   FaLayerGroup,
// } from "react-icons/fa";
// import { FiShoppingCart } from "react-icons/fi";
// import { AiOutlineHeart } from "react-icons/ai";
// import { IoMdNotificationsOutline } from "react-icons/io";
// import { useNavigate } from "react-router-dom";
// import axios from "axios";
// import { jwtDecode } from "jwt-decode";
// import TopHeader from "./TopHeader";
// import globalBackendRoute from "../../config/Config";

// const Header = () => {
//   const navigate = useNavigate();

//   const [menuOpen, setMenuOpen] = useState(false);
//   const [tutorialsOpen, setTutorialsOpen] = useState(false);

//   const [selectedCatId, setSelectedCatId] = useState(null);
//   const [selectedSubId, setSelectedSubId] = useState(null);

//   // Data
//   const [categories, setCategories] = useState([]);
//   const [subcategories, setSubcategories] = useState([]);
//   const [courses, setCourses] = useState([]);

//   // Auth (for /user-course/:userid/:courseid)
//   const [userId, setUserId] = useState("guest");

//   // Basic UI
//   const [userDropdownOpen, setUserDropdownOpen] = useState(false);
//   const userInitials = "JS";
//   const wishlistCount = 3;
//   const cartCount = 2;
//   const notificationCount = 5;

//   // Read user id from token if present
//   useEffect(() => {
//     try {
//       const token = localStorage.getItem("token");
//       if (!token) return;
//       const decoded = jwtDecode(token);
//       if (decoded?.id) setUserId(decoded.id);
//     } catch {
//       setUserId("guest");
//     }
//   }, []);

//   // Fetch categories, subcategories, courses
//   useEffect(() => {
//     let alive = true;

//     (async () => {
//       try {
//         const [catRes, subRes, courseRes] = await Promise.all([
//           axios.get(`${globalBackendRoute}/api/all-categories`),
//           axios.get(`${globalBackendRoute}/api/all-subcategories`),
//           axios.get(`${globalBackendRoute}/api/list-courses`),
//         ]);

//         if (!alive) return;

//         setCategories(Array.isArray(catRes.data) ? catRes.data : []);
//         setSubcategories(Array.isArray(subRes.data) ? subRes.data : []);

//         const coursePayload = Array.isArray(courseRes.data?.data)
//           ? courseRes.data.data
//           : Array.isArray(courseRes.data)
//           ? courseRes.data
//           : [];
//         setCourses(coursePayload);
//       } catch (err) {
//         console.error("Header fetch failed:", err);
//       }
//     })();

//     return () => {
//       alive = false;
//     };
//   }, []);

//   // Build maps
//   const byCategory = useMemo(() => {
//     const map = new Map();
//     subcategories.forEach((sub) => {
//       const catId = String(sub.category?._id || sub.category || "");
//       if (!catId) return;
//       if (!map.has(catId)) map.set(catId, []);
//       map.get(catId).push(sub);
//     });
//     return map;
//   }, [subcategories]);

//   const coursesBySubcategory = useMemo(() => {
//     const map = new Map();
//     courses.forEach((c) => {
//       const subId = String(
//         c.subcategory?._id ||
//           c.subcategory ||
//           c.subCategory?._id ||
//           c.subCategory ||
//           ""
//       );
//       if (!subId) return;
//       if (!map.has(subId)) map.set(subId, []);
//       map.get(subId).push(c);
//     });
//     map.forEach((arr) =>
//       arr.sort((a, b) =>
//         String(a.title || "").localeCompare(String(b.title || ""))
//       )
//     );
//     return map;
//   }, [courses]);

//   const catSubs = selectedCatId
//     ? byCategory.get(String(selectedCatId)) || []
//     : [];
//   const subCourses = selectedSubId
//     ? coursesBySubcategory.get(String(selectedSubId)) || []
//     : [];

//   // 🧭 Updated navigation: /user-course/:userid/:courseid
//   const navigateToCourse = (course) => {
//     const id = course?._id || course?.id;
//     if (!id) return;
//     navigate(`/user-course/${userId}/${id}`);
//     setTutorialsOpen(false);
//     setSelectedSubId(null);
//     setSelectedCatId(null);
//   };

//   const itemBase =
//     "w-full text-left px-3 py-1.5 rounded hover:bg-gray-50 flex items-center justify-between";
//   const itemText =
//     "truncate text-[13px] font-medium tracking-tight text-gray-800";
//   const lightHint = "text-[12px] text-gray-500 px-2 py-1";

//   const CategoryItem = ({ cat }) => (
//     <button
//       className={`${itemBase} ${
//         String(selectedCatId) === String(cat._id)
//           ? "bg-purple-50 text-purple-700"
//           : ""
//       }`}
//       onMouseEnter={() => {
//         setSelectedCatId(cat._id);
//         setSelectedSubId(null);
//       }}
//       onFocus={() => {
//         setSelectedCatId(cat._id);
//         setSelectedSubId(null);
//       }}
//     >
//       <span className={`${itemText}`}>{cat.category_name || "Untitled"}</span>
//       <FaChevronRight className="ml-2 text-[10px] opacity-70" />
//     </button>
//   );

//   const SubcategoryItem = ({ sub }) => (
//     <button
//       className={`${itemBase} ${
//         String(selectedSubId) === String(sub._id)
//           ? "bg-indigo-50 text-indigo-700"
//           : ""
//       }`}
//       onMouseEnter={() => setSelectedSubId(sub._id)}
//       onFocus={() => setSelectedSubId(sub._id)}
//     >
//       <span className={`${itemText}`}>
//         {sub.subcategory_name || "Untitled"}
//       </span>
//       <FaChevronRight className="ml-2 text-[10px] opacity-70" />
//     </button>
//   );

//   return (
//     <>
//       <TopHeader />

//       <header className="z-50 w-full bg-white shadow">
//         <div className="max-w-screen-3xl mx-auto px-4 flex items-center justify-between py-2">
//           {/* Logo */}
//           <div className="text-xl font-bold text-purple-700">
//             <a href="/home">Ecoders</a>
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
//               {/* Tutorials Nested Mega Menu */}
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
//                       {/* Col 1: Categories */}
//                       <div className="border rounded p-2">
//                         <div className="flex items-center gap-2 text-[12px] font-semibold mb-1 tracking-tight text-gray-700">
//                           <FaLayerGroup /> Categories
//                         </div>
//                         <div className="space-y-1">
//                           {categories.length === 0 ? (
//                             <div className={lightHint}>No categories found</div>
//                           ) : (
//                             categories.map((cat) => (
//                               <CategoryItem key={cat._id} cat={cat} />
//                             ))
//                           )}
//                         </div>
//                       </div>

//                       {/* Col 2: Subcategories */}
//                       <div className="border rounded p-2">
//                         <div className="flex items-center gap-2 text-[12px] font-semibold mb-1 tracking-tight text-gray-700">
//                           <FaLayerGroup /> Subcategories
//                         </div>
//                         <div className="space-y-1">
//                           {!selectedCatId ? (
//                             <div className={lightHint}>Hover a category…</div>
//                           ) : catSubs.length === 0 ? (
//                             <div className={lightHint}>No subcategories</div>
//                           ) : (
//                             catSubs.map((sub) => (
//                               <SubcategoryItem key={sub._id} sub={sub} />
//                             ))
//                           )}
//                         </div>
//                       </div>

//                       {/* Col 3: Courses */}
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
//                                 key={course._id || course.id}
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
//               <a
//                 href="/apply-to-become-instructor"
//                 className="text-sm font-semibold text-gray-600 hover:text-purple-600"
//               >
//                 Become an Instructor
//               </a>
//               <a
//                 href="#"
//                 className="text-sm font-semibold text-gray-600 hover:text-purple-600"
//               >
//                 My Courses
//               </a>
//               <a
//                 href="/all-degrees"
//                 className="text-sm font-semibold text-gray-600 hover:text-purple-600"
//               >
//                 Certification/Degree
//               </a>
//               <a
//                 href="/all-blogs"
//                 className="text-sm font-semibold text-gray-600 hover:text-purple-600"
//               >
//                 Blogs
//               </a>

//               {/* Wishlist */}
//               <div className="relative">
//                 <AiOutlineHeart className="text-xl hover:text-purple-600" />
//                 {wishlistCount > 0 && (
//                   <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full px-1.5">
//                     {wishlistCount}
//                   </span>
//                 )}
//               </div>

//               {/* Cart */}
//               <div className="relative">
//                 <FiShoppingCart className="text-xl hover:text-purple-600" />
//                 {cartCount > 0 && (
//                   <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full px-1.5">
//                     {cartCount}
//                   </span>
//                 )}
//               </div>

//               {/* Notifications */}
//               <div className="relative">
//                 <IoMdNotificationsOutline className="text-xl hover:text-purple-600" />
//                 {notificationCount > 0 && (
//                   <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full px-1.5">
//                     {notificationCount}
//                   </span>
//                 )}
//               </div>

//               {/* User Dropdown */}
//               <div className="relative">
//                 <button
//                   onClick={() => setUserDropdownOpen(!userDropdownOpen)}
//                   className="flex items-center gap-2"
//                 >
//                   <div className="bg-purple-600 text-white rounded-full h-8 w-8 flex items-center justify-center uppercase text-sm">
//                     {userInitials}
//                   </div>
//                   <FaChevronDown className="text-xs" />
//                 </button>
//                 {userDropdownOpen && (
//                   <div className="absolute right-0 mt-2 w-48 bg-white border rounded shadow-md z-10">
//                     <a href="#" className="block px-4 py-2 hover:bg-gray-100">
//                       Profile
//                     </a>
//                     <a href="#" className="block px-4 py-2 hover:bg-gray-100">
//                       Settings
//                     </a>
//                     <a
//                       href="#"
//                       className="block px-4 py-2 text-red-600 hover:bg-gray-100"
//                     >
//                       Logout
//                     </a>
//                   </div>
//                 )}
//               </div>
//             </div>
//           </div>
//         </div>

//         {/* Mobile Menu (simplified) */}
//         {menuOpen && (
//           <div className="md:hidden px-4 py-4 space-y-4 bg-white shadow">
//             <details className="border rounded">
//               <summary className="px-3 py-2 cursor-pointer font-medium">
//                 Tutorials
//               </summary>
//               <div className="p-2 space-y-2">
//                 {categories.map((cat) => {
//                   const subs = byCategory.get(String(cat._id)) || [];
//                   return (
//                     <details key={cat._id} className="ml-2">
//                       <summary className="px-2 py-1 cursor-pointer text-sm font-semibold">
//                         {cat.category_name || "Untitled"}
//                       </summary>
//                       <div className="pl-3 py-1 space-y-1">
//                         {subs.length === 0 && (
//                           <div className="text-xs text-gray-500 px-2">
//                             No subcategories
//                           </div>
//                         )}
//                         {subs.map((sub) => {
//                           const cs =
//                             coursesBySubcategory.get(String(sub._id)) || [];
//                           return (
//                             <details key={sub._id} className="ml-2">
//                               <summary className="px-2 py-1 cursor-pointer text-sm font-semibold">
//                                 {sub.subcategory_name || "Untitled"}
//                               </summary>
//                               <div className="pl-3 py-1 space-y-1">
//                                 {cs.length === 0 && (
//                                   <div className="text-xs text-gray-500 px-2">
//                                     No courses
//                                   </div>
//                                 )}
//                                 {cs.map((course) => (
//                                   <button
//                                     key={course._id || course.id}
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

//             <a
//               href="/apply-to-become-instructor"
//               className="block text-sm text-gray-800"
//             >
//               Become an Instructor
//             </a>
//             <a href="#" className="block text-sm text-gray-800">
//               My Courses
//             </a>
//             <div className="relative">
//               <input
//                 type="text"
//                 placeholder="Search"
//                 className="w-full rounded-full border px-4 py-1.5 pr-10 text-sm"
//               />
//               <FaSearch className="absolute right-4 top-2.5 text-gray-500 text-sm" />
//             </div>
//             <div className="flex items-center justify-around">
//               <AiOutlineHeart className="text-xl" />
//               <FiShoppingCart className="text-xl" />
//               <IoMdNotificationsOutline className="text-xl" />
//               <div className="bg-purple-600 text-white rounded-full h-8 w-8 flex items-center justify-center text-sm">
//                 {userInitials}
//               </div>
//             </div>
//           </div>
//         )}
//       </header>
//     </>
//   );
// };

// export default Header;

//

//

// src/components/common_components/Header.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  FaSearch,
  FaChevronDown,
  FaBars,
  FaTimes,
  FaChevronRight,
  FaBookOpen,
  FaLayerGroup,
} from "react-icons/fa";
import { FiShoppingCart } from "react-icons/fi";
import { AiOutlineHeart } from "react-icons/ai";
import { IoMdNotificationsOutline } from "react-icons/io";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import TopHeader from "./TopHeader";
import globalBackendRoute from "../../config/Config";

const Header = () => {
  const navigate = useNavigate();

  const [menuOpen, setMenuOpen] = useState(false);
  const [tutorialsOpen, setTutorialsOpen] = useState(false);

  const [selectedCatId, setSelectedCatId] = useState(null);
  const [selectedSubId, setSelectedSubId] = useState(null);

  // Data
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [courses, setCourses] = useState([]);

  // Auth (for /user-course/:userid/:courseid)
  const [userId, setUserId] = useState("guest");

  // --- auth bits for top-right menu ---
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userInfo, setUserInfo] = useState(null); // { id, name, role }
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const userMenuRef = useRef(null);

  // Badges (kept as-is)
  const wishlistCount = 3;
  const cartCount = 2;
  const notificationCount = 5;

  // Read user from token if present
  useEffect(() => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setIsLoggedIn(false);
        setUserInfo(null);
        setUserId("guest");
        return;
      }
      const decoded = jwtDecode(token);
      if (decoded?.id) setUserId(decoded.id);
      setIsLoggedIn(true);
      setUserInfo({
        id: decoded?.id || decoded?._id || "unknown",
        name: decoded?.name || "User",
        role: decoded?.role || "user",
      });
    } catch {
      setIsLoggedIn(false);
      setUserInfo(null);
      setUserId("guest");
    }
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const onDocClick = (e) => {
      if (!userMenuRef.current) return;
      if (!userMenuRef.current.contains(e.target)) {
        setUserDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  // Fetch categories, subcategories, courses
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const [catRes, subRes, courseRes] = await Promise.all([
          axios.get(`${globalBackendRoute}/api/all-categories`),
          axios.get(`${globalBackendRoute}/api/all-subcategories`),
          axios.get(`${globalBackendRoute}/api/list-courses`),
        ]);

        if (!alive) return;

        setCategories(Array.isArray(catRes.data) ? catRes.data : []);
        setSubcategories(Array.isArray(subRes.data) ? subRes.data : []);

        const coursePayload = Array.isArray(courseRes.data?.data)
          ? courseRes.data.data
          : Array.isArray(courseRes.data)
          ? courseRes.data
          : [];
        setCourses(coursePayload);
      } catch (err) {
        console.error("Header fetch failed:", err);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  // Build maps
  const byCategory = useMemo(() => {
    const map = new Map();
    subcategories.forEach((sub) => {
      const catId = String(sub.category?._id || sub.category || "");
      if (!catId) return;
      if (!map.has(catId)) map.set(catId, []);
      map.get(catId).push(sub);
    });
    return map;
  }, [subcategories]);

  const coursesBySubcategory = useMemo(() => {
    const map = new Map();
    courses.forEach((c) => {
      const subId = String(
        c.subcategory?._id ||
          c.subcategory ||
          c.subCategory?._id ||
          c.subCategory ||
          ""
      );
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

  const catSubs = selectedCatId
    ? byCategory.get(String(selectedCatId)) || []
    : [];
  const subCourses = selectedSubId
    ? coursesBySubcategory.get(String(selectedSubId)) || []
    : [];

  // 🧭 Updated navigation: /user-course/:userid/:courseid
  const navigateToCourse = (course) => {
    const id = course?._id || course?.id;
    if (!id) return;
    navigate(`/user-course/${userId}/${id}`);
    setTutorialsOpen(false);
    setSelectedSubId(null);
    setSelectedCatId(null);
  };

  // Initials from name
  const userInitials = useMemo(() => {
    const n = userInfo?.name || "";
    const parts = n.trim().split(/\s+/).slice(0, 2);
    if (parts.length) {
      return parts.map((p) => p[0]?.toUpperCase() || "").join("") || "U";
    }
    return "U";
  }, [userInfo?.name]);

  // Role-based dashboard route
  const dashboardRoute = useMemo(() => {
    const r = userInfo?.role;
    if (!r) return "/dashboard";
    const map = {
      admin: "/admin-dashboard",
      superadmin: "/superadmin-dashboard",
      student: "/student-dashboard",
      instructor: "/instructor-dashboard",
      user: "/user-dashboard",
    };
    return map[r] || "/dashboard";
  }, [userInfo?.role]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    setIsLoggedIn(false);
    setUserInfo(null);
    setUserDropdownOpen(false);
    navigate("/home", { replace: true }); // requirement #3
  };

  const goToProfile = () => {
    if (!userInfo?.id) return;
    setUserDropdownOpen(false);
    navigate(`/profile/${userInfo.id}`);
  };

  const goToDashboard = () => {
    setUserDropdownOpen(false);
    navigate(dashboardRoute);
  };

  const itemBase =
    "w-full text-left px-3 py-1.5 rounded hover:bg-gray-50 flex items-center justify-between";
  const itemText =
    "truncate text-[13px] font-medium tracking-tight text-gray-800";
  const lightHint = "text-[12px] text-gray-500 px-2 py-1";

  const CategoryItem = ({ cat }) => (
    <button
      className={`${itemBase} ${
        String(selectedCatId) === String(cat._id)
          ? "bg-purple-50 text-purple-700"
          : ""
      }`}
      onMouseEnter={() => {
        setSelectedCatId(cat._id);
        setSelectedSubId(null);
      }}
      onFocus={() => {
        setSelectedCatId(cat._id);
        setSelectedSubId(null);
      }}
    >
      <span className={`${itemText}`}>{cat.category_name || "Untitled"}</span>
      <FaChevronRight className="ml-2 text-[10px] opacity-70" />
    </button>
  );

  const SubcategoryItem = ({ sub }) => (
    <button
      className={`${itemBase} ${
        String(selectedSubId) === String(sub._id)
          ? "bg-indigo-50 text-indigo-700"
          : ""
      }`}
      onMouseEnter={() => setSelectedSubId(sub._id)}
      onFocus={() => setSelectedSubId(sub._id)}
    >
      <span className={`${itemText}`}>
        {sub.subcategory_name || "Untitled"}
      </span>
      <FaChevronRight className="ml-2 text-[10px] opacity-70" />
    </button>
  );

  return (
    <>
      <TopHeader />

      <header className="z-50 w-full bg-white shadow">
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
                      {/* Col 1: Categories */}
                      <div className="border rounded p-2">
                        <div className="flex items-center gap-2 text-[12px] font-semibold mb-1 tracking-tight text-gray-700">
                          <FaLayerGroup /> Categories
                        </div>
                        <div className="space-y-1">
                          {categories.length === 0 ? (
                            <div className={lightHint}>No categories found</div>
                          ) : (
                            categories.map((cat) => (
                              <CategoryItem key={cat._id} cat={cat} />
                            ))
                          )}
                        </div>
                      </div>

                      {/* Col 2: Subcategories */}
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
                              <SubcategoryItem key={sub._id} sub={sub} />
                            ))
                          )}
                        </div>
                      </div>

                      {/* Col 3: Courses */}
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
                                key={course._id || course.id}
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
              <a
                href="/apply-to-become-instructor"
                className="text-sm font-semibold text-gray-600 hover:text-purple-600"
              >
                Become an Instructor
              </a>
              <a
                href="#"
                className="text-sm font-semibold text-gray-600 hover:text-purple-600"
              >
                My Courses
              </a>
              <a
                href="/all-degrees"
                className="text-sm font-semibold text-gray-600 hover:text-purple-600"
              >
                Certification/Degree
              </a>
              <a
                href="/all-blogs"
                className="text-sm font-semibold text-gray-600 hover:text-purple-600"
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

              {/* Login / User menu (desktop) */}
              <div className="relative" ref={userMenuRef}>
                {!isLoggedIn ? (
                  // Logged OUT -> Login link
                  <a
                    href="/login"
                    className="text-sm font-semibold text-gray-600 hover:text-purple-600"
                  >
                    Login
                  </a>
                ) : (
                  // Logged IN -> initials + dropdown
                  <>
                    <button
                      onClick={() => setUserDropdownOpen((v) => !v)}
                      className="flex items-center gap-2"
                      aria-haspopup="menu"
                      aria-expanded={userDropdownOpen}
                    >
                      <div className="bg-purple-600 text-white rounded-full h-8 w-8 flex items-center justify-center uppercase text-sm">
                        {userInitials}
                      </div>
                      <FaChevronDown className="text-xs" />
                    </button>

                    {userDropdownOpen && (
                      <div
                        role="menu"
                        className="absolute right-0 mt-2 w-48 bg-white border rounded shadow-md z-20"
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

        {/* Mobile Menu (simplified) */}
        {menuOpen && (
          <div className="md:hidden px-4 py-4 space-y-4 bg-white shadow">
            <details className="border rounded">
              <summary className="px-3 py-2 cursor-pointer font-medium">
                Tutorials
              </summary>
              <div className="p-2 space-y-2">
                {categories.map((cat) => {
                  const subs = byCategory.get(String(cat._id)) || [];
                  return (
                    <details key={cat._id} className="ml-2">
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
                          const cs =
                            coursesBySubcategory.get(String(sub._id)) || [];
                          return (
                            <details key={sub._id} className="ml-2">
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
                                    key={course._id || course.id}
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

            <a
              href="/apply-to-become-instructor"
              className="block text-sm text-gray-800"
            >
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

            {/* Mobile right actions: login-aware */}
            <div className="flex items-center justify-around">
              <AiOutlineHeart className="text-xl" />
              <FiShoppingCart className="text-xl" />
              <IoMdNotificationsOutline className="text-xl" />
              {!isLoggedIn ? (
                <a
                  href="/login"
                  className="text-sm font-semibold text-purple-600 hover:text-purple-700"
                >
                  Login
                </a>
              ) : (
                <button
                  onClick={goToDashboard}
                  className="bg-purple-600 text-white rounded-full h-8 w-8 flex items-center justify-center text-sm uppercase"
                >
                  {userInitials}
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
