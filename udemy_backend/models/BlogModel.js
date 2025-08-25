// const mongoose = require("mongoose");
// const slugify = require("slugify");

// const blogSchema = new mongoose.Schema(
//   {
//     title: {
//       type: String,
//       required: true,
//     },
//     body: {
//       type: String,
//       required: true,
//     },
//     author: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "User", // Use the User model here
//       required: true,
//     },
//     summary: {
//       type: String,
//     },
//     tags: [String],
//     category: {
//       type: String,
//     },
//     published: {
//       type: Boolean,
//       default: false,
//     },
//     publishedDate: {
//       type: Date,
//     },
//     comments: [
//       {
//         text: String,
//         postedBy: {
//           type: mongoose.Schema.Types.ObjectId,
//           ref: "User", // Use the User model for commenters as well
//         },
//         createdAt: {
//           type: Date,
//           default: Date.now,
//         },
//       },
//     ],
//     likes: [
//       {
//         type: mongoose.Schema.Types.ObjectId,
//         ref: "User", // Use the User model for likes
//       },
//     ],
//     featuredImage: {
//       type: String,
//     },
//     seoTitle: {
//       type: String,
//     },
//     metaDescription: {
//       type: String,
//     },
//     slug: {
//       type: String,
//       slug: "title", // Field 'title' will be used to generate slug
//       unique: true,
//     },
//     viewCount: {
//       type: Number,
//       default: 0,
//     },
//   },
//   {
//     timestamps: true,
//   }
// );

// blogSchema.pre("save", function (next) {
//   if (this.isModified("title")) {
//     this.slug = slugify(this.title, { lower: true, strict: true });
//   }
//   next();
// });

// const Blog = mongoose.model("Blog", blogSchema);

// module.exports = Blog;

//

//

// original code.

//

//

const mongoose = require("mongoose");
const slugify = require("slugify");

const blogSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    body: { type: String, required: true },

    // NEW: structured code & explanation fields
    code: { type: String, default: "" },
    explanation: { type: String, default: "" },

    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    summary: { type: String },
    tags: [{ type: String }], // store as array of strings
    category: { type: String },
    published: { type: Boolean, default: false },
    publishedDate: { type: Date },
    comments: [
      {
        text: String,
        postedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    featuredImage: { type: String },
    seoTitle: { type: String },
    metaDescription: { type: String },
    slug: {
      type: String,
      slug: "title",
      unique: true,
    },
    viewCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

blogSchema.pre("save", function (next) {
  if (this.isModified("title")) {
    this.slug = slugify(this.title, { lower: true, strict: true });
  }
  next();
});

const Blog = mongoose.model("Blog", blogSchema);
module.exports = Blog;
