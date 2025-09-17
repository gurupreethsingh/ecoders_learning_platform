// src/pages/admin/attendance/CreateAttendance.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import {
  FiCalendar,
  FiClock,
  FiLink,
  FiCopy,
  FiCheckCircle,
  FiXCircle,
  FiAlertTriangle,
  FiRefreshCcw,
  FiChevronDown,
} from "react-icons/fi";

import globalBackendRoute from "../../config/Config"; // or "../../config/Config.js"
import { getAuthorizationHeader } from "../../components/auth_components/AuthManager";

const API = globalBackendRoute;

const METHODS = [
  { value: "manual", label: "Manual (in class / by staff)" },
  { value: "online", label: "Online (students click a link)" },
];

const DEFAULT_WINDOW_MINUTES = 60;

function fmtLocalDateInput(d = new Date()) {
  const z = (n) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
}

function fmtLocalTimeInput(d = new Date()) {
  const z = (n) => n.toString().padStart(2, "0");
  return `${z(d.getHours())}:${z(d.getMinutes())}`;
}

function toISO(dateStr, timeStr) {
  const [y, m, d] = (dateStr || "").split("-").map((x) => parseInt(x, 10));
  const [hh, mm] = (timeStr || "").split(":").map((x) => parseInt(x, 10));
  if (!y || !m || !d) return null;
  const dt = new Date(y, (m || 1) - 1, d || 1, hh || 0, mm || 0, 0);
  return dt.toISOString();
}

const CreateAttendance = () => {
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);

  const [degrees, setDegrees] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [courses, setCourses] = useState([]);

  const [title, setTitle] = useState("");
  const [method, setMethod] = useState("online");
  const [degreeId, setDegreeId] = useState("");
  const [semesterId, setSemesterId] = useState("");
  const [courseId, setCourseId] = useState("");
  const [sessionDate, setSessionDate] = useState(fmtLocalDateInput(new Date()));
  const [startTime, setStartTime] = useState(fmtLocalTimeInput(new Date()));
  const [endTime, setEndTime] = useState(
    fmtLocalTimeInput(new Date(Date.now() + DEFAULT_WINDOW_MINUTES * 60 * 1000))
  );
  const [notes, setNotes] = useState("");

  const [publishNow, setPublishNow] = useState(true);
  const [windowMinutes, setWindowMinutes] = useState(DEFAULT_WINDOW_MINUTES);
  const [limitToCohort, setLimitToCohort] = useState(true);
  const [sendEmail, setSendEmail] = useState(true);

  const [generatedLink, setGeneratedLink] = useState(null);

  const authHeader = useMemo(() => getAuthorizationHeader(), []);

  /* ------------------------- Data bootstrapping ------------------------- */
  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        // matches your DegreeRoutes: /list-degrees
        const degRes = await axios.get(`${API}/api/list-degrees`, {
          headers: authHeader,
        });
        if (ignore) return;
        const degreeList = degRes?.data?.data || degRes?.data || [];
        setDegrees(degreeList);
        if (degreeList.length === 1) setDegreeId(degreeList[0]._id);
      } catch (err) {
        setToast({
          type: "error",
          msg: err?.response?.data?.message || "Failed to load degrees",
        });
      }
    })();
    return () => {
      ignore = true;
    };
  }, [API, authHeader]);

  useEffect(() => {
    if (!degreeId) {
      setSemesters([]);
      setSemesterId("");
      return;
    }
    let ignore = false;
    (async () => {
      try {
        // your working route for listing by degree
        const res = await axios.get(
          `${API}/api/semesters/list-by-degree/${degreeId}`,
          { headers: authHeader }
        );
        if (ignore) return;
        const arr = res?.data?.data || res?.data || [];
        setSemesters(arr);
        if (arr.length === 1) setSemesterId(arr[0]._id);
      } catch (err) {
        setToast({
          type: "error",
          msg: err?.response?.data?.message || "Failed to load semesters",
        });
      }
    })();
    return () => {
      ignore = true;
    };
  }, [degreeId, API, authHeader]);

  useEffect(() => {
    if (!semesterId) {
      setCourses([]);
      setCourseId("");
      return;
    }
    let ignore = false;
    (async () => {
      try {
        // your working route for listing by semester
        const res = await axios.get(
          `${API}/api/courses/list-by-semester/${semesterId}`,
          { headers: authHeader }
        );
        if (ignore) return;
        const arr = res?.data?.data || res?.data || [];
        setCourses(arr);
      } catch (err) {
        setToast({
          type: "error",
          msg: err?.response?.data?.message || "Failed to load courses",
        });
      }
    })();
    return () => {
      ignore = true;
    };
  }, [semesterId, API, authHeader]);

  /* --------------------------- Core submission -------------------------- */
  const handleCreate = async () => {
    setToast(null);

    if (!title.trim()) {
      setToast({ type: "warn", msg: "Please enter a title." });
      return;
    }
    if (!degreeId || !semesterId) {
      setToast({
        type: "warn",
        msg: "Select Degree and Semester (Course optional).",
      });
      return;
    }
    if (!sessionDate) {
      setToast({ type: "warn", msg: "Pick a session date." });
      return;
    }

    const validFromISO =
      method === "online" ? toISO(sessionDate, startTime) : null;
    const validToISO = method === "online" ? toISO(sessionDate, endTime) : null;

    if (
      method === "online" &&
      publishNow &&
      (!validFromISO ||
        !validToISO ||
        new Date(validToISO) <= new Date(validFromISO))
    ) {
      setToast({
        type: "warn",
        msg: "For online sessions, please set a valid start/end time.",
      });
      return;
    }

    setBusy(true);
    try {
      if (method === "online") {
        // ↳ POST /create-link (kebab-cased)
        const linkBody = {
          title: title.trim(),
          degreeId: limitToCohort ? degreeId : undefined,
          semesterId: limitToCohort ? semesterId : undefined,
          courseId: courseId || undefined,
          validFrom: validFromISO || toISO(sessionDate, "00:00"),
          validTo: validToISO || toISO(sessionDate, "23:59"),
          isActive: !!publishNow,
          metadata: { notes: notes?.trim() || "" },
        };

        const linkRes = await axios.post(`${API}/api/create-link`, linkBody, {
          headers: authHeader,
        });
        const linkData = linkRes?.data?.data || linkRes?.data;
        setGeneratedLink(linkData);

        // Optional email blast → POST /send-reminder-for-active-link?courseId=...
        if (sendEmail && linkData?.course) {
          try {
            await axios.post(
              `${API}/api/send-reminder-for-active-link?courseId=${linkData.course}`,
              null,
              { headers: authHeader }
            );
          } catch (mailErr) {
            console.warn(
              "Email blast failed:",
              mailErr?.response?.data || mailErr
            );
          }
        }

        setToast({
          type: "success",
          msg: publishNow
            ? "Link created & published."
            : "Link created (inactive).",
        });
      } else {
        // Manual session setup (no API call here—/create-attendance needs a studentId).
        setToast({
          type: "success",
          msg: "Manual session configured. Use the manual/bulk marking screen to mark students.",
        });
      }
    } catch (err) {
      setToast({
        type: "error",
        msg: err?.response?.data?.message || "Failed to create",
      });
    } finally {
      setBusy(false);
    }
  };

  const handleCopy = async (text) => {
    try {
      await navigator.clipboard.writeText(text || "");
      setToast({ type: "success", msg: "Link copied to clipboard." });
    } catch {
      setToast({ type: "warn", msg: "Could not copy link." });
    }
  };

  useEffect(() => {
    if (!sessionDate || !startTime) return;
    const [hh, mm] = startTime.split(":").map((n) => parseInt(n, 10));
    const base = new Date();
    base.setHours(hh || 0, mm || 0, 0, 0);
    const end = new Date(
      base.getTime() + (parseInt(windowMinutes, 10) || 0) * 60000
    );
    const z = (n) => n.toString().padStart(2, "0");
    setEndTime(`${z(end.getHours())}:${z(end.getMinutes())}`);
  }, [windowMinutes, sessionDate, startTime]);

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            Create Attendance
          </h1>
          <p className="text-sm text-gray-500">
            Create a manual session or an online attendance link students can
            use within a time window.
          </p>
        </div>

        <div className="flex gap-2">
          <Link
            to="/admin/attendance"
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border bg-white hover:bg-gray-50 text-sm"
          >
            <FiRefreshCcw className="opacity-70" />
            Manage Attendance
          </Link>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={`mb-4 rounded-lg p-3 text-sm flex items-start gap-2 ${
            toast.type === "success"
              ? "bg-green-50 text-green-800 border border-green-200"
              : toast.type === "warn"
              ? "bg-amber-50 text-amber-800 border border-amber-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          {toast.type === "success" ? (
            <FiCheckCircle className="mt-0.5" />
          ) : toast.type === "warn" ? (
            <FiAlertTriangle className="mt-0.5" />
          ) : (
            <FiXCircle className="mt-0.5" />
          )}
          <div>{toast.msg}</div>
        </div>
      )}

      {/* Card */}
      <section className="bg-white border rounded-2xl shadow-sm p-4 md:p-6">
        <div className="grid md:grid-cols-2 gap-5">
          {/* Left */}
          <div className="space-y-5">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Title<span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., DS-101 Lecture Attendance"
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              />
            </div>

            {/* Method */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Method<span className="text-rose-500">*</span>
              </label>
              <div className="mt-1 relative">
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                  className="w-full appearance-none rounded-lg border px-3 py-2 text-sm bg-white"
                >
                  {METHODS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
                <FiChevronDown className="absolute right-3 top-3 pointer-events-none text-gray-400" />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Manual: staff marks attendance. Online: students click a link
                within a time window.
              </p>
            </div>

            {/* Cohort selectors */}
            <div className="grid grid-cols-1 gap-4">
              {/* Degree */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Degree<span className="text-rose-500">*</span>
                </label>
                <div className="mt-1 relative">
                  <select
                    value={degreeId}
                    onChange={(e) => setDegreeId(e.target.value)}
                    className="w-full appearance-none rounded-lg border px-3 py-2 text-sm bg-white"
                  >
                    <option value="">— Select Degree —</option>
                    {degrees.map((d) => (
                      <option key={d._id} value={d._id}>
                        {d.name || d.title || d.slug || d._id}
                      </option>
                    ))}
                  </select>
                  <FiChevronDown className="absolute right-3 top-3 pointer-events-none text-gray-400" />
                </div>
              </div>

              {/* Semester */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Semester<span className="text-rose-500">*</span>
                </label>
                <div className="mt-1 relative">
                  <select
                    value={semesterId}
                    onChange={(e) => setSemesterId(e.target.value)}
                    className="w-full appearance-none rounded-lg border px-3 py-2 text-sm bg-white"
                    disabled={!degreeId}
                  >
                    <option value="">— Select Semester —</option>
                    {semesters.map((s) => (
                      <option key={s._id} value={s._id}>
                        {s.semister_name || s.name || s.slug || s._id}
                      </option>
                    ))}
                  </select>
                  <FiChevronDown className="absolute right-3 top-3 pointer-events-none text-gray-400" />
                </div>
              </div>

              {/* Course (optional) */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Course (optional)
                </label>
                <div className="mt-1 relative">
                  <select
                    value={courseId}
                    onChange={(e) => setCourseId(e.target.value)}
                    className="w-full appearance-none rounded-lg border px-3 py-2 text-sm bg-white"
                    disabled={!semesterId}
                  >
                    <option value="">— Not specific —</option>
                    {courses.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.title || c.name || c.slug || c._id}
                      </option>
                    ))}
                  </select>
                  <FiChevronDown className="absolute right-3 top-3 pointer-events-none text-gray-400" />
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Notes (optional)
              </label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                placeholder="Any special instructions for invigilators or students…"
              />
            </div>
          </div>

          {/* Right */}
          <div className="space-y-5">
            {/* Date & window */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Session Date<span className="text-rose-500">*</span>
                </label>
                <div className="mt-1 flex items-center gap-2">
                  <FiCalendar className="text-gray-400" />
                  <input
                    type="date"
                    value={sessionDate}
                    onChange={(e) => setSessionDate(e.target.value)}
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                  />
                </div>
              </div>

              {method === "online" && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Start Time
                    </label>
                    <div className="mt-1 flex items-center gap-2">
                      <FiClock className="text-gray-400" />
                      <input
                        type="time"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className="w-full rounded-lg border px-3 py-2 text-sm"
                      />
                    </div>
                  </div>

                  <div className="md:col-span-2 grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        End Time
                      </label>
                      <div className="mt-1 flex items-center gap-2">
                        <FiClock className="text-gray-400" />
                        <input
                          type="time"
                          value={endTime}
                          onChange={(e) => setEndTime(e.target.value)}
                          className="w-full rounded-lg border px-3 py-2 text-sm"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Window (minutes)
                      </label>
                      <input
                        type="number"
                        min={5}
                        step={5}
                        value={windowMinutes}
                        onChange={(e) => setWindowMinutes(e.target.value)}
                        className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Used to auto-adjust End Time from Start Time.
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Online publish options */}
            {method === "online" && (
              <div className="border rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div className="font-medium text-gray-900">
                    Link Publishing Options
                  </div>
                </div>

                <div className="mt-3 space-y-3">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={publishNow}
                      onChange={(e) => setPublishNow(e.target.checked)}
                      className="rounded"
                    />
                    Publish link immediately after creating attendance
                  </label>

                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={limitToCohort}
                      onChange={(e) => setLimitToCohort(e.target.checked)}
                      className="rounded"
                    />
                    Restrict link to selected Degree/Semester (and Course if
                    set)
                  </label>

                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={sendEmail}
                      onChange={(e) => setSendEmail(e.target.checked)}
                      className="rounded"
                    />
                    Email the link to all eligible students
                  </label>

                  <p className="text-xs text-gray-500">
                    Students will also see the active link on their Attendance
                    tab during the window.
                  </p>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleCreate}
                disabled={busy}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60"
              >
                {busy ? (
                  <>
                    <svg
                      className="animate-spin h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                      ></path>
                    </svg>
                    Creating…
                  </>
                ) : (
                  <>
                    <FiCheckCircle />
                    Create Attendance
                  </>
                )}
              </button>

              <Link
                to="/admin/attendance"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border bg-white hover:bg-gray-50"
              >
                <FiRefreshCcw className="opacity-70" />
                View All
              </Link>
            </div>

            {/* Link Preview */}
            {generatedLink && (
              <div className="border rounded-xl p-4 bg-gray-50/40">
                <div className="flex items-center gap-2 text-gray-900 font-medium">
                  <FiLink /> Link Published
                </div>

                <div className="mt-3 text-sm">
                  <div className="grid grid-cols-1 gap-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-gray-700 break-all">
                        <span className="font-medium">URL: </span>
                        {generatedLink.url ||
                          `${API}/api/mark-via-link/${generatedLink.code}`}
                      </div>
                      <button
                        onClick={() =>
                          handleCopy(
                            generatedLink.url ||
                              `${API}/api/mark-via-link/${generatedLink.code}`
                          )
                        }
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-white hover:bg-gray-50"
                      >
                        <FiCopy className="opacity-70" />
                        Copy
                      </button>
                    </div>

                    <div className="text-gray-700">
                      <span className="font-medium">Code: </span>
                      <span className="font-mono">{generatedLink.code}</span>
                    </div>

                    <div className="text-gray-700">
                      <span className="font-medium">Valid: </span>
                      {new Date(
                        generatedLink.validFrom
                      ).toLocaleString()}{" "}
                      — {new Date(generatedLink.validTo).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Help */}
        <div className="mt-6 text-xs text-gray-500">
          Tip: Attendance rows appear when students mark via the link (during
          the window) or when staff mark manually/bulk. Creating a link alone
          does not create per-student rows.
        </div>
      </section>
    </div>
  );
};

export default CreateAttendance;
