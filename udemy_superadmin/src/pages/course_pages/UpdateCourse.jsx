import React, { useEffect, useMemo, useState, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import globalBackendRoute from "@/config/Config.js";
import {
  FiSave,
  FiX,
  FiAlertTriangle,
  FiCheckCircle,
  FiRefreshCcw,
  FiPlus,
  FiTrash2,
  FiArrowUp,
  FiArrowDown,
  FiChevronDown,
  FiChevronRight,
  FiMinimize2,
  FiMaximize2,
} from "react-icons/fi";

const API = globalBackendRoute;

const LEVELS = ["Beginner", "Intermediate", "Advanced"];
const ACCESS = ["Free", "Paid", "Subscription", "Lifetime"];
const COMPLETION = ["All Topics", "Final Exam", "Manual Approval"];

// include visibility here so it collapses too
const SECTION_KEYS = [
  "basic",
  "seo",
  "marketing",
  "associations",
  "learning",
  "access",
  "certificate",
  "visibility",
];

/* ---------------------- helpers to fix 400s ---------------------- */

// robustly coerce anything that "looks like" an ObjectId into a string
const toIdString = (v) => {
  if (!v && v !== 0) return "";
  // already a string
  if (typeof v === "string") return v;
  // Typical Mongoose ObjectId has .toString() => "hex24"
  try {
    const s = String(v);
    return s;
  } catch {
    return "";
  }
};

const isValidObjectIdHex = (s) => /^[a-f\d]{24}$/i.test(s || "");

// Only include a field if it's a valid 24-hex ObjectId string
const idOrUndef = (v) => {
  const s = toIdString(v);
  return isValidObjectIdHex(s) ? s : undefined;
};

// Only include a date if it's a valid datetime-local string
const dateOrUndef = (v) => {
  if (!v || typeof v !== "string") return undefined;
  const d = new Date(v);
  return isNaN(d.getTime()) ? undefined : v; // send the same string; backend will parse
};

const cleanCsv = (s) =>
  String(s || "")
    .split(/[,\n]/) // allow comma or newline
    .map((x) => x.trim())
    .filter(Boolean);

const emptyTopic = () => ({
  title: "",
  explanation: "",
  code: "",
  codeExplanation: "",
  codeLanguage: "plaintext",
  videoUrl: "",
  pdfUrl: "",
  duration: "",
  isFreePreview: false,
  _collapsed: false, // UI-only flag
});

// convert ISO string/Date to input[type=datetime-local] value
const toLocalDateTimeValue = (v) => {
  if (!v) return "";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mi = pad(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
};

// simple toast component
const Toast = ({ text, onClose }) => {
  if (!text) return null;
  return (
    <div className="fixed bottom-6 right-6 z-50">
      <div className="flex items-center gap-2 rounded-lg bg-gray-900 text-white px-4 py-3 shadow-lg">
        <FiCheckCircle className="h-4 w-4" />
        <span className="text-sm">{text}</span>
        <button
          onClick={onClose}
          className="ml-2 rounded px-2 py-0.5 text-xs bg-white/10 hover:bg-white/20"
        >
          Close
        </button>
      </div>
    </div>
  );
};

const UpdateCourse = () => {
  const { id } = useParams();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState({ type: "", text: "" });

  // toast state
  const [toastText, setToastText] = useState("");
  const toastTimerRef = useRef(null);
  const showToast = (text) => {
    setToastText(text);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToastText(""), 2500);
  };

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  // basic fields + all the missing ones you wanted
  const [form, setForm] = useState({
    // Basics
    title: "",
    slug: "",
    description: "",
    language: "English",
    level: "Beginner",
    durationInHours: "",
    price: "",
    accessType: "Paid",
    thumbnail: "",
    promoVideoUrl: "",

    // SEO / tags
    metaTitle: "",
    metaDescription: "",
    keywordsCsv: "",
    tagsCsv: "",

    // Marketing/more info
    requirementsCsv: "",
    learningOutcomesCsv: "",

    // People
    instructor: "",
    authorsCsv: "",

    // Associations
    degree: "",
    semester: "",
    category: "",
    subCategory: "",

    // Learning resources
    lrVideosCsv: "",
    lrPdfsCsv: "",
    lrAssignmentsCsv: "",
    lrLinksCsv: "",

    // Access / enrollment
    maxStudents: "",
    enrollmentDeadlineLocal: "", // datetime-local control value
    completionCriteria: "All Topics",

    // Certificate
    issueCertificate: false,
    certificateTemplateUrl: "",

    // Flags / display
    published: false,
    isArchived: false,
    isFeatured: false,
    order: "",
    version: "",
  });

  // lookups
  const [degrees, setDegrees] = useState([]);
  const [semesters, setSemisters] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [instructors, setInstructors] = useState([]);

  // modules & topics
  const [modules, setModules] = useState([]);

  // collapsible main sections — start COLLAPSED on initial load
  const [sectionCollapsed, setSectionCollapsed] = useState(
    SECTION_KEYS.reduce((acc, k) => ({ ...acc, [k]: true }), {})
  );

  const toggleSection = (key) =>
    setSectionCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));

  const setAllSectionsCollapsed = (collapsed) =>
    setSectionCollapsed(
      SECTION_KEYS.reduce((acc, k) => ({ ...acc, [k]: collapsed }), {})
    );

  /* ------------------------ load data ------------------------ */
  useEffect(() => {
    let active = true;

    (async () => {
      try {
        setLoading(true);
        setErr("");
        setMsg({ type: "", text: "" });

        const [courseRes, deg, sem, cat, sub, inst] = await Promise.allSettled([
          fetch(`${API}/api/get-course-by-id/${id}`).then((r) => r.json()),
          fetch(`${API}/api/list-degrees?page=1&limit=500`).then((r) =>
            r.json()
          ),
          fetch(`${API}/api/semesters?page=1&limit=2000`).then((r) => r.json()),
          fetch(`${API}/api/all-categories`).then((r) => r.json()),
          fetch(`${API}/api/all-subcategories`).then((r) => r.json()),
          fetch(`${API}/api/get-instructors`).then((r) => r.json()),
        ]);

        if (!active) return;

        if (courseRes.status !== "fulfilled" || !courseRes.value) {
          throw new Error("Failed to load course.");
        }
        const c = courseRes.value;
        if (!c || c.message) throw new Error(c.message || "Course not found.");

        // learning resources safe picks
        const lr = c.learningResources || {};
        const arrOrEmpty = (a) => (Array.isArray(a) ? a : []);

        // Coerce incoming ids to strings (avoid BSON objects in selects)
        const degreeId = toIdString(c.degree);
        const semesterId = toIdString(c.semester);
        const categoryId = toIdString(c.category);
        const subCategoryId = toIdString(c.subCategory);
        const instructorId = toIdString(c.instructor);

        setForm({
          // Basics
          title: c.title || "",
          slug: c.slug || "",
          description: c.description || "",
          language: c.language || "English",
          level: c.level || "Beginner",
          durationInHours:
            typeof c.durationInHours === "number" ? c.durationInHours : "",
          price: typeof c.price === "number" ? c.price : "",
          accessType: c.accessType || "Paid",
          thumbnail: c.thumbnail || "",
          promoVideoUrl: c.promoVideoUrl || "",

          // SEO
          metaTitle: c.metaTitle || "",
          metaDescription: c.metaDescription || "",
          keywordsCsv: Array.isArray(c.keywords) ? c.keywords.join(", ") : "",
          tagsCsv: Array.isArray(c.tags) ? c.tags.join(", ") : "",

          // Marketing
          requirementsCsv: Array.isArray(c.requirements)
            ? c.requirements.join(", ")
            : "",
          learningOutcomesCsv: Array.isArray(c.learningOutcomes)
            ? c.learningOutcomes.join(", ")
            : "",

          // People
          instructor: instructorId || "",
          authorsCsv: Array.isArray(c.authors)
            ? c.authors.map((x) => toIdString(x)).join(", ")
            : "",

          // Associations
          degree: degreeId || "",
          semester: semesterId || "",
          category: categoryId || "",
          subCategory: subCategoryId || "",

          // Learning resources
          lrVideosCsv: arrOrEmpty(lr.videos).join(", "),
          lrPdfsCsv: arrOrEmpty(lr.pdfs).join(", "),
          lrAssignmentsCsv: arrOrEmpty(lr.assignments).join(", "),
          lrLinksCsv: arrOrEmpty(lr.externalLinks).join(", "),

          // Access / enrollment
          maxStudents:
            typeof c.maxStudents === "number" ? String(c.maxStudents) : "",
          enrollmentDeadlineLocal: toLocalDateTimeValue(c.enrollmentDeadline),
          completionCriteria: c.completionCriteria || "All Topics",

          // Certificate
          issueCertificate: Boolean(c.issueCertificate),
          certificateTemplateUrl: c.certificateTemplateUrl || "",

          // Flags / display
          published: Boolean(c.published),
          isArchived: Boolean(c.isArchived),
          isFeatured: Boolean(c.isFeatured),
          order: typeof c.order === "number" ? String(c.order) : "",
          version: c.version || "",
        });

        // normalize modules — start COLLAPSED on initial load
        const incomingModules = Array.isArray(c.modules) ? c.modules : [];
        setModules(
          incomingModules.map((m) => ({
            title: m.title || "",
            description: m.description || "",
            _collapsed: true, // collapsed on load
            topics: Array.isArray(m.topics)
              ? m.topics.map((t) => ({
                  title: t.title || "",
                  explanation: t.explanation || "",
                  code: t.code || "",
                  codeExplanation: t.codeExplanation || "",
                  codeLanguage: t.codeLanguage || "plaintext",
                  videoUrl: t.videoUrl || "",
                  pdfUrl: t.pdfUrl || "",
                  duration:
                    typeof t.duration === "number" ? String(t.duration) : "",
                  isFreePreview: !!t.isFreePreview,
                  _collapsed: true, // collapsed on load
                }))
              : [],
          }))
        );

        // Option lists (leave raw but ensure selects use string values)
        if (deg.status === "fulfilled") {
          const list = deg.value?.data || deg.value || [];
          setDegrees(Array.isArray(list) ? list : []);
        }
        if (sem.status === "fulfilled") {
          const list = sem.value?.data || sem.value || [];
          setSemisters(Array.isArray(list) ? list : []);
        }
        if (cat.status === "fulfilled") {
          const list = cat.value?.data || cat.value || [];
          setCategories(Array.isArray(list) ? list : []);
        }
        if (sub.status === "fulfilled") {
          const list = sub.value?.data || sub.value || [];
          setSubcategories(Array.isArray(list) ? list : []);
        }
        if (inst.status === "fulfilled") {
          const list =
            inst.value?.data?.data || inst.value?.data || inst.value || [];
          setInstructors(Array.isArray(list) ? list : []);
        }
      } catch (e) {
        if (active) setErr(e.message || "Something went wrong.");
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [API, id]);

  const canSave = useMemo(() => form.title.trim() && !saving, [form, saving]);

  /* ------------------------ basic form handlers ------------------------ */
  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setMsg({ type: "", text: "" });
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  /* ------------------------ modules & topics handlers (client-side) ------------------------ */
  const addModuleLocal = () => {
    setModules((prev) => [
      // new module starts expanded so user can edit right away
      { title: "", description: "", _collapsed: false, topics: [] },
      ...prev,
    ]);
  };
  const removeModuleLocal = (mIndex) => {
    setModules((prev) => prev.filter((_, i) => i !== mIndex));
  };
  const updateModuleFieldLocal = (mIndex, field, value) => {
    setModules((prev) =>
      prev.map((m, i) => (i === mIndex ? { ...m, [field]: value } : m))
    );
  };

  const moveModule = (mIndex, dir) => {
    setModules((prev) => {
      const next = [...prev];
      const to = mIndex + dir;
      if (to < 0 || to >= next.length) return prev;
      const [m] = next.splice(mIndex, 1);
      next.splice(to, 0, m);
      return next;
    });
  };

  const addTopicLocal = (mIndex) => {
    setModules((prev) =>
      prev.map((m, i) =>
        i === mIndex
          ? {
              ...m,
              topics: [
                // new topic expanded for immediate edit
                { ...emptyTopic(), _collapsed: false },
                ...(m.topics || []),
              ],
            }
          : m
      )
    );
  };
  const removeTopicLocal = (mIndex, tIndex) => {
    setModules((prev) =>
      prev.map((m, i) =>
        i === mIndex
          ? { ...m, topics: (m.topics || []).filter((_, j) => j !== tIndex) }
          : m
      )
    );
  };
  const updateTopicFieldLocal = (mIndex, tIndex, field, value) => {
    setModules((prev) =>
      prev.map((m, i) =>
        i === mIndex
          ? {
              ...m,
              topics: m.topics.map((t, j) =>
                j === tIndex ? { ...t, [field]: value } : t
              ),
            }
          : m
      )
    );
  };

  const moveTopic = (mIndex, tIndex, dir) => {
    setModules((prev) =>
      prev.map((m, i) => {
        if (i !== mIndex) return m;
        const list = [...(m.topics || [])];
        const to = tIndex + dir;
        if (to < 0 || to >= list.length) return m;
        const [t] = list.splice(tIndex, 1);
        list.splice(to, 0, t);
        return { ...m, topics: list };
      })
    );
  };

  /* ------------------------ collapse / expand helpers (modules/topics) ------------------------ */
  const toggleModuleCollapsed = (mIndex) => {
    setModules((prev) =>
      prev.map((m, i) =>
        i === mIndex ? { ...m, _collapsed: !m._collapsed } : m
      )
    );
  };

  const toggleTopicCollapsed = (mIndex, tIndex) => {
    setModules((prev) =>
      prev.map((m, i) =>
        i === mIndex
          ? {
              ...m,
              topics: m.topics.map((t, j) =>
                j === tIndex ? { ...t, _collapsed: !t._collapsed } : t
              ),
            }
          : m
      )
    );
  };

  const setAllModulesCollapsed = (collapsed) => {
    setModules((prev) => prev.map((m) => ({ ...m, _collapsed: collapsed })));
  };

  const setAllTopicsCollapsed = (collapsed) => {
    setModules((prev) =>
      prev.map((m) => ({
        ...m,
        topics: (m.topics || []).map((t) => ({ ...t, _collapsed: collapsed })),
      }))
    );
  };

  const setAllTopicsInModuleCollapsed = (mIndex, collapsed) => {
    setModules((prev) =>
      prev.map((m, i) =>
        i === mIndex
          ? {
              ...m,
              topics: (m.topics || []).map((t) => ({
                ...t,
                _collapsed: collapsed,
              })),
            }
          : m
      )
    );
  };

  /* ------------------------ server calls: basic + modules (all-at-once) ------------------------ */
  const onSubmit = async (e) => {
    e.preventDefault();
    setMsg({ type: "", text: "" });

    if (!form.title.trim()) {
      setMsg({ type: "error", text: "Title is required." });
      return;
    }

    // Build payload (includes modules) — GUARANTEE strings for IDs & valid date
    const payload = {
      // basics
      title: form.title.trim(),
      description: form.description,
      language: form.language,
      level: form.level,
      accessType: form.accessType,
      thumbnail: form.thumbnail,
      promoVideoUrl: form.promoVideoUrl,

      // SEO
      metaTitle: form.metaTitle,
      metaDescription: form.metaDescription,
      tags: cleanCsv(form.tagsCsv),
      keywords: cleanCsv(form.keywordsCsv),

      // marketing
      requirements: cleanCsv(form.requirementsCsv),
      learningOutcomes: cleanCsv(form.learningOutcomesCsv),

      // associations / people (only send if valid 24-hex)
      degree: idOrUndef(form.degree),
      semester: idOrUndef(form.semester),
      category: idOrUndef(form.category),
      subCategory: idOrUndef(form.subCategory),
      instructor: idOrUndef(form.instructor),
      authors: cleanCsv(form.authorsCsv).filter(isValidObjectIdHex),

      // learning resources
      learningResources: {
        videos: cleanCsv(form.lrVideosCsv),
        pdfs: cleanCsv(form.lrPdfsCsv),
        assignments: cleanCsv(form.lrAssignmentsCsv),
        externalLinks: cleanCsv(form.lrLinksCsv),
      },

      // access / enrollment
      maxStudents:
        form.maxStudents === "" ? undefined : Number(form.maxStudents),
      enrollmentDeadline: dateOrUndef(form.enrollmentDeadlineLocal),
      completionCriteria: form.completionCriteria,

      // certificate
      issueCertificate: Boolean(form.issueCertificate),
      certificateTemplateUrl: form.certificateTemplateUrl,

      // flags / display
      published: Boolean(form.published),
      isArchived: Boolean(form.isArchived),
      isFeatured: Boolean(form.isFeatured),
      order: form.order === "" ? undefined : Number(form.order),
      version: form.version,

      // send all modules+topics (omit _collapsed)
      modules: modules.map((m) => ({
        title: m.title,
        description: m.description,
        topics: (m.topics || []).map((t) => ({
          title: t.title,
          explanation: t.explanation,
          code: t.code,
          codeExplanation: t.codeExplanation,
          codeLanguage: t.codeLanguage || "plaintext",
          videoUrl: t.videoUrl,
          pdfUrl: t.pdfUrl,
          duration: t.duration === "" ? undefined : Number(t.duration),
          isFreePreview: !!t.isFreePreview,
        })),
      })),
    };

    if (form.slug && form.slug.trim()) payload.slug = form.slug.trim();
    if (form.durationInHours !== "")
      payload.durationInHours = Number(form.durationInHours);
    if (form.price !== "") payload.price = Number(form.price);

    // remove undefined keys so we don't send empty objects/dates
    Object.keys(payload).forEach((k) => {
      if (
        payload[k] === undefined ||
        (typeof payload[k] === "object" &&
          payload[k] !== null &&
          !Array.isArray(payload[k]) &&
          Object.keys(payload[k]).length === 0)
      ) {
        delete payload[k];
      }
    });

    try {
      setSaving(true);
      const res = await fetch(`${API}/api/update-course/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const contentType = res.headers.get("content-type") || "";
      const body = contentType.includes("application/json")
        ? await res.json()
        : { message: await res.text() };

      if (!res.ok) {
        console.log("UPDATE /update-course status:", res.status, "body:", body);
        throw new Error(body?.message || "Failed to update course.");
      }

      setMsg({ type: "success", text: "Course updated successfully." });
      showToast("Updated successfully");
    } catch (e) {
      setMsg({ type: "error", text: e.message || "Something went wrong." });
    } finally {
      setSaving(false);
    }
  };

  /* ------------------------ server calls: granular ops (optional) ------------------------ */
  const syncAfter = async (promise, successMsg) => {
    try {
      setSaving(true);
      const res = await promise;
      const contentType = res.headers.get("content-type") || "";
      const body = contentType.includes("application/json")
        ? await res.json()
        : { message: await res.text() };
      if (!res.ok) throw new Error(body?.message || "Request failed.");
      // refresh modules from server (body is the full course object per controller)
      if (body?.modules) {
        setModules(
          (body.modules || []).map((m) => ({
            title: m.title || "",
            description: m.description || "",
            // keep collapsed on refresh to match initial-load behavior
            _collapsed: true,
            topics: Array.isArray(m.topics)
              ? m.topics.map((t) => ({
                  title: t.title || "",
                  explanation: t.explanation || "",
                  code: t.code || "",
                  codeExplanation: t.codeExplanation || "",
                  codeLanguage: t.codeLanguage || "plaintext",
                  videoUrl: t.videoUrl || "",
                  pdfUrl: t.pdfUrl || "",
                  duration:
                    typeof t.duration === "number" ? String(t.duration) : "",
                  isFreePreview: !!t.isFreePreview,
                  _collapsed: true,
                }))
              : [],
          }))
        );
      }
      setMsg({ type: "success", text: successMsg });
      showToast(successMsg);
    } catch (e) {
      setMsg({ type: "error", text: e.message || "Something went wrong." });
    } finally {
      setSaving(false);
    }
  };

  const addModuleServer = (m) =>
    syncAfter(
      fetch(`${API}/api/courses/${id}/modules`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: m.title, description: m.description }),
      }),
      "Module saved"
    );

  const updateModuleServer = (mIndex, m) =>
    syncAfter(
      fetch(`${API}/api/courses/${id}/modules/${mIndex}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: m.title, description: m.description }),
      }),
      "Module updated"
    );

  const deleteModuleServer = (mIndex) =>
    syncAfter(
      fetch(`${API}/api/courses/${id}/modules/${mIndex}`, {
        method: "DELETE",
      }),
      "Module deleted"
    );

  const addTopicServer = (mIndex, t) =>
    syncAfter(
      fetch(`${API}/api/courses/${id}/modules/${mIndex}/topics`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(t),
      }),
      "Topic saved"
    );

  const updateTopicServer = (mIndex, tIndex, t) =>
    syncAfter(
      fetch(`${API}/api/courses/${id}/modules/${mIndex}/topics/${tIndex}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(t),
      }),
      "Topic updated"
    );

  const deleteTopicServer = (mIndex, tIndex) =>
    syncAfter(
      fetch(`${API}/api/courses/${id}/modules/${mIndex}/topics/${tIndex}`, {
        method: "DELETE",
      }),
      "Topic deleted"
    );

  /* ------------------------ skeletons ------------------------ */
  if (loading) {
    return (
      <div className="max-w-7xl mx-auto w-full px-5 md:px-8 py-8">
        <div className="max-w-4xl mx-auto bg-white p-6 md:p-8">
          <div className="h-6 w-48 bg-gray-200 mb-6" />
          <div className="h-20 w-full bg-gray-200 mb-4" />
          <div className="h-40 w-full bg-gray-200" />
        </div>
      </div>
    );
  }

  if (err) {
    return (
      <div className="max-w-7xl mx-auto w-full px-5 md:px-8 py-8">
        <div className="max-w-4xl mx-auto bg-white p-6 md:p-8">
          <div className="rounded-lg px-4 py-3 text-sm bg-red-50 text-red-800 border border-red-200">
            {err}
          </div>
          <div className="mt-4 flex gap-3">
            <Link to="/all-courses" className="text-gray-900 underline">
              ← Back to All Courses
            </Link>
            <Link to="/dashboard" className="text-gray-900 underline">
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="max-w-7xl mx-auto w-full px-5 md:px-8 py-8">
        <div className="max-w-4xl mx-auto bg-white p-6 md:p-8">
          {/* Header */}
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                Update Course
              </h1>
              <p className="text-gray-600 mt-1">
                Edit general details, marketing, resources, modules & topics.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setAllSectionsCollapsed(true)}
                className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm border hover:bg-gray-50"
                title="Collapse all sections"
              >
                <FiMinimize2 className="h-4 w-4" />
                Collapse sections
              </button>
              <button
                type="button"
                onClick={() => setAllSectionsCollapsed(false)}
                className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm border hover:bg-gray-50"
                title="Expand all sections"
              >
                <FiMaximize2 className="h-4 w-4" />
                Expand sections
              </button>
              <Link
                to={`/single-course/${encodeURIComponent(
                  form.slug || "course"
                )}/${id}`}
                className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-gray-900 text-sm font-semibold border hover:bg-gray-50"
                title="Back to Course"
              >
                <FiRefreshCcw className="h-4 w-4" />
                View Course
              </Link>
            </div>
          </div>

          {/* Alerts */}
          {msg.text ? (
            <div
              className={`mt-4 rounded-lg px-4 py-3 text-sm ${
                msg.type === "success"
                  ? "bg-green-50 text-green-800 border border-green-200"
                  : "bg-red-50 text-red-800 border border-red-200"
              }`}
            >
              {msg.type === "success" ? (
                <FiCheckCircle className="inline mr-2" />
              ) : (
                <FiAlertTriangle className="inline mr-2" />
              )}
              {msg.text}
            </div>
          ) : null}

          {/* Form */}
          <form onSubmit={onSubmit} className="mt-6 space-y-6">
            {/* Basic */}
            <div className="rounded-lg border p-4">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggleSection("basic")}
                    className="p-2 border rounded hover:bg-gray-50"
                    title={sectionCollapsed.basic ? "Expand" : "Collapse"}
                  >
                    {sectionCollapsed.basic ? (
                      <FiChevronRight className="h-4 w-4" />
                    ) : (
                      <FiChevronDown className="h-4 w-4" />
                    )}
                  </button>
                  <h2 className="font-semibold text-gray-900">Basic</h2>
                </div>
              </div>
              {!sectionCollapsed.basic && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-800">
                        Title *
                      </label>
                      <input
                        name="title"
                        type="text"
                        value={form.title}
                        onChange={onChange}
                        required
                        className="mt-2 w-full rounded-lg border border-gray-300 focus:border-gray-400 focus:ring-0 px-4 py-2.5 text-gray-900"
                        placeholder="e.g., SQL for Analysts"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-800">
                        Slug
                      </label>
                      <input
                        name="slug"
                        type="text"
                        value={form.slug}
                        onChange={onChange}
                        className="mt-2 w-full rounded-lg border border-gray-300 focus:border-gray-400 focus:ring-0 px-4 py-2.5 text-gray-900"
                        placeholder="auto-generated from title if blank"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-800">
                        Level
                      </label>
                      <select
                        name="level"
                        value={form.level}
                        onChange={onChange}
                        className="mt-2 w-full rounded-lg border border-gray-300 focus:border-gray-400 focus:ring-0 px-4 py-2.5 text-gray-900 bg-white"
                      >
                        {LEVELS.map((lvl) => (
                          <option key={lvl} value={lvl}>
                            {lvl}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-800">
                        Language
                      </label>
                      <input
                        name="language"
                        type="text"
                        value={form.language}
                        onChange={onChange}
                        className="mt-2 w-full rounded-lg border border-gray-300 focus:border-gray-400 focus:ring-0 px-4 py-2.5 text-gray-900"
                        placeholder="e.g., English"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-800">
                        Duration (hours)
                      </label>
                      <input
                        name="durationInHours"
                        type="number"
                        step="1"
                        value={form.durationInHours}
                        onChange={onChange}
                        className="mt-2 w-full rounded-lg border border-gray-300 focus:border-gray-400 focus:ring-0 px-4 py-2.5 text-gray-900"
                        placeholder="e.g., 12"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-800">
                        Price (0 for Free)
                      </label>
                      <input
                        name="price"
                        type="number"
                        step="1"
                        value={form.price}
                        onChange={onChange}
                        className="mt-2 w-full rounded-lg border border-gray-300 focus:border-gray-400 focus:ring-0 px-4 py-2.5 text-gray-900"
                        placeholder="e.g., 199"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-800">
                        Access Type
                      </label>
                      <select
                        name="accessType"
                        value={form.accessType}
                        onChange={onChange}
                        className="mt-2 w-full rounded-lg border border-gray-300 focus:border-gray-400 focus:ring-0 px-4 py-2.5 text-gray-900 bg-white"
                      >
                        {ACCESS.map((a) => (
                          <option key={a} value={a}>
                            {a}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-800">
                        Thumbnail URL
                      </label>
                      <input
                        name="thumbnail"
                        type="text"
                        value={form.thumbnail}
                        onChange={onChange}
                        className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-2.5"
                        placeholder="https://…"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-800">
                        Promo Video URL
                      </label>
                      <input
                        name="promoVideoUrl"
                        type="text"
                        value={form.promoVideoUrl}
                        onChange={onChange}
                        className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-2.5"
                        placeholder="https://…"
                      />
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-800">
                      Description
                    </label>
                    <textarea
                      name="description"
                      rows={4}
                      value={form.description}
                      onChange={onChange}
                      className="mt-2 w-full rounded-lg border border-gray-300 focus:border-gray-400 focus:ring-0 px-4 py-2.5 text-gray-900"
                      placeholder="Short overview of the course…"
                    />
                  </div>
                </>
              )}
            </div>

            {/* SEO & Visibility */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* SEO */}
              <div className="rounded-lg border p-4">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggleSection("seo")}
                      className="p-2 border rounded hover:bg-gray-50"
                      title={sectionCollapsed.seo ? "Expand" : "Collapse"}
                    >
                      {sectionCollapsed.seo ? (
                        <FiChevronRight className="h-4 w-4" />
                      ) : (
                        <FiChevronDown className="h-4 w-4" />
                      )}
                    </button>
                    <h3 className="font-semibold text-gray-900">SEO</h3>
                  </div>
                </div>

                {!sectionCollapsed.seo && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-800">
                        Meta Title
                      </label>
                      <input
                        name="metaTitle"
                        type="text"
                        value={form.metaTitle}
                        onChange={onChange}
                        className="mt-2 w-full rounded-lg border border-gray-300 focus:border-gray-400 focus:ring-0 px-4 py-2.5 text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-800">
                        Meta Description
                      </label>
                      <textarea
                        name="metaDescription"
                        rows={3}
                        value={form.metaDescription}
                        onChange={onChange}
                        className="mt-2 w-full rounded-lg border border-gray-300 focus:border-gray-400 focus:ring-0 px-4 py-2.5 text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-800">
                        Keywords (comma or newline)
                      </label>
                      <textarea
                        name="keywordsCsv"
                        rows={2}
                        value={form.keywordsCsv}
                        onChange={onChange}
                        className="mt-2 w-full rounded-lg border border-gray-300 focus:border-gray-400 focus:ring-0 px-4 py-2.5 text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-800">
                        Tags (comma or newline)
                      </label>
                      <textarea
                        name="tagsCsv"
                        rows={2}
                        value={form.tagsCsv}
                        onChange={onChange}
                        className="mt-2 w-full rounded-lg border border-gray-300 focus:border-gray-400 focus:ring-0 px-4 py-2.5 text-gray-900"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Visibility (now collapsible) */}
              <div className="rounded-lg border p-4">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggleSection("visibility")}
                      className="p-2 border rounded hover:bg-gray-50"
                      title={
                        sectionCollapsed.visibility ? "Expand" : "Collapse"
                      }
                    >
                      {sectionCollapsed.visibility ? (
                        <FiChevronRight className="h-4 w-4" />
                      ) : (
                        <FiChevronDown className="h-4 w-4" />
                      )}
                    </button>
                    <h3 className="font-semibold text-gray-900">Visibility</h3>
                  </div>
                </div>

                {!sectionCollapsed.visibility && (
                  <div className="space-y-3">
                    <label className="flex items-center gap-2 text-gray-800">
                      <input
                        type="checkbox"
                        name="published"
                        checked={form.published}
                        onChange={onChange}
                        className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                      />
                      Published
                    </label>
                    <label className="flex items-center gap-2 text-gray-800">
                      <input
                        type="checkbox"
                        name="isFeatured"
                        checked={form.isFeatured}
                        onChange={onChange}
                        className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                      />
                      Featured
                    </label>
                    <label className="flex items-center gap-2 text-gray-800">
                      <input
                        type="checkbox"
                        name="isArchived"
                        checked={form.isArchived}
                        onChange={onChange}
                        className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                      />
                      Archived
                    </label>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                      <div>
                        <label className="block text-sm font-medium text-gray-800">
                          Display Order
                        </label>
                        <input
                          name="order"
                          type="number"
                          value={form.order}
                          onChange={onChange}
                          className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-2.5"
                          placeholder="e.g., 1"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-800">
                          Version
                        </label>
                        <input
                          name="version"
                          type="text"
                          value={form.version}
                          onChange={onChange}
                          className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-2.5"
                          placeholder="e.g., 1.0"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Marketing */}
            <div className="rounded-lg border p-4">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggleSection("marketing")}
                    className="p-2 border rounded hover:bg-gray-50"
                    title={sectionCollapsed.marketing ? "Expand" : "Collapse"}
                  >
                    {sectionCollapsed.marketing ? (
                      <FiChevronRight className="h-4 w-4" />
                    ) : (
                      <FiChevronDown className="h-4 w-4" />
                    )}
                  </button>
                  <h3 className="font-semibold text-gray-900">Marketing</h3>
                </div>
              </div>

              {!sectionCollapsed.marketing && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-800">
                      Requirements (comma or newline)
                    </label>
                    <textarea
                      name="requirementsCsv"
                      rows={3}
                      value={form.requirementsCsv}
                      onChange={onChange}
                      className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-2.5"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-800">
                      Learning Outcomes (comma or newline)
                    </label>
                    <textarea
                      name="learningOutcomesCsv"
                      rows={3}
                      value={form.learningOutcomesCsv}
                      onChange={onChange}
                      className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-2.5"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Associations */}
            <div className="rounded-lg border p-4">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggleSection("associations")}
                    className="p-2 border rounded hover:bg-gray-50"
                    title={
                      sectionCollapsed.associations ? "Expand" : "Collapse"
                    }
                  >
                    {sectionCollapsed.associations ? (
                      <FiChevronRight className="h-4 w-4" />
                    ) : (
                      <FiChevronDown className="h-4 w-4" />
                    )}
                  </button>
                  <h2 className="font-semibold text-gray-900">Associations</h2>
                </div>
              </div>

              {!sectionCollapsed.associations && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-800">
                      Degree
                    </label>
                    <select
                      name="degree"
                      value={toIdString(form.degree)}
                      onChange={onChange}
                      className="mt-2 w-full rounded-lg border border-gray-300 focus:border-gray-400 focus:ring-0 px-4 py-2.5 text-gray-900 bg-white"
                    >
                      <option value="">—</option>
                      {degrees.map((d) => {
                        const val = toIdString(d._id || d.id);
                        return (
                          <option key={val} value={val}>
                            {d.name || "Untitled Degree"}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-800">
                      Semester
                    </label>
                    <select
                      name="semester"
                      value={toIdString(form.semester)}
                      onChange={onChange}
                      className="mt-2 w-full rounded-lg border border-gray-300 focus:border-gray-400 focus:ring-0 px-4 py-2.5 text-gray-900 bg-white"
                    >
                      <option value="">—</option>
                      {semesters.map((s) => {
                        const val = toIdString(s._id || s.id);
                        const label =
                          s.title ||
                          s.semester_name ||
                          s.semester_name || // tolerate old field
                          (s.semNumber ? `Semester ${s.semNumber}` : s.slug) ||
                          "Semester";
                        return (
                          <option key={val} value={val}>
                            {label}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-800">
                      Category
                    </label>
                    <select
                      name="category"
                      value={toIdString(form.category)}
                      onChange={onChange}
                      className="mt-2 w-full rounded-lg border border-gray-300 focus:border-gray-400 focus:ring-0 px-4 py-2.5 text-gray-900 bg-white"
                    >
                      <option value="">—</option>
                      {categories.map((c) => {
                        const val = toIdString(c._id || c.id);
                        return (
                          <option key={val} value={val}>
                            {c.category_name || c.name || "Uncategorized"}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-800">
                      Subcategory
                    </label>
                    <select
                      name="subCategory"
                      value={toIdString(form.subCategory)}
                      onChange={onChange}
                      className="mt-2 w-full rounded-lg border border-gray-300 focus:border-gray-400 focus:ring-0 px-4 py-2.5 text-gray-900 bg-white"
                    >
                      <option value="">—</option>
                      {subcategories.map((s) => {
                        const val = toIdString(s._id || s.id);
                        return (
                          <option key={val} value={val}>
                            {s.subcategory_name || s.name || "—"}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-800">
                      Instructor
                    </label>
                    <select
                      name="instructor"
                      value={toIdString(form.instructor)}
                      onChange={onChange}
                      className="mt-2 w-full rounded-lg border border-gray-300 focus:border-gray-400 focus:ring-0 px-4 py-2.5 text-gray-900 bg-white"
                    >
                      <option value="">—</option>
                      {instructors.map((u) => {
                        const val = toIdString(u._id || u.id);
                        return (
                          <option key={val} value={val}>
                            {u.name || u.fullName || u.email || "Instructor"}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-800">
                      Author IDs (comma or newline)
                    </label>
                    <textarea
                      name="authorsCsv"
                      rows={2}
                      value={form.authorsCsv}
                      onChange={onChange}
                      className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-2.5"
                      placeholder="ObjectId1, ObjectId2…"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Learning Resources */}
            <div className="rounded-lg border p-4">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggleSection("learning")}
                    className="p-2 border rounded hover:bg-gray-50"
                    title={sectionCollapsed.learning ? "Expand" : "Collapse"}
                  >
                    {sectionCollapsed.learning ? (
                      <FiChevronRight className="h-4 w-4" />
                    ) : (
                      <FiChevronDown className="h-4 w-4" />
                    )}
                  </button>
                  <h3 className="font-semibold text-gray-900">
                    Learning Resources
                  </h3>
                </div>
              </div>

              {!sectionCollapsed.learning && (
                <>
                  <p className="text-xs text-gray-500 mb-3">
                    Enter URLs or labels separated by commas or new lines.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-800">
                        Videos
                      </label>
                      <textarea
                        name="lrVideosCsv"
                        rows={3}
                        value={form.lrVideosCsv}
                        onChange={onChange}
                        className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-2.5"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-800">
                        PDFs
                      </label>
                      <textarea
                        name="lrPdfsCsv"
                        rows={3}
                        value={form.lrPdfsCsv}
                        onChange={onChange}
                        className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-2.5"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-800">
                        Assignments
                      </label>
                      <textarea
                        name="lrAssignmentsCsv"
                        rows={3}
                        value={form.lrAssignmentsCsv}
                        onChange={onChange}
                        className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-2.5"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-800">
                        External Links
                      </label>
                      <textarea
                        name="lrLinksCsv"
                        rows={3}
                        value={form.lrLinksCsv}
                        onChange={onChange}
                        className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-2.5"
                      />
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Access / Enrollment */}
            <div className="rounded-lg border p-4">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggleSection("access")}
                    className="p-2 border rounded hover:bg-gray-50"
                    title={sectionCollapsed.access ? "Expand" : "Collapse"}
                  >
                    {sectionCollapsed.access ? (
                      <FiChevronRight className="h-4 w-4" />
                    ) : (
                      <FiChevronDown className="h-4 w-4" />
                    )}
                  </button>
                  <h3 className="font-semibold text-gray-900">
                    Access & Enrollment
                  </h3>
                </div>
              </div>

              {!sectionCollapsed.access && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-800">
                        Max Students
                      </label>
                      <input
                        name="maxStudents"
                        type="number"
                        value={form.maxStudents}
                        onChange={onChange}
                        className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-2.5"
                        min={0}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-800">
                        Enrollment Deadline
                      </label>
                      <input
                        name="enrollmentDeadlineLocal"
                        type="datetime-local"
                        value={form.enrollmentDeadlineLocal}
                        onChange={onChange}
                        className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-2.5"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-800">
                        Completion Criteria
                      </label>
                      <select
                        name="completionCriteria"
                        value={form.completionCriteria}
                        onChange={onChange}
                        className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-2.5 bg-white"
                      >
                        {COMPLETION.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Certificate */}
            <div className="rounded-lg border p-4">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggleSection("certificate")}
                    className="p-2 border rounded hover:bg-gray-50"
                    title={sectionCollapsed.certificate ? "Expand" : "Collapse"}
                  >
                    {sectionCollapsed.certificate ? (
                      <FiChevronRight className="h-4 w-4" />
                    ) : (
                      <FiChevronDown className="h-4 w-4" />
                    )}
                  </button>
                  <h3 className="font-semibold text-gray-900">Certificate</h3>
                </div>
              </div>

              {!sectionCollapsed.certificate && (
                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-gray-800">
                    <input
                      type="checkbox"
                      name="issueCertificate"
                      checked={form.issueCertificate}
                      onChange={onChange}
                      className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                    />
                    Issue Certificate
                  </label>
                  <div>
                    <label className="block text-sm font-medium text-gray-800">
                      Certificate Template URL
                    </label>
                    <input
                      name="certificateTemplateUrl"
                      type="text"
                      value={form.certificateTemplateUrl}
                      onChange={onChange}
                      className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-2.5"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Modules & Topics */}
            <div className="rounded-lg border p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900">
                  Modules & Topics
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setAllModulesCollapsed(true)}
                    className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm border hover:bg-gray-50"
                    title="Collapse all modules"
                  >
                    <FiMinimize2 className="h-4 w-4" />
                    Collapse all
                  </button>
                  <button
                    type="button"
                    onClick={() => setAllModulesCollapsed(false)}
                    className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm border hover:bg-gray-50"
                    title="Expand all modules"
                  >
                    <FiMaximize2 className="h-4 w-4" />
                    Expand all
                  </button>
                  <button
                    type="button"
                    onClick={addModuleLocal}
                    className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm border hover:bg-gray-50"
                    title="Add module (local)"
                  >
                    <FiPlus className="h-4 w-4" />
                    Add Module
                  </button>
                </div>
              </div>

              {modules.length === 0 ? (
                <div className="text-sm text-gray-500">No modules yet.</div>
              ) : null}

              {modules.map((m, mIdx) => (
                <div key={mIdx} className="border rounded-md p-3 mb-4">
                  {/* Module header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => toggleModuleCollapsed(mIdx)}
                        className="p-2 border rounded hover:bg-gray-50"
                        title={
                          m._collapsed ? "Expand module" : "Collapse module"
                        }
                      >
                        {m._collapsed ? (
                          <FiChevronRight className="h-4 w-4" />
                        ) : (
                          <FiChevronDown className="h-4 w-4" />
                        )}
                      </button>
                      <h4 className="font-semibold">
                        Module #{mIdx + 1}
                        {m.title ? ` — ${m.title}` : ""}
                      </h4>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setAllTopicsInModuleCollapsed(mIdx, true)
                        }
                        className="p-2 border rounded hover:bg-gray-50"
                        title="Collapse all topics in this module"
                        disabled={(m.topics || []).length === 0}
                      >
                        <FiMinimize2 className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setAllTopicsInModuleCollapsed(mIdx, false)
                        }
                        className="p-2 border rounded hover:bg-gray-50"
                        title="Expand all topics in this module"
                        disabled={(m.topics || []).length === 0}
                      >
                        <FiMaximize2 className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveModule(mIdx, -1)}
                        className="p-2 border rounded hover:bg-gray-50"
                        title="Move up"
                        disabled={mIdx === 0}
                      >
                        <FiArrowUp />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveModule(mIdx, 1)}
                        className="p-2 border rounded hover:bg-gray-50"
                        title="Move down"
                        disabled={mIdx === modules.length - 1}
                      >
                        <FiArrowDown />
                      </button>
                      <button
                        type="button"
                        onClick={() => addModuleServer(m)}
                        className="p-2 border rounded hover:bg-gray-50"
                        title="Save this module to server"
                      >
                        <FiSave />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          window.confirm("Delete this module on server?") &&
                          deleteModuleServer(mIdx)
                        }
                        className="p-2 border rounded hover:bg-gray-50 text-red-600 border-red-300"
                        title="Delete this module on server"
                      >
                        <FiTrash2 />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeModuleLocal(mIdx)}
                        className="p-2 border rounded hover:bg-gray-50 text-red-600 border-red-300"
                        title="Remove module locally"
                      >
                        Remove
                      </button>
                    </div>
                  </div>

                  {/* Module fields (collapsible) */}
                  {!m._collapsed && (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-800">
                            Module Title
                          </label>
                          <input
                            className="mt-2 w-full rounded-lg border border-gray-300 focus:border-gray-400 focus:ring-0 px-4 py-2.5 text-gray-900"
                            value={m.title}
                            onChange={(e) =>
                              updateModuleFieldLocal(
                                mIdx,
                                "title",
                                e.target.value
                              )
                            }
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-800">
                            Module Description
                          </label>
                          <input
                            className="mt-2 w-full rounded-lg border border-gray-300 focus:border-gray-400 focus:ring-0 px-4 py-2.5 text-gray-900"
                            value={m.description}
                            onChange={(e) =>
                              updateModuleFieldLocal(
                                mIdx,
                                "description",
                                e.target.value
                              )
                            }
                          />
                        </div>
                      </div>

                      {/* Topics */}
                      <div className="mt-3">
                        <div className="flex items-center justify-between">
                          <h5 className="font-medium text-gray-900">
                            Topics ({m.topics?.length || 0})
                          </h5>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => addTopicLocal(mIdx)}
                              className="inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm border hover:bg-gray-50"
                            >
                              <FiPlus className="h-4 w-4" />
                              Add Topic
                            </button>
                            <button
                              type="button"
                              onClick={() => updateModuleServer(mIdx, m)}
                              className="inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm border hover:bg-gray-50"
                              title="Save module fields to server"
                            >
                              <FiSave className="h-4 w-4" />
                              Save Module
                            </button>
                          </div>
                        </div>

                        {(m.topics || []).map((t, tIdx) => (
                          <div key={tIdx} className="mt-3 border rounded p-3">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    toggleTopicCollapsed(mIdx, tIdx)
                                  }
                                  className="p-2 border rounded hover:bg-gray-50"
                                  title={
                                    t._collapsed
                                      ? "Expand topic"
                                      : "Collapse topic"
                                  }
                                >
                                  {t._collapsed ? (
                                    <FiChevronRight className="h-4 w-4" />
                                  ) : (
                                    <FiChevronDown className="h-4 w-4" />
                                  )}
                                </button>
                                <div className="font-medium">
                                  Topic #{tIdx + 1}
                                  {t.title ? ` — ${t.title}` : ""}
                                </div>
                              </div>

                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => moveTopic(mIdx, tIdx, -1)}
                                  className="p-2 border rounded hover:bg-gray-50"
                                  title="Move up"
                                  disabled={tIdx === 0}
                                >
                                  <FiArrowUp />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => moveTopic(mIdx, tIdx, 1)}
                                  className="p-2 border rounded hover:bg-gray-50"
                                  title="Move down"
                                  disabled={
                                    tIdx === (m.topics?.length || 0) - 1
                                  }
                                >
                                  <FiArrowDown />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => addTopicServer(mIdx, t)}
                                  className="p-2 border rounded hover:bg-gray-50"
                                  title="Save as new topic on server"
                                >
                                  <FiPlus />
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateTopicServer(mIdx, tIdx, t)
                                  }
                                  className="p-2 border rounded hover:bg-gray-50"
                                  title="Update this topic on server"
                                >
                                  <FiSave />
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    window.confirm(
                                      "Delete this topic on server?"
                                    ) && deleteTopicServer(mIdx, tIdx)
                                  }
                                  className="p-2 border rounded hover:bg-gray-50 text-red-600 border-red-300"
                                  title="Delete this topic on server"
                                >
                                  <FiTrash2 />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => removeTopicLocal(mIdx, tIdx)}
                                  className="p-2 border rounded hover:bg-gray-50 text-red-600 border-red-300"
                                  title="Remove topic locally"
                                >
                                  Remove
                                </button>
                              </div>
                            </div>

                            {/* Topic body (collapsible) */}
                            {!t._collapsed && (
                              <>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div>
                                    <label className="block text-sm font-medium text-gray-800">
                                      Title
                                    </label>
                                    <input
                                      className="mt-2 w-full rounded-lg border border-gray-300 focus:border-gray-400 focus:ring-0 px-4 py-2.5 text-gray-900"
                                      value={t.title}
                                      onChange={(e) =>
                                        updateTopicFieldLocal(
                                          mIdx,
                                          tIdx,
                                          "title",
                                          e.target.value
                                        )
                                      }
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-800">
                                      Duration (mins)
                                    </label>
                                    <input
                                      type="number"
                                      className="mt-2 w-full rounded-lg border border-gray-300 focus:border-gray-400 focus:ring-0 px-4 py-2.5 text-gray-900"
                                      value={t.duration}
                                      onChange={(e) =>
                                        updateTopicFieldLocal(
                                          mIdx,
                                          tIdx,
                                          "duration",
                                          e.target.value
                                        )
                                      }
                                      min={0}
                                    />
                                  </div>
                                </div>

                                <div className="mt-3">
                                  <label className="block text-sm font-medium text-gray-800">
                                    Explanation
                                  </label>
                                  <textarea
                                    rows={3}
                                    className="mt-2 w-full rounded-lg border border-gray-300 focus:border-gray-400 focus:ring-0 px-4 py-2.5 text-gray-900"
                                    value={t.explanation}
                                    onChange={(e) =>
                                      updateTopicFieldLocal(
                                        mIdx,
                                        tIdx,
                                        "explanation",
                                        e.target.value
                                      )
                                    }
                                  />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                                  <div>
                                    <label className="block text-sm font-medium text-gray-800">
                                      Code Snippet
                                    </label>
                                    <textarea
                                      rows={4}
                                      className="mt-2 w-full rounded-lg border border-gray-300 focus:border-gray-400 focus:ring-0 px-4 py-2.5 text-gray-900"
                                      value={t.code}
                                      onChange={(e) =>
                                        updateTopicFieldLocal(
                                          mIdx,
                                          tIdx,
                                          "code",
                                          e.target.value
                                        )
                                      }
                                      placeholder="// your code here"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-800">
                                      Code Explanation
                                    </label>
                                    <textarea
                                      rows={4}
                                      className="mt-2 w-full rounded-lg border border-gray-300 focus:border-gray-400 focus:ring-0 px-4 py-2.5 text-gray-900"
                                      value={t.codeExplanation}
                                      onChange={(e) =>
                                        updateTopicFieldLocal(
                                          mIdx,
                                          tIdx,
                                          "codeExplanation",
                                          e.target.value
                                        )
                                      }
                                      placeholder="Walk through the code…"
                                    />
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
                                  <div>
                                    <label className="block text-sm font-medium text-gray-800">
                                      Code Language
                                    </label>
                                    <select
                                      className="mt-2 w-full rounded-lg border border-gray-300 focus:border-gray-400 focus:ring-0 px-4 py-2.5 text-gray-900 bg-white"
                                      value={t.codeLanguage || "plaintext"}
                                      onChange={(e) =>
                                        updateTopicFieldLocal(
                                          mIdx,
                                          tIdx,
                                          "codeLanguage",
                                          e.target.value
                                        )
                                      }
                                    >
                                      {[
                                        "plaintext",
                                        "javascript",
                                        "typescript",
                                        "python",
                                        "java",
                                        "c",
                                        "cpp",
                                        "csharp",
                                        "go",
                                        "rust",
                                        "ruby",
                                        "php",
                                        "swift",
                                        "kotlin",
                                        "sql",
                                        "bash",
                                      ].map((lang) => (
                                        <option key={lang} value={lang}>
                                          {lang}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-800">
                                      Video URL
                                    </label>
                                    <input
                                      className="mt-2 w-full rounded-lg border border-gray-300 focus:border-gray-400 focus:ring-0 px-4 py-2.5 text-gray-900"
                                      value={t.videoUrl}
                                      onChange={(e) =>
                                        updateTopicFieldLocal(
                                          mIdx,
                                          tIdx,
                                          "videoUrl",
                                          e.target.value
                                        )
                                      }
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-800">
                                      PDF URL
                                    </label>
                                    <input
                                      className="mt-2 w-full rounded-lg border border-gray-300 focus:border-gray-400 focus:ring-0 px-4 py-2.5 text-gray-900"
                                      value={t.pdfUrl}
                                      onChange={(e) =>
                                        updateTopicFieldLocal(
                                          mIdx,
                                          tIdx,
                                          "pdfUrl",
                                          e.target.value
                                        )
                                      }
                                    />
                                  </div>
                                </div>

                                <div className="mt-2">
                                  <label className="inline-flex items-center gap-2">
                                    <input
                                      type="checkbox"
                                      checked={!!t.isFreePreview}
                                      onChange={(e) =>
                                        updateTopicFieldLocal(
                                          mIdx,
                                          tIdx,
                                          "isFreePreview",
                                          e.target.checked
                                        )
                                      }
                                    />
                                    <span>Mark as free preview</span>
                                  </label>
                                </div>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>

            {/* Global Topics Collapse/Expand */}
            <div className="flex items-center gap-2 -mt-4 mb-2">
              <button
                type="button"
                onClick={() => setAllTopicsCollapsed(true)}
                className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm border hover:bg-gray-50"
                title="Collapse all topics"
              >
                <FiMinimize2 className="h-4 w-4" />
                Collapse all topics
              </button>
              <button
                type="button"
                onClick={() => setAllTopicsCollapsed(false)}
                className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm border hover:bg-gray-50"
                title="Expand all topics"
              >
                <FiMaximize2 className="h-4 w-4" />
                Expand all topics
              </button>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={!canSave}
                className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-white text-sm font-semibold ${
                  canSave
                    ? "bg-gray-900 hover:bg-gray-800"
                    : "bg-gray-400 cursor-not-allowed"
                }`}
                title="Save changes (including modules & topics)"
              >
                <FiSave className="h-4 w-4" /> {saving ? "Saving…" : "Save All"}
              </button>

              <Link
                to={`/single-course/${encodeURIComponent(
                  form.slug || "course"
                )}/${id}`}
                className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-gray-900 text-sm font-semibold border hover:bg-gray-50"
                title="Cancel and view course"
              >
                <FiX className="h-4 w-4" /> Cancel
              </Link>

              <Link
                to="/all-courses"
                className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-gray-900 text-sm font-semibold border hover:bg-gray-50"
              >
                Back to All Courses
              </Link>
            </div>
          </form>
        </div>
      </div>

      {/* Toast */}
      <Toast text={toastText} onClose={() => setToastText("")} />
    </>
  );
};

export default UpdateCourse;
