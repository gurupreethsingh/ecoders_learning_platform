// src/pages/notifications/SingleNotification.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  FiChevronDown,
  FiChevronUp,
  FiCalendar,
  FiHash,
  FiTag,
  FiCopy,
  FiTrash2,
  FiPaperclip,
  FiAlertCircle,
  FiUsers,
  FiExternalLink,
  FiX,
  FiZap,
  FiClock,
  FiSend,
  FiStopCircle,
  FiDownload,
  FiEdit,
} from "react-icons/fi";
import axios from "axios";
import globalBackendRoute from "@/config/Config.js";

const API = globalBackendRoute;
const NA = "—";

const api = axios.create({ baseURL: API });
api.interceptors.request.use((config) => {
  const t = localStorage.getItem("token");
  if (t) config.headers.Authorization = `Bearer ${t}`;
  return config;
});
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err?.response?.status;
    const msg = err?.response?.data?.message || "";
    if (status === 401 && /token expired|jwt expired/i.test(msg)) {
      localStorage.removeItem("token");
      window.location.assign("/login");
    }
    return Promise.reject(err);
  }
);

const Section = ({ title, children, defaultOpen = false }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-lg border">
      <button
        onClick={() => setOpen((s) => !s)}
        className="w-full flex items-center justify-between px-4 py-3"
        title={open ? "Collapse" : "Expand"}
      >
        <span className="font-semibold text-gray-900">{title}</span>
        {open ? <FiChevronUp /> : <FiChevronDown />}
      </button>
      {open ? <div className="px-4 pb-4">{children}</div> : null}
    </div>
  );
};

export default function SingleNotification() {
  const { id } = useParams(); // slug not needed for API calls
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState({ type: "", text: "" });

  const setAlert = (type, text) => setMsg({ type, text });

  const createdAt = useMemo(
    () => (data?.createdAt ? new Date(data.createdAt).toLocaleString() : NA),
    [data]
  );
  const scheduledAt = useMemo(
    () =>
      data?.scheduledAt ? new Date(data.scheduledAt).toLocaleString() : NA,
    [data]
  );
  const sentAt = useMemo(
    () => (data?.sentAt ? new Date(data.sentAt).toLocaleString() : NA),
    [data]
  );
  const expiresAt = useMemo(
    () => (data?.expiresAt ? new Date(data.expiresAt).toLocaleString() : NA),
    [data]
  );

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        setLoading(true);
        setAlert("", "");
        const [nRes, dRes] = await Promise.all([
          api.get(`/api/get-notification/${id}`),
          api.get(`/api/list-notification-deliveries/${id}`),
        ]);
        if (!alive) return;
        const n = nRes?.data?.data || nRes?.data || null;
        const dl = dRes?.data?.data || dRes?.data || [];
        setData(n);
        setDeliveries(Array.isArray(dl) ? dl : []);
      } catch (e) {
        setAlert(
          "error",
          e?.response?.data?.message || "Failed to load notification."
        );
      } finally {
        if (alive) setLoading(false);
      }
    };
    load();
    return () => {
      alive = false;
    };
  }, [id]);

  const doDuplicate = async () => {
    try {
      setAlert("", "");
      const res = await api.post(`/api/duplicate-notification/${id}`);
      const newId = res?.data?.data?._id || res?.data?._id || res?.data?.id;
      setAlert("success", "Notification duplicated.");
      if (newId)
        navigate(
          `/single-notification/${data?.slug || "notification"}/${newId}`
        );
    } catch (e) {
      setAlert("error", e?.response?.data?.message || "Failed to duplicate.");
    }
  };

  const doDelete = async () => {
    const ok = window.confirm(
      "This will permanently delete the notification. Continue?"
    );
    if (!ok) return;
    try {
      setAlert("", "");
      await api.delete(`/api/delete-notification/${id}`);
      setAlert("success", "Notification deleted.");
      navigate("/all-notifications");
    } catch (e) {
      setAlert("error", e?.response?.data?.message || "Failed to delete.");
    }
  };

  const doSendNow = async () => {
    try {
      setAlert("", "");
      await api.post(`/api/send-notification/${id}`);
      setAlert("success", "Send queued / completed.");
    } catch (e) {
      setAlert("error", e?.response?.data?.message || "Failed to send.");
    }
  };

  const doSchedule = async () => {
    const when = window.prompt(
      "Enter schedule time (ISO like 2025-09-10T14:30:00Z)"
    );
    if (when === null) return;
    try {
      setAlert("", "");
      await api.post(`/api/schedule-notification/${id}`, {
        scheduledAt: when || new Date().toISOString(),
      });
      setAlert("success", "Scheduled.");
    } catch (e) {
      setAlert("error", e?.response?.data?.message || "Failed to schedule.");
    }
  };

  const doCancel = async () => {
    try {
      setAlert("", "");
      await api.post(`/api/cancel-notification/${id}`);
      setAlert("success", "Canceled.");
    } catch (e) {
      setAlert("error", e?.response?.data?.message || "Failed to cancel.");
    }
  };

  const exportCsv = async () => {
    try {
      const res = await api.get(
        `/api/export-notification-deliveries-csv/${id}`,
        {
          responseType: "blob",
        }
      );
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `notification_${id}_deliveries.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      setAlert("error", e?.response?.data?.message || "Failed to export CSV.");
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

  if (!data) {
    return (
      <div className="max-w-7xl mx-auto w-full px-5 md:px-8 py-8">
        <div className="max-w-4xl mx-auto bg-white p-6 md:p-8">
          <div className="rounded-lg px-4 py-3 text-sm bg-red-50 text-red-800 border border-red-200">
            Notification not found.
          </div>
          <div className="mt-4 flex gap-3">
            <Link to="/all-notifications" className="text-gray-900 underline">
              ← Back to All Notifications
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const tags = Array.isArray(data?.tags)
    ? data.tags
    : String(data?.tags || "")
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

  return (
    <div className="max-w-7xl mx-auto w-full px-4 md:px-6 py-6">
      <div className="bg-white p-4 md:p-6 rounded-lg border">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <div className="min-w-0">
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 truncate">
              {data?.title || "Notification Details"}
            </h1>
            <p className="text-gray-600 mt-1 text-sm">
              Compact detail view with actions.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              to={`/update-notification/${data?.slug || "notification"}/${
                data?._id || data?.id
              }`}
              className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-white text-sm font-semibold bg-blue-600 hover:bg-blue-500"
              title="Edit / Update"
            >
              <FiEdit className="h-4 w-4" />
              Update
            </Link>

            <button
              onClick={doSendNow}
              className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-white text-sm font-semibold bg-green-600 hover:bg-green-500"
              title="Send now"
            >
              <FiSend className="h-4 w-4" />
              Send
            </button>
            <button
              onClick={doSchedule}
              className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-white text-sm font-semibold bg-amber-600 hover:bg-amber-500"
              title="Schedule"
            >
              <FiClock className="h-4 w-4" />
              Schedule
            </button>
            <button
              onClick={doCancel}
              className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-white text-sm font-semibold bg-rose-600 hover:bg-rose-500"
              title="Cancel"
            >
              <FiStopCircle className="h-4 w-4" />
              Cancel
            </button>
            <button
              onClick={doDuplicate}
              className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-white text-sm font-semibold bg-indigo-600 hover:bg-indigo-500"
              title="Duplicate"
            >
              <FiCopy className="h-4 w-4" />
              Duplicate
            </button>
            <button
              onClick={doDelete}
              className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-white text-sm font-semibold bg-red-600 hover:bg-red-500"
              title="Delete"
            >
              <FiTrash2 className="h-4 w-4" />
              Delete
            </button>
          </div>
        </div>

        {/* Alert */}
        {msg.text ? (
          <div
            className={`mt-4 rounded-lg px-4 py-3 text-sm ${
              msg.type === "success"
                ? "bg-green-50 text-green-800 border border-green-200"
                : msg.type === "error"
                ? "bg-red-50 text-red-800 border border-red-200"
                : "bg-yellow-50 text-yellow-800 border border-yellow-200"
            }`}
          >
            {msg.text}
          </div>
        ) : null}

        {/* Basic */}
        <Section title="Basic" defaultOpen>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2 text-gray-800">
              <FiHash className="shrink-0" />
              <span className="truncate">
                <span className="font-medium">ID:</span>{" "}
                <code className="bg-gray-100 border px-1.5 py-0.5 rounded">
                  {data?._id || data?.id}
                </code>
              </span>
            </div>

            <div className="flex items-center gap-2 text-gray-800">
              <FiTag className="shrink-0" />
              <span className="truncate">
                <span className="font-medium">Category:</span>{" "}
                {data?.category || NA}
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
                <span className="font-medium">Scheduled:</span> {scheduledAt}
              </span>
            </div>

            <div className="flex items-center gap-2 text-gray-800">
              <FiCalendar className="shrink-0" />
              <span className="truncate">
                <span className="font-medium">Sent:</span> {sentAt}
              </span>
            </div>

            <div className="flex items-center gap-2 text-gray-800">
              <FiCalendar className="shrink-0" />
              <span className="truncate">
                <span className="font-medium">Expires:</span> {expiresAt}
              </span>
            </div>
          </div>

          <div className="mt-4">
            <div className="text-sm font-medium text-gray-900 mb-1">
              Message
            </div>
            <div className="rounded-lg bg-gray-50 p-3 text-sm text-gray-800 whitespace-pre-wrap">
              {data?.message || NA}
            </div>
          </div>

          {Array.isArray(tags) && tags.length > 0 && (
            <div className="mt-3 text-sm text-gray-700">
              <span className="font-medium">Tags:</span> {tags.join(", ")}
            </div>
          )}
        </Section>

        {/* Audience / Channels */}
        <Section title="Audience & Channels">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <p className="text-gray-700">
              <span className="font-medium">Audience Type:</span>{" "}
              {data?.audienceType || NA}
            </p>
            <p className="text-gray-700">
              <span className="font-medium">Channels:</span>{" "}
              {Array.isArray(data?.channels) ? data.channels.join(", ") : NA}
            </p>
            {Array.isArray(data?.rolesInclude) &&
              data.rolesInclude.length > 0 && (
                <p className="text-gray-700 md:col-span-2">
                  <span className="font-medium">Roles Include:</span>{" "}
                  {data.rolesInclude.join(", ")}
                </p>
              )}
            {Array.isArray(data?.usersInclude) &&
              data.usersInclude.length > 0 && (
                <p className="text-gray-700 md:col-span-2">
                  <span className="font-medium">Users Include:</span>{" "}
                  {data.usersInclude.join(", ")}
                </p>
              )}
          </div>
        </Section>

        {/* Context */}
        <Section title="Context">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <p className="text-gray-700">
              <span className="font-medium">Degree:</span>{" "}
              {data?.context?.degree?._id ||
              typeof data?.context?.degree === "string"
                ? data?.context?.degree?._id || data?.context?.degree
                : NA}
            </p>
            <p className="text-gray-700">
              <span className="font-medium">Semester:</span>{" "}
              {data?.context?.semester?._id ||
              typeof data?.context?.semester === "string"
                ? data?.context?.semester?._id || data?.context?.semester
                : NA}
            </p>
            <p className="text-gray-700">
              <span className="font-medium">Course:</span>{" "}
              {data?.context?.course?._id ||
              typeof data?.context?.course === "string"
                ? data?.context?.course?._id || data?.context?.course
                : NA}
            </p>
            <p className="text-gray-700">
              <span className="font-medium">Section:</span>{" "}
              {data?.context?.section || NA}
            </p>
            <p className="text-gray-700">
              <span className="font-medium">Batch Year:</span>{" "}
              {data?.context?.batchYear || NA}
            </p>
          </div>
        </Section>

        {/* Attachments */}
        <Section title="Attachments">
          {Array.isArray(data?.attachments) && data.attachments.length > 0 ? (
            <ul className="space-y-2">
              {data.attachments.map((att, i) => {
                const url =
                  typeof att === "string"
                    ? att
                    : att?.url || att?.href || att?.path || "";
                const label =
                  typeof att === "string"
                    ? att.split("/").pop()
                    : att?.caption ||
                      att?.name ||
                      att?.label ||
                      url?.split("/").pop() ||
                      `Attachment ${i + 1}`;
                return (
                  <li key={i} className="flex items-center gap-3 text-sm">
                    <FiPaperclip className="shrink-0" />
                    {url ? (
                      <a
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-indigo-600 hover:underline inline-flex items-center gap-1 break-all"
                      >
                        {label} <FiExternalLink />
                      </a>
                    ) : (
                      <span className="text-gray-800 break-all">{label}</span>
                    )}
                    <span className="text-gray-500 text-xs">
                      ({att?.type || "file"})
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="text-sm text-gray-700">{NA}</div>
          )}

          <div className="mt-3 rounded bg-yellow-50 border border-yellow-200 text-yellow-800 px-3 py-2 text-xs flex items-center gap-2">
            <FiAlertCircle />
            Manage uploads via create/update forms. Refresh to see the latest
            here.
          </div>
        </Section>

        {/* Deliveries */}
        <Section title="Deliveries">
          {deliveries.length === 0 ? (
            <div className="text-sm text-gray-700">{NA}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="text-left">
                  <tr>
                    <th className="py-2 pr-4 font-medium text-gray-700">
                      User
                    </th>
                    <th className="py-2 pr-4 font-medium text-gray-700">
                      Channel
                    </th>
                    <th className="py-2 pr-4 font-medium text-gray-700">
                      Status
                    </th>
                    <th className="py-2 pr-4 font-medium text-gray-700">
                      Seen
                    </th>
                    <th className="py-2 pr-4 font-medium text-gray-700">
                      Created
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {deliveries.map((d) => (
                    <tr key={d._id || d.id} className="border-t">
                      <td className="py-2 pr-4">
                        {d?.user?.name || d?.userName || d?.user || NA}
                      </td>
                      <td className="py-2 pr-4">{d?.channel || NA}</td>
                      <td className="py-2 pr-4">{d?.status || NA}</td>
                      <td className="py-2 pr-4">{d?.seen ? "Yes" : "No"}</td>
                      <td className="py-2 pr-4">
                        {d?.createdAt
                          ? new Date(d.createdAt).toLocaleString()
                          : NA}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-3">
            <button
              onClick={exportCsv}
              className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-white text-sm font-semibold bg-gray-900 hover:bg-gray-800"
            >
              <FiDownload className="h-4 w-4" />
              Export Deliveries CSV
            </button>
          </div>
        </Section>

        {/* Footer */}
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            to="/all-notifications"
            className="inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-gray-900 text-sm font-semibold border hover:bg-gray-50"
          >
            Back to All Notifications
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
}
