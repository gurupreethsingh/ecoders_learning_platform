import React, { useEffect, useState, useMemo } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import {
  FaTh,
  FaAlignLeft,
  FaAlignRight,
  FaArrowLeft,
  FaArrowRight,
} from "react-icons/fa";
import { motion } from "framer-motion";
import axios from "axios";
import globalBackendRoute from "../../config/Config";

// simple fallback image
const dogImage = "https://via.placeholder.com/800x500.png?text=No+Image";

// Safe client-side slug fallback (in case server didn't send blog.slug)
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

const SingleBlog = () => {
  // route: /single-blog/:slug/:id
  const { slug, id } = useParams();
  const navigate = useNavigate();

  const [view, setView] = useState("right-sidebar");
  const [searchTerm, setSearchTerm] = useState("");

  const [blog, setBlog] = useState(null);
  const [allBlogs, setAllBlogs] = useState([]);
  const [filteredBlogs, setFilteredBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchErr, setFetchErr] = useState("");
  const [deleting, setDeleting] = useState(false);

  // --- helpers ---
  const getImageUrl = (imagePath) => {
    if (!imagePath) return dogImage;
    try {
      const pathStr = String(imagePath);
      if (/^https?:\/\//i.test(pathStr)) return pathStr; // absolute from API
      const normalized = pathStr.replace(/\\/g, "/");
      const tail = normalized.split("uploads/").pop();
      if (!tail) return dogImage;
      return `${globalBackendRoute}/uploads/${tail}`;
    } catch {
      return dogImage;
    }
  };

  const toTagArray = (tags) => {
    if (!tags) return [];
    if (Array.isArray(tags)) return tags;
    return String(tags)
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
  };

  // Extract ```fenced code``` blocks from body (optional)
  const extractCodeBlocks = (bodyText) => {
    if (!bodyText) return { cleanedBody: "", codeBlocks: [] };
    const text = String(bodyText);
    const codeBlocks = [];
    const regex = /```(?:\w+)?\n([\s\S]*?)```/g;
    let cleaned = text;
    let m;
    while ((m = regex.exec(text)) !== null) {
      codeBlocks.push(m[1].trim());
    }
    cleaned = cleaned.replace(regex, "").trim();
    return { cleanedBody: cleaned, codeBlocks };
  };

  // Turn remaining body into Q/A sections
  const preprocessBody = (text) => {
    if (!text) return [];
    const paragraphs = String(text).split("\n");
    const sections = [];
    let current = [];
    paragraphs.forEach((p) => {
      const trimmed = p.trim();
      if (!trimmed) return;
      if (trimmed.endsWith("?")) {
        if (current.length) sections.push(current);
        current = [{ type: "question", text: trimmed }];
      } else if (current.length > 0 && current[0].type === "question") {
        sections.push([{ type: "answer", text: trimmed }]);
        current = [];
      } else {
        current.push({ type: "text", text: trimmed });
      }
    });
    if (current.length) sections.push(current);
    return sections;
  };

  // --- fetch single blog ---
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setFetchErr("");
      try {
        const { data } = await axios.get(
          `${globalBackendRoute}/api/single-blogs/${id}`
        );
        if (cancelled) return;

        const { cleanedBody, codeBlocks } = extractCodeBlocks(data?.body || "");
        const processed = preprocessBody(cleanedBody);

        setBlog({
          ...data,
          processedBody: processed,
          codeBlocks,
          tags: toTagArray(data?.tags),
          code: data?.code || "",
          explanation: data?.explanation || "",
        });
      } catch (err) {
        console.error("Error fetching blog:", err?.response || err?.message);
        if (!cancelled) setFetchErr("Failed to load blog. Please try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  // --- fetch all blogs for sidebar + prev/next ---
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await axios.get(`${globalBackendRoute}/api/all-blogs`);
        if (cancelled) return;
        const normalized = Array.isArray(data)
          ? data.map((b) => ({ ...b, tags: toTagArray(b?.tags) }))
          : [];
        setAllBlogs(normalized);
        setFilteredBlogs(normalized);
      } catch (err) {
        console.error("Error fetching all blogs:", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // --- filter sidebar by title ---
  useEffect(() => {
    if (!searchTerm) {
      setFilteredBlogs(allBlogs);
      return;
    }
    const term = searchTerm.toLowerCase();
    setFilteredBlogs(
      allBlogs.filter((b) => (b?.title || "").toLowerCase().includes(term))
    );
  }, [searchTerm, allBlogs]);

  // --- prev/next ---
  const prevNext = useMemo(() => {
    if (!blog || allBlogs.length === 0) return { prev: null, next: null };
    const idx = allBlogs.findIndex((b) => b._id === blog._id);
    if (idx === -1) return { prev: null, next: null };
    const prevIndex = idx === 0 ? allBlogs.length - 1 : idx - 1;
    const nextIndex = idx === allBlogs.length - 1 ? 0 : idx + 1;
    return { prev: allBlogs[prevIndex], next: allBlogs[nextIndex] };
  }, [blog, allBlogs]);

  const renderDescription = () =>
    blog?.processedBody?.map((section, idx) => (
      <div key={idx} className="mb-8">
        {section.map((item, i) =>
          item.type === "question" ? (
            <p key={i} className="font-bold text-lg mb-4 mt-6 break-words">
              {item.text}
            </p>
          ) : item.type === "answer" ? (
            <blockquote
              key={i}
              className="border-l-4 border-blue-500 pl-4 text-gray-700 italic mb-6 break-words"
            >
              {item.text}
            </blockquote>
          ) : (
            <p key={i} className="text-gray-800 text-lg mb-4 break-words">
              {item.text}
            </p>
          )
        )}
      </div>
    ));

  const CodeBlock = ({ code }) => (
    <div
      className="rounded-md mb-4"
      style={{
        background: "#e5e7eb",
        color: "#111827",
        fontFamily:
          'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
        fontSize: "0.875rem",
        lineHeight: 1.5,
        padding: "1rem",
        whiteSpace: "pre-wrap",
        overflowWrap: "anywhere",
        wordBreak: "break-word",
        maxWidth: "100%",
        overflowX: "hidden",
      }}
    >
      {code}
    </div>
  );

  const renderCodeAndExplanation = () => {
    const hasSeparateCode = !!blog?.code;
    const hasFencedCode =
      Array.isArray(blog?.codeBlocks) && blog.codeBlocks.length > 0;
    const hasExplanation = !!blog?.explanation;

    if (!hasSeparateCode && !hasFencedCode && !hasExplanation) return null;

    return (
      <div
        className="mt-10 p-6 rounded-xl shadow-md border border-gray-200"
        style={{ background: "#f3f4f6" }}
      >
        <h3 className="text-2xl font-bold mb-4 text-gray-900">Code Example:</h3>

        {hasSeparateCode && <CodeBlock code={blog.code} />}

        {hasFencedCode &&
          blog.codeBlocks.map((block, idx) => (
            <CodeBlock key={idx} code={block} />
          ))}

        {hasExplanation && (
          <>
            <h4 className="text-lg font-semibold mb-2">Explanation:</h4>
            <p className="text-gray-800 whitespace-pre-wrap break-words">
              {blog.explanation}
            </p>
          </>
        )}
      </div>
    );
  };

  const blogPath = (b) =>
    `/single-blog/${makeSlug(b?.title, b?.slug)}/${b?._id}`;

  const renderSidebar = () => (
    <div className="p-4 mt-4 lg:w-80 border border-gray-200 rounded-md overflow-x-hidden">
      <input
        type="text"
        placeholder="Search blogs..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="w-full p-2 border border-gray-300 rounded mb-4"
      />
      <h3 className="text-lg font-bold mb-4 border-b text-left">
        Latest Blogs
      </h3>
      <ul className="mb-4">
        {filteredBlogs
          .filter((b) => b._id !== blog?._id)
          .map((b) => (
            <li
              key={b._id}
              className="flex items-center mb-4 cursor-pointer border-b"
              onClick={() => navigate(blogPath(b))}
            >
              <img
                src={getImageUrl(b.featuredImage)}
                alt={b.title}
                className="w-12 h-12 mr-2 rounded-md object-cover"
                onError={(e) => (e.currentTarget.src = dogImage)}
              />
              <div className="text-sm break-words">
                <Link to={blogPath(b)}>{b.title}</Link>
              </div>
            </li>
          ))}
      </ul>
      <h3 className="text-lg font-bold mb-2 border-b text-left">Category</h3>
      <p className="mb-4 break-words">{blog?.category}</p>
      <h3 className="text-lg font-bold mb-2 border-b text-left">Tags</h3>
      <div className="flex flex-wrap">
        {toTagArray(blog?.tags).map((tag, i) => (
          <span
            key={i}
            className="bg-gray-200 text-gray-700 text-xs px-2 py-1 mr-2 mb-2 rounded"
          >
            {tag}
          </span>
        ))}
      </div>
    </div>
  );

  // --- ACTIONS: Delete & Update ---
  const onDelete = async () => {
    if (!id) return;
    const ok = window.confirm("Are you sure you want to delete this blog?");
    if (!ok) return;

    setDeleting(true);
    try {
      await axios.delete(`${globalBackendRoute}/api/delete-blog/${id}`);
      alert("✅ Blog deleted successfully.");
      navigate("/all-blogs", { replace: true });
    } catch (err) {
      console.error("Delete failed:", err?.response || err);
      alert("❌ Failed to delete the blog. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  const onUpdate = () => {
    if (!id) return;
    navigate(`/update-blog/${id}`);
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-4">
        <p className="text-center text-gray-600">Loading…</p>
      </div>
    );
  }

  if (fetchErr || !blog) {
    return (
      <div className="max-w-7xl mx-auto p-4">
        <p className="text-center text-red-600">{fetchErr || "Not found."}</p>
      </div>
    );
  }

  return (
    <motion.div
      className="max-w-7xl mx-auto p-4 border-b overflow-x-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex justify-between items-center mb-2 gap-4">
        <h1 className="text-3xl font-bold break-words">{blog.title}</h1>

        {/* Right side controls: 3 icons + Update + Delete */}
        <div className="flex items-center gap-2 sm:gap-3">
          <FaTh
            onClick={() => setView("wide")}
            className={`cursor-pointer text-xl ${
              view === "wide" ? "text-blue-500" : "text-gray-500"
            }`}
            title="Wide view"
          />
          <FaAlignLeft
            onClick={() => setView("left-sidebar")}
            className={`cursor-pointer text-xl ${
              view === "left-sidebar" ? "text-blue-500" : "text-gray-500"
            }`}
            title="Left sidebar"
          />
          <FaAlignRight
            onClick={() => setView("right-sidebar")}
            className={`cursor-pointer text-xl ${
              view === "right-sidebar" ? "text-blue-500" : "text-gray-500"
            }`}
            title="Right sidebar"
          />

          {/* Update */}
          <button
            type="button"
            onClick={onUpdate}
            className="ml-2 px-3 py-1.5 text-sm rounded-md bg-indigo-600 text-white hover:bg-indigo-700"
            title="Update this blog"
          >
            Update
          </button>

          {/* Delete */}
          <button
            type="button"
            onClick={onDelete}
            disabled={deleting}
            className={`px-3 py-1.5 text-sm rounded-md ${
              deleting
                ? "bg-red-300 cursor-not-allowed text-white"
                : "bg-red-600 hover:bg-red-700 text-white"
            }`}
            title="Delete this blog"
          >
            {deleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>

      <p className="text-gray-600 mb-4 text-left">
        Published on{" "}
        {blog?.publishedDate
          ? new Date(blog.publishedDate).toLocaleDateString()
          : "—"}
      </p>

      <div className="flex lg:flex-row flex-col">
        {view === "left-sidebar" && (
          <div className="lg:w-1/4 w-full lg:mr-8 mb-8">{renderSidebar()}</div>
        )}

        <div className="flex-1 p-3 overflow-x-hidden">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="w-full mb-8"
          >
            <img
              src={getImageUrl(blog.featuredImage)}
              alt={blog.title}
              className="w-full max-h-[500px] object-cover rounded-xl shadow-md max-w-full"
              onError={(e) => (e.currentTarget.src = dogImage)}
            />
          </motion.div>

          <div className="p-3 w-full whitespace-pre-wrap break-words overflow-x-hidden">
            {renderDescription()}
            {renderCodeAndExplanation()}
          </div>

          <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mt-10">
            <button
              onClick={() => prevNext.prev && navigate(blogPath(prevNext.prev))}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg flex items-center shadow disabled:opacity-50"
              disabled={!prevNext.prev}
            >
              <FaArrowLeft className="mr-2" />
              <span className="text-sm font-medium text-left break-words">
                {prevNext.prev?.title || "Previous"}
              </span>
            </button>

            <button
              onClick={() => prevNext.next && navigate(blogPath(prevNext.next))}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg flex items-center shadow disabled:opacity-50"
              disabled={!prevNext.next}
            >
              <span className="text-sm font-medium text-right break-words">
                {prevNext.next?.title || "Next"}
              </span>
              <FaArrowRight className="ml-2" />
            </button>
          </div>
        </div>

        {view === "right-sidebar" && (
          <div className="lg:w-1/4 w-full lg:ml-8 mb-8">{renderSidebar()}</div>
        )}
      </div>
    </motion.div>
  );
};

export default SingleBlog;
