// src/pages/student_admission_pages/SingleStudentAdmission.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import globalBackendRoute from "@/config/Config.js";
import {
  FiCheckCircle,
  FiSlash,
  FiCalendar,
  FiRefreshCcw,
  FiTag,
  FiHash,
  FiUser,
  FiMail,
  FiPhone,
  FiFlag,
  FiMapPin,
  FiHome,
  FiBookOpen,
  FiEdit,
  FiAlertTriangle,
  FiCopy,
  FiArrowRightCircle,
  FiXCircle,
} from "react-icons/fi";

const API = globalBackendRoute;

/* ---------------- helpers ---------------- */
const pretty = (v) => (v == null || v === "" ? "—" : String(v));
const fmtDateTime = (d) => {
  if (!d) return "—";
  try {
    const dt = new Date(d);
    if (Number.isNaN(dt.getTime())) return "—";
    return dt.toLocaleString();
  } catch {
    return "—";
  }
};
const getId = (val) => {
  if (!val) return "—";
  if (typeof val === "object") return val._id || val.id || "—";
  return val; // string/ObjectId string
};
const statusLabel = (s) =>
  ({
    draft: "Draft",
    submitted: "Submitted",
    under_review: "Under Review",
    approved: "Approved",
    rejected: "Rejected",
    withdrawn: "Withdrawn",
  }[s] || s || "—");
const statusBadgeClass = (s) => {
  switch (s) {
    case "approved":
      return "bg-green-50 text-green-700 border-green-200";
    case "rejected":
      return "bg-rose-50 text-rose-700 border-rose-200";
    case "submitted":
      return "bg-blue-50 text-blue-700 border-blue-200";
    case "under_review":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "withdrawn":
      return "bg-gray-100 text-gray-700 border-gray-200";
    default:
      return "bg-purple-50 text-purple-700 border-purple-200"; // draft/unknown
  }
};
const joinArr = (arr, mapper) =>
  Array.isArray(arr) && arr.length
    ? arr.map(mapper || ((x) => x)).join(", ")
    : "—";

/* ---------------- component ---------------- */
const SingleStudentAdmission = () => {
  const { id } = useParams();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState({ type: "", text: "" });
  const [busy, setBusy] = useState(false);

  // Best-effort lookup maps if backend didn’t populate (usually it does)
  const [degreeName, setDegreeName] = useState("—");
  const [semesterName, setSemesterName] = useState("—");
  const [courseName, setCourseName] = useState("—");

  /* ------------- load admission + light lookups ------------- */
  useEffect(() => {
    let active = true;

    const loadAdmission = async () => {
      try {
        setLoading(true);
        setErr("");
        const res = await fetch(`${API}/api/get-admission/${id}`);
        const json = await res.json();
        if (!res.ok)
          throw new Error(json?.message || "Failed to fetch admission.");
        if (!active) return;
        const doc = json?.data || json;
        setData(doc);

        // Set labels from populated relations (or fallback later)
        const d =
          doc?.intendedEnrollment?.degree?.name ||
          doc?.intendedEnrollment?.degree?.title ||
          "—";
        const s =
          doc?.intendedEnrollment?.semester?.semester_name ||
          doc?.intendedEnrollment?.semester?.title ||
          (doc?.intendedEnrollment?.semester?.semNumber
            ? `Semester ${doc?.intendedEnrollment?.semester?.semNumber}`
            : "") ||
          "—";
        const c =
          doc?.intendedEnrollment?.course?.title ||
          doc?.intendedEnrollment?.course?.name ||
          "—";
        setDegreeName(d || "—");
        setSemesterName(s || "—");
        setCourseName(c || "—");
      } catch (e) {
        if (active) setErr(e.message || "Something went wrong.");
      } finally {
        if (active) setLoading(false);
      }
    };

    loadAdmission();
    return () => {
      active = false;
    };
  }, [id]);

  /* ---------------- derived ---------------- */
  const admissionId = data?._id || data?.id || "—";
  const status = data?.applicationStatus || "draft";
  const isDeleted = !!data?.isDeleted;

  const createdAt = useMemo(() => fmtDateTime(data?.createdAt), [data]);
  const updatedAt = useMemo(() => fmtDateTime(data?.updatedAt), [data]);
  const submittedAt = useMemo(() => fmtDateTime(data?.submittedAt), [data]);
  const reviewedAt = useMemo(() => fmtDateTime(data?.reviewedAt), [data]);
  const deletedAt = useMemo(() => fmtDateTime(data?.deletedAt), [data]);

  const user = data?.user;
  const studentName =
    user?.name ||
    `${data?.firstName || ""} ${data?.lastName || ""}`.trim() ||
    data?.email ||
    "Student";

  const email = data?.email || user?.email || "—";
  const phone = data?.phone || user?.phone || "—";

  const ie = data?.intendedEnrollment || {};
  const ay = ie?.academicYear || "—";
  const degreeId = getId(ie?.degree);
  const semesterId = getId(ie?.semester);
  const courseId = getId(ie?.course);
  const preferredBatch = pretty(ie?.preferredBatch);

  const address = data?.address || {};
  const perm = data?.permanentAddress || {};

  /* ---------------- actions ---------------- */
  const callAndToast = async (fn) => {
    try {
      setBusy(true);
      setMsg({ type: "", text: "" });
      await fn();
    } catch (e) {
      setMsg({ type: "error", text: e.message || "Action failed." });
    } finally {
      setBusy(false);
    }
  };

  const doSubmit = () =>
    callAndToast(async () => {
      const res = await fetch(`${API}/api/submit/${admissionId}`, {
        method: "POST",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || "Submit failed.");
      setData((p) => (p ? { ...p, applicationStatus: "submitted", submittedAt: new Date().toISOString() } : p));
      setMsg({ type: "success", text: "Admission submitted." });
    });

  const doApprove = () =>
    callAndToast(async () => {
      const res = await fetch(`${API}/api/approve/${admissionId}`, {
        method: "POST",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || "Approve failed.");
      setData((p) => (p ? { ...p, applicationStatus: "approved", reviewedAt: new Date().toISOString() } : p));
      setMsg({ type: "success", text: "Admission approved." });
    });

  const doReject = () =>
    callAndToast(async () => {
      const reason = window.prompt("Reason for rejection (optional):", "");
      const res = await fetch(`${API}/api/reject/${admissionId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason || "" }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || "Reject failed.");
      setData((p) =>
        p ? { ...p, applicationStatus: "rejected", rejectionReason: reason || "" } : p
      );
      setMsg({ type: "success", text: "Admission rejected." });
    });

  const doCancel = () =>
    callAndToast(async () => {
      const ok = window.confirm(
        "Cancel (withdraw) this admission? It will be marked withdrawn and soft-deleted."
      );
      if (!ok) return;
      const res = await fetch(`${API}/api/cancel-admission/${admissionId}`, {
        method: "PATCH",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || "Cancel failed.");
      setData((p) =>
        p
          ? {
              ...p,
              applicationStatus: "withdrawn",
              isDeleted: true,
              deletedAt: new Date().toISOString(),
            }
          : p
      );
      setMsg({ type: "success", text: "Admission cancelled (withdrawn)." });
    });

  const doDelete = () =>
    callAndToast(async () => {
      const ok = window.confirm(
        "Delete this admission permanently? This cannot be undone."
      );
      if (!ok) return;
      const res = await fetch(`${API}/api/delete-admission/${admissionId}`, {
        method: "DELETE",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || "Delete failed.");
      setMsg({
        type: "success",
        text: "Admission deleted. Navigate back to All Admissions.",
      });
    });

  const doDuplicate = () =>
    callAndToast(async () => {
      const degree = window.prompt("Target Degree ID (required):", "");
      if (!degree) return;
      const academicYear = window.prompt(
        "Target Academic Year (e.g., 2025-26) (required):",
        ""
      );
      if (!academicYear) return;
      const semester = window.prompt("Target Semester ID (optional):", "");
      const course = window.prompt("Target Course ID (optional):", "");

      const res = await fetch(`${API}/api/duplicate-admission/${admissionId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          degree,
          academicYear,
          semester: semester || undefined,
          course: course || undefined,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || "Duplicate failed.");
      setMsg({ type: "success", text: "Admission duplicated." });
    });

  const doTransfer = () =>
    callAndToast(async () => {
      const degree = window.prompt("NEW Degree ID (required):", "");
      if (!degree) return;
      const semester = window.prompt("NEW Semester ID (optional):", "");
      const course = window.prompt("NEW Course ID (optional):", "");
      const academicYear = window.prompt(
        "NEW Academic Year (optional, e.g., 2025-26):",
        ""
      );

      const body = { degree };
      if (semester) body.semester = semester;
      if (course) body.course = course;
      if (academicYear) body.academicYear = academicYear;

      const res = await fetch(`${API}/api/transfer-admission/${admissionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || "Transfer failed.");

      // reflect changes locally when returned
      if (json?.data) setData(json.data);
      setMsg({ type: "success", text: "Admission transferred." });
    });

  /* ---------------- render states ---------------- */
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
            <Link to="/all-admissions" className="text-gray-900 underline">
              ← Back to All Admissions
            </Link>
            <Link to="/dashboard" className="text-gray-900 underline">
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  /* ---------------- UI ---------------- */
  return (
    <div className="max-w-7xl mx-auto w-full px-5 md:px-8 py-8">
      <div className="max-w-7xl mx-auto bg-white p-6 md:p-8">
        {/* Title & actions */}
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
              Admission Details
            </h1>
            <p className="text-gray-600 mt-1">
              View student, enrollment, documents and actions.
            </p>
            {/* Admission ID */}
            <div className="mt-2 inline-flex items-center gap-2 text-xs text-gray-700">
              <FiHash className="text-purple-600" />
              <code className="bg-gray-100 border px-2 py-0.5 rounded">
                {admissionId}
              </code>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold border ${statusBadgeClass(
                status
              )}`}
            >
              {status === "approved" ? (
                <FiCheckCircle />
              ) : status === "withdrawn" ? (
                <FiXCircle />
              ) : (
                <FiFlag />
              )}
              {statusLabel(status)}
            </span>

            {isDeleted ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 text-gray-700 border border-gray-200 px-3 py-1 text-xs font-semibold">
                <FiSlash /> Deleted
              </span>
            ) : null}

            {/* Actions */}
            <button
              onClick={doSubmit}
              disabled={busy}
              className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-white text-sm font-semibold ${
                busy ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-500"
              }`}
              title="Submit"
            >
              <FiRefreshCcw className="h-4 w-4" />
              Submit
            </button>

            <button
              onClick={doApprove}
              disabled={busy}
              className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-white text-sm font-semibold ${
                busy ? "bg-gray-400" : "bg-green-600 hover:bg-green-500"
              }`}
              title="Approve"
            >
              <FiCheckCircle className="h-4 w-4" />
              Approve
            </button>

            <button
              onClick={doReject}
              disabled={busy}
              className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-white text-sm font-semibold ${
                busy ? "bg-gray-400" : "bg-amber-600 hover:bg-amber-500"
              }`}
              title="Reject"
            >
              <FiSlash className="h-4 w-4" />
              Reject
            </button>

            <button
              onClick={doTransfer}
              disabled={busy}
              className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-white text-sm font-semibold ${
                busy ? "bg-gray-400" : "bg-indigo-600 hover:bg-indigo-500"
              }`}
              title="Transfer"
            >
              <FiArrowRightCircle className="h-4 w-4" />
              Transfer
            </button>

            <button
              onClick={doDuplicate}
              disabled={busy}
              className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-white text-sm font-semibold ${
                busy ? "bg-gray-400" : "bg-purple-600 hover:bg-purple-500"
              }`}
              title="Duplicate"
            >
              <FiCopy className="h-4 w-4" />
              Duplicate
            </button>

            <button
              onClick={doCancel}
              disabled={busy}
              className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-white text-sm font-semibold ${
                busy ? "bg-gray-400" : "bg-gray-700 hover:bg-gray-600"
              }`}
              title="Cancel (Withdraw)"
            >
              <FiXCircle className="h-4 w-4" />
              Cancel
            </button>

            <button
              onClick={doDelete}
              disabled={busy}
              className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-white text-sm font-semibold ${
                busy ? "bg-gray-400" : "bg-red-600 hover:bg-red-500"
              }`}
              title="Delete"
            >
              <FiAlertTriangle className="h-4 w-4" />
              Delete
            </button>

            <Link
              to={`/update-admission/${admissionId}`}
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-white text-sm font-semibold bg-indigo-600 hover:bg-indigo-500"
              title="Update Admission"
            >
              <FiEdit className="h-4 w-4" />
              Update
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

        {/* Applicant */}
        <div className="mt-6 rounded-lg border p-4">
          <h2 className="font-semibold text-gray-900 mb-3">Applicant</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2 text-gray-800">
              <FiUser className="shrink-0" />
              <span className="truncate">
                <span className="font-medium">Name:</span> {studentName}
              </span>
            </div>
            <div className="flex items-center gap-2 text-gray-800">
              <FiMail className="shrink-0" />
              <span className="truncate">
                <span className="font-medium">Email:</span> {pretty(email)}
              </span>
            </div>
            <div className="flex items-center gap-2 text-gray-800">
              <FiPhone className="shrink-0" />
              <span className="truncate">
                <span className="font-medium">Phone:</span> {pretty(phone)}
              </span>
            </div>
            <div className="flex items-center gap-2 text-gray-800">
              <FiTag className="shrink-0" />
              <span className="truncate">
                <span className="font-medium">Gender:</span>{" "}
                {pretty(data?.gender)}
              </span>
            </div>
            <div className="flex items-center gap-2 text-gray-800">
              <FiCalendar className="shrink-0" />
              <span className="truncate">
                <span className="font-medium">Date of Birth:</span>{" "}
                {data?.dateOfBirth
                  ? new Date(data.dateOfBirth).toLocaleDateString()
                  : "—"}
              </span>
            </div>
            <div className="flex items-center gap-2 text-gray-800">
              <FiFlag className="shrink-0" />
              <span className="truncate">
                <span className="font-medium">Nationality:</span>{" "}
                {pretty(data?.nationality)}
              </span>
            </div>
            <div className="flex items-center gap-2 text-gray-800">
              <FiTag className="shrink-0" />
              <span className="truncate">
                <span className="font-medium">Category:</span>{" "}
                {pretty(data?.category)}
              </span>
            </div>
          </div>
        </div>

        {/* Enrollment */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-lg border p-4">
            <h3 className="font-semibold text-gray-900 mb-2">
              Intended Enrollment
            </h3>
            <p className="text-sm text-gray-700 flex items-center gap-2">
              <FiCalendar />
              <span>
                <span className="font-medium">Academic Year:</span> {pretty(ay)}
              </span>
            </p>
            <p className="text-sm text-gray-700 flex items-center gap-2">
              <FiBookOpen />
              <span className="truncate">
                <span className="font-medium">Degree:</span> {degreeName}{" "}
                <code className="bg-gray-100 border px-1 py-0.5 rounded text-xs ml-1">
                  {degreeId}
                </code>
              </span>
            </p>
            <p className="text-sm text-gray-700">
              <span className="font-medium">Semester:</span> {semesterName}{" "}
              {semesterId !== "—" && (
                <code className="bg-gray-100 border px-1 py-0.5 rounded text-xs ml-1">
                  {semesterId}
                </code>
              )}
            </p>
            <p className="text-sm text-gray-700">
              <span className="font-medium">Course:</span> {courseName}{" "}
              {courseId !== "—" && (
                <code className="bg-gray-100 border px-1 py-0.5 rounded text-xs ml-1">
                  {courseId}
                </code>
              )}
            </p>
            <p className="text-sm text-gray-700">
              <span className="font-medium">Preferred Batch:</span>{" "}
              {preferredBatch}
            </p>
          </div>

          {/* Audit */}
          <div className="rounded-lg border p-4">
            <h3 className="font-semibold text-gray-900 mb-2">Audit</h3>
            <p className="text-sm text-gray-700">
              <span className="font-medium">Status:</span>{" "}
              {statusLabel(status)}
            </p>
            <p className="text-sm text-gray-700">
              <span className="font-medium">Submitted At:</span>{" "}
              {submittedAt}
            </p>
            <p className="text-sm text-gray-700">
              <span className="font-medium">Reviewed At:</span> {reviewedAt}
            </p>
            <p className="text-sm text-gray-700">
              <span className="font-medium">Reviewed By:</span>{" "}
              {data?.reviewedBy
                ? data?.reviewedBy?.name ||
                  data?.reviewedBy?.email ||
                  getId(data?.reviewedBy)
                : "—"}
            </p>
            <p className="text-sm text-gray-700">
              <span className="font-medium">Created By:</span>{" "}
              {data?.createdBy
                ? data?.createdBy?.name ||
                  data?.createdBy?.email ||
                  getId(data?.createdBy)
                : "—"}
            </p>
            <p className="text-sm text-gray-700">
              <span className="font-medium">Updated By:</span>{" "}
              {data?.updatedBy
                ? data?.updatedBy?.name ||
                  data?.updatedBy?.email ||
                  getId(data?.updatedBy)
                : "—"}
            </p>
            <p className="text-sm text-gray-700">
              <span className="font-medium">Created:</span> {createdAt}
            </p>
            <p className="text-sm text-gray-700">
              <span className="font-medium">Updated:</span> {updatedAt}
            </p>
            <p className="text-sm text-gray-700">
              <span className="font-medium">Deleted:</span>{" "}
              {isDeleted ? "Yes" : "No"}{" "}
              {isDeleted && deletedAt !== "—" ? `• ${deletedAt}` : ""}
            </p>
            {data?.rejectionReason ? (
              <p className="text-sm text-gray-700">
                <span className="font-medium">Rejection Reason:</span>{" "}
                {data.rejectionReason}
              </p>
            ) : null}
          </div>
        </div>

        {/* Addresses */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-lg border p-4">
            <h3 className="font-semibold text-gray-900 mb-2">Current Address</h3>
            <p className="text-sm text-gray-700 flex items-center gap-2">
              <FiHome />
              <span>
                {joinArr(
                  [
                    address.line1,
                    address.line2,
                    address.city,
                    address.state,
                    address.country,
                    address.postalCode,
                  ].filter(Boolean)
                )}
              </span>
            </p>
          </div>

          <div className="rounded-lg border p-4">
            <h3 className="font-semibold text-gray-900 mb-2">
              Permanent Address
            </h3>
            <p className="text-sm text-gray-700 flex items-center gap-2">
              <FiMapPin />
              <span>
                {joinArr(
                  [
                    perm.line1,
                    perm.line2,
                    perm.city,
                    perm.state,
                    perm.country,
                    perm.postalCode,
                  ].filter(Boolean)
                )}
              </span>
            </p>
          </div>
        </div>

        {/* Prior Education */}
        {Array.isArray(data?.priorEducation) && data.priorEducation.length > 0 && (
          <div className="mt-6 rounded-lg border p-4">
            <h3 className="font-semibold text-gray-900 mb-2">
              Prior Education
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-600 border-b">
                    <th className="py-2 pr-4">Level</th>
                    <th className="py-2 pr-4">Institute</th>
                    <th className="py-2 pr-4">Board/University</th>
                    <th className="py-2 pr-4">Year</th>
                    <th className="py-2 pr-4">% / CGPA</th>
                    <th className="py-2 pr-4">Major/Stream</th>
                  </tr>
                </thead>
                <tbody>
                  {data.priorEducation.map((pe, idx) => (
                    <tr key={idx} className="border-b last:border-0">
                      <td className="py-2 pr-4">{pretty(pe.level)}</td>
                      <td className="py-2 pr-4">{pretty(pe.institute)}</td>
                      <td className="py-2 pr-4">
                        {pretty(pe.boardOrUniversity)}
                      </td>
                      <td className="py-2 pr-4">{pretty(pe.yearOfPassing)}</td>
                      <td className="py-2 pr-4">
                        {pretty(pe.percentageOrCGPA)}
                      </td>
                      <td className="py-2 pr-4">{pretty(pe.majorOrStream)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Documents */}
        {Array.isArray(data?.documents) && data.documents.length > 0 && (
          <div className="mt-6 rounded-lg border p-4">
            <h3 className="font-semibold text-gray-900 mb-2">Documents</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-600 border-b">
                    <th className="py-2 pr-4">Type</th>
                    <th className="py-2 pr-4">Label</th>
                    <th className="py-2 pr-4">URL</th>
                    <th className="py-2 pr-4">Verified</th>
                    <th className="py-2 pr-4">Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {data.documents.map((d, idx) => (
                    <tr key={idx} className="border-b last:border-0">
                      <td className="py-2 pr-4">{pretty(d.type)}</td>
                      <td className="py-2 pr-4">{pretty(d.label)}</td>
                      <td className="py-2 pr-4">
                        {d.url ? (
                          <a
                            href={d.url}
                            className="text-indigo-600 underline"
                            target="_blank"
                            rel="noreferrer"
                          >
                            Open
                          </a>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="py-2 pr-4">
                        {d.verified ? "Yes" : "No"}
                      </td>
                      <td className="py-2 pr-4">{pretty(d.remarks)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            to="/all-admissions"
            className="inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-gray-900 text-sm font-semibold border hover:bg-gray-50"
          >
            Back to All Admissions
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

export default SingleStudentAdmission;
