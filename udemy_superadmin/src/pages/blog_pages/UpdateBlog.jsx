import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import globalBackendRoute from "../../config/Config";

const dogImage = "https://via.placeholder.com/800x500.png?text=No+Image";

export default function UpdateBlog() {
  const { id } = useParams();
  const navigate = useNavigate();

  const initialFormData = {
    title: "",
    body: "",
    summary: "",
    tags: "", // string for input (comma-separated)
    category: "",
    seoTitle: "",
    metaDescription: "",
    published: false,
    featuredImage: null, // File object if changed
    code: "",
    explanation: "",
  };

  const [formData, setFormData] = useState(initialFormData);
  const [existingImageUrl, setExistingImageUrl] = useState(""); // preview current image
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const getImageUrl = (imagePath) => {
    if (!imagePath) return dogImage;
    try {
      const pathStr = String(imagePath).replace(/\\/g, "/");
      if (/^https?:\/\//i.test(pathStr)) return pathStr;
      const tail = pathStr.split("uploads/").pop();
      if (!tail) return dogImage;
      return `${globalBackendRoute}/uploads/${tail}`;
    } catch {
      return dogImage;
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const { data } = await axios.get(
          `${globalBackendRoute}/api/single-blogs/${id}`
        );

        if (cancelled) return;

        // Normalize tags -> a string for the input
        let tagsStr = "";
        if (Array.isArray(data?.tags)) {
          tagsStr = data.tags.join(", ");
        } else if (typeof data?.tags === "string") {
          tagsStr = data.tags;
        }

        setFormData({
          title: data?.title || "",
          body: data?.body || "",
          summary: data?.summary || "",
          tags: tagsStr,
          category: data?.category || "",
          seoTitle: data?.seoTitle || "",
          metaDescription: data?.metaDescription || "",
          published: !!data?.published,
          featuredImage: null, // no new file yet
          code: data?.code || "",
          explanation: data?.explanation || "",
        });

        setExistingImageUrl(getImageUrl(data?.featuredImage));
      } catch (err) {
        console.error("Error loading blog:", err);
        alert("Failed to load blog.");
        navigate("/all-blogs");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id, navigate]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0] || null;
    setFormData((prev) => ({ ...prev, featuredImage: file }));
    if (file) {
      // preview new image
      const reader = new FileReader();
      reader.onload = () => setExistingImageUrl(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const blogForm = new FormData();
      // Append all fields
      blogForm.append("title", formData.title);
      blogForm.append("body", formData.body);
      blogForm.append("summary", formData.summary);
      blogForm.append("tags", formData.tags);
      blogForm.append("category", formData.category);
      blogForm.append("seoTitle", formData.seoTitle);
      blogForm.append("metaDescription", formData.metaDescription);
      blogForm.append("published", formData.published);
      blogForm.append("code", formData.code || "");
      blogForm.append("explanation", formData.explanation || "");

      // Only append featuredImage if user selected a new file
      if (formData.featuredImage) {
        blogForm.append("featuredImage", formData.featuredImage);
      }

      await axios.put(`${globalBackendRoute}/api/update-blog/${id}`, blogForm, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      // NOTE: Your backend's updateBlog already deletes old image when a new file is provided.
      alert("✅ Blog updated successfully!");

      // Go back to the single blog page
      navigate(`/single-blog/updated/${id}`, { replace: true });
    } catch (error) {
      console.error("Error updating blog:", error);
      alert("❌ Failed to update blog. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="containerWidth my-8">
        <div className="bg-white p-6 sm:p-8 max-w-7xl mx-auto">
          <p>Loading blog…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="containerWidth my-8">
      <div className="bg-white p-6 sm:p-8 max-w-7xl mx-auto">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
          ✏️ Update Blog
        </h2>

        {/* Current / New Image Preview */}
        <div className="mb-6">
          <img
            src={existingImageUrl || dogImage}
            alt="Current"
            className="w-full max-h-[320px] object-cover rounded-lg border"
            onError={(e) => (e.currentTarget.src = dogImage)}
          />
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {[
            { label: "Title", name: "title", type: "text" },
            { label: "SEO Title", name: "seoTitle", type: "text" },
            { label: "Tags (comma-separated)", name: "tags", type: "text" },
            { label: "Category", name: "category", type: "text" },
          ].map(({ label, name, type }) => (
            <div key={name}>
              <label htmlFor={name} className="formLabel">
                {label}
              </label>
              <input
                type={type}
                name={name}
                value={formData[name]}
                onChange={handleChange}
                className="formInput"
                required={name === "title"}
              />
            </div>
          ))}

          <div>
            <label className="formLabel" htmlFor="body">
              Body (normal content)
            </label>
            <textarea
              id="body"
              name="body"
              rows="8"
              value={formData.body}
              onChange={handleChange}
              className="formInput"
              required
            />
          </div>

          <div>
            <label className="formLabel" htmlFor="summary">
              Summary
            </label>
            <textarea
              id="summary"
              name="summary"
              rows="2"
              value={formData.summary}
              onChange={handleChange}
              className="formInput"
            />
          </div>

          <div>
            <label className="formLabel" htmlFor="metaDescription">
              Meta Description
            </label>
            <textarea
              id="metaDescription"
              name="metaDescription"
              rows="2"
              value={formData.metaDescription}
              onChange={handleChange}
              className="formInput"
            />
          </div>

          {/* Optional structured code/explanation */}
          <div>
            <label className="formLabel" htmlFor="code">
              Code (optional; shows with gray background)
            </label>
            <textarea
              id="code"
              name="code"
              rows="6"
              value={formData.code}
              onChange={handleChange}
              className="formInput font-mono"
            />
          </div>

          <div>
            <label className="formLabel" htmlFor="explanation">
              Explanation (optional)
            </label>
            <textarea
              id="explanation"
              name="explanation"
              rows="3"
              value={formData.explanation}
              onChange={handleChange}
              className="formInput"
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="published"
              name="published"
              checked={formData.published}
              onChange={handleChange}
              className="mr-2"
            />
            <label htmlFor="published" className="text-sm text-gray-700">
              Publish Blog
            </label>
          </div>

          <div>
            <label className="formLabel" htmlFor="featuredImage">
              Replace Featured Image (optional)
            </label>
            <input
              type="file"
              id="featuredImage"
              onChange={handleImageChange}
              className="w-full mt-1 text-sm file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-indigo-600 file:text-white hover:file:bg-indigo-700"
            />
            <p className="text-xs text-gray-500 mt-1">
              Choose a new image only if you want to replace the current one.
            </p>
          </div>

          <div className="text-center pt-4">
            <button
              type="submit"
              disabled={saving}
              className={`primaryBtn px-6 py-2 rounded-lg w-full sm:w-1/2 mx-auto ${
                saving ? "opacity-60 cursor-not-allowed" : ""
              }`}
            >
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
