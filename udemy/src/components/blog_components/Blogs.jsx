import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  FaThList,
  FaThLarge,
  FaTh,
  FaArrowLeft,
  FaArrowRight,
  FaCalendar,
  FaTags,
  FaUser,
  FaSearch,
} from "react-icons/fa";
import { motion } from "framer-motion";
import axios from "axios";
import globalBackendRoute from "../../config/Config";
import dogImage from "../../assets/images/dog.jpg";

export default function Blogs() {
  const [view, setView] = useState("grid");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");

  // --- helpers ---
  const getImageUrl = (imagePath) => {
    if (!imagePath) return dogImage; // fallback
    try {
      const normalized = String(imagePath).replace(/\\/g, "/");
      const tail = normalized.split("uploads/").pop();
      if (!tail) return dogImage;
      return `${globalBackendRoute}/uploads/${tail}`;
    } catch {
      return dogImage;
    }
  };

  const toArrayTags = (tags) => {
    if (!tags) return [];
    if (Array.isArray(tags)) return tags;
    return String(tags)
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
  };

  const makeSlug = (title, serverSlug) => {
    if (serverSlug && typeof serverSlug === "string" && serverSlug.length > 0) {
      return serverSlug;
    }
    if (!title) return "blog";
    return String(title)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
  };

  // --- fetch blogs ---
  useEffect(() => {
    let isMounted = true;
    (async () => {
      setLoading(true);
      setFetchError("");
      try {
        const res = await axios.get(`${globalBackendRoute}/api/all-blogs`);
        if (isMounted) setBlogs(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error("Error fetching blogs:", err);
        if (isMounted) setFetchError("Failed to load blogs. Please try again.");
      } finally {
        if (isMounted) setLoading(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  // --- search + sort ---
  const filteredBlogs = useMemo(() => {
    const search = searchTerm.toLowerCase();
    return blogs
      .filter((blog) => {
        const titleMatch = blog?.title?.toLowerCase().includes(search);
        const categoryMatch = blog?.category?.toLowerCase().includes(search);
        const tagsArr = toArrayTags(blog?.tags);
        const tagsMatch = tagsArr.some((t) => t.toLowerCase().includes(search));

        // author can be populated object or raw id/string; handle both
        const authorName =
          (blog?.author && typeof blog.author === "object"
            ? blog.author.name || blog.author.fullName || blog.author.username
            : blog?.author) || "";

        const authorMatch = String(authorName).toLowerCase().includes(search);
        return titleMatch || categoryMatch || tagsMatch || authorMatch;
      })
      .sort((a, b) => {
        const da = a?.publishedDate ? new Date(a.publishedDate) : new Date(0);
        const db = b?.publishedDate ? new Date(b.publishedDate) : new Date(0);
        return db - da; // newest first
      });
  }, [blogs, searchTerm]);

  // --- pagination ---
  const itemsPerPage = 6;
  const totalPages = Math.max(
    1,
    Math.ceil(filteredBlogs.length / itemsPerPage)
  );
  const paginatedBlogs = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredBlogs.slice(start, start + itemsPerPage);
  }, [filteredBlogs, currentPage]);

  const goToNextPage = () => setCurrentPage((p) => Math.min(p + 1, totalPages));
  const goToPreviousPage = () => setCurrentPage((p) => Math.max(p - 1, 1));

  // --- icon styles ---
  const iconStyle = {
    list: view === "list" ? "text-blue-500" : "text-gray-500",
    grid: view === "grid" ? "text-green-500" : "text-gray-500",
    card: view === "card" ? "text-purple-500" : "text-gray-500",
  };

  // Reset to first page on search change
  useEffect(() => setCurrentPage(1), [searchTerm]);

  return (
    <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8 border-b">
      {/* Search + Count + View Switcher */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 space-y-4 sm:space-y-0">
        <div className="block-heading">
          <h2 className="font-bold text-xl">All Blogs</h2>
        </div>
        <div className="relative w-full sm:w-1/2">
          <input
            type="text"
            placeholder="Search blogs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-4 py-2 pr-10 text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
          <FaSearch className="absolute top-1/2 right-3 transform -translate-y-1/2 text-gray-400" />
        </div>

        <div className="flex items-center space-x-4">
          <p className="text-sm text-gray-600">
            Showing {paginatedBlogs.length} of {filteredBlogs.length} blogs
          </p>
          <FaThList
            className={`cursor-pointer ${iconStyle.list}`}
            onClick={() => setView("list")}
          />
          <FaTh
            className={`cursor-pointer ${iconStyle.card}`}
            onClick={() => setView("card")}
          />
          <FaThLarge
            className={`cursor-pointer ${iconStyle.grid}`}
            onClick={() => setView("grid")}
          />
        </div>
      </div>

      {/* Loading / Error */}
      {loading && (
        <p className="text-center text-gray-600 mt-6">Loading blogs…</p>
      )}
      {fetchError && !loading && (
        <p className="text-center text-red-600 mt-6">{fetchError}</p>
      )}

      {/* Blog Cards */}
      {!loading && !fetchError && (
        <>
          <motion.div
            className={`grid gap-6 ${
              view === "list"
                ? "grid-cols-1"
                : view === "grid"
                ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
                : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
            }`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            {paginatedBlogs.map((blog) => {
              const tagsArr = toArrayTags(blog?.tags);

              const authorName =
                (blog?.author && typeof blog.author === "object"
                  ? blog.author.name ||
                    blog.author.fullName ||
                    blog.author.username
                  : blog?.author) || "Unknown";

              const displayDate = blog?.publishedDate
                ? new Date(blog.publishedDate).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })
                : "—";

              const slug = makeSlug(blog?.title, blog?.slug);

              return (
                <Link key={blog._id} to={`/single-blog/${slug}/${blog._id}`}>
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`border rounded-lg shadow-sm hover:shadow-md transition-shadow bg-white overflow-hidden h-full flex flex-col ${
                      view === "list" ? "sm:flex-row p-4 items-center" : ""
                    }`}
                  >
                    {/* Image */}
                    <div
                      className={`${
                        view === "list"
                          ? "w-24 h-24 flex-shrink-0 mr-4"
                          : "w-full h-48"
                      }`}
                    >
                      <img
                        src={getImageUrl(blog?.featuredImage)}
                        alt={blog?.title || "blog"}
                        className="w-full h-full object-cover rounded-md"
                        onError={(e) => {
                          e.currentTarget.src = dogImage;
                        }}
                      />
                    </div>

                    {/* Content */}
                    <div
                      className={`${
                        view === "list"
                          ? "flex-1 flex flex-col"
                          : "p-4 flex flex-col flex-grow"
                      }`}
                    >
                      {/* Top block: never stretches, no forced gaps */}
                      <div className="text-left space-y-1 flex-shrink-0">
                        <h3 className="text-lg font-bold text-gray-900">
                          {blog?.title || "Untitled"}
                        </h3>

                        {displayDate !== "—" && (
                          <p className="text-sm text-gray-600 flex items-center">
                            <FaCalendar className="mr-1 text-yellow-500" />
                            {displayDate}
                          </p>
                        )}

                        <p className="text-sm text-gray-600 flex items-center">
                          <FaUser className="mr-1 text-red-500" />
                          {authorName}
                        </p>

                        {tagsArr.length > 0 && (
                          <p className="text-sm text-gray-600 flex items-center">
                            <FaTags className="mr-1 text-green-500" />
                            {tagsArr.join(", ")}
                          </p>
                        )}
                      </div>

                      {/* Summary (optional) */}
                      {view !== "list" && blog?.summary?.trim() && (
                        <p className="text-gray-700 mt-2 line-clamp-3 flex-shrink-0">
                          {blog.summary}
                        </p>
                      )}

                      {/* Spacer to push any leftover space to the very bottom */}
                      <div className="flex-grow" />
                    </div>
                  </motion.div>
                </Link>
              );
            })}
          </motion.div>

          {filteredBlogs.length === 0 && (
            <p className="text-center text-gray-600 mt-6">No blogs found.</p>
          )}

          {/* Pagination */}
          <div className="flex justify-between items-center mt-8">
            <button
              onClick={goToPreviousPage}
              disabled={currentPage === 1}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md text-white ${
                currentPage === 1
                  ? "bg-gray-300"
                  : "bg-indigo-600 hover:bg-indigo-500"
              }`}
            >
              <FaArrowLeft />
            </button>
            <span className="text-gray-700">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={goToNextPage}
              disabled={currentPage === totalPages}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md text-white ${
                currentPage === totalPages
                  ? "bg-gray-300"
                  : "bg-indigo-600 hover:bg-indigo-500"
              }`}
            >
              <FaArrowRight />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
