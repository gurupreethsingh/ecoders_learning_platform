import React, {
  useEffect,
  useMemo,
  useState,
  useCallback,
  useRef,
} from "react";
import {
  FaIdBadge,
  FaUser,
  FaCalendarAlt,
  FaImage,
  FaCheck,
  FaTimes,
  FaLink,
  FaPhone,
  FaGlobe,
  FaMapMarkerAlt,
  FaMoneyBillAlt,
  FaBook,
  FaCertificate,
  FaClock,
  FaStar,
  FaUsers,
  FaSitemap,
  FaTag,
} from "react-icons/fa";
import { MdEdit } from "react-icons/md";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useParams } from "react-router-dom";
import axios from "axios";
import globalBackendRoute from "@/config/Config.js";

/* ---------- utils ---------- */
const failedImageCache = new Set();
const isHex24 = (s) => typeof s === "string" && /^[a-fA-F0-9]{24}$/.test(s);
const shortId = (val) =>
  typeof val === "string" ? `${val.slice(0, 6)}…${val.slice(-4)}` : "";

const looksLikeObjectId = (v) =>
  typeof v === "string" && /^[a-f0-9]{24}$/i.test(v);

const getId = (v) => {
  if (!v) return null;
  if (typeof v === "object") return v._id || v.id || null;
  return v;
};
const extractArray = (payload) => {
  const d = payload?.data;
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(d)) return d;
  if (Array.isArray(d?.data)) return d.data;
  if (Array.isArray(d?.items)) return d.items;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
};

function SmartImage({
  src,
  alt = "Avatar",
  fallback = "/images/default-avatar.png",
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
      setLoaded(true);
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

const prettyDate = (d) => (d ? new Date(d).toLocaleString() : "-");
const Yes = () => (
  <span className="inline-flex items-center gap-1 text-green-600">
    <FaCheck /> Yes
  </span>
);
const No = () => (
  <span className="inline-flex items-center gap-1 text-rose-600">
    <FaTimes /> No
  </span>
);
const yesNo = (b) => (b ? <Yes /> : <No />);

const slugify = (s = "") =>
  s
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

/* ---------- field row ---------- */
function Row({ icon, label, children }) {
  return (
    <div className="py-2 sm:grid sm:grid-cols-3 sm:gap-4 px-2 sm:px-4">
      <dt className="flex items-center text-sm font-medium text-gray-700 gap-2">
        {icon} {label}
      </dt>
      <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
        {children}
      </dd>
    </div>
  );
}

/* ---------- pill list ---------- */
function Pills({ items }) {
  if (!Array.isArray(items) || !items.length) return <span>-</span>;
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((v, i) => (
        <span
          key={`${String(v)}-${i}`}
          className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 border"
        >
          {String(v)}
        </span>
      ))}
    </div>
  );
}

/* ---------- name+id chips ---------- */
function PairChips({ pairs }) {
  if (!pairs || pairs.length === 0) return <span>-</span>;
  return (
    <div className="flex flex-wrap gap-2">
      {pairs.map(({ label, id }) => (
        <span
          key={`${label}-${id}`}
          className="inline-flex items-center gap-1 text-xs bg-gray-50 border border-gray-200 px-2 py-1 rounded"
          title={id}
        >
          <FaTag className="text-gray-400" />
          <span className="font-medium">{label}</span>
          {id ? (
            <code className="bg-white border px-1 rounded">{shortId(id)}</code>
          ) : null}
        </span>
      ))}
    </div>
  );
}

/* ---------- key:value list for Mixed arrays ---------- */
function KVList({ list }) {
  if (!Array.isArray(list) || !list.length) return <span>-</span>;
  return (
    <div className="space-y-2">
      {list.map((obj, i) => (
        <div key={i} className="rounded-lg border bg-gray-50 p-3 text-sm">
          {typeof obj === "object" && obj
            ? Object.entries(obj).map(([k, v]) => (
                <div key={k} className="grid grid-cols-3 gap-2">
                  <span className="text-gray-600">{k}</span>
                  <span className="col-span-2 break-words">
                    {String(v ?? "-")}
                  </span>
                </div>
              ))
            : String(obj)}
        </div>
      ))}
    </div>
  );
}

/* ---------- link helper ---------- */
const ExtLink = ({ href, children }) =>
  href ? (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="text-blue-600 hover:underline inline-flex items-center gap-2"
    >
      <FaLink /> {children || href}
    </a>
  ) : (
    <span>-</span>
  );

/* ---------- neutral chevron + slower accordion ---------- */
function ChevronDown({ open }) {
  return (
    <motion.svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      className="h-4 w-4 text-gray-500"
      animate={{ rotate: open ? 180 : 0 }}
      transition={{ duration: 0.45, ease: "easeInOut" }}
    >
      <path
        d="M6 8l4 4 4-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </motion.svg>
  );
}

function Section({ title, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  const contentTransition = { duration: 0.45, ease: [0.22, 1, 0.36, 1] }; // slower & smoother

  return (
    <div className="rounded-xl border bg-white overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => o ^ 1)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <span className="text-sm font-semibold text-gray-900">{title}</span>
        <ChevronDown open={open} />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={contentTransition}
            className="border-t divide-y divide-gray-100 overflow-hidden"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ============================ PAGE ============================ */
export default function SingleInstructor() {
  // MUST match the route param name
  const { instructorId } = useParams(); // /single-instructor/:instructorId/:slug
  const id = instructorId;

  const [inst, setInst] = useState(null);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState("");

  // lookup maps (id -> name)
  const [degMap, setDegMap] = useState({});
  const [semMap, setSemMap] = useState({});
  const [courseMap, setCourseMap] = useState({});

  // Prevent duplicate fetch in React 18 StrictMode (dev)
  const didFetchRef = useRef(false);

  const fetcher = useCallback(async () => {
    if (!id) {
      setLoading(false);
      setApiError("Missing instructor id in URL.");
      setInst(null);
      return;
    }
    if (!isHex24(id)) {
      setLoading(false);
      setApiError("Invalid id format (must be 24-char hex).");
      setInst(null);
      return;
    }

    // In dev StrictMode, effects run twice; skip the 2nd
    if (process.env.NODE_ENV !== "production") {
      if (didFetchRef.current) return;
      didFetchRef.current = true;
    }

    const controller = new AbortController();
    try {
      setLoading(true);
      setApiError("");

      // instructor
      const url = `${globalBackendRoute}/api/instructors/get-by-id/${id}`;
      const { data } = await axios.get(url, { signal: controller.signal });
      const instData = data?.data || null;
      setInst(instData);

      // Conditional lookups
      const needDegreeLookup =
        (instData?.degrees && instData.degrees.length) ||
        looksLikeObjectId(instData?.degree) ||
        looksLikeObjectId(instData?.degreeId);

      const needSemLookup =
        (instData?.semesters && instData.semesters.length) ||
        looksLikeObjectId(instData?.semester) ||
        looksLikeObjectId(instData?.semesterId) ||
        looksLikeObjectId(instData?.semesterId);

      const needCourseLookup =
        (instData?.courses && instData.courses.length) ||
        looksLikeObjectId(instData?.course) ||
        looksLikeObjectId(instData?.courseId);

      const tasks = [];

      if (needDegreeLookup) {
        tasks.push(
          axios
            .get(`${globalBackendRoute}/api/list-degrees`, {
              params: { page: 1, limit: 2000, sortBy: "name", sortDir: "asc" },
            })
            .then((res) => {
              const arr = extractArray(res.data);
              const map = {};
              arr.forEach((d) => {
                const _id = d?._id || d?.id;
                const name =
                  d?.name || d?.title || d?.code || d?.slug || "Degree";
                if (_id) map[_id] = name;
              });
              setDegMap(map);
            })
            .catch(() => {})
        );
      }

      if (needSemLookup) {
        tasks.push(
          axios
            .get(`${globalBackendRoute}/api/semesters`, {
              params: { page: 1, limit: 5000 },
            })
            .then((res) => {
              const arr = extractArray(res.data);
              const map = {};
              arr.forEach((s) => {
                const _id = s?._id || s?.id;
                const label =
                  s?.semester_name ||
                  (s?.semNumber ? `Semester ${s.semNumber}` : s?.slug) ||
                  "Semester";
                if (_id) map[_id] = label;
              });
              setSemMap(map);
            })
            .catch(() => {})
        );
      }

      if (needCourseLookup) {
        tasks.push(
          axios
            .get(`${globalBackendRoute}/api/list-courses`, {
              params: {
                page: 1,
                limit: 5000,
                sortBy: "createdAt",
                order: "desc",
              },
            })
            .then((res) => {
              const arr = extractArray(res.data);
              const map = {};
              arr.forEach((c) => {
                const _id = c?._id || c?.id;
                const title =
                  c?.title || c?.name || c?.code || c?.slug || "Course";
                if (_id) map[_id] = title;
              });
              setCourseMap(map);
            })
            .catch(() => {})
        );
      }

      if (tasks.length) await Promise.allSettled(tasks);
    } catch (err) {
      const status = err?.response?.status;
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to fetch instructor";
      if (status && status !== 404) {
        // Only log unexpected errors
        console.error("Failed to fetch instructor:", err);
      }
      setInst(null);
      setApiError(msg);
    } finally {
      setLoading(false);
    }

    return () => controller.abort();
  }, [id]);

  useEffect(() => {
    didFetchRef.current = false; // reset if id changes (dev)
    fetcher();
  }, [fetcher, id]);

  if (!id) return <div className="text-center py-8">Invalid URL.</div>;
  if (loading) return <div className="text-center py-8">Loading...</div>;
  if (!inst) {
    return (
      <div className="text-center py-8">
        <div className="mb-2 font-semibold">Not found</div>
        {apiError && (
          <div className="text-xs text-gray-500 max-w-xl mx-auto break-words">
            {apiError}
          </div>
        )}
      </div>
    );
  }

  const fullName =
    `${inst.firstName || ""} ${inst.lastName || ""}`.trim() || "Instructor";
  const slug = slugify(fullName);
  const avatarAbs = inst.avatarUrl
    ? inst.avatarUrl.startsWith("http")
      ? inst.avatarUrl
      : `${globalBackendRoute}/${String(inst.avatarUrl).replace(/^\/+/, "")}`
    : null;

  // ---------- Build association pairs (name + id) ----------
  const toPairs = (arrOrVal, map, fallbackLabel) => {
    const arr = Array.isArray(arrOrVal) ? arrOrVal : arrOrVal ? [arrOrVal] : [];
    const pairs = [];
    arr.forEach((item) => {
      const idVal = getId(item);
      const name =
        (typeof item === "object" &&
          (item.title ||
            item.name ||
            item.semester_name ||
            item.code ||
            item.slug)) ||
        (idVal && map[idVal]) ||
        (looksLikeObjectId(item) ? fallbackLabel : String(item));
      pairs.push({
        label: name || fallbackLabel,
        id: idVal || (looksLikeObjectId(item) ? item : null),
      });
    });
    return pairs;
  };

  const degreePairs = toPairs(
    inst.degrees || inst.degree || inst.degreeId,
    degMap,
    "Degree"
  );
  const semesterPairs = toPairs(
    inst.semesters ||
      inst.semester ||
      inst.semesterId ||
      inst.semester ||
      inst.semesterId,
    semMap,
    "Semester"
  );
  const coursePairs = toPairs(
    inst.courses || inst.course || inst.courseId,
    courseMap,
    "Course"
  );

  return (
    <motion.div
      className="containerWidth my-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35 }}
    >
      {/* ===== Header ===== */}
      <motion.h3
        className="subHeadingTextMobile lg:subHeadingText mb-4"
        initial={{ x: -30, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.35 }}
      >
        Instructor Details
      </motion.h3>

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 sm:gap-6">
        {/* Left: avatar + chips */}
        <div className="flex items-start gap-4">
          <motion.div
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.35 }}
            className="w-24 h-24 sm:w-32 sm:h-32"
          >
            <SmartImage
              src={avatarAbs}
              alt={fullName}
              containerClass="w-full h-full"
              imgClass="w-full h-full"
            />
          </motion.div>

          {/* Chips */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 pt-1">
            {/* ID */}
            <span className="inline-flex items-center gap-2 rounded-full bg-gray-100 border px-3 py-1 text-xs text-gray-800">
              <FaIdBadge className="text-purple-600" />
              <span className="font-semibold">ID</span>
              <code className="bg-white border px-1.5 py-0.5 rounded">
                {inst._id}
              </code>
            </span>

            <span className="inline-flex items-center gap-2 rounded-full bg-gray-100 border px-3 py-1 text-xs text-gray-800">
              <FaIdBadge className="text-purple-600" />
              <span className="font-semibold">Name : </span>
              <code className="bg-white border px-1.5 py-0.5 rounded">
                {inst.firstName} {inst.lastName}
              </code>
            </span>

            {/* Deleted */}
            {typeof inst.isDeleted === "boolean" && (
              <span
                className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs border ${
                  inst.isDeleted
                    ? "bg-rose-50 text-rose-700 border-rose-200"
                    : "bg-gray-100 text-gray-700 border-gray-200"
                }`}
                title="Deletion state"
              >
                <FaTimes />
                {inst.isDeleted ? "Deleted" : "Not Deleted"}
              </span>
            )}

            {/* Active */}
            {typeof inst.isActive === "boolean" && (
              <span
                className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs border ${
                  inst.isActive
                    ? "bg-green-50 text-green-700 border-green-200"
                    : "bg-gray-100 text-gray-700 border-gray-200"
                }`}
                title="Active state"
              >
                {inst.isActive ? <FaCheck /> : <FaTimes />}
                {inst.isActive ? "Active" : "Inactive"}
              </span>
            )}
          </div>
        </div>

        {/* Right: actions */}
        <div className="flex flex-col sm:flex-row gap-3 sm:items-start justify-start sm:justify-end">
          <Link
            to={`/update-instructor/${slug}/${inst._id}`}
            className="primaryBtn w-full sm:w-auto px-4 flex items-center justify-center gap-2 rounded-full"
            title="Update this instructor"
          >
            <MdEdit /> Update
          </Link>

          <Link
            to="/all-instructors"
            className="secondaryBtn w-full sm:w-auto px-4 rounded-full text-center"
            title="Back to All Instructors"
          >
            Back to All Instructors
          </Link>
        </div>
      </div>

      {/* Sections (accordion) */}
      <div className="mt-6 space-y-4">
        {/* Meta & Status */}
        <Section title="Meta & Status" defaultOpen>
          <Row
            icon={<FaCalendarAlt className="text-amber-600" />}
            label="Created At"
          >
            {prettyDate(inst.createdAt)}
          </Row>
          <Row
            icon={<FaCalendarAlt className="text-amber-600" />}
            label="Updated At"
          >
            {prettyDate(inst.updatedAt)}
          </Row>
          <Row icon={<FaIdBadge className="text-gray-600" />} label="createdBy">
            {inst.createdBy || "-"}
          </Row>
          <Row icon={<FaIdBadge className="text-gray-600" />} label="updatedBy">
            {inst.updatedBy || "-"}
          </Row>
          <Row
            icon={<FaIdBadge className="text-gray-600" />}
            label="reviewedBy"
          >
            {inst.reviewedBy || "-"}
          </Row>
          <Row
            icon={<FaCalendarAlt className="text-gray-600" />}
            label="reviewedAt"
          >
            {prettyDate(inst.reviewedAt)}
          </Row>
          <Row
            icon={<FaCalendarAlt className="text-rose-600" />}
            label="deletedAt"
          >
            {prettyDate(inst.deletedAt)}
          </Row>
        </Section>

        {/* Profile */}
        <Section title="Profile">
          <Row icon={<FaUser className="text-blue-600" />} label="First Name">
            {inst.firstName || "-"}
          </Row>
          <Row icon={<FaUser className="text-blue-600" />} label="Last Name">
            {inst.lastName || "-"}
          </Row>
          <Row icon={<FaLink className="text-blue-600" />} label="Email">
            {inst.email || "-"}
          </Row>
          <Row icon={<FaPhone className="text-blue-600" />} label="Phone">
            {inst.phone || "-"}
          </Row>
          <Row
            icon={<FaImage className="text-indigo-600" />}
            label="Avatar URL"
          >
            {inst.avatarUrl ? (
              <ExtLink href={avatarAbs}>{inst.avatarUrl}</ExtLink>
            ) : (
              "-"
            )}
          </Row>
          <Row icon={<FaBook className="text-gray-700" />} label="Bio">
            {inst.bio || "-"}
          </Row>
          <Row icon={<FaUser className="text-fuchsia-600" />} label="Gender">
            {inst.gender || "-"}
          </Row>
          <Row
            icon={<FaCalendarAlt className="text-emerald-600" />}
            label="Date of Birth"
          >
            {prettyDate(inst.dateOfBirth)}
          </Row>
        </Section>

        {/* Contact & Links */}
        <Section title="Contact & Links">
          <Row
            icon={<FaMapMarkerAlt className="text-red-500" />}
            label="Address"
          >
            <div className="text-sm space-y-1">
              <div>Line 1: {inst.address?.line1 || "-"}</div>
              <div>Line 2: {inst.address?.line2 || "-"}</div>
              <div>City: {inst.address?.city || "-"}</div>
              <div>State: {inst.address?.state || "-"}</div>
              <div>Country: {inst.address?.country || "-"}</div>
              <div>Postal Code: {inst.address?.postalCode || "-"}</div>
            </div>
          </Row>
          <Row icon={<FaGlobe className="text-gray-800" />} label="Website">
            <ExtLink href={inst.website} />
          </Row>
          <Row icon={<FaLink className="text-sky-700" />} label="LinkedIn">
            <ExtLink href={inst.linkedin} />
          </Row>
          <Row icon={<FaLink className="text-gray-900" />} label="GitHub">
            <ExtLink href={inst.github} />
          </Row>
          <Row icon={<FaLink className="text-red-600" />} label="YouTube">
            <ExtLink href={inst.youtube} />
          </Row>
          <Row icon={<FaLink className="text-blue-500" />} label="Twitter">
            <ExtLink href={inst.twitter} />
          </Row>
          <Row icon={<FaLink className="text-blue-600" />} label="Resume URL">
            {inst.resumeUrl ? <ExtLink href={inst.resumeUrl} /> : "-"}
          </Row>
          <Row icon={<FaLink className="text-blue-600" />} label="ID Proof URL">
            {inst.idProofUrl ? <ExtLink href={inst.idProofUrl} /> : "-"}
          </Row>
        </Section>

        {/* Professional */}
        <Section title="Professional">
          <Row icon={<FaGlobe className="text-green-700" />} label="Languages">
            <Pills items={inst.languages} />
          </Row>
          <Row icon={<FaBook className="text-indigo-700" />} label="Skills">
            <Pills items={inst.skills} />
          </Row>
          <Row
            icon={<FaBook className="text-indigo-700" />}
            label="Areas Of Expertise"
          >
            <Pills items={inst.areasOfExpertise} />
          </Row>
          <Row
            icon={<FaCertificate className="text-amber-700" />}
            label="Education"
          >
            <KVList list={inst.education} />
          </Row>
          <Row
            icon={<FaCertificate className="text-amber-700" />}
            label="Certifications"
          >
            <KVList list={inst.certifications} />
          </Row>
          <Row
            icon={<FaClock className="text-emerald-700" />}
            label="Availability"
          >
            <KVList list={inst.availability} />
          </Row>
          <Row
            icon={<FaMoneyBillAlt className="text-green-600" />}
            label="Hourly Rate"
          >
            {typeof inst.hourlyRate === "number" ? `${inst.hourlyRate}` : "-"}
          </Row>
        </Section>

        {/* Compliance & Verification */}
        <Section title="Compliance & Verification">
          <Row icon={<FaIdBadge className="text-emerald-700" />} label="UPI ID">
            {inst.upiId || "-"}
          </Row>
          <Row
            icon={<FaIdBadge className="text-emerald-700" />}
            label="Payout Preference"
          >
            {inst.payoutPreference || "-"}
          </Row>
          <Row
            icon={<FaCheck className="text-green-600" />}
            label="Email Verified"
          >
            {yesNo(inst.isEmailVerified)}
          </Row>
          <Row
            icon={<FaCheck className="text-green-600" />}
            label="KYC Verified"
          >
            {yesNo(inst.isKycVerified)}
          </Row>
          <Row
            icon={<FaIdBadge className="text-indigo-600" />}
            label="Application Status"
          >
            {inst.applicationStatus || "-"}
          </Row>
          <Row
            icon={<FaTimes className="text-rose-600" />}
            label="Rejection Reason"
          >
            {inst.rejectionReason || "-"}
          </Row>
          <Row icon={<FaTimes className="text-rose-600" />} label="Deleted">
            {yesNo(inst.isDeleted)}
          </Row>
        </Section>

        {/* Associations (IDs + Names) */}
        <Section title="Associations (IDs + Names)" defaultOpen>
          <div className="px-2 sm:px-4 py-2 text-xs text-gray-600 flex items-center gap-2">
            <FaSitemap /> Best-effort resolution based on populated objects or
            ID lookups.
          </div>
          <Row icon={<FaBook className="text-indigo-700" />} label="Degrees">
            <PairChips pairs={degreePairs} />
          </Row>
          <Row icon={<FaBook className="text-indigo-700" />} label="Semesters">
            <PairChips pairs={semesterPairs} />
          </Row>
          <Row icon={<FaBook className="text-indigo-700" />} label="Courses">
            <PairChips pairs={coursePairs} />
          </Row>
        </Section>

        {/* Stats */}
        <Section title="Performance & Reach">
          <Row icon={<FaStar className="text-yellow-500" />} label="Rating">
            {typeof inst.rating === "number" ? `${inst.rating}` : "-"}
          </Row>
          <Row
            icon={<FaStar className="text-yellow-500" />}
            label="Rating Count"
          >
            {typeof inst.ratingCount === "number" ? `${inst.ratingCount}` : "-"}
          </Row>
          <Row
            icon={<FaUsers className="text-teal-600" />}
            label="Students Taught"
          >
            {typeof inst.studentsTaught === "number"
              ? `${inst.studentsTaught}`
              : "-"}
          </Row>
        </Section>

        {/* System */}
        <Section title="System">
          <Row
            icon={<FaIdBadge className="text-gray-600" />}
            label="Linked User ID"
          >
            {inst.user || "-"}
          </Row>
        </Section>
      </div>
    </motion.div>
  );
}
