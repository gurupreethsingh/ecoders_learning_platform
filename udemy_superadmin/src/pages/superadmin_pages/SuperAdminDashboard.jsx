// pages/SuperadminDashboard.jsx
import React, { useEffect, useState, useMemo } from "react";
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
  FaEnvelope,
} from "react-icons/fa";

import globalBackendRoute from "../../config/Config.js";
import SearchBar from "../../components/common_components/SearchBar";
import LeftSidebarNav from "../../components/common_components/LeftSidebarNav";
import DashboardCard from "../../components/common_components/DashboardCard";
import DashboardLayout from "../../components/common_components/DashboardLayout";
import iconMap from "../../components/common_components/iconMap.jsx";
import stopwords from "../../components/common_components/stopwords.jsx";

/* ---------------- UI helpers ---------------- */
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
const colorForKey = (key = "") => {
  const s = String(key);
  let sum = 0;
  for (let i = 0; i < s.length; i++)
    sum = (sum + s.charCodeAt(i)) % colorPalette.length;
  return colorPalette[sum];
};
const coerceNumber = (v, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

/* ---------------- HARD DEFAULTS so cards never vanish ----------------
   Exactly the attributes you listed, normalized to plural keys.
   (We keep "semesters" here; backend builds it from SemisterModel.)
--------------------------------------------------------------------- */
const DEFAULT_COUNT_KEYS = {
  blogs: 0,
  categories: 0,
  contacts: 0,
  courses: 0,
  degrees: 0,
  exams: 0,
  instructors: 0,
  notifications: 0,
  questions: 0,
  quizzes: 0,
  semesters: 0,
  subcategories: 0,
  users: 0,
  students: 0,
};

const SuperadminDashboard = () => {
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [view, setView] = useState("grid");
  const [userId, setUserId] = useState(null);

  // counts for the main cards (always seeded with defaults)
  const [counts, setCounts] = useState(DEFAULT_COUNT_KEYS);

  // instructor app/status breakdown (optional section)
  const [instructorCounts, setInstructorCounts] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
    active: 0,
    inactive: 0,
  });

  // Contact message quick card (unread dot)
  const [msgTotal, setMsgTotal] = useState(0);
  const [msgUnread, setMsgUnread] = useState(0);

  /* ---------------- Auth ---------------- */
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

  /* ---------------- Dashboard counts (resilient) ---------------- */
  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const res = await axios.get(
          `${globalBackendRoute}/api/dashboard-counts`
        );
        const payload = res.data || {};
        const coerced = Object.fromEntries(
          Object.entries(payload).map(([k, v]) => [k, coerceNumber(v, 0)])
        );
        setCounts({ ...DEFAULT_COUNT_KEYS, ...coerced }); // overlay onto defaults
      } catch (err) {
        console.error("Failed to fetch dashboard counts", err);
        setCounts(DEFAULT_COUNT_KEYS); // keep defaults so every card shows 0
      }
    };
    fetchCounts();
  }, []);

  /* ---------------- Instructor counts (optional) ---------------- */
  useEffect(() => {
    const fetchInstructorCounts = async () => {
      try {
        const res = await axios.get(
          `${globalBackendRoute}/api/instructors/counts`
        );
        if (res.data?.success && res.data?.data) {
          const d = res.data.data;
          setInstructorCounts({
            pending: coerceNumber(d.pending, 0),
            approved: coerceNumber(d.approved, 0),
            rejected: coerceNumber(d.rejected, 0),
            active: coerceNumber(d.active, 0),
            inactive: coerceNumber(d.inactive, 0),
          });
        } else {
          setInstructorCounts({
            pending: 0,
            approved: 0,
            rejected: 0,
            active: 0,
            inactive: 0,
          });
        }
      } catch (err) {
        console.error("Failed to fetch instructor counts", err);
        setInstructorCounts({
          pending: 0,
          approved: 0,
          rejected: 0,
          active: 0,
          inactive: 0,
        });
      }
    };
    fetchInstructorCounts();
  }, []);

  /* ---------------- Contact messages quick card ---------------- */
  useEffect(() => {
    let timer;
    const fetchContactCounts = async () => {
      try {
        // Unread
        const unreadRes = await axios.get(
          `${globalBackendRoute}/api/messages/unread-count`
        );
        const unread =
          coerceNumber(unreadRes.data?.unreadCount, 0) ??
          coerceNumber(unreadRes.data?.count, 0) ??
          coerceNumber(unreadRes.data?.data?.unread, 0);
        setMsgUnread(unread);

        // Total (with robust fallbacks)
        let total = 0;
        try {
          const totalRes = await axios.get(
            `${globalBackendRoute}/api/messages/get-messages-count`
          );
          if (typeof totalRes.data === "object" && totalRes.data) {
            if (typeof totalRes.data.total !== "undefined")
              total = coerceNumber(totalRes.data.total, 0);
            else if (typeof totalRes.data.count !== "undefined")
              total = coerceNumber(totalRes.data.count, 0);
            else if (
              totalRes.data.data &&
              typeof totalRes.data.data.total !== "undefined"
            )
              total = coerceNumber(totalRes.data.data.total, 0);
            else total = 0;
          }
        } catch {
          try {
            const allRes = await axios.get(
              `${globalBackendRoute}/api/all-messages`
            );
            const arr = Array.isArray(allRes.data)
              ? allRes.data
              : allRes.data?.data || [];
            total = arr.length || 0;
          } catch {
            total = 0;
          }
        }
        setMsgTotal(total);
      } catch (err) {
        console.error("Failed to fetch contact message counts", err);
        setMsgUnread(0);
        setMsgTotal(0);
      }
    };

    fetchContactCounts();
    timer = setInterval(fetchContactCounts, 30000);
    const onVis = () =>
      document.visibilityState === "visible" && fetchContactCounts();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  /* ---------------- Cards from counts (never drop zeros) ---------------- */
  const baseCards = useMemo(
    () =>
      Object.entries(counts).map(([key, value]) => {
        const title = key
          .replace(/_/g, " ")
          .replace(/\b\w/g, (c) => c.toUpperCase());
        return {
          key,
          title,
          value: coerceNumber(value, 0),
          link: `/all-${key}`,
          icon: iconMap[key] || <FaBoxOpen className="text-indigo-600" />,
          bgColor: colorForKey(key),
        };
      }),
    [counts]
  );

  /* ---------------- Instructor breakdown (optional add-ons) ---------------- */
  const instructorBreakdownCards = useMemo(() => {
    const d = instructorCounts || {};
    return [
      {
        key: "instructors_pending",
        title: "Instructor Applicants (Pending)",
        value: coerceNumber(d.pending, 0),
        link: `/all-instructors-applications?status=pending`,
        icon: <FaUserClock className="text-yellow-600" />,
        bgColor: "bg-yellow-50",
      },
      {
        key: "instructors_approved",
        title: "Instructors (Approved)",
        value: coerceNumber(d.approved, 0),
        link: `/all-instructors-applications?status=approved`,
        icon: <FaUserCheck className="text-green-600" />,
        bgColor: "bg-green-50",
      },
      {
        key: "instructors_rejected",
        title: "Instructors (Rejected)",
        value: coerceNumber(d.rejected, 0),
        link: `/all-instructors-applications?status=rejected`,
        icon: <FaUserTimes className="text-red-600" />,
        bgColor: "bg-rose-50",
      },
    ];
  }, [instructorCounts]);

  // Contact Messages quick card (always show)
  const contactQuickCard = useMemo(
    () => ({
      key: "contact_messages", // distinct from "contacts" in baseCards
      title: "Contact Messages",
      value: coerceNumber(msgTotal, 0),
      link: "/all-messages",
      icon: <FaEnvelope className="text-emerald-600" />,
      bgColor: "bg-emerald-50",
      unread: coerceNumber(msgUnread, 0),
    }),
    [msgTotal, msgUnread]
  );

  // Compose all cards; avoid duplicates via "first wins" rule
  const allCards = useMemo(() => {
    const ordered = [
      contactQuickCard, // shows unread dot
      ...baseCards, // includes "contacts" (will be de-duped by the quick card)
      ...instructorBreakdownCards,
    ];
    const byKey = {};
    for (const c of ordered) if (c && !byKey[c.key]) byKey[c.key] = c;
    return Object.values(byKey);
  }, [contactQuickCard, baseCards, instructorBreakdownCards]);

  // Search
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
                  label: "Add Semesters",
                  icon: <FaPlus className="text-orange-600" />,
                  path: "/create-semister",
                }, // route name kept to your existing
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
                {
                  label: "Create Quiz",
                  icon: <FaPlus className="text-green-600" />,
                  path: "/create-quiz",
                },
                {
                  label: "Create Question",
                  icon: <FaPlus className="text-fuchsia-600" />,
                  path: "/create-question",
                },
                {
                  label: "Create Notification",
                  icon: <FaPlus className="text-purple-500" />,
                  path: "/create-notification",
                },
                {
                  label: "Create Activity",
                  icon: <FaPlus className="text-purple-800" />,
                  path: "/create-activity",
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
              {filteredCards.map((card) => {
                const cardEl = (
                  <DashboardCard
                    key={card.key}
                    card={card}
                    view={view}
                    onClick={() => navigate(card.link)}
                  />
                );

                // Red dot for unread contact messages
                if (
                  card.key === "contact_messages" &&
                  coerceNumber(card.unread, 0) > 0
                ) {
                  return (
                    <div
                      key={card.key}
                      className="relative"
                      onClick={() => navigate(card.link)}
                    >
                      {cardEl}
                      <span
                        title={`${card.unread} unread`}
                        className="absolute -top-1 -right-1 inline-flex items-center justify-center w-4 h-4 rounded-full bg-red-500 ring-2 ring-white"
                      />
                    </div>
                  );
                }
                return cardEl;
              })}
            </div>
          }
        />
      </div>
    </div>
  );
};

export default SuperadminDashboard;
