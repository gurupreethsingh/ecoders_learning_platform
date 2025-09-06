import React, { useState, useEffect, useMemo } from "react";
import {
  FaThList,
  FaThLarge,
  FaTh,
  FaSearch,
  FaTrashAlt,
} from "react-icons/fa";
import { Link } from "react-router-dom";
import axios from "axios";
import globalBackendRoute from "../../config/config"; // <- ensure filename/casing matches real file

/** Cache broken image URLs so we never re-try them */
const failedImageCache = new Set();

/** Smart image that avoids flicker and retries */
function SmartImage({
  src,
  alt = "Category",
  className = "",
  fallback = "/images/default-category.jpg",
  containerClass = "",
}) {
  const [currentSrc, setCurrentSrc] = useState(
    !src || failedImageCache.has(src) ? fallback : src
  );
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!src || failedImageCache.has(src)) {
      setCurrentSrc(fallback);
      setLoaded(true);
    } else {
      setCurrentSrc(src);
      setLoaded(false);
    }
  }, [src, fallback]);

  return (
    <div className={`overflow-hidden rounded-md bg-gray-100 ${containerClass}`}>
      <img
        src={currentSrc}
        alt={alt}
        loading="lazy"
        decoding="async"
        draggable="false"
        onLoad={() => setLoaded(true)}
        onError={() => {
          if (src) failedImageCache.add(src);
          if (currentSrc !== fallback) setCurrentSrc(fallback);
        }}
        className={`${className} object-cover transition-opacity duration-300 ${
          loaded ? "opacity-100" : "opacity-0"
        }`}
      />
    </div>
  );
}

export default function AllCategories() {
  // Use the same API root convention as your messages pages
  const API =
    globalBackendRoute ||
    (import.meta?.env && import.meta.env.VITE_BACKEND_URL) ||
    "http://localhost:5000";

  const [categories, setCategories] = useState([]);
  const [view, setView] = useState("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [totalCount, setTotalCount] = useState(0);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    (async () => {
      try {
        setLoading(true);
        setErr("");

        // Fetch both endpoints in parallel
        const [catRes, countRes] = await Promise.all([
          axios.get(`${API}/api/all-categories`, { signal: controller.signal }),
          axios.get(`${API}/api/category-count`, { signal: controller.signal }),
        ]);

        if (!active) return;

        const list = Array.isArray(catRes?.data) ? catRes.data : [];
        const count =
          typeof countRes?.data?.categoryCount === "number"
            ? countRes.data.categoryCount
            : list.length;

        setCategories(list);
        setTotalCount(count);
      } catch (e) {
        if (!active || axios.isCancel(e)) return;
        console.error("Error fetching categories:", e);
        setErr(
          e?.response?.status
            ? `Failed (${e.response.status}) to load categories`
            : "Failed to load categories"
        );
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
      controller.abort();
    };
  }, [API]);

  const deleteCategory = async (categoryId) => {
    const ok = window.confirm("Are you sure you want to delete this category?");
    if (!ok) return;
    try {
      await axios.delete(`${API}/api/delete-category/${categoryId}`);
      alert("Category deleted successfully.");
      setCategories((prev) => prev.filter((c) => c._id !== categoryId));
      setTotalCount((x) => Math.max(0, x - 1));
    } catch (error) {
      console.error("Error deleting category:", error);
      alert(
        error?.response?.status
          ? `Failed (${error.response.status}) to delete the category`
          : "Failed to delete the category."
      );
    }
  };

  const getImageUrl = (imgPath) => {
    if (!imgPath || typeof imgPath !== "string") return null;
    const normalized = imgPath.replace(/\\/g, "/").replace(/^\/+/, "");
    return `${API}/${normalized}`;
  };

  const filteredCategories = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return categories;
    const words = q.split(/\s+/);
    return categories.filter((category) => {
      const name = (category?.category_name || "").toLowerCase();
      return words.some((w) => name.includes(w));
    });
  }, [categories, searchQuery]);

  // per-view sizing so layout never jumps
  const imageSizeClasses =
    view === "list"
      ? { container: "w-20 h-20", img: "w-20 h-20" }
      : view === "card"
      ? { container: "w-full h-40", img: "w-full h-40" }
      : { container: "w-full h-32", img: "w-full h-32" };

  if (loading) {
    return (
      <div className="fullWidth py-6">
        <div className="containerWidth">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
            <h2 className="headingText">All Categories</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="bg-white rounded-lg p-4 shadow">
                <div className="w-full h-32 bg-gray-200 rounded-md mb-3" />
                <div className="h-4 bg-gray-200 rounded w-2/3" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (err) {
    return (
      <div className="fullWidth py-6">
        <div className="containerWidth">
          <div className="mb-4 rounded-lg px-4 py-3 text-sm bg-red-50 text-red-800 border border-red-200">
            {err}
          </div>
          <button
            onClick={() => window.location.reload()}
            className="fileUploadBtn"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fullWidth py-6">
      <div className="containerWidth">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
          <h2 className="headingText">
            All Categories
            <span className="text-sm text-gray-500 ml-2">
              Showing {filteredCategories.length} of {totalCount}
            </span>
          </h2>

          <div className="flex items-center flex-wrap gap-4">
            <FaThList
              className={`text-xl cursor-pointer ${
                view === "list" ? "text-indigo-600" : "text-gray-600"
              }`}
              onClick={() => setView("list")}
              title="List view"
            />
            <FaThLarge
              className={`text-xl cursor-pointer ${
                view === "card" ? "text-indigo-600" : "text-gray-600"
              }`}
              onClick={() => setView("card")}
              title="Card view"
            />
            <FaTh
              className={`text-xl cursor-pointer ${
                view === "grid" ? "text-indigo-600" : "text-gray-600"
              }`}
              onClick={() => setView("grid")}
              title="Grid view"
            />

            <div className="relative w-full sm:w-auto">
              <FaSearch className="absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                className="formInput pl-10"
                placeholder="Search categories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <Link to="/add-category">
              <button className="fileUploadBtn">Add Category</button>
            </Link>
          </div>
        </div>

        <div className="mt-6">
          {filteredCategories.length === 0 ? (
            <p className="text-center text-gray-500">No categories found.</p>
          ) : (
            <div
              className={
                view === "list"
                  ? "space-y-6"
                  : view === "card"
                  ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
                  : "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4"
              }
            >
              {filteredCategories.map((category) => {
                const imageUrl = getImageUrl(category?.category_image);

                return (
                  <div
                    key={category._id}
                    className={`relative bg-white rounded-lg p-4 transition hover:shadow-lg ${
                      view === "list"
                        ? "flex items-center space-x-4 shadow"
                        : "flex flex-col"
                    }`}
                  >
                    <button
                      className="absolute top-2 right-2 text-red-500 hover:text-red-700"
                      onClick={() => deleteCategory(category._id)}
                      title="Delete category"
                    >
                      <FaTrashAlt />
                    </button>

                    <Link
                      to={`/single-category/${category._id}`}
                      className={
                        view === "list"
                          ? "flex-1 flex items-center gap-4"
                          : "flex flex-col items-center"
                      }
                    >
                      <SmartImage
                        src={imageUrl}
                        alt={category?.category_name || "Category"}
                        containerClass={imageSizeClasses.container}
                        className={imageSizeClasses.img}
                        fallback="/images/default-category.jpg"
                      />

                      <h3
                        className={
                          view === "list"
                            ? "text-lg font-semibold text-left text-gray-900"
                            : "text-md font-semibold text-center text-gray-900 mt-2"
                        }
                      >
                        {category?.category_name || "—"}
                      </h3>
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
