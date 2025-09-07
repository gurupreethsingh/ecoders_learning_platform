// src/pages/subcategories/AllSubCategories.jsx
import React, { useState, useEffect, useMemo } from "react";
import {
  FaThList,
  FaThLarge,
  FaTh,
  FaSearch,
  FaTrashAlt,
  FaPlus,
} from "react-icons/fa";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import globalBackendRoute from "../../config/Config";

const AllSubCategories = () => {
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);

  const [view, setView] = useState("grid"); // 'list' | 'card' | 'grid'
  const [searchQuery, setSearchQuery] = useState("");

  // NEW: sidebar category search
  const [categorySearch, setCategorySearch] = useState("");

  // pagination (like AllCategories)
  const [rowsPerPage, setRowsPerPage] = useState(12);
  const [page, setPage] = useState(1);

  const navigate = useNavigate();

  /* ---------------------------- fetch categories --------------------------- */
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [catRes, subRes] = await Promise.all([
          axios.get(`${globalBackendRoute}/api/all-categories`),
          axios.get(`${globalBackendRoute}/api/all-subcategories`),
        ]);

        const cats = Array.isArray(catRes.data?.data)
          ? catRes.data.data
          : catRes.data || [];
        setCategories(cats);

        const subs = Array.isArray(subRes.data?.data)
          ? subRes.data.data
          : subRes.data || [];
        setSubcategories(subs);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };
    fetchData();
  }, []);

  /* -------------------------- sidebar cat filtering ------------------------ */
  const filteredCategories = useMemo(() => {
    const q = categorySearch.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter((c) => {
      const name = String(c?.category_name || "").toLowerCase();
      const id = String(c?._id || "");
      return name.includes(q) || id.includes(q);
    });
  }, [categories, categorySearch]);

  /* --------------------------- derived / filtering ------------------------- */
  const filteredByCategory = useMemo(() => {
    if (!selectedCategory) return subcategories;
    return subcategories.filter(
      (sub) =>
        String(sub.category?._id || sub.category) === String(selectedCategory)
    );
  }, [subcategories, selectedCategory]);

  const filteredBySearch = useMemo(() => {
    const words = (searchQuery || "")
      .toLowerCase()
      .replace(/[^\w\s]/gi, "")
      .split(/\s+/)
      .filter(Boolean);

    if (words.length === 0) return filteredByCategory;

    return filteredByCategory.filter((sub) => {
      const subName = String(sub.subcategory_name || "").toLowerCase();
      const catId = String(sub.category?._id || sub.category || "");
      const catObj = categories.find((c) => String(c._id) === catId);
      const catName = String(catObj?.category_name || "").toLowerCase();

      return words.some((w) => {
        const singular = w.replace(/s$/, "");
        return (
          subName.includes(w) ||
          subName.includes(singular) ||
          catName.includes(w) ||
          catName.includes(singular)
        );
      });
    });
  }, [filteredByCategory, categories, searchQuery]);

  // reset to first page when search, filter, or rowsPerPage change
  useEffect(() => setPage(1), [searchQuery, selectedCategory, rowsPerPage]);

  /* ------------------------------ pagination ------------------------------ */
  const total = filteredBySearch.length;
  const totalPages = Math.max(1, Math.ceil(total / Math.max(1, rowsPerPage)));
  const currentPage = Math.min(page, totalPages);
  const startIdx = (currentPage - 1) * rowsPerPage;
  const endIdx = Math.min(startIdx + rowsPerPage, total);
  const visible = filteredBySearch.slice(startIdx, endIdx);

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

  /* -------------------------------- helpers ------------------------------- */
  const getCategoryName = (categoryId) => {
    const id = String(categoryId?._id || categoryId);
    const match = categories.find((cat) => String(cat._id) === id);
    return match?.category_name || "Unknown";
  };

  const getImageUrl = (imagePath) => {
    if (!imagePath) return null;
    return `${globalBackendRoute}/${String(imagePath).replace(/\\/g, "/")}`;
  };

  const handleCategoryClick = (categoryId) => {
    setSelectedCategory((prev) => (prev === categoryId ? null : categoryId));
  };

  const clearSelection = () => {
    setSelectedCategory(null);
    setSearchQuery("");
    setCategorySearch("");
    setPage(1);
  };

  const deleteSubCategory = async (subcategoryId) => {
    if (!window.confirm("Are you sure you want to delete this subcategory?"))
      return;
    try {
      await axios.delete(
        `${globalBackendRoute}/api/delete-subcategory/${subcategoryId}`
      );
      alert("Subcategory deleted successfully.");
      setSubcategories((prev) => prev.filter((s) => s._id !== subcategoryId));
      setPage(1);
    } catch (error) {
      console.error("Error deleting subcategory:", error);
      alert("Failed to delete the subcategory.");
    }
  };

  /* ---------------------------------- UI ---------------------------------- */
  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto border-b">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left Sidebar - Categories (scrollable) */}
        <aside className="lg:w-1/4 space-y-4">
          {/* Sidebar Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search Categories
            </label>
            <div className="relative">
              <FaSearch className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Type to filter…"
                className="pl-8 pr-3 py-2 border rounded-md w-full text-sm"
                value={categorySearch}
                onChange={(e) => setCategorySearch(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold">Main Categories</h3>
            <button
              onClick={clearSelection}
              className="px-2 py-1 text-xs border rounded text-indigo-600 border-indigo-300 hover:bg-indigo-50"
              title="Clear selection and show all subcategories"
            >
              Clear
            </button>
          </div>

          {/* Scrollable list */}
          <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1 custom-scroll">
            {filteredCategories.map((category) => (
              <button
                key={category._id}
                className={`w-full text-left cursor-pointer flex items-center gap-3 p-2 rounded border transition ${
                  selectedCategory === category._id
                    ? "bg-indigo-100 border-indigo-500"
                    : "hover:bg-gray-50 border-gray-300"
                }`}
                onClick={() => handleCategoryClick(category._id)}
                title={category.category_name}
              >
                <img
                  src={getImageUrl(category.category_image)}
                  alt={category.category_name}
                  className="w-12 h-12 object-cover rounded"
                />
                <div className="min-w-0">
                  <div className="font-medium text-sm truncate">
                    {category.category_name}
                  </div>
                  {/* Category ID */}
                  <div className="mt-0.5 text-[11px] text-gray-500">
                    <span className="mr-1">ID:</span>
                    <code className="bg-gray-100 border px-1 py-0.5 rounded">
                      {category._id}
                    </code>
                  </div>
                </div>
              </button>
            ))}

            {filteredCategories.length === 0 && (
              <div className="text-sm text-gray-500 py-6 text-center">
                No categories match your search.
              </div>
            )}
          </div>
        </aside>

        {/* Right Panel - Subcategories */}
        <section className="flex-1">
          {/* Top bar: title + actions */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <div>
              <h2 className="text-xl font-bold">
                Subcategories{" "}
                <span className="ml-2 text-gray-500 text-sm">({total})</span>
              </h2>
              <div className="text-sm text-gray-600 mt-1">
                Showing{" "}
                <span className="font-semibold">
                  {total === 0 ? 0 : startIdx + 1}–{endIdx}
                </span>{" "}
                of <span className="font-semibold">{total}</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              {/* Add Subcategory — small & subtle */}
              <button
                onClick={() => navigate("/add-subcategory")}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border text-indigo-700 border-indigo-200 hover:bg-indigo-50 bg-white text-sm"
                title="Add Subcategory"
              >
                <FaPlus className="text-xs" />
                Add Subcategory
              </button>

              {/* View toggles */}
              <div className="flex items-center gap-3 border rounded-full px-3 py-1.5">
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

              {/* Compact search (subcategories) */}
              <div className="relative">
                <FaSearch className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search subcategories…"
                  className="pl-8 pr-3 py-2 border rounded-md w-40 sm:w-56 text-sm"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Rows selector */}
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">Rows:</label>
                <select
                  className="text-sm border rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  value={rowsPerPage}
                  onChange={(e) => setRowsPerPage(Number(e.target.value) || 6)}
                >
                  {[6, 12, 24, 48].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Subcategory Items */}
          <div
            className={
              view === "list"
                ? "space-y-3"
                : view === "card"
                ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
                : "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
            }
          >
            {visible.map((sub) => {
              const catName = getCategoryName(sub.category);
              const item = (
                <div
                  className={`relative bg-white rounded-lg border p-4 shadow-sm hover:shadow-md transition ${
                    view === "list"
                      ? "flex items-center gap-4"
                      : "flex flex-col"
                  }`}
                >
                  {/* Delete */}
                  <button
                    className="absolute top-2 right-2 text-red-500 hover:text-red-600"
                    onClick={() => deleteSubCategory(sub._id)}
                    title="Delete subcategory"
                  >
                    <FaTrashAlt />
                  </button>

                  <div className={view === "list" ? "flex-1" : ""}>
                    <div
                      className={`${
                        view === "list" ? "text-base" : "text-lg"
                      } font-semibold text-gray-800`}
                    >
                      {sub.subcategory_name}
                    </div>

                    {/* Subcategory ID */}
                    <div className="mt-1 text-xs text-gray-500">
                      <span className="mr-2">ID:</span>
                      <code className="bg-gray-100 border px-1.5 py-0.5 rounded">
                        {sub._id}
                      </code>
                    </div>

                    <div className="text-xs text-gray-600 mt-1 italic">
                      Category: {catName}
                    </div>
                  </div>
                </div>
              );

              return (
                <Link key={sub._id} to={`/single-subcategory/${sub._id}`}>
                  {item}
                </Link>
              );
            })}
          </div>

          {/* Empty state */}
          {total === 0 && (
            <div className="text-center text-gray-500 mt-8">
              No subcategories found.
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2">
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
          )}
        </section>
      </div>

      {/* Optional: light custom scrollbar for the sidebar (Tailwind plugin or global CSS) */}
      <style>{`
        .custom-scroll::-webkit-scrollbar { width: 8px; }
        .custom-scroll::-webkit-scrollbar-thumb {
          background-color: rgba(99, 102, 241, 0.25);
          border-radius: 9999px;
        }
        .custom-scroll::-webkit-scrollbar-track {
          background-color: rgba(0,0,0,0.03);
          border-radius: 9999px;
        }
      `}</style>
    </div>
  );
};

export default AllSubCategories;
