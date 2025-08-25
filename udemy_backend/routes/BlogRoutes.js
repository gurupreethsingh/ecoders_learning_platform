const express = require("express");
const {
  blogUpload,
  addBlog,
  getAllBlogs,
  getBlogById,
  updateBlog,
  deleteBlog,
  getBlogCount,
} = require("../controllers/BlogController");

const router = express.Router();

// Add a new blog
router.post("/add-blog", blogUpload.single("featuredImage"), addBlog);

// Fetch all blogs
router.get("/all-blogs", getAllBlogs);

// Fetch a single blog by ID
router.get("/single-blogs/:id", getBlogById);

// Delete single blog by ID
router.delete("/delete-blog/:id", deleteBlog);


// Update blog by ID (optional image replacement)
// expects multipart/form-data with field name: "featuredImage"
router.put("/update-blog/:id", blogUpload.single("featuredImage"), updateBlog);

// Get total blog count
router.get("/blogs-count", getBlogCount);

module.exports = router;
