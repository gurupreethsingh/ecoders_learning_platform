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
} from "react-icons/fa";
import { MdEdit } from "react-icons/md";
import { motion } from "framer-motion";
import { Link, useParams } from "react-router-dom";
import axios from "axios";
import globalBackendRoute from "../../config/Config";

/* ---------- utils ---------- */
const failedImageCache = new Set();
const isHex24 = (s) => typeof s === "string" && /^[a-fA-F0-9]{24}$/.test(s);

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
    <div className="py-3 sm:grid sm:grid-cols-3 sm:gap-4 px-2 sm:px-4">
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
          key={`${v}-${i}`}
          className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 border"
        >
          {String(v)}
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

/* ============================ PAGE ============================ */
export default function SingleInstructor() {
  // MUST match the route param name
  const { instructorId } = useParams(); // /single-instructor/:instructorId/:slug
  const id = instructorId;

  const [inst, setInst] = useState(null);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState("");

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
      const url = `${globalBackendRoute}/api/instructors/get-by-id/${id}`;
      const { data } = await axios.get(url, { signal: controller.signal });
      setInst(data?.data || null);
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

  return (
    <motion.div
      className="containerWidth my-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35 }}
    >
      <div className="flex flex-col sm:flex-row sm:items-start items-center gap-6">
        <motion.div
          initial={{ scale: 0.96, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-40 h-40 sm:w-48 sm:h-48"
        >
          <SmartImage
            src={avatarAbs}
            alt={fullName}
            containerClass="w-full h-full"
            imgClass="w-full h-full"
          />
        </motion.div>

        <div className="w-full">
          <motion.h3
            className="subHeadingTextMobile lg:subHeadingText mb-4"
            initial={{ x: -30, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
          >
            Instructor Details
          </motion.h3>

          <div className="border-t border-gray-200 divide-y divide-gray-100">
            <Row
              icon={<FaIdBadge className="text-purple-600" />}
              label="Instructor ID"
            >
              <code className="text-xs sm:text-sm bg-gray-100 px-2 py-1 rounded">
                {inst._id}
              </code>
            </Row>
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
            <Row
              icon={<FaIdBadge className="text-gray-600" />}
              label="createdBy"
            >
              {inst.createdBy || "-"}
            </Row>
            <Row
              icon={<FaIdBadge className="text-gray-600" />}
              label="updatedBy"
            >
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

            <Row
              icon={<FaGlobe className="text-green-700" />}
              label="Languages"
            >
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
            <Row icon={<FaLink className="text-blue-600" />} label="Resume URL">
              {inst.resumeUrl ? <ExtLink href={inst.resumeUrl} /> : "-"}
            </Row>
            <Row
              icon={<FaLink className="text-blue-600" />}
              label="ID Proof URL"
            >
              {inst.idProofUrl ? <ExtLink href={inst.idProofUrl} /> : "-"}
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

            <Row
              icon={<FaIdBadge className="text-emerald-700" />}
              label="UPI ID"
            >
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
            <Row icon={<FaCheck className="text-green-600" />} label="Active">
              {yesNo(inst.isActive)}
            </Row>
            <Row icon={<FaTimes className="text-rose-600" />} label="Deleted">
              {yesNo(inst.isDeleted)}
            </Row>

            <Row icon={<FaBook className="text-indigo-700" />} label="Degrees">
              <Pills
                items={(inst.degrees || []).map(
                  (d) => d?.title || d?.name || d?._id
                )}
              />
            </Row>
            <Row
              icon={<FaBook className="text-indigo-700" />}
              label="Semesters"
            >
              <Pills
                items={(inst.semesters || []).map(
                  (s) => s?.title || s?.semister_name || s?._id
                )}
              />
            </Row>
            <Row icon={<FaBook className="text-indigo-700" />} label="Courses">
              <Pills
                items={(inst.courses || []).map(
                  (c) => c?.title || c?.name || c?._id
                )}
              />
            </Row>

            <Row icon={<FaStar className="text-yellow-500" />} label="Rating">
              {typeof inst.rating === "number" ? `${inst.rating}` : "-"}
            </Row>
            <Row
              icon={<FaStar className="text-yellow-500" />}
              label="Rating Count"
            >
              {typeof inst.ratingCount === "number"
                ? `${inst.ratingCount}`
                : "-"}
            </Row>
            <Row
              icon={<FaUsers className="text-teal-600" />}
              label="Students Taught"
            >
              {typeof inst.studentsTaught === "number"
                ? `${inst.studentsTaught}`
                : "-"}
            </Row>

            <Row
              icon={<FaIdBadge className="text-gray-600" />}
              label="Linked User ID"
            >
              {inst.user || "-"}
            </Row>
          </div>

          <div className="mt-6 text-center flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to={`/update-instructor/${slug}/${inst._id}`}
              className="primaryBtn w-fit px-4 flex items-center gap-2 rounded-full"
            >
              <MdEdit /> Update
            </Link>
            <Link
              to="/all-instructors"
              className="secondaryBtn w-fit px-4 rounded-full"
            >
              Back to All Instructors
            </Link>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
