import React, { useState, useEffect } from "react";
import {
  FaThList,
  FaThLarge,
  FaTh,
  FaSearch,
  FaTrashAlt,
} from "react-icons/fa";
import { Link } from "react-router-dom";
import axios from "axios";
import globalBackendRoute from "../../config/Config";

const AllSubCategories = () => {
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [filteredSubcategories, setFilteredSubcategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [view, setView] = useState("grid");
  const [searchQuery, setSearchQuery] = useState("");

  // pagination
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE_GRID_CARD = 12; // grid & card
  const PAGE_SIZE_LIST = 6; // list (show pagination after 6 items)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [catRes, subRes] = await Promise.all([
          axios.get(`${globalBackendRoute}/api/all-categories`),
          axios.get(`${globalBackendRoute}/api/all-subcategories`),
        ]);
        setCategories(catRes.data);
        setSubcategories(subRes.data);
        setFilteredSubcategories(subRes.data);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };
    fetchData();
  }, []);

  const handleCategoryClick = (categoryId) => {
    if (selectedCategory === categoryId) {
      setSelectedCategory(null);
      setFilteredSubcategories(subcategories);
    } else {
      setSelectedCategory(categoryId);
      const filtered = subcategories.filter(
        (sub) =>
          String(sub.category?._id || sub.category) === String(categoryId)
      );
      setFilteredSubcategories(filtered);
    }
    setCurrentPage(1);
  };

  // small clear button: resets to show all
  const clearSelection = () => {
    setSelectedCategory(null);
    setFilteredSubcategories(subcategories);
    setSearchQuery(""); // optional: also clear search
    setCurrentPage(1);
  };

  const deleteSubCategory = async (subcategoryId) => {
    if (window.confirm("Are you sure you want to delete this subcategory?")) {
      try {
        await axios.delete(
          `${globalBackendRoute}/api/delete-subcategory/${subcategoryId}`
        );
        alert("Subcategory deleted successfully.");
        const updated = subcategories.filter(
          (sub) => sub._id !== subcategoryId
        );
        setSubcategories(updated);
        const visible = selectedCategory
          ? updated.filter(
              (sub) =>
                String(sub.category?._id || sub.category) ===
                String(selectedCategory)
            )
          : updated;
        setFilteredSubcategories(visible);
        setCurrentPage(1);
      } catch (error) {
        console.error("Error deleting subcategory:", error);
        alert("Failed to delete the subcategory.");
      }
    }
  };

  const getCategoryName = (categoryId) => {
    const id = String(categoryId?._id || categoryId);
    const match = categories.find((cat) => String(cat._id) === id);
    return match?.category_name || "Unknown";
  };

  const getImageUrl = (imagePath) => {
    if (!imagePath) return null;
    return `${globalBackendRoute}/${imagePath.replace(/\\/g, "/")}`;
  };

  // Search over filteredSubcategories
  const searchedSubcategories = filteredSubcategories.filter((sub) => {
    const subName = (sub.subcategory_name || "").toLowerCase();
    const categoryId = String(sub.category?._id || sub.category);
    const categoryObj = categories.find(
      (cat) => String(cat._id) === categoryId
    );
    const categoryName = (categoryObj?.category_name || "").toLowerCase();

    const words = searchQuery
      .toLowerCase()
      .replace(/[^\w\s]/gi, "")
      .split(/\s+/)
      .filter(Boolean);

    if (words.length === 0) return true;

    return words.some(
      (word) =>
        subName.includes(word) ||
        subName.includes(word.replace(/s$/, "")) ||
        categoryName.includes(word) ||
        categoryName.includes(word.replace(/s$/, ""))
    );
  });

  // reset page when search or view changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, view]);

  // choose page size by view
  const pageSize = view === "list" ? PAGE_SIZE_LIST : PAGE_SIZE_GRID_CARD;

  // pagination calculations
  const totalItems = searchedSubcategories.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startIdx = (currentPage - 1) * pageSize;
  const endIdx = startIdx + pageSize;
  const pageItems = searchedSubcategories.slice(startIdx, endIdx);

  const goToPage = (page) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 p-4 sm:p-6 max-w-7xl mx-auto  border-b">
      {/* Left Sidebar - Main Categories */}
      <div className="lg:w-1/4 space-y-4">
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
        {categories.map((category) => (
          <div
            key={category._id}
            className={`cursor-pointer flex items-center gap-4 p-2 rounded border ${
              selectedCategory === category._id
                ? "bg-indigo-100 border-indigo-500"
                : "hover:bg-gray-100 border-gray-300"
            }`}
            onClick={() => handleCategoryClick(category._id)}
          >
            <img
              src={getImageUrl(category.category_image)}
              alt={category.category_name}
              className="w-12 h-12 object-cover rounded"
            />
            <span className="font-medium text-sm">
              {category.category_name}
            </span>
          </div>
        ))}
      </div>

      {/* Right Panel - Subcategories */}
      <div className="flex-1">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <h2 className="text-xl font-bold">
            Subcategories{" "}
            <span className="ml-2 text-gray-500 text-sm">({totalItems})</span>
          </h2>
          <div className="flex flex-wrap gap-4 items-center">
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
            <div className="relative">
              <FaSearch className="absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                placeholder="Search subcategories..."
                className="pl-10 py-2 border rounded w-full sm:w-64"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Subcategory View */}
        <div
          className={
            view === "list"
              ? "space-y-4"
              : view === "card"
              ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
              : "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
          }
        >
          {pageItems.map((sub) => (
            <div
              key={sub._id}
              className={`relative bg-white rounded-lg p-4 shadow hover:shadow-lg transition ${
                view === "list" ? "flex items-center gap-4" : "flex flex-col"
              }`}
            >
              <button
                className="absolute top-2 right-2 text-red-500 hover:text-red-700"
                onClick={() => deleteSubCategory(sub._id)}
              >
                <FaTrashAlt />
              </button>
              <Link
                to={`/single-subcategory/${sub._id}`}
                className={
                  view === "list"
                    ? "flex-1 flex flex-col"
                    : "flex flex-col items-center"
                }
              >
                <div className="text-sm font-semibold text-gray-800">
                  {sub.subcategory_name}
                </div>
                <div className="text-xs text-gray-500 italic mt-1">
                  Category: {getCategoryName(sub.category)}
                </div>
              </Link>
            </div>
          ))}
        </div>

        {/* Pagination (always shown if needed) */}
        {totalPages > 1 && (
          <div className="flex flex-wrap items-center justify-center gap-2 mt-6">
            <button
              className="px-3 py-1 border rounded text-sm hover:bg-gray-50 disabled:opacity-50"
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
            >
              Prev
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                onClick={() => goToPage(n)}
                className={`px-3 py-1 border rounded text-sm ${
                  currentPage === n
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "hover:bg-gray-50"
                }`}
              >
                {n}
              </button>
            ))}

            <button
              className="px-3 py-1 border rounded text-sm hover:bg-gray-50 disabled:opacity-50"
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AllSubCategories;
