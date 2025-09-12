// udemy_frontend/src/pages/notification_pages/AllUserNotifications.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { FaThList, FaThLarge, FaTh, FaSearch, FaFilter } from "react-icons/fa";
import { IoMdNotificationsOutline } from "react-icons/io";
import { FaEnvelopeOpenText, FaDotCircle } from "react-icons/fa";
import globalBackendRoute from "../../config/Config";
import { getAuthorizationHeader } from "../../components/auth_components/AuthManager";

/* ------------------------------- utils ---------------------------------- */
const slugify = (s = "") =>
  s
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[\s\W-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

const safeArr = (v) => (Array.isArray(v) ? v : []);
const toLocal = (d) => (d ? new Date(d).toLocaleString() : "");

/* --------------------------- component ----------------------------------- */
const PAGE_BATCH = 250; // fetch in big pages once then paginate client-side
const ROWS_CHOICES = [10, 20, 50, 100];

const AllUserNotifications = () => {
  // full dataset (deliveries with populated notification)
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  // client-side controls
  const [view, setView] = useState("list"); // 'list' | 'card' | 'grid'  (default list)
  const [searchQuery, setSearchQuery] = useState("");
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [page, setPage] = useState(1);

  // filters (left sidebar)
  const [seenFilter, setSeenFilter] = useState("all"); // all | seen | unseen
  const [category, setCategory] = useState("all");
  const [priority, setPriority] = useState("all");
  const [channel, setChannel] = useState("all");
  const [dateSince, setDateSince] = useState(""); // yyyy-mm-dd
  const [dateUntil, setDateUntil] = useState(""); // yyyy-mm-dd

  // sorting
  const [sort, setSort] = useState("created_desc");
  // created_desc | created_asc | title_asc | title_desc | unseen_first | seen_first

  /* ----------------------------- fetch all -------------------------------- */
  useEffect(() => {
    let alive = true;
    const fetchAll = async () => {
      setLoading(true);
      try {
        let p = 1;
        let all = [];
        while (true) {
          const res = await axios.get(
            `${globalBackendRoute}/api/my-notification-feed`,
            {
              params: { sort: "-createdAt", page: p, limit: PAGE_BATCH },
              headers: { ...getAuthorizationHeader() },
            }
          );
          const chunk = Array.isArray(res?.data?.data) ? res.data.data : [];
          all = all.concat(chunk);
          if (chunk.length < PAGE_BATCH) break; // no more pages
          if (p >= 20) break; // defensive cap
          p += 1;
        }

        if (!alive) return;

        // normalize for fast render & filtering
        const normalized = all
          .filter((d) => d?.notification)
          .map((d) => {
            const n = d.notification || {};
            return {
              deliveryId: d._id,
              seen: !!d.seen,
              seenAt: d.seenAt ? new Date(d.seenAt) : null,
              dismissedAt: d.dismissedAt ? new Date(d.dismissedAt) : null,
              notificationId: n._id,
              title: n.title || "Notification",
              message: n.message || "",
              html: n.html || "",
              createdAt: n.createdAt ? new Date(n.createdAt) : null,
              category: n.category || null,
              priority: n.priority || null,
              channels: safeArr(n.channels || n.channel || []),
              tags: safeArr(n.tags),
            };
          });

        setRows(normalized);
      } catch (err) {
        console.error("Failed to load notifications:", err);
        setRows([]);
      } finally {
        if (alive) setLoading(false);
      }
    };

    fetchAll();
    return () => {
      alive = false;
    };
  }, []);

  /* --------------------------- derived lists ------------------------------ */
  const uniqueCategories = useMemo(() => {
    const set = new Set();
    rows.forEach((r) => r.category && set.add(String(r.category)));
    return Array.from(set);
  }, [rows]);

  const uniquePriorities = useMemo(() => {
    const set = new Set();
    rows.forEach((r) => r.priority && set.add(String(r.priority)));
    return Array.from(set);
  }, [rows]);

  const uniqueChannels = useMemo(() => {
    const set = new Set();
    rows.forEach((r) => r.channels.forEach((c) => set.add(String(c))));
    return Array.from(set);
  }, [rows]);

  /* ------------------------------ filtering ------------------------------- */
  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const since = dateSince ? new Date(dateSince) : null;
    const until = dateUntil ? new Date(dateUntil) : null;

    return rows.filter((r) => {
      // seen/unseen
      if (seenFilter === "seen" && !r.seen) return false;
      if (seenFilter === "unseen" && r.seen) return false;

      // category / priority / channel
      if (category !== "all" && String(r.category) !== String(category))
        return false;
      if (priority !== "all" && String(r.priority) !== String(priority))
        return false;
      if (
        channel !== "all" &&
        !r.channels.map(String).includes(String(channel))
      )
        return false;

      // date range on createdAt
      if (since && r.createdAt && r.createdAt < since) return false;
      if (
        until &&
        r.createdAt &&
        r.createdAt > new Date(until.getTime() + 86399000)
      )
        return false; // include whole day

      // search in title/message/tags
      if (q) {
        const hay = (
          r.title +
          " " +
          r.message +
          " " +
          r.tags.join(" ")
        ).toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [
    rows,
    seenFilter,
    category,
    priority,
    channel,
    searchQuery,
    dateSince,
    dateUntil,
  ]);

  /* -------------------------------- sorting ------------------------------- */
  const sorted = useMemo(() => {
    const copy = filtered.slice();
    switch (sort) {
      case "created_asc":
        copy.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
        break;
      case "title_asc":
        copy.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case "title_desc":
        copy.sort((a, b) => b.title.localeCompare(a.title));
        break;
      case "unseen_first":
        copy.sort((a, b) => Number(a.seen) - Number(b.seen));
        break;
      case "seen_first":
        copy.sort((a, b) => Number(b.seen) - Number(a.seen));
        break;
      case "created_desc":
      default:
        copy.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    }
    return copy;
  }, [filtered, sort]);

  /* ------------------------------ pagination ------------------------------ */
  useEffect(() => {
    setPage(1);
  }, [
    searchQuery,
    seenFilter,
    category,
    priority,
    channel,
    rowsPerPage,
    sort,
    dateSince,
    dateUntil,
  ]);

  const total = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / Math.max(1, rowsPerPage)));
  const currentPage = Math.min(page, totalPages);
  const startIdx = (currentPage - 1) * rowsPerPage;
  const endIdx = Math.min(startIdx + rowsPerPage, total);
  const visible = sorted.slice(startIdx, endIdx);

  const goTo = (p) => setPage(Math.min(Math.max(1, p), totalPages));
  const buildPages = () => {
    const pages = [];
    const maxBtns = 7;
    if (totalPages <= maxBtns) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
      return pages;
    }
    pages.push(1);
    if (currentPage > 4) pages.push("…");
    const s = Math.max(2, currentPage - 1);
    const e = Math.min(totalPages - 1, currentPage + 1);
    for (let i = s; i <= e; i++) pages.push(i);
    if (currentPage < totalPages - 3) pages.push("…");
    pages.push(totalPages);
    return pages;
  };

  /* --------------------------------- UI ----------------------------------- */
  const clearFilters = () => {
    setSeenFilter("all");
    setCategory("all");
    setPriority("all");
    setChannel("all");
    setDateSince("");
    setDateUntil("");
    setSearchQuery("");
  };

  const ItemListRow = ({ r }) => {
    const href = `/my-notification/${slugify(r.title)}/${r.notificationId}/${
      r.deliveryId
    }`;
    return (
      <Link
        to={href}
        className="block border rounded-lg p-3 sm:p-4 bg-white hover:shadow-sm transition mt-3"
      >
        <div className="flex items-start gap-3">
          <div className="mt-1 shrink-0">
            {r.seen ? (
              <FaEnvelopeOpenText className="text-gray-400" />
            ) : (
              <FaDotCircle className="text-red-500" title="Unseen" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <div className="font-semibold text-gray-900 truncate">
                {r.title}
              </div>
              {r.priority && (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {String(r.priority)}
                </span>
              )}
              {r.category && (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-50 text-gray-700 border">
                  {String(r.category)}
                </span>
              )}
            </div>
            <div className="text-sm text-gray-600 line-clamp-2">
              {r.message}
            </div>
            <div className="text-xs text-gray-400 mt-1">
              {r.createdAt ? toLocal(r.createdAt) : ""}
              {r.channels.length > 0 && (
                <span className="ml-2">
                  • {r.channels.map((c) => `#${c}`).join(", ")}
                </span>
              )}
            </div>
          </div>
        </div>
      </Link>
    );
  };

  const ItemCard = ({ r }) => {
    const href = `/my-notification/${slugify(r.title)}/${r.notificationId}/${
      r.deliveryId
    }`;
    return (
      <Link
        to={href}
        className="block bg-white border rounded-xl p-4 shadow-sm hover:shadow-md transition"
      >
        <div className="flex items-center justify-between">
          <div className="font-semibold text-gray-900 truncate">{r.title}</div>
          {r.seen ? (
            <FaEnvelopeOpenText className="text-gray-400" />
          ) : (
            <FaDotCircle className="text-red-500" title="Unseen" />
          )}
        </div>
        <div className="mt-1 text-xs text-gray-500">
          {r.createdAt ? toLocal(r.createdAt) : ""}
        </div>
        <div className="mt-2 text-sm text-gray-700 line-clamp-3">
          {r.message}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {r.priority && (
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
              {String(r.priority)}
            </span>
          )}
          {r.category && (
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-50 text-gray-700 border">
              {String(r.category)}
            </span>
          )}
          {r.channels.map((c) => (
            <span
              key={c}
              className="text-[11px] px-2 py-0.5 rounded-full bg-gray-50 text-gray-700 border"
            >
              #{c}
            </span>
          ))}
        </div>
      </Link>
    );
  };

  const ItemGrid = ({ r }) => {
    const href = `/my-notification/${slugify(r.title)}/${r.notificationId}/${
      r.deliveryId
    }`;
    return (
      <Link
        to={href}
        className="block bg-white border rounded-lg p-3 hover:shadow-sm transition"
      >
        <div className="flex items-center justify-between">
          <div className="font-medium text-gray-900 truncate">{r.title}</div>
          {!r.seen && <span className="text-[10px] text-red-600">NEW</span>}
        </div>
        <div className="mt-1 text-[12px] text-gray-500">
          {r.createdAt ? toLocal(r.createdAt) : ""}
        </div>
        <div className="mt-2 text-[13px] text-gray-700 line-clamp-2">
          {r.message}
        </div>
      </Link>
    );
  };

  return (
    <div className="p-3 sm:p-4 md:p-6 max-w-7xl mx-auto border-b">
      {/* ====================== TOP TOOLBAR (one line, all sizes) ===================== */}
      <div className="mb-3 sm:mb-4">
        <div
          className="
            flex items-center gap-3 sm:gap-4 
            overflow-x-auto whitespace-nowrap
            py-2 px-3 bg-white rounded-xl shadow
            custom-toolbar-scroll
          "
        >
          {/* Title + counts */}
          <div className="flex items-center gap-2 shrink-0">
            <IoMdNotificationsOutline className="text-xl text-indigo-600" />
            <span className="text-base sm:text-lg font-bold">
              My Notifications
            </span>
            <span className="text-gray-500 text-sm">({total})</span>
            <span className="hidden sm:inline text-sm text-gray-600">
              • Showing{" "}
              <span className="font-semibold">
                {total === 0 ? 0 : startIdx + 1}–{endIdx}
              </span>{" "}
              of <span className="font-semibold">{total}</span>
            </span>
          </div>

          {/* Separator */}
          <span className="h-5 w-px bg-gray-200 shrink-0" />

          {/* View toggles */}
          <div className="flex items-center gap-3 rounded-full px-3 py-1.5 bg-white shrink-0">
            <FaThList
              className={`text-lg cursor-pointer ${
                view === "list" ? "text-indigo-600" : "text-gray-500"
              }`}
              onClick={() => setView("list")}
              title="List view"
            />
            <FaThLarge
              className={`text-lg cursor-pointer ${
                view === "card" ? "text-indigo-600" : "text-gray-500"
              }`}
              onClick={() => setView("card")}
              title="Card view"
            />
            <FaTh
              className={`text-lg cursor-pointer ${
                view === "grid" ? "text-indigo-600" : "text-gray-500"
              }`}
              onClick={() => setView("grid")}
              title="Grid view"
            />
          </div>

          {/* Search */}
          <div className="relative shrink-0">
            <FaSearch className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search…"
              className="pl-8 pr-3 py-2 border rounded-full w-[150px] sm:w-[220px] md:w-[300px] text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search notifications"
            />
          </div>

          {/* Sort */}
          <div className="flex items-center gap-2 shrink-0">
            <label className="text-sm text-gray-600 hidden md:block">
              Sort:
            </label>
            <select
              className="text-sm border rounded-md px-2 py-1.5"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              aria-label="Sort notifications"
            >
              <option value="created_desc">Newest first</option>
              <option value="created_asc">Oldest first</option>
              <option value="unseen_first">Unseen first</option>
              <option value="seen_first">Seen first</option>
              <option value="title_asc">Title A–Z</option>
              <option value="title_desc">Title Z–A</option>
            </select>
          </div>

          {/* Rows per page */}
          <div className="flex items-center gap-2 shrink-0">
            <label className="text-sm text-gray-600 hidden md:block">
              Rows:
            </label>
            <select
              className="text-sm border rounded-md px-2 py-1.5"
              value={rowsPerPage}
              onChange={(e) =>
                setRowsPerPage(Number(e.target.value) || ROWS_CHOICES[0])
              }
              aria-label="Rows per page"
            >
              {ROWS_CHOICES.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
        {/* ---------------------------- Left Sidebar ------------------------- */}
        <aside className="lg:w-1/4 space-y-4">
          <div className="flex items-center gap-2">
            <FaFilter className="text-gray-500" />
            <h3 className="text-lg sm:text-xl font-bold">Filters</h3>
          </div>

          {/* Seen filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <div className="grid grid-cols-3 gap-2">
              {["all", "unseen", "seen"].map((opt) => (
                <button
                  key={opt}
                  onClick={() => setSeenFilter(opt)}
                  className={`px-2 py-1 rounded text-sm border ${
                    seenFilter === opt
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  {opt[0].toUpperCase() + opt.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <select
              className="w-full text-sm border rounded-md px-2 py-2"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="all">All</option>
              {uniqueCategories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Priority
            </label>
            <select
              className="w-full text-sm border rounded-md px-2 py-2"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
            >
              <option value="all">All</option>
              {uniquePriorities.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          {/* Channel */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Channel
            </label>
            <select
              className="w-full text-sm border rounded-md px-2 py-2"
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
            >
              <option value="all">All</option>
              {uniqueChannels.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Date range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date range
            </label>
            <div className="flex items-center gap-2">
              <input
                type="date"
                className="w-full border rounded-md px-2 py-2 text-sm"
                value={dateSince}
                onChange={(e) => setDateSince(e.target.value)}
              />
              <span className="text-gray-400">—</span>
              <input
                type="date"
                className="w-full border rounded-md px-2 py-2 text-sm"
                value={dateUntil}
                onChange={(e) => setDateUntil(e.target.value)}
              />
            </div>
          </div>

          {/* Clear */}
          <button
            onClick={clearFilters}
            className="w-full px-3 py-2 text-sm rounded-md border text-indigo-700 border-indigo-200 hover:bg-indigo-50 bg-white"
            title="Clear all filters"
          >
            Clear All
          </button>
        </aside>

        {/* ---------------------------- Right Panel -------------------------- */}
        <section className="flex-1">
          {/* Items */}
          <div
            className={
              view === "list"
                ? "space-y-2 sm:space-y-3"
                : view === "card"
                ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6"
                : "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4"
            }
          >
            {visible.map((r) =>
              view === "list" ? (
                <ItemListRow key={r.deliveryId} r={r} />
              ) : view === "card" ? (
                <ItemCard key={r.deliveryId} r={r} />
              ) : (
                <ItemGrid key={r.deliveryId} r={r} />
              )
            )}
          </div>

          {/* Empty state (but we STILL show pagination below) */}
          {!loading && total === 0 && (
            <div className="text-center text-gray-500 mt-8">
              No notifications match your filters.
            </div>
          )}

          {/* Pagination — always visible, even with zero items */}
          <div className="mt-6 sm:mt-8 flex items-center justify-center gap-2">
            <button
              onClick={() => goTo(1)}
              disabled={currentPage === 1}
              className={`px-3 py-1 rounded-full border text-sm ${
                currentPage === 1
                  ? "text-gray-400 border-gray-200 cursor-not-allowed"
                  : "text-indigo-600 border-indigo-200 hover:bg-indigo-50"
              }`}
            >
              « First
            </button>
            <button
              onClick={() => goTo(currentPage - 1)}
              disabled={currentPage === 1}
              className={`px-3 py-1 rounded-full border text-sm ${
                currentPage === 1
                  ? "text-gray-400 border-gray-200 cursor-not-allowed"
                  : "text-indigo-600 border-indigo-200 hover:bg-indigo-50"
              }`}
            >
              ‹ Prev
            </button>

            {buildPages().map((p, idx) =>
              p === "…" ? (
                <span
                  key={`dots-${idx}`}
                  className="px-2 text-gray-400 select-none"
                >
                  …
                </span>
              ) : (
                <button
                  key={p}
                  onClick={() => goTo(p)}
                  className={`min-w-[36px] px-3 py-1 rounded-full border text-sm transition ${
                    p === currentPage
                      ? "bg-indigo-600 text-white border-indigo-600 shadow"
                      : "text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                  }`}
                >
                  {p}
                </button>
              )
            )}

            <button
              onClick={() => goTo(currentPage + 1)}
              disabled={currentPage === totalPages}
              className={`px-3 py-1 rounded-full border text-sm ${
                currentPage === totalPages
                  ? "text-gray-400 border-gray-200 cursor-not-allowed"
                  : "text-indigo-600 border-indigo-200 hover:bg-indigo-50"
              }`}
            >
              Next ›
            </button>
            <button
              onClick={() => goTo(totalPages)}
              disabled={currentPage === totalPages}
              className={`px-3 py-1 rounded-full border text-sm ${
                currentPage === totalPages
                  ? "text-gray-400 border-gray-200 cursor-not-allowed"
                  : "text-indigo-600 border-indigo-200 hover:bg-indigo-50"
              }`}
            >
              Last »
            </button>
          </div>
        </section>
      </div>

      {/* Loading overlay */}
      {loading && (
        <div className="fixed inset-0 bg-white/50 backdrop-blur-[1px] flex items-center justify-center z-10">
          <div className="px-4 py-2 rounded-md border bg-white shadow-sm text-sm text-gray-700">
            Loading notifications…
          </div>
        </div>
      )}

      {/* Optional: lighter horizontal scrollbar for the single-line toolbar */}
      <style>{`
        .custom-toolbar-scroll::-webkit-scrollbar { height: 6px; }
        .custom-toolbar-scroll::-webkit-scrollbar-thumb {
          background-color: rgba(99, 102, 241, 0.25);
          border-radius: 9999px;
        }
        .custom-toolbar-scroll::-webkit-scrollbar-track {
          background-color: rgba(0,0,0,0.03);
          border-radius: 9999px;
        }
      `}</style>
    </div>
  );
};

export default AllUserNotifications;
