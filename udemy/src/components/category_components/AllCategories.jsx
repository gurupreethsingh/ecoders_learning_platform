import React, { useState, useEffect, useMemo } from "react";
import { FaPython, FaJava, FaDatabase, FaReact, FaRobot } from "react-icons/fa";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import globalBackendRoute from "../../config/Config";

const AllCategories = () => {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [categoryNames, setCategoryNames] = useState([]); // ["Java", "Python", ...]
  const [catIdToName, setCatIdToName] = useState({}); // {"68ab...": "Java", ...}
  const [coursesRaw, setCoursesRaw] = useState([]); // raw from API
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [cols, setCols] = useState(4);
  const [rowsPerPage, setRowsPerPage] = useState(2);
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  // responsive cols
  useEffect(() => {
    const computeCols = () => {
      const w = window.innerWidth;
      if (w >= 1280) return 5;
      if (w >= 1024) return 4;
      if (w >= 768) return 3;
      if (w >= 640) return 2;
      return 1;
    };
    const onResize = () => setCols(computeCols());
    setCols(computeCols());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    fetchAll();
  }, []);
  useEffect(() => {
    setPage(1);
  }, [selectedCategory, rowsPerPage, cols]);

  // sync search term from ?search=
  const getSearchFromURL = (loc) => {
    const usp = new URLSearchParams(loc.search || "");
    return usp.get("search") || "";
  };
  useEffect(() => {
    const s = getSearchFromURL(location).trim();
    setSearchTerm(s);
    if (s) setSelectedCategory("All");
    setPage(1);
  }, [location]);

  const extractArray = (payload) => {
    const d = payload?.data;
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(d)) return d;
    if (Array.isArray(d?.data)) return d.data;
    if (Array.isArray(d?.items)) return d.items;
    if (Array.isArray(payload?.items)) return payload.items;
    if (Array.isArray(payload?.results)) return payload.results;
    return [];
  };
  const extractMeta = (payload) => {
    // supports {data:[...], meta:{...}} or {meta:{...}}
    return payload?.data?.meta || payload?.meta || null;
  };

  const fetchAll = async () => {
    setLoading(true);
    setErr(null);
    try {
      // 1) Categories (to build id->name)
      const catRes = await axios.get(
        `${globalBackendRoute}/api/all-categories`
      );
      const cats = extractArray(catRes);
      const names = [];
      const map = {};
      cats.forEach((c) => {
        const name = typeof c === "string" ? c : c?.name || c?.category_name;
        if (name) names.push(name);
        const id = typeof c === "object" ? c?._id || c?.id : null;
        if (id && name) map[id] = name;
      });
      setCategoryNames(names.filter(Boolean));
      setCatIdToName(map);

      // 2) Courses — try to get everything in one call, fall back to paging
      let allCourses = [];
      let first = await axios.get(`${globalBackendRoute}/api/list-courses`, {
        params: { page: 1, limit: 5000, sortBy: "createdAt", order: "desc" },
      });
      let arr = extractArray(first);
      const meta = extractMeta(first);
      allCourses = arr;

      // if server still paginates (e.g., caps limit), fetch remaining pages
      if (
        meta?.totalPages &&
        meta.totalPages > 1 &&
        arr.length < (meta.total || Infinity)
      ) {
        for (let p = 2; p <= meta.totalPages; p++) {
          const next = await axios.get(
            `${globalBackendRoute}/api/list-courses`,
            {
              params: {
                page: p,
                limit: meta.limit || 20,
                sortBy: meta.sortBy || "createdAt",
                order: meta.order || "desc",
              },
            }
          );
          allCourses = allCourses.concat(extractArray(next));
        }
      }
      setCoursesRaw(allCourses);
    } catch (e) {
      console.error("Error fetching:", e);
      setErr("Failed to load data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ---------- helpers ----------
  const looksLikeObjectId = (v) =>
    typeof v === "string" && /^[a-f0-9]{24}$/i.test(v);

  const resolveCategoryName = (course) => {
    // populated object
    if (course?.category?.name) return course.category.name;
    if (course?.category?.category_name) return course.category.category_name;
    // direct name
    if (
      typeof course?.category === "string" &&
      !looksLikeObjectId(course.category)
    )
      return course.category;
    if (typeof course?.categoryName === "string") return course.categoryName;
    if (typeof course?.category_label === "string")
      return course.category_label;
    // ids
    if (looksLikeObjectId(course?.category))
      return catIdToName[course.category] || "Uncategorized";
    if (looksLikeObjectId(course?.categoryId))
      return catIdToName[course.categoryId] || "Uncategorized";
    // array shape (pick first)
    if (Array.isArray(course?.categories) && course.categories.length) {
      const c0 = course.categories[0];
      if (c0?.name) return c0.name;
      if (c0?.category_name) return c0.category_name;
      if (looksLikeObjectId(c0)) return catIdToName[c0] || "Uncategorized";
      if (typeof c0 === "string") return c0;
    }
    return "Uncategorized";
  };

  const determineIsPaid = (course) => {
    const price = Number(course?.price ?? 0);
    const accessType = (course?.accessType || course?.visibility || "")
      .toString()
      .toLowerCase();
    return price > 0 || accessType === "paid";
  };

  const getIconForCategory = (catName) => {
    const name = (catName || "").toLowerCase();
    if (name.includes("java"))
      return <FaJava className="text-4xl text-red-500" />;
    if (name.includes("python"))
      return <FaPython className="text-4xl text-yellow-500" />;
    if (name.includes("selenium"))
      return <FaRobot className="text-4xl text-purple-700" />;
    if (
      name.includes("mysql") ||
      name.includes("sql") ||
      name.includes("db") ||
      name.includes("database")
    )
      return <FaDatabase className="text-4xl text-blue-500" />;
    if (name.includes("react") || name.includes("web"))
      return <FaReact className="text-4xl text-cyan-500" />;
    return <FaReact className="text-4xl text-cyan-500" />;
  };

  const truncateTwoLines = (text) => {
    if (!text) return "Explore this course.";
    const s = String(text);
    return s.length > 180 ? s.slice(0, 180).trim() + "..." : s;
  };

  const normalizeCourse = (course) => {
    const categoryName = resolveCategoryName(course);
    const isPaid = determineIsPaid(course);
    const fallbackSlug = course?.title
      ? course.title.toLowerCase().replace(/\s+/g, "-")
      : "course";
    return {
      id: course?._id || course?.id || course?.slug || fallbackSlug,
      title: course?.title || "Untitled Course",
      slug: course?.slug || fallbackSlug,
      category: categoryName, // **normalized to NAME for filtering**
      description: truncateTwoLines(
        course?.shortDescription || course?.description
      ),
      isPaid,
      icon: getIconForCategory(categoryName),
      _search_blob: [
        course?.title,
        course?.shortDescription,
        course?.description,
        categoryName,
        course?.slug,
        ...(Array.isArray(course?.tags) ? course.tags : []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase(),
    };
  };

  const courses = useMemo(
    () => coursesRaw.map(normalizeCourse),
    [coursesRaw, catIdToName]
  );

  // search matching: split by spaces, any token match ok (case-insensitive)
  const matchesKeyword = (course, kw) => {
    const s = (kw || "").toLowerCase().trim();
    if (!s) return true;
    const tokens = s.split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return true;
    const blob = course._search_blob || "";
    // ANY token match = keep
    return tokens.some((t) => blob.includes(t));
  };

  // filter by category (unless searching) and then by keyword
  const baseFiltered =
    selectedCategory === "All" || searchTerm
      ? courses
      : courses.filter((c) => c.category === selectedCategory);

  const filteredCourses = baseFiltered.filter((c) =>
    matchesKeyword(c, searchTerm)
  );

  // pagination
  const pageSize = Math.max(1, (cols || 1) * (rowsPerPage || 1));
  const total = filteredCourses.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIdx = (currentPage - 1) * pageSize;
  const endIdx = Math.min(startIdx + pageSize, total);
  const visible = filteredCourses.slice(startIdx, endIdx);
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
    const s = Math.max(2, currentPage - 1),
      e = Math.min(totalPages - 1, currentPage + 1);
    for (let i = s; i <= e; i++) pages.push(i);
    if (currentPage < totalPages - 3) pages.push("…");
    pages.push(totalPages);
    return pages;
  };

  return (
    <div className="category_container">
      <div className="px-4 md:px-8 lg:px-12 py-8">
        {/* Category Tabs */}
        <div className="flex flex-wrap justify-center gap-3 mb-10">
          <button
            onClick={() => setSelectedCategory("All")}
            className={`text-sm md:text-base px-3 py-1 font-medium border-b-2 transition whitespace-nowrap ${
              selectedCategory === "All"
                ? "text-purple-600 border-purple-600"
                : "text-gray-700 border-transparent hover:text-purple-600 hover:border-purple-600"
            }`}
          >
            All
          </button>
          {categoryNames.map((cat, index) => (
            <button
              key={index}
              onClick={() => setSelectedCategory(cat)}
              className={`text-sm md:text-base px-3 py-1 font-medium border-b-2 transition whitespace-nowrap ${
                selectedCategory === cat
                  ? "text-purple-600 border-purple-600"
                  : "text-gray-700 border-transparent hover:text-purple-600 hover:border-purple-600"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Top-right status + rows selector */}
        <div className="flex items-center justify-end gap-4 mb-3">
          <div className="text-sm text-gray-600">
            Showing{" "}
            <span className="font-semibold">
              {total === 0 ? 0 : startIdx + 1}–{endIdx}
            </span>{" "}
            of <span className="font-semibold">{total}</span>
            {searchTerm ? (
              <span className="ml-2 text-gray-500">
                (search: <span className="italic">"{searchTerm}"</span>)
              </span>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Rows:</label>
            <select
              value={rowsPerPage}
              onChange={(e) => setRowsPerPage(Number(e.target.value) || 1)}
              className="text-sm border rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-purple-400"
            >
              <option value={1}>1</option>
              <option value={2}>2</option>
              <option value={3}>3</option>
              <option value={4}>4</option>
            </select>
          </div>
        </div>

        {/* Course Cards */}
        <div className="all_categories border-t border-b py-5 container mx-auto">
          {loading ? (
            <div className="text-center text-gray-500 py-10">
              Loading courses…
            </div>
          ) : err ? (
            <div className="text-center text-red-600 py-10">{err}</div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                {visible.length === 0 ? (
                  <div className="col-span-full text-center text-gray-500">
                    No courses found
                    {searchTerm
                      ? ` for the search "${searchTerm}"`
                      : selectedCategory !== "All"
                      ? ` for "${selectedCategory}"`
                      : ""}
                  </div>
                ) : (
                  visible.map((course) => (
                    <div
                      key={course.id}
                      className="relative bg-white rounded-xl shadow-md hover:shadow-lg transition p-5 flex flex-col justify-between cursor-pointer hover:ring-2 hover:ring-purple-300"
                      onClick={() => {
                        const userId = localStorage.getItem("userId");
                        if (course.isPaid) {
                          if (userId)
                            navigate(`/user-course/${userId}/${course.id}`);
                          else
                            alert("Please log in to access this paid course.");
                        } else {
                          navigate(`/user-course/${course.slug}/${course.id}`);
                        }
                      }}
                    >
                      {course.isPaid && (
                        <span className="absolute top-3 right-3 bg-red-100 text-red-600 text-xs px-2 py-1 rounded-full">
                          Paid
                        </span>
                      )}

                      <div className="mb-4 flex justify-center">
                        {course.icon}
                      </div>

                      <h3 className="text-lg font-semibold text-gray-800 mb-2 text-center">
                        {course.title}
                      </h3>

                      <p
                        className="text-sm text-gray-600 mb-4 text-center"
                        style={{
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                        }}
                        title={course.description}
                      >
                        {course.description}
                      </p>

                      <div className="mt-auto text-center text-sm text-purple-500 hover:underline ">
                        Start learning →
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-8 flex items-center justify-center gap-2">
                  <button
                    onClick={() => goTo(1)}
                    disabled={currentPage === 1}
                    className={`px-3 py-1 rounded-full border text-sm ${
                      currentPage === 1
                        ? "text-gray-400 border-gray-200 cursor-not-allowed"
                        : "text-purple-600 border-purple-200 hover:bg-purple-50"
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
                        : "text-purple-600 border-purple-200 hover:bg-purple-50"
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
                            ? "bg-purple-600 text-white border-purple-600 shadow"
                            : "text-purple-600 border-purple-200 hover:bg-purple-50"
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
                        : "text-purple-600 border-purple-200 hover:bg-purple-50"
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
                        : "text-purple-600 border-purple-200 hover:bg-purple-50"
                    }`}
                  >
                    Last »
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AllCategories;
