const Blog = require("../models/BlogModel");
const multer = require("multer");
const fs = require("fs");
const path = require("path");

const uploadDir = path.join("uploads", "blogs");

// Ensure directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// ==== Multer storage for blog images ====
const blogStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const filename =
      file.fieldname + "-" + Date.now() + path.extname(file.originalname);
    cb(null, filename);
  },
});

const blogUpload = multer({ storage: blogStorage });

// ---- Helpers ----
const toBool = (val) => {
  if (typeof val === "boolean") return val;
  if (typeof val === "string") {
    const v = val.toLowerCase();
    return v === "true" || v === "1" || v === "yes";
  }
  return false;
};

const normalizeTags = (tags) => {
  if (!tags) return [];
  if (Array.isArray(tags))
    return tags.map((t) => String(t).trim()).filter(Boolean);
  return String(tags)
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
};

// ==== Add Blog ====
const addBlog = async (req, res) => {
  try {
    const {
      title,
      body,
      author,
      summary,
      tags,
      category,
      seoTitle,
      metaDescription,
      published,
      code,
      explanation,
    } = req.body;

    const categoryTrim = category ? String(category).trim() : "";
    const tagArray = normalizeTags(tags);
    const publishedBool = toBool(published);

    const featuredImage = req.file
      ? path.join(uploadDir, req.file.filename).replace(/\\/g, "/")
      : "";

    const newBlog = new Blog({
      title,
      body,
      author,
      summary,
      tags: tagArray,
      category: categoryTrim,
      seoTitle,
      metaDescription,
      published: publishedBool,
      featuredImage,
      code: code || "",
      explanation: explanation || "",
      publishedDate: publishedBool ? new Date() : null,
    });

    await newBlog.save();

    res.status(201).json({
      message: "Blog added successfully",
      blog: newBlog,
    });
  } catch (error) {
    console.error("Error adding blog:", error);
    res.status(500).json({ message: "Error adding blog" });
  }
};

// ==== Get All Blogs (minimal shape like your category code) ====
const getAllBlogs = async (req, res) => {
  try {
    const blogs = await Blog.find(
      {},
      "title summary tags category featuredImage published publishedDate author code explanation"
    )
      .populate("author", "name")
      .lean();

    // Keep file paths as stored (relative), like your category sample
    const formatted = blogs.map((b) => ({
      _id: b._id,
      title: b.title,
      summary: b.summary,
      tags: Array.isArray(b.tags) ? b.tags : normalizeTags(b.tags),
      category: b.category,
      featuredImage: b.featuredImage, // e.g., "uploads/blogs/abc.jpg"
      published: b.published,
      publishedDate: b.publishedDate,
      author: b.author, // { _id, name } if populated
      code: b.code || "",
      explanation: b.explanation || "",
    }));

    res.status(200).json(formatted);
  } catch (error) {
    console.error("Error fetching blogs:", error);
    res.status(500).json({ message: "Error fetching blogs" });
  }
};

// ==== Get Blog by ID ====
const getBlogById = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id)
      .populate("author", "name")
      .populate("comments.postedBy", "name");

    if (!blog) {
      return res.status(404).json({ message: "Blog not found" });
    }

    res.status(200).json(blog);
  } catch (error) {
    console.error("Error fetching blog:", error);
    res.status(500).json({ message: "Error fetching blog" });
  }
};

// ==== Update Blog (replace image, delete old file if new provided) ====
const updateBlog = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      body,
      author,
      summary,
      tags,
      category,
      seoTitle,
      metaDescription,
      published,
      code,
      explanation,
    } = req.body;

    const blog = await Blog.findById(id);
    if (!blog) {
      return res.status(404).json({ message: "Blog not found" });
    }

    // If uploading a new image, delete the old file (if exists)
    if (req.file && blog.featuredImage) {
      const oldPath = path.join(__dirname, "..", blog.featuredImage);
      if (fs.existsSync(oldPath)) {
        try {
          fs.unlinkSync(oldPath);
        } catch (err) {
          console.warn("Could not delete old blog image:", err.message);
        }
      }
    }

    // Update fields
    if (title !== undefined) blog.title = title;
    if (body !== undefined) blog.body = body;
    if (author !== undefined) blog.author = author;
    if (summary !== undefined) blog.summary = summary;
    if (tags !== undefined) blog.tags = normalizeTags(tags);
    if (category !== undefined) blog.category = String(category).trim();
    if (seoTitle !== undefined) blog.seoTitle = seoTitle;
    if (metaDescription !== undefined) blog.metaDescription = metaDescription;
    if (published !== undefined) blog.published = toBool(published);
    if (code !== undefined) blog.code = code;
    if (explanation !== undefined) blog.explanation = explanation;

    if (req.file) {
      blog.featuredImage = path
        .join(uploadDir, req.file.filename)
        .replace(/\\/g, "/");
      // set/clear publishedDate if published toggled true/false
      blog.publishedDate = blog.published
        ? blog.publishedDate || new Date()
        : null;
    }

    const updated = await blog.save();

    res.status(200).json({
      message: "Blog updated successfully",
      blog: updated,
    });
  } catch (error) {
    console.error("Error updating blog:", error);
    res.status(500).json({ message: "Error updating blog" });
  }
};

// ==== Delete Blog (delete DB doc + image file) ====
const deleteBlog = async (req, res) => {
  try {
    const { id } = req.params;

    const blog = await Blog.findById(id);
    if (!blog) {
      return res.status(404).json({ message: "Blog not found" });
    }

    // Delete image if exists
    if (blog.featuredImage) {
      const imagePath = path.join(__dirname, "..", blog.featuredImage);
      if (fs.existsSync(imagePath)) {
        try {
          fs.unlinkSync(imagePath);
        } catch (err) {
          console.warn("Could not delete blog image:", err.message);
          // Do not fail the request just because the file couldn't be deleted
        }
      }
    }

    await Blog.findByIdAndDelete(id);

    res.status(200).json({ message: "Blog deleted successfully" });
  } catch (error) {
    console.error("Error deleting blog:", error);
    res.status(500).json({ message: "Error deleting blog" });
  }
};

// ==== Count Blogs ====
const getBlogCount = async (req, res) => {
  try {
    const count = await Blog.countDocuments();
    res.status(200).json({ count });
  } catch (error) {
    console.error("Error counting blogs:", error);
    res.status(500).json({ message: "Error counting blogs" });
  }
};

module.exports = {
  blogUpload,
  addBlog,
  getAllBlogs,
  getBlogById,
  updateBlog,
  deleteBlog,
  getBlogCount,
};
