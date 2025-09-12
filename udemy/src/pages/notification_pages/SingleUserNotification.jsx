import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import axios from "axios";
import globalBackendRoute from "../../config/Config";
import {
  FiCheckCircle,
  FiSlash,
  FiCalendar,
  FiRefreshCcw,
  FiTag,
  FiHash,
  FiClock,
  FiBookOpen,
  FiEdit,
  FiStar,
  FiFlag,
  FiTrendingUp,
  FiAlertTriangle,
  FiInbox,
  FiEye,
} from "react-icons/fi";
import { IoMdNotificationsOutline } from "react-icons/io";
import { getAuthorizationHeader } from "../../components/auth_components/AuthManager";

const API = globalBackendRoute;

// --------- helpers ----------
const pretty = (v) => (v == null || v === "" ? "—" : String(v));
const joinList = (arr) =>
  Array.isArray(arr) && arr.length ? arr.join(", ") : "—";
const fmtDateTime = (d) => {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleString();
  } catch {
    return "—";
  }
};
const makeSlug = (s) =>
  String(s || "notification")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

const getId = (val) => {
  if (!val) return "—";
  if (typeof val === "object") return val._id || val.id || "—";
  return val;
};

const SingleUserNotification = () => {
  // Route pattern you use: /my-notification/:slug/:notificationId/:deliveryId
  const { slug: slugParam, notificationId, deliveryId } = useParams();
  const navigate = useNavigate();

  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState({ type: "", text: "" });
  const [busy, setBusy] = useState(false);

  // Local delivery state (since we don’t fetch the delivery doc separately)
  const [seen, setSeen] = useState(false);
  const [seenAt, setSeenAt] = useState(null);

  // ---------- load + mark seen ----------
  useEffect(() => {
    let active = true;
    const loadNotification = async () => {
      try {
        setLoading(true);
        setErr("");
        const res = await axios.get(
          `${API}/api/get-notification/${notificationId}`,
          {
            headers: { ...getAuthorizationHeader() },
          }
        );
        const data = res?.data?.data || res?.data || null;
        if (!active) return;
        setDoc(data);
      } catch (e) {
        if (active) {
          setErr(
            e?.response?.data?.message ||
              e.message ||
              "Failed to fetch notification."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    const markSeen = async () => {
      try {
        if (!deliveryId) return;
        await axios.post(
          `${API}/api/mark-delivery-seen/${deliveryId}`,
          {},
          { headers: { ...getAuthorizationHeader() } }
        );
        setSeen(true);
        setSeenAt(new Date());
        // Inform header bell to refresh
        window.dispatchEvent(new Event("notifications:updated"));
      } catch {
        // ignore – we still show the notification
      }
    };

    loadNotification().then(markSeen);
    return () => {
      active = false;
    };
  }, [notificationId, deliveryId]);

  // Safe slug for links
  const viewSlug = useMemo(() => {
    if (doc?.slug) return doc.slug;
    if (slugParam) return slugParam;
    return makeSlug(doc?.title || doc?._id || "notification");
  }, [doc, slugParam]);

  // Derived
  const notifId = doc?._id || doc?.id || "—";
  const createdAt = useMemo(() => fmtDateTime(doc?.createdAt), [doc]);
  const updatedAt = useMemo(() => fmtDateTime(doc?.updatedAt), [doc]);

  // Common chips
  const category = doc?.category ? String(doc.category) : null;
  const priority = doc?.priority ? String(doc.priority) : null;
  const channels = Array.isArray(doc?.channels || doc?.channel)
    ? doc.channels || doc.channel
    : doc?.channel
    ? [doc.channel]
    : [];
  const tags = Array.isArray(doc?.tags) ? doc.tags : [];

  // Actions
  const refresh = async () => {
    try {
      setBusy(true);
      setMsg({ type: "", text: "" });
      const res = await axios.get(
        `${API}/api/get-notification/${notificationId}`,
        {
          headers: { ...getAuthorizationHeader() },
        }
      );
      setDoc(res?.data?.data || res?.data || null);
      setMsg({ type: "success", text: "Refreshed." });
    } catch (e) {
      setMsg({
        type: "error",
        text: e?.response?.data?.message || e.message || "Refresh failed.",
      });
    } finally {
      setBusy(false);
    }
  };

  const reMarkSeen = async () => {
    if (!deliveryId) return;
    try {
      setBusy(true);
      setMsg({ type: "", text: "" });
      await axios.post(
        `${API}/api/mark-delivery-seen/${deliveryId}`,
        {},
        { headers: { ...getAuthorizationHeader() } }
      );
      setSeen(true);
      setSeenAt(new Date());
      window.dispatchEvent(new Event("notifications:updated"));
      setMsg({ type: "success", text: "Marked as seen." });
    } catch (e) {
      setMsg({
        type: "error",
        text: e?.response?.data?.message || e.message || "Action failed.",
      });
    } finally {
      setBusy(false);
    }
  };

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
            <Link to="/my-notifications" className="text-gray-900 underline">
              ← Back to My Notifications
            </Link>
            <Link to="/dashboard" className="text-gray-900 underline">
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!doc) return null;

  const title = doc?.title || "Notification";

  return (
    <div className="max-w-7xl mx-auto w-full px-5 md:px-8 py-8">
      <div className="max-w-7xl mx-auto bg-white p-6 md:p-8">
        {/* Title & actions (match SingleExam style) */}
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
              Notification Details
            </h1>
            <p className="text-gray-600 mt-1">
              View notification content, labels and delivery info.
            </p>

            {/* Notification ID under the header */}
            <div className="mt-2 inline-flex items-center gap-2 text-xs text-gray-700">
              <FiHash className="text-purple-600" />
              <code className="bg-gray-100 border px-2 py-0.5 rounded">
                {notifId}
              </code>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Seen / Unseen chip */}
            {seen ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-green-50 text-green-700 border border-green-200 px-3 py-1 text-xs font-semibold">
                <FiCheckCircle /> Seen
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 text-gray-700 border border-gray-200 px-3 py-1 text-xs font-semibold">
                <FiSlash /> Unseen
              </span>
            )}

            {priority ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 px-3 py-1 text-xs font-semibold">
                <FiTrendingUp /> {priority}
              </span>
            ) : null}

            {category ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1 text-xs font-semibold">
                <FiFlag /> {category}
              </span>
            ) : null}

            <button
              onClick={refresh}
              disabled={busy}
              className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-white text-sm font-semibold ${
                busy ? "bg-gray-400" : "bg-gray-900 hover:bg-gray-800"
              }`}
              title="Refresh"
            >
              <FiRefreshCcw className="h-4 w-4" />
              Refresh
            </button>

            <button
              onClick={reMarkSeen}
              disabled={busy}
              className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-white text-sm font-semibold ${
                busy ? "bg-gray-400" : "bg-green-600 hover:bg-green-500"
              }`}
              title="Mark as seen"
            >
              <FiEye className="h-4 w-4" />
              Mark Seen
            </button>

            <Link
              to={`/my-notification/${encodeURIComponent(
                viewSlug
              )}/${notifId}/${deliveryId || ""}`}
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-white text-sm font-semibold bg-indigo-600 hover:bg-indigo-500"
              title="Permalink"
            >
              <IoMdNotificationsOutline className="h-4 w-4" />
              Permalink
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
            {msg.text}
          </div>
        ) : null}

        {/* Basic */}
        <div className="mt-6 rounded-lg border p-4">
          <h2 className="font-semibold text-gray-900 mb-3">Basic</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2 text-gray-800">
              <FiHash className="shrink-0" />
              <span className="truncate">
                <span className="font-medium">Notification ID:</span>{" "}
                <code className="bg-gray-100 border px-1.5 py-0.5 rounded">
                  {notifId}
                </code>
              </span>
            </div>

            {deliveryId ? (
              <div className="flex items-center gap-2 text-gray-800">
                <FiInbox className="shrink-0" />
                <span className="truncate">
                  <span className="font-medium">Delivery ID:</span>{" "}
                  <code className="bg-gray-100 border px-1.5 py-0.5 rounded">
                    {deliveryId}
                  </code>
                </span>
              </div>
            ) : null}

            <div className="flex items-center gap-2 text-gray-800 md:col-span-2">
              <FiBookOpen className="shrink-0" />
              <span className="truncate">
                <span className="font-medium">Title:</span> {pretty(doc.title)}
              </span>
            </div>

            <div className="flex items-center gap-2 text-gray-800">
              <FiCalendar className="shrink-0" />
              <span className="truncate">
                <span className="font-medium">Created:</span> {createdAt}
              </span>
            </div>
            <div className="flex items-center gap-2 text-gray-800">
              <FiCalendar className="shrink-0" />
              <span className="truncate">
                <span className="font-medium">Updated:</span> {updatedAt}
              </span>
            </div>

            <div className="flex items-center gap-2 text-gray-800">
              <FiClock className="shrink-0" />
              <span className="truncate">
                <span className="font-medium">Seen At:</span>{" "}
                {fmtDateTime(seenAt)}
              </span>
            </div>
          </div>
        </div>

        {/* Labels */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-lg border p-4">
            <h3 className="font-semibold text-gray-900 mb-2">Labels</h3>
            <p className="text-sm text-gray-700 flex items-center gap-2">
              <FiTag />
              <span>
                <span className="font-medium">Tags:</span> {joinList(tags)}
              </span>
            </p>
            <p className="text-sm text-gray-700 mt-1">
              <span className="font-medium">Category:</span> {pretty(category)}
            </p>
            <p className="text-sm text-gray-700 mt-1">
              <span className="font-medium">Priority:</span> {pretty(priority)}
            </p>
          </div>

          <div className="rounded-lg border p-4">
            <h3 className="font-semibold text-gray-900 mb-2">Channels</h3>
            <p className="text-sm text-gray-700">{joinList(channels)}</p>
          </div>
        </div>

        {/* Content */}
        <div className="mt-6 rounded-lg border p-4">
          <h3 className="font-semibold text-gray-900 mb-2">Content</h3>

          {doc?.message ? (
            <div className="rounded-lg bg-gray-50 p-3 text-sm text-gray-800 whitespace-pre-wrap">
              {doc.message}
            </div>
          ) : null}

          {doc?.html ? (
            <div
              className="prose prose-sm max-w-none mt-4"
              dangerouslySetInnerHTML={{ __html: doc.html }}
            />
          ) : null}

          {!!doc?.ctas?.length && (
            <div className="mt-5 flex flex-wrap gap-2">
              {doc.ctas.map((cta, idx) => (
                <a
                  key={idx}
                  href={cta.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center px-3 py-2 rounded-md bg-indigo-600 text-white text-sm hover:bg-indigo-700"
                >
                  {cta.label || "Open"}
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            to="/my-notifications"
            className="inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-gray-900 text-sm font-semibold border hover:bg-gray-50"
          >
            Back to My Notifications
          </Link>
          <Link
            to="/dashboard"
            className="inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-gray-900 text-sm font-semibold border hover:bg-gray-50"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
};

export default SingleUserNotification;
