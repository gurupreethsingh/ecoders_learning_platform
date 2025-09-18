import React, { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import axios from "axios";
import globalBackendRoute from "../../config/Config";
import {
  getAuthorizationHeader,
  getTokenUserId,
} from "../../components/auth_components/AuthManager";
import {
  FiCheckCircle,
  FiXCircle,
  FiAlertTriangle,
  FiChevronDown,
  FiClock,
  FiCalendar,
  FiLink,
  FiClipboard,
  FiTrash2,
} from "react-icons/fi";

const API = `${globalBackendRoute}/api`;

const fmt = (dt) => {
  try {
    return new Date(dt).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return String(dt || "—");
  }
};

export default function MarkAttendance() {
  const { code: routeCode } = useParams();
  const [qs] = useSearchParams();

  const authHeader = useMemo(() => getAuthorizationHeader(), []);
  const tokenUserId = useMemo(() => getTokenUserId?.() || "", []); // ← studentId from token

  const [busyLink, setBusyLink] = useState(false);
  const [busyManual, setBusyManual] = useState(false);

  const [toast, setToast] = useState(null); // {type: success|warn|error, msg}

  // ---- LINK FLOW ----
  const [code, setCode] = useState(routeCode || "");
  const [link, setLink] = useState(null);
  const [linkLoading, setLinkLoading] = useState(false);

  // ---- MANUAL FLOW (auto-degree) ----
  const [degreeId, setDegreeId] = useState("");
  const [degreeName, setDegreeName] = useState("");
  const [semesters, setSemesters] = useState([]);
  const [semesterId, setSemesterId] = useState(qs.get("semesterId") || "");
  const [courses, setCourses] = useState([]);
  const [courseId, setCourseId] = useState(qs.get("courseId") || "");

  const [loadingMe, setLoadingMe] = useState(true);

  // ------------------------ Resolve student's ONE degree ------------------------
  useEffect(() => {
    let alive = true;

    const safeId = (obj) =>
      obj && (obj._id || obj.id || (typeof obj === "string" ? obj : null));

    const resolveDegree = async () => {
      setLoadingMe(true);
      try {
        const uid = tokenUserId;
        if (!uid) throw new Error("Not logged in.");
        const userRes = await axios.get(`${API}/getUserById/${uid}`, {
          headers: authHeader,
        });
        const user = userRes?.data?.data || userRes?.data || {};
        let dId =
          safeId(user?.degree) ||
          user?.degreeId ||
          (typeof user?.program === "string"
            ? user.program
            : safeId(user?.program)) ||
          null;

        if (!dId) {
          const adm = await axios.get(
            `${API}/list-admissions?userId=${uid}&page=1&limit=1&sortBy=createdAt&sortDir=desc`,
            { headers: authHeader }
          );
          const doc = (
            Array.isArray(adm?.data?.data) ? adm.data.data : adm?.data || []
          )[0];
          dId = safeId(doc?.intendedEnrollment?.degree);
        }

        if (!dId) throw new Error("Degree not found for this user.");

        let dName = "";
        try {
          const d = await axios.get(`${API}/get-degree-by-id/slug/${dId}`, {
            headers: authHeader,
          });
          const dd = d?.data?.data || d?.data || {};
          dName = dd?.name || dd?.title || dd?.degree_name || "Degree";
        } catch {
          dName = "Degree";
        }

        if (!alive) return;
        setDegreeId(String(dId));
        setDegreeName(String(dName));
      } catch (e) {
        if (alive)
          setToast({
            type: "error",
            msg:
              e?.response?.data?.message ||
              e.message ||
              "Could not resolve your degree.",
          });
      } finally {
        if (alive) setLoadingMe(false);
      }
    };

    resolveDegree();
    return () => {
      alive = false;
    };
  }, [authHeader, tokenUserId]);

  // ------------------------ Load semesters for the detected degree ------------------------
  useEffect(() => {
    if (!degreeId) {
      setSemesters([]);
      setSemesterId("");
      return;
    }
    let alive = true;
    (async () => {
      try {
        const r = await axios.get(
          `${API}/semesters/list-by-degree/${degreeId}`,
          { headers: authHeader }
        );
        const arr = Array.isArray(r?.data?.data) ? r.data.data : r?.data || [];
        if (!alive) return;
        setSemesters(arr);
        if (arr.length === 1) setSemesterId(arr[0]._id || arr[0].id);
        else if (semesterId) {
          const still = arr.find(
            (s) => String(s._id || s.id) === String(semesterId)
          );
          if (!still) setSemesterId("");
        }
      } catch {
        if (alive) setSemesters([]);
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [degreeId, authHeader]);

  // ------------------------ Load courses for selected semester ------------------------
  useEffect(() => {
    if (!semesterId) {
      setCourses([]);
      setCourseId("");
      return;
    }
    let alive = true;
    (async () => {
      try {
        const r = await axios.get(
          `${API}/courses/list-by-semester/${semesterId}`,
          { headers: authHeader }
        );
        const arr = Array.isArray(r?.data?.data) ? r.data.data : r?.data || [];
        if (!alive) return;
        setCourses(arr);
        if (arr.length === 1) setCourseId(arr[0]._id || arr[0].id);
        else if (courseId) {
          const still = arr.find(
            (c) => String(c._id || c.id) === String(courseId)
          );
          if (!still) setCourseId("");
        }
      } catch {
        if (alive) {
          setCourses([]);
          setCourseId("");
        }
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [semesterId, authHeader]);

  // ------------------------ Load link details if :code present ------------------------
  useEffect(() => {
    if (!routeCode) return;
    let alive = true;
    setLink(null);
    (async () => {
      setLinkLoading(true);
      setToast(null);
      try {
        // Might be admin-only on your server; ignore errors.
        const r = await axios.get(`${API}/get-link-by-code/${routeCode}`, {
          headers: authHeader,
        });
        const lk = r?.data?.data || r?.data || null;
        if (alive) setLink(lk);
      } catch {
        // ignore; marking will still work
      } finally {
        if (alive) setLinkLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [routeCode, authHeader]);

  // ----------------------------- Actions: link flow -----------------------------
  const markViaLink = async () => {
    if (!code.trim()) {
      setToast({ type: "warn", msg: "Enter or paste a link code first." });
      return;
    }
    if (!tokenUserId) {
      setToast({ type: "error", msg: "You must be logged in." });
      return;
    }

    setBusyLink(true);
    setToast(null);
    try {
      // Include studentId (and userId) from token
      const body = {
        studentId: tokenUserId,
        userId: tokenUserId, // harmless extra
        degreeId: degreeId || undefined,
        semesterId: semesterId || undefined,
        courseId: courseId || undefined,
      };
      const res = await axios.post(
        `${API}/mark-via-link/${code.trim()}`,
        body,
        {
          headers: authHeader,
        }
      );
      const data = res?.data?.data || res?.data || {};
      const created =
        data?.created === true ||
        String(data?.message || "")
          .toLowerCase()
          .includes("created");
      setToast({
        type: "success",
        msg: created
          ? "Attendance marked successfully."
          : data?.message || "Attendance already marked for today.",
      });
    } catch (err) {
      const status = err?.response?.status;
      const msg =
        err?.response?.data?.message ||
        (status === 401
          ? "You are not logged in or your session expired. Please sign in again."
          : status === 403
          ? "Not eligible for this link or the window is closed."
          : "Failed to mark attendance.");
      setToast({ type: "error", msg });
    } finally {
      setBusyLink(false);
    }
  };

  const pasteCodeFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text) {
        setToast({ type: "warn", msg: "Clipboard is empty." });
        return;
      }
      setCode(text.trim());
      setToast(null);
    } catch {
      setToast({
        type: "warn",
        msg: "Could not read from clipboard. Paste manually (Ctrl/Cmd+V).",
      });
    }
  };

  const clearCode = () => {
    setCode("");
    setToast(null);
  };

  // --------------------------- Actions: manual flow ---------------------------
  const markManual = async () => {
    if (!degreeId || !semesterId || !courseId) {
      setToast({
        type: "warn",
        msg: "Select Semester and Course to mark today's attendance.",
      });
      return;
    }
    if (!tokenUserId) {
      setToast({ type: "error", msg: "You must be logged in." });
      return;
    }

    setBusyManual(true);
    setToast(null);
    try {
      // Include studentId (and userId) from token; server should mark for "today"
      const body = {
        studentId: tokenUserId,
        userId: tokenUserId, // harmless extra
        degreeId,
        semesterId,
        courseId,
      };
      const res = await axios.post(`${API}/mark-manual`, body, {
        headers: authHeader,
      });
      const data = res?.data?.data || res?.data || {};
      const created =
        data?.created === true ||
        String(data?.message || "")
          .toLowerCase()
          .includes("created");
      setToast({
        type: "success",
        msg: created
          ? "Attendance marked successfully for today."
          : data?.message || "Attendance already marked for today.",
      });
    } catch (err) {
      const status = err?.response?.status;
      const msg =
        err?.response?.data?.message ||
        (status === 401
          ? "You are not logged in or your session expired. Please sign in again."
          : status === 403
          ? "Manual marking is not allowed for you / this course."
          : "Failed to mark attendance.");
      setToast({ type: "error", msg });
    } finally {
      setBusyManual(false);
    }
  };

  // ------------------------------- UI bits -------------------------------
  const Toast = () =>
    toast && (
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
    );

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            Mark Attendance
          </h1>
          <p className="text-sm text-gray-500">
            Attendance can be marked for <strong>today only</strong>.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            to="/my-attendance"
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border bg-white hover:bg-gray-50 text-sm"
          >
            View Attendance
          </Link>
          <Link
            to="/student-dashboard"
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border bg-white hover:bg-gray-50 text-sm"
          >
            Dashboard
          </Link>
        </div>
      </div>

      <Toast />

      {/* ---------------- LINK FLOW ---------------- */}
      <section className="bg-white border rounded-2xl shadow-sm p-4 md:p-6 mb-5">
        <div className="flex items-center gap-2 text-gray-900 font-medium mb-3">
          <FiLink /> Mark using link code
        </div>

        {/* If coming via /mark-attendance/:code, show link details (best-effort) */}
        {routeCode && (
          <div className="mb-4">
            {linkLoading ? (
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <FiClock className="animate-pulse" />
                Loading link details…
              </div>
            ) : link ? (
              <div className="rounded-lg border bg-gray-50 p-3">
                <div className="font-medium text-gray-900">
                  {link.title || "Attendance Link"}
                </div>
                <div className="text-sm text-gray-700 mt-1">
                  <span className="inline-flex items-center gap-1 mr-4">
                    <FiCalendar /> {fmt(link.validFrom)} — {fmt(link.validTo)}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <FiClock />
                    {link.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border bg-amber-50 text-amber-800 p-3 text-sm">
                Couldn’t show link details. You can still paste the code below.
              </div>
            )}
          </div>
        )}

        <div className="grid md:grid-cols-[1fr_auto] gap-3">
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Enter attendance code (e.g., PG82N9ZZ)"
            className="w-full rounded-lg border px-3 py-2 text-sm"
          />
          <div className="flex gap-2">
            <button
              onClick={pasteCodeFromClipboard}
              type="button"
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border bg-white hover:bg-gray-50 text-sm"
              title="Paste from clipboard"
            >
              <FiClipboard /> Paste
            </button>
            <button
              onClick={clearCode}
              type="button"
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border bg-white hover:bg-gray-50 text-sm"
              title="Clear"
            >
              <FiTrash2 /> Clear
            </button>
            <button
              onClick={markViaLink}
              disabled={busyLink || !code.trim()}
              className="inline-flex items-center justify-center px-4 py-2 rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-sm"
            >
              {busyLink ? "Marking…" : "Mark me present"}
            </button>
          </div>
        </div>

        <div className="text-xs text-gray-500 mt-2">
          If your link is cohort-restricted, the Semester/Course you pick below
          will be used as context. The server enforces eligibility and “today
          only”.
        </div>
      </section>

      {/* ---------------- MANUAL FLOW ---------------- */}
      <section className="bg-white border rounded-2xl shadow-sm p-4 md:p-6">
        <div className="flex items-center gap-2 text-gray-900 font-medium mb-3">
          <FiCheckCircle /> Mark without a link (manual)
        </div>

        {/* Degree: auto & read-only */}
        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Degree
            </label>
            <div className="mt-1">
              <input
                value={
                  loadingMe
                    ? "Loading your degree…"
                    : degreeName || "(not found)"
                }
                readOnly
                className="w-full rounded-lg border px-3 py-2 text-sm bg-gray-50 text-gray-700"
              />
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
                disabled={!degreeId || loadingMe}
              >
                <option value="">— Select Semester —</option>
                {semesters.map((s) => (
                  <option key={s._id || s.id} value={s._id || s.id}>
                    {s.semister_name || s.name || s.slug || s._id || s.id}
                  </option>
                ))}
              </select>
              <FiChevronDown className="absolute right-3 top-3 pointer-events-none text-gray-400" />
            </div>
          </div>

          {/* Course (required for manual) */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Course<span className="text-rose-500">*</span>
            </label>
            <div className="mt-1 relative">
              <select
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
                className="w-full appearance-none rounded-lg border px-3 py-2 text-sm bg-white"
                disabled={!semesterId}
              >
                <option value="">— Select Course —</option>
                {courses.map((c) => (
                  <option key={c._id || c.id} value={c._id || c.id}>
                    {c.title || c.name || c.slug || c._id || c.id}
                  </option>
                ))}
              </select>
              <FiChevronDown className="absolute right-3 top-3 pointer-events-none text-gray-400" />
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <button
            onClick={markManual}
            disabled={
              busyManual || !degreeId || !semesterId || !courseId || loadingMe
            }
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60"
          >
            {busyManual ? "Marking…" : "Mark me present (today)"}
          </button>
          <div className="text-xs text-gray-500">
            No date picker — marking is for <strong>today</strong>. The server
            enforces this rule.
          </div>
        </div>
      </section>
    </div>
  );
}
