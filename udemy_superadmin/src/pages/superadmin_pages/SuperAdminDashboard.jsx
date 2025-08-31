// import React, { useEffect, useState } from "react";
// import { useNavigate } from "react-router-dom";
// import axios from "axios";
// import { jwtDecode } from "jwt-decode";
// import {
//   FaThList,
//   FaThLarge,
//   FaTh,
//   FaCog,
//   FaPlus,
//   FaBoxOpen,
//   FaUserCheck,
//   FaUserClock,
//   FaUserTimes,
// } from "react-icons/fa";

// import globalBackendRoute from "../../config/Config";
// import SearchBar from "../../components/common_components/SearchBar";
// import LeftSidebarNav from "../../components/common_components/LeftSidebarNav";
// import DashboardCard from "../../components/common_components/DashboardCard";
// import DashboardLayout from "../../components/common_components/DashboardLayout";
// import iconMap from "../../components/common_components/iconMap.jsx";
// import bgColorLogic from "../../components/common_components/bgColorLogic.jsx";
// import stopwords from "../../components/common_components/stopwords.jsx";

// const SuperadminDashboard = () => {
//   const navigate = useNavigate();
//   const [counts, setCounts] = useState({});
//   const [instructorCounts, setInstructorCounts] = useState(null);
//   const [search, setSearch] = useState("");
//   const [userId, setUserId] = useState(null);
//   const [view, setView] = useState("grid");

//   // 🔐 Auth check
//   useEffect(() => {
//     const token = localStorage.getItem("token");
//     if (!token) return navigate("/my-account");
//     try {
//       const decoded = jwtDecode(token);
//       setUserId(decoded.id);
//     } catch (error) {
//       navigate("/my-account");
//     }
//   }, [navigate]);

//   // 🔁 Fetch all dynamic dashboard counts (existing)
//   useEffect(() => {
//     const fetchCounts = async () => {
//       try {
//         const res = await axios.get(
//           `${globalBackendRoute}/api/dashboard-counts`
//         );
//         setCounts(res.data || {}); // keys: users, products, courses, etc.
//       } catch (err) {
//         console.error("Failed to fetch dashboard counts", err);
//       }
//     };
//     fetchCounts();
//   }, []);

//   // 🧑‍🏫 Fetch instructor application/status counts (new)
//   useEffect(() => {
//     const fetchInstructorCounts = async () => {
//       try {
//         const res = await axios.get(
//           `${globalBackendRoute}/api/instructors/counts`
//         );
//         if (res.data?.success) setInstructorCounts(res.data.data);
//         else setInstructorCounts(null);
//       } catch (err) {
//         console.error("Failed to fetch instructor counts", err);
//         setInstructorCounts(null);
//       }
//     };
//     fetchInstructorCounts();
//   }, []);

//   // 📦 Auto-generate cards from general counts (existing)
//   const baseCards = Object.entries(counts)
//     .map(([key, value]) => {
//       if (!value || value === 0) return null;

//       const title = key
//         .replace(/_/g, " ")
//         .replace(/\b\w/g, (c) => c.toUpperCase());

//       return {
//         key,
//         title,
//         value,
//         link: `/all-${key}`,
//         icon: iconMap[key] || <FaBoxOpen className="text-indigo-600" />,
//         bgColor: bgColorLogic(value),
//         state: null,
//       };
//     })
//     .filter(Boolean);

//   // 🧑‍🏫 Instructor-specific cards with BOTH query + state
//   const instructorCards = instructorCounts
//     ? [
//         {
//           key: "instructors_pending",
//           title: "Instructor Applicants (Pending)",
//           value: instructorCounts.pending || 0,
//           link: `/all-instructors-applications?status=pending`,
//           icon: iconMap["instructors_pending"] || (
//             <FaUserClock className="text-yellow-600" />
//           ),
//           bgColor: bgColorLogic(instructorCounts.pending || 0),
//           state: { status: "pending" },
//         },
//         {
//           key: "instructors_approved",
//           title: "Instructors (Approved)",
//           value: instructorCounts.approved || 0,
//           link: `/all-instructors-applications?status=approved`,
//           icon: iconMap["instructors_approved"] || (
//             <FaUserCheck className="text-green-600" />
//           ),
//           bgColor: bgColorLogic(instructorCounts.approved || 0),
//           state: { status: "approved" },
//         },
//         {
//           key: "instructors_rejected",
//           title: "Instructors (Rejected)",
//           value: instructorCounts.rejected || 0,
//           link: `/all-instructors-applications?status=rejected`,
//           icon: iconMap["instructors_rejected"] || (
//             <FaUserTimes className="text-red-600" />
//           ),
//           bgColor: bgColorLogic(instructorCounts.rejected || 0),
//           state: { status: "rejected" },
//         },
//         {
//           key: "instructors_active",
//           title: "Instructors (Active)",
//           value: instructorCounts.active || 0,
//           link: `/all-instructors-applications?active=true`,
//           icon: iconMap["instructors_active"] || (
//             <FaUserCheck className="text-indigo-600" />
//           ),
//           bgColor: bgColorLogic(instructorCounts.active || 0),
//           state: { active: true },
//         },
//         {
//           key: "instructors_inactive",
//           title: "Instructors (Inactive)",
//           value: instructorCounts.inactive || 0,
//           link: `/all-instructors-applications?active=false`,
//           icon: iconMap["instructors_inactive"] || (
//             <FaUserTimes className="text-gray-600" />
//           ),
//           bgColor: bgColorLogic(instructorCounts.inactive || 0),
//           state: { active: false },
//         },
//       ].filter((c) => c.value > 0)
//     : [];

//   const allCards = [...baseCards, ...instructorCards];

//   // 🔍 Filtered cards based on search
//   const filteredCards =
//     search.trim() === ""
//       ? allCards
//       : allCards.filter((card) => {
//           const text = `${card.title} ${card.value}`.toLowerCase();
//           const queryWords = search
//             .toLowerCase()
//             .split(/\s+/)
//             .filter((word) => !stopwords.includes(word));
//           return queryWords.some(
//             (word) =>
//               text.includes(word) || text.includes(word.replace(/s$/, ""))
//           );
//         });

//   return (
//     <div className="fullWidth py-6">
//       <div className="containerWidth">
//         {/* Header */}
//         <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center flex-wrap mb-6 gap-4">
//           <h1 className="headingText">Superadmin Dashboard</h1>
//           <div className="flex items-center flex-wrap gap-3">
//             <FaThList
//               className={`text-xl cursor-pointer ${
//                 view === "list" ? "text-indigo-600" : "text-gray-600"
//               }`}
//               onClick={() => setView("list")}
//             />
//             <FaThLarge
//               className={`text-xl cursor-pointer ${
//                 view === "card" ? "text-indigo-600" : "text-gray-600"
//               }`}
//               onClick={() => setView("card")}
//             />
//             <FaTh
//               className={`text-xl cursor-pointer ${
//                 view === "grid" ? "text-indigo-600" : "text-gray-600"
//               }`}
//               onClick={() => setView("grid")}
//             />
//             <SearchBar
//               value={search}
//               onChange={(e) => setSearch(e.target.value)}
//               placeholder="Search cards..."
//             />
//           </div>
//         </div>

//         {/* Layout */}
//         <DashboardLayout
//           left={
//             <LeftSidebarNav
//               navigate={navigate}
//               items={[
//                 {
//                   label: "Account Settings",
//                   icon: <FaCog className="text-indigo-600" />,
//                   path: `/profile/${userId}`,
//                 },
//                 {
//                   label: "Add Blog",
//                   icon: <FaPlus className="text-red-600" />,
//                   path: "/add-blog",
//                 },
//                 {
//                   label: "Add Category",
//                   icon: <FaPlus className="text-orange-400" />,
//                   path: "/add-category",
//                 },
//                 {
//                   label: "Add Sub Category",
//                   icon: <FaPlus className="text-orange-600" />,
//                   path: "/add-sub-category",
//                 },
//                 {
//                   label: "Add Degree",
//                   icon: <FaBoxOpen className="text-green-600" />,
//                   path: "/create-degree",
//                 },
//                 {
//                   label: "Add Semisters",
//                   icon: <FaPlus className="text-orange-600" />,
//                   path: "/create-semister",
//                 },
//                 {
//                   label: "Create Course",
//                   icon: <FaPlus className="text-green-400" />,
//                   path: "/create-course",
//                 },
//                 {
//                   label: "Create Exam",
//                   icon: <FaPlus className="text-green-600" />,
//                   path: "/create-exam",
//                 },
//                 {
//                   label: "Create Student",
//                   icon: <FaPlus className="text-green-600" />,
//                   path: "/student-register",
//                 },
//               ]}
//             />
//           }
//           right={
//             <div
//               className={`${
//                 view === "grid"
//                   ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4"
//                   : view === "card"
//                   ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
//                   : "space-y-4"
//               }`}
//             >
//               {filteredCards.map((card) => (
//                 <DashboardCard
//                   key={card.key}
//                   card={card}
//                   view={view}
//                   onClick={() =>
//                     navigate(card.link, { state: card.state || null })
//                   }
//                 />
//               ))}
//             </div>
//           }
//         />
//       </div>
//     </div>
//   );
// };

// export default SuperadminDashboard;

//

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import {
  FaThList,
  FaThLarge,
  FaTh,
  FaCog,
  FaPlus,
  FaBoxOpen,
  FaUserCheck,
  FaUserClock,
  FaUserTimes,
} from "react-icons/fa";

import globalBackendRoute from "../../config/Config";
import SearchBar from "../../components/common_components/SearchBar";
import LeftSidebarNav from "../../components/common_components/LeftSidebarNav";
import DashboardCard from "../../components/common_components/DashboardCard";
import DashboardLayout from "../../components/common_components/DashboardLayout";
import iconMap from "../../components/common_components/iconMap.jsx";
import stopwords from "../../components/common_components/stopwords.jsx";

// Fixed, pleasant bg colors for cards
const colorPalette = [
  "bg-indigo-50",
  "bg-blue-50",
  "bg-green-50",
  "bg-amber-50",
  "bg-pink-50",
  "bg-purple-50",
  "bg-teal-50",
  "bg-rose-50",
  "bg-cyan-50",
  "bg-lime-50",
];

// deterministic color per key
const colorForKey = (key = "") => {
  const s = String(key);
  let sum = 0;
  for (let i = 0; i < s.length; i++)
    sum = (sum + s.charCodeAt(i)) % colorPalette.length;
  return colorPalette[sum];
};

const SuperadminDashboard = () => {
  const navigate = useNavigate();
  const [counts, setCounts] = useState({});
  const [instructorCounts, setInstructorCounts] = useState(null);
  const [search, setSearch] = useState("");
  const [userId, setUserId] = useState(null);
  const [view, setView] = useState("grid");

  // Auth check
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return navigate("/my-account");
    try {
      const decoded = jwtDecode(token);
      setUserId(decoded.id);
    } catch {
      navigate("/my-account");
    }
  }, [navigate]);

  // General dashboard counts
  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const res = await axios.get(
          `${globalBackendRoute}/api/dashboard-counts`
        );
        setCounts(res.data || {});
      } catch (err) {
        console.error("Failed to fetch dashboard counts", err);
      }
    };
    fetchCounts();
  }, []);

  // Instructor application/status counts
  useEffect(() => {
    const fetchInstructorCounts = async () => {
      try {
        const res = await axios.get(
          `${globalBackendRoute}/api/instructors/counts`
        );
        if (res.data?.success) setInstructorCounts(res.data.data);
        else setInstructorCounts(null);
      } catch (err) {
        console.error("Failed to fetch instructor counts", err);
        setInstructorCounts(null);
      }
    };
    fetchInstructorCounts();
  }, []);

  // Auto-generate cards from general counts (fixed colors)
  const baseCards = Object.entries(counts)
    .map(([key, value]) => {
      if (!value || value === 0) return null;

      const title = key
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());

      return {
        key,
        title,
        value,
        link: `/all-${key}`,
        icon: iconMap[key] || <FaBoxOpen className="text-indigo-600" />,
        bgColor: colorForKey(key),
      };
    })
    .filter(Boolean);

  // Instructor-specific cards (explicit colors)
  const instructorCards = instructorCounts
    ? [
        {
          key: "instructors_pending",
          title: "Instructor Applicants (Pending)",
          value: instructorCounts.pending || 0,
          link: `/all-instructors-applications?status=pending`,
          icon: iconMap["instructors_pending"] || (
            <FaUserClock className="text-yellow-600" />
          ),
          bgColor: "bg-yellow-50",
        },
        {
          key: "instructors_approved",
          title: "Instructors (Approved)",
          value: instructorCounts.approved || 0,
          link: `/all-instructors-applications?status=approved`,
          icon: iconMap["instructors_approved"] || (
            <FaUserCheck className="text-green-600" />
          ),
          bgColor: "bg-green-50",
        },
        {
          key: "instructors_rejected",
          title: "Instructors (Rejected)",
          value: instructorCounts.rejected || 0,
          link: `/all-instructors-applications?status=rejected`,
          icon: iconMap["instructors_rejected"] || (
            <FaUserTimes className="text-red-600" />
          ),
          bgColor: "bg-rose-50",
        },
        {
          key: "instructors_active",
          title: "Instructors (Active)",
          value: instructorCounts.active || 0,
          link: `/all-instructors-applications?active=true`,
          icon: iconMap["instructors_active"] || (
            <FaUserCheck className="text-indigo-600" />
          ),
          bgColor: "bg-indigo-50",
        },
        {
          key: "instructors_inactive",
          title: "Instructors (Inactive)",
          value: instructorCounts.inactive || 0,
          link: `/all-instructors-applications?active=false`,
          icon: iconMap["instructors_inactive"] || (
            <FaUserTimes className="text-gray-600" />
          ),
          bgColor: "bg-gray-100",
        },
      ].filter((c) => c.value > 0)
    : [];

  const allCards = [...baseCards, ...instructorCards];

  // Search filtering
  const filteredCards =
    search.trim() === ""
      ? allCards
      : allCards.filter((card) => {
          const text = `${card.title} ${card.value}`.toLowerCase();
          const queryWords = search
            .toLowerCase()
            .split(/\s+/)
            .filter((word) => word && !stopwords.includes(word));
          return queryWords.some(
            (word) =>
              text.includes(word) || text.includes(word.replace(/s$/, ""))
          );
        });

  return (
    <div className="fullWidth py-6">
      <div className="containerWidth">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center flex-wrap mb-6 gap-4">
          <h1 className="headingText">Superadmin Dashboard</h1>
          <div className="flex items-center flex-wrap gap-3">
            <FaThList
              className={`text-xl cursor-pointer ${
                view === "list" ? "text-indigo-600" : "text-gray-600"
              }`}
              onClick={() => setView("list")}
            />
            <FaThLarge
              className={`text-xl cursor-pointer ${
                view === "card" ? "text-indigo-600" : "text-gray-600"
              }`}
              onClick={() => setView("card")}
            />
            <FaTh
              className={`text-xl cursor-pointer ${
                view === "grid" ? "text-indigo-600" : "text-gray-600"
              }`}
              onClick={() => setView("grid")}
            />
            <SearchBar
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search cards..."
            />
          </div>
        </div>

        {/* Layout */}
        <DashboardLayout
          left={
            <LeftSidebarNav
              navigate={navigate}
              items={[
                {
                  label: "Account Settings",
                  icon: <FaCog className="text-indigo-600" />,
                  path: `/profile/${userId}`,
                },
                {
                  label: "Add Blog",
                  icon: <FaPlus className="text-red-600" />,
                  path: "/add-blog",
                },
                {
                  label: "Add Category",
                  icon: <FaPlus className="text-orange-400" />,
                  path: "/add-category",
                },
                {
                  label: "Add Sub Category",
                  icon: <FaPlus className="text-orange-600" />,
                  path: "/add-sub-category",
                },
                {
                  label: "Add Degree",
                  icon: <FaBoxOpen className="text-green-600" />,
                  path: "/create-degree",
                },
                {
                  label: "Add Semisters",
                  icon: <FaPlus className="text-orange-600" />,
                  path: "/create-semister",
                },
                {
                  label: "Create Course",
                  icon: <FaPlus className="text-green-400" />,
                  path: "/create-course",
                },
                {
                  label: "Create Exam",
                  icon: <FaPlus className="text-green-600" />,
                  path: "/create-exam",
                },
                {
                  label: "Create Student",
                  icon: <FaPlus className="text-green-600" />,
                  path: "/student-register",
                },
              ]}
            />
          }
          right={
            <div
              className={`${
                view === "grid"
                  ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4"
                  : view === "card"
                  ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
                  : "space-y-4"
              }`}
            >
              {filteredCards.map((card) => (
                <DashboardCard
                  key={card.key}
                  card={card}
                  view={view}
                  // ✅ no state passed
                  onClick={() => navigate(card.link)}
                />
              ))}
            </div>
          }
        />
      </div>
    </div>
  );
};

export default SuperadminDashboard;
