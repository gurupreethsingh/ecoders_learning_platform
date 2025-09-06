import React, { useEffect, useMemo, useState, useCallback } from "react";
import { FaImage, FaUser, FaCalendarAlt, FaIdBadge } from "react-icons/fa";
import { MdEdit } from "react-icons/md";
import { motion } from "framer-motion";
import { Link, useParams } from "react-router-dom";
import axios from "axios";
import globalBackendRoute from "../../config/Config";
import ModernFileInput from "../../components/common_components/ModernFileInput";
import ModernTextInput from "../../components/common_components/MordernTextInput";

/* ---------- SmartImage (no flicker, cached fallbacks) ---------- */
const failedImageCache = new Set();

function SmartImage({
  src,
  alt = "Category",
  fallback = "/images/default-category.jpg",
  containerClass = "",
  imgClass = "",
}) {
  const initialSrc = useMemo(() => {
    if (!src || failedImageCache.has(src)) return fallback;
    return src;
  }, [src, fallback]);

  const [currentSrc, setCurrentSrc] = useState(initialSrc);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!src || failedImageCache.has(src)) {
      setCurrentSrc(fallback);
      setLoaded(true); // already using fallback; no fade flash
    } else {
      setCurrentSrc(src);
      setLoaded(false);
    }
  }, [src, fallback]);

  return (
    <div
      className={`overflow-hidden rounded-xl bg-gray-100 border ${containerClass}`}
    >
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
        className={`${imgClass} object-cover transition-opacity duration-300 ${
          loaded ? "opacity-100" : "opacity-0"
        }`}
      />
    </div>
  );
}

export default function SingleCategory() {
  const [categoryData, setCategoryData] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [updatedCategoryName, setUpdatedCategoryName] = useState("");
  const [newCategoryImage, setNewCategoryImage] = useState(null);
  const { id } = useParams();

  const getImageUrl = useCallback((imagePath) => {
    if (!imagePath || typeof imagePath !== "string") return null;
    const normalized = imagePath.replace(/\\/g, "/").replace(/^\/+/, "");
    return `${globalBackendRoute}/${normalized}`;
  }, []);

  const fetchCategoryData = useCallback(async () => {
    try {
      const response = await axios.get(
        `${globalBackendRoute}/api/single-category/${id}`
      );
      const data = response.data || null;
      setCategoryData(data);
      setUpdatedCategoryName(data?.category_name || "");
    } catch (error) {
      console.error("Error fetching category data:", error);
    }
  }, [id]);

  useEffect(() => {
    fetchCategoryData();
  }, [fetchCategoryData]);

  const handleUpdateCategory = async () => {
    if (!updatedCategoryName.trim()) {
      alert("Category name cannot be empty!");
      return;
    }

    const formData = new FormData();
    formData.append("category_name", updatedCategoryName);
    if (newCategoryImage) {
      formData.append("category_image", newCategoryImage);
    }

    try {
      await axios.put(
        `${globalBackendRoute}/api/update-category/${id}`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );
      alert("Category updated successfully!");
      setEditMode(false);
      setNewCategoryImage(null);
      // Refresh from server to reflect any updated image path, timestamps, etc.
      await fetchCategoryData();
    } catch (error) {
      console.error("Error updating category:", error);
      alert("Failed to update the category. Please try again.");
    }
  };

  if (!categoryData) return <div className="text-center py-8">Loading...</div>;

  const imageUrl = getImageUrl(categoryData.category_image);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="containerWidth my-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-start items-center gap-6">
        {/* Category Image (flicker-free) */}
        <motion.div
          initial={{ scale: 0.96, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-40 h-40 sm:w-48 sm:h-48"
        >
          <SmartImage
            src={imageUrl}
            alt={categoryData.category_name || "Category"}
            containerClass="w-full h-full"
            imgClass="w-full h-full"
          />
        </motion.div>

        {/* Category Details */}
        <div className="w-full">
          <motion.h3
            className="subHeadingTextMobile lg:subHeadingText mb-4"
            initial={{ x: -30, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
          >
            Category Details
          </motion.h3>

          <div className="border-t border-gray-200 divide-y divide-gray-100">
            {/* Category ID (read-only) */}
            <CategoryField
              icon={<FaIdBadge className="text-purple-600" />}
              label="Category ID"
              value={
                <code className="text-xs sm:text-sm bg-gray-100 px-2 py-1 rounded">
                  {categoryData?._id}
                </code>
              }
            />

            {/* Category Name */}
            <CategoryField
              icon={<FaUser className="text-blue-600" />}
              label="Category Name"
              value={
                editMode ? (
                  <ModernTextInput
                    value={updatedCategoryName}
                    onChange={(e) => setUpdatedCategoryName(e.target.value)}
                  />
                ) : (
                  categoryData.category_name
                )
              }
            />

            {/* Created At */}
            <CategoryField
              icon={<FaCalendarAlt className="text-green-600" />}
              label="Created At"
              value={
                categoryData?.createdAt
                  ? new Date(categoryData.createdAt).toLocaleString()
                  : "-"
              }
            />

            {/* Updated At */}
            <CategoryField
              icon={<FaCalendarAlt className="text-amber-600" />}
              label="Updated At"
              value={
                categoryData?.updatedAt
                  ? new Date(categoryData.updatedAt).toLocaleString()
                  : "-"
              }
            />

            {/* New Image (only in edit mode) */}
            {editMode && (
              <CategoryField
                icon={<FaImage className="text-indigo-600" />}
                label="New Image"
                value={
                  <ModernFileInput
                    onFileSelect={(file) => setNewCategoryImage(file)}
                  />
                }
              />
            )}
          </div>

          <div className="mt-6 text-center flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() =>
                editMode ? handleUpdateCategory() : setEditMode(true)
              }
              className="primaryBtn w-fit px-4 flex items-center gap-2 rounded-full"
            >
              <MdEdit /> {editMode ? "Save" : "Update"}
            </button>

            <Link
              to="/all-categories"
              className="secondaryBtn w-fit px-4 rounded-full"
            >
              Back to All Categories
            </Link>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function CategoryField({ icon, label, value }) {
  return (
    <div className="py-3 sm:grid sm:grid-cols-3 sm:gap-4 px-2 sm:px-4">
      <dt className="flex items-center text-sm font-medium text-gray-700 gap-2">
        {icon} {label}
      </dt>
      <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
        {value}
      </dd>
    </div>
  );
}
