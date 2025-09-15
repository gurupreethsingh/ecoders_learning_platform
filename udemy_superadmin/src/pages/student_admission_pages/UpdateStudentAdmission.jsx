// src/pages/student_admission_pages/UpdateStudentAdmission.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import globalBackendRoute from "@/config/Config.js";
import {
  FiHash,
  FiUser,
  FiMail,
  FiPhone,
  FiFlag,
  FiCalendar,
  FiMapPin,
  FiHome,
  FiBookOpen,
  FiCheckCircle,
  FiSlash,
} from "react-icons/fi";

const API = globalBackendRoute;

/* ---------- helpers ---------- */
const pretty = (v) => (v == null || v === "" ? "—" : String(v));
const fmtDate = (d) => {
  if (!d) return "";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "";
  return dt.toISOString().slice(0, 10);
};
const parseDate = (s) => (s ? new Date(s) : undefined);

/* Small label with star */
const Label = ({ children, required = false }) => (
  <label className="block text-sm font-medium mb-1">
    {children} {required && <span className="text-red-600">*</span>}
  </label>
);

/* ----------- component ----------- */
const UpdateStudentAdmission = () => {
  const { id } = useParams();

  // data + loading
  const [loading, setLoading] = useState(true);
  const [fetchErr, setFetchErr] = useState("");

  // alerts
  const [msg, setMsg] = useState({ type: "", text: "" });
  const [saving, setSaving] = useState(false);

  // dropdown lists
  const [degrees, setDegrees] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [courses, setCourses] = useState([]);

  // immutable (display only)
  const [linkedUser, setLinkedUser] = useState(null);
  const [appStatus, setAppStatus] = useState("draft");
  const [isDeleted, setIsDeleted] = useState(false);

  // form fields (editable)
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName]   = useState("");
  const [email, setEmail]         = useState("");
  const [phone, setPhone]         = useState("");
  const [gender, setGender]       = useState("prefer_not_to_say");
  const [dateOfBirth, setDateOfBirth] = useState(""); // yyyy-mm-dd
  const [nationality, setNationality] = useState("");
  const [category, setCategory]   = useState("");

  const [address, setAddress] = useState({
    line1: "", line2: "", city: "", state: "", country: "", postalCode: "",
  });
  const [permanentAddress, setPermanentAddress] = useState({
    line1: "", line2: "", city: "", state: "", country: "", postalCode: "",
  });

  const [academicYear, setAcademicYear] = useState("");
  const [degreeId, setDegreeId]         = useState("");
  const [semesterId, setSemesterId]     = useState("");
  const [courseId, setCourseId]         = useState("");
  const [preferredBatch, setPreferredBatch] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(true);

  const statusBadge = useMemo(() => {
    const cls =
      appStatus === "approved"
        ? "bg-green-50 text-green-700 border-green-200"
        : appStatus === "rejected"
        ? "bg-rose-50 text-rose-700 border-rose-200"
        : appStatus === "submitted"
        ? "bg-blue-50 text-blue-700 border-blue-200"
        : appStatus === "under_review"
        ? "bg-amber-50 text-amber-700 border-amber-200"
        : appStatus === "withdrawn"
        ? "bg-gray-100 text-gray-700 border-gray-200"
        : "bg-purple-50 text-purple-700 border-purple-200";
    const icon =
      appStatus === "approved" ? <FiCheckCircle /> : <FiSlash />;
    return { cls, icon };
  }, [appStatus]);

  /* -------- load admission + degrees -------- */
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setFetchErr("");
        setMsg({ type: "", text: "" });

        // Load admission
        const admRes = await axios.get(`${API}/api/get-admission/${id}`);
        const adm = admRes.data?.data || admRes.data;
        if (!alive) return;

        // fill immutable
        setAppStatus(adm?.applicationStatus || "draft");
        setIsDeleted(!!adm?.isDeleted);
        setLinkedUser(adm?.user || null);

        // fill identity
        setFirstName(adm?.firstName || "");
        setLastName(adm?.lastName || "");
        setEmail(adm?.email || adm?.user?.email || "");
        setPhone(adm?.phone || adm?.user?.phone || "");
        setGender(adm?.gender || "prefer_not_to_say");
        setDateOfBirth(fmtDate(adm?.dateOfBirth));
        setNationality(adm?.nationality || "");
        setCategory(adm?.category || "");

        // addresses
        setAddress({
          line1: adm?.address?.line1 || "",
          line2: adm?.address?.line2 || "",
          city: adm?.address?.city || "",
          state: adm?.address?.state || "",
          country: adm?.address?.country || "",
          postalCode: adm?.address?.postalCode || "",
        });
        setPermanentAddress({
          line1: adm?.permanentAddress?.line1 || "",
          line2: adm?.permanentAddress?.line2 || "",
          city: adm?.permanentAddress?.city || "",
          state: adm?.permanentAddress?.state || "",
          country: adm?.permanentAddress?.country || "",
          postalCode: adm?.permanentAddress?.postalCode || "",
        });

        // enrollment
        const ie = adm?.intendedEnrollment || {};
        const dId =
          ie?.degree?._id || ie?.degree?.id || (typeof ie?.degree === "string" ? ie?.degree : "");
        const sId =
          ie?.semester?._id || ie?.semester?.id || (typeof ie?.semester === "string" ? ie?.semester : "");
        const cId =
          ie?.course?._id || ie?.course?.id || (typeof ie?.course === "string" ? ie?.course : "");

        setAcademicYear(ie?.academicYear || "");
        setDegreeId(dId || "");
        setSemesterId(sId || "");
        setCourseId(cId || "");
        setPreferredBatch(ie?.preferredBatch || "");
        setTermsAccepted(!!adm?.termsAccepted);

        // load degrees list
        const degRes = await axios.get(`${API}/api/list-degrees`, {
          params: { page: 1, limit: 1000, sortBy: "createdAt", sortDir: "desc" },
        });
        const degs = degRes.data?.data || degRes.data || [];
        if (!alive) return;
        setDegrees(Array.isArray(degs) ? degs : []);

      } catch (e) {
        if (alive) setFetchErr(e?.response?.data?.message || e.message || "Failed to load admission.");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => { alive = false; };
  }, [id]);

  /* -------- load semesters when degree changes -------- */
  useEffect(() => {
    let alive = true;
    (async () => {
      setSemesters([]);
      setCourses([]);
      // don't reset selected here; keep current if still present
      if (!degreeId) return;

      try {
        const res = await axios.get(`${API}/api/semesters`, {
          params: { page: 1, limit: 1000, degree: degreeId, degreeId },
        });
        const list = res?.data?.data || res?.data || [];
        if (!alive) return;
        setSemesters(Array.isArray(list) ? list : []);
      } catch {
        /* ignore */
      }
    })();
    return () => { alive = false; };
  }, [degreeId]);

  /* -------- load courses when degree/semester changes -------- */
  useEffect(() => {
    let alive = true;
    (async () => {
      setCourses([]);
      if (!degreeId) return;
      try {
        const res = await axios.get(`${API}/api/list-courses`, {
          params: {
            page: 1, limit: 1000, degreeId: degreeId, semesterId: semesterId || undefined,
          },
        });
        const list = res?.data?.data || res?.data || [];
        if (!alive) return;

        // best-effort filter
        const arr = (Array.isArray(list) ? list : []).filter((c) => {
          const dOk = c?.degree?._id
            ? String(c.degree._id) === String(degreeId)
            : c?.degree
            ? String(c.degree) === String(degreeId)
            : true;
          const sOk = !semesterId
            ? true
            : c?.semester?._id
            ? String(c.semester._id) === String(semesterId)
            : c?.semester
            ? String(c.semester) === String(semesterId)
            : false;
          return dOk && sOk;
        });

        setCourses(arr);
      } catch {
        /* ignore */
      }
    })();
    return () => { alive = false; };
  }, [degreeId, semesterId]);

  /* -------- submit update -------- */
  const onSubmit = async (e) => {
    e.preventDefault();
    setMsg({ type: "", text: "" });

    // basic frontend checks
    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      return setMsg({ type: "error", text: "Please fill all mandatory fields." });
    }
    if (!academicYear.trim() || !degreeId) {
      return setMsg({ type: "error", text: "Academic Year and Degree are required." });
    }

    const payload = {
      firstName,
      lastName,
      email,
      phone,
      gender,
      dateOfBirth: dateOfBirth ? parseDate(dateOfBirth) : undefined,
      nationality,
      category,
      address,
      permanentAddress,
      intendedEnrollment: {
        academicYear,
        degree: degreeId,
        semester: semesterId || undefined,
        course: courseId || undefined,
        preferredBatch: preferredBatch || undefined,
      },
      termsAccepted: !!termsAccepted,
    };

    try {
      setSaving(true);
      const res = await axios.patch(`${API}/api/update-admission/${id}`, payload);
      const updated = res?.data?.data || res?.data;
      setMsg({ type: "success", text: "Admission updated successfully." });

      // reflect fresh data
      if (updated) {
        // identity
        setFirstName(updated.firstName || "");
        setLastName(updated.lastName || "");
        setEmail(updated.email || "");
        setPhone(updated.phone || "");
        setGender(updated.gender || "prefer_not_to_say");
        setDateOfBirth(fmtDate(updated.dateOfBirth));
        setNationality(updated.nationality || "");
        setCategory(updated.category || "");
        // addresses
        setAddress({
          line1: updated?.address?.line1 || "",
          line2: updated?.address?.line2 || "",
          city: updated?.address?.city || "",
          state: updated?.address?.state || "",
          country: updated?.address?.country || "",
          postalCode: updated?.address?.postalCode || "",
        });
        setPermanentAddress({
          line1: updated?.permanentAddress?.line1 || "",
          line2: updated?.permanentAddress?.line2 || "",
          city: updated?.permanentAddress?.city || "",
          state: updated?.permanentAddress?.state || "",
          country: updated?.permanentAddress?.country || "",
          postalCode: updated?.permanentAddress?.postalCode || "",
        });
        // enrollment
        const ie = updated?.intendedEnrollment || {};
        setAcademicYear(ie?.academicYear || "");
        setDegreeId(
          ie?.degree?._id || ie?.degree?.id || (typeof ie?.degree === "string" ? ie?.degree : "")
        );
        setSemesterId(
          ie?.semester?._id || ie?.semester?.id || (typeof ie?.semester === "string" ? ie?.semester : "")
        );
        setCourseId(
          ie?.course?._id || ie?.course?.id || (typeof ie?.course === "string" ? ie?.course : "")
        );
        setPreferredBatch(ie?.preferredBatch || "");
        setTermsAccepted(!!updated?.termsAccepted);
        // status
        setAppStatus(updated?.applicationStatus || appStatus);
        setIsDeleted(!!updated?.isDeleted);
      }
      window.alert("Admission updated successfully.");
    } catch (err) {
      const message =
        err?.response?.data?.message || err.message || "Failed to update admission.";
      setMsg({ type: "error", text: message });
      window.alert(message);
    } finally {
      setSaving(false);
    }
  };

  /* -------- render -------- */
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

  if (fetchErr) {
    return (
      <div className="max-w-7xl mx-auto w-full px-5 md:px-8 py-8">
        <div className="max-w-4xl mx-auto bg-white p-6 md:p-8">
          <div className="rounded-lg px-4 py-3 text-sm bg-red-50 text-red-800 border border-red-200">
            {fetchErr}
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

  const degreeLabel = (d) =>
    `${d?.name || d?.title || "Degree"}${d?.code ? ` (${d.code})` : ""}`;
  const semesterLabel = (s) =>
    s?.semester_name ||
    s?.title ||
    (s?.semNumber ? `Semester ${s.semNumber}` : s?.slug || "Semester");
  const courseLabel = (c) => c?.title || c?.name || "Course";

  return (
    <div className="max-w-7xl mx-auto w-full px-5 md:px-8 py-8">
      <div className="max-w-7xl mx-auto bg-white p-6 md:p-8">
        {/* Header */}
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
              Update Admission
            </h1>
            <p className="text-gray-600 mt-1">
              Modify applicant details, addresses and enrollment.
            </p>
            <div className="mt-2 inline-flex items-center gap-2 text-xs text-gray-700">
              <FiHash className="text-purple-600" />
              <code className="bg-gray-100 border px-2 py-0.5 rounded">
                {id}
              </code>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold border ${statusBadge.cls}`}
              title="Current application status"
            >
              {statusBadge.icon}
              {appStatus.replace("_", " ")}
            </span>
            {isDeleted ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 text-gray-700 border border-gray-200 px-3 py-1 text-xs font-semibold">
                Deleted
              </span>
            ) : null}
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

        {/* Form */}
        <form onSubmit={onSubmit} className="mt-6 space-y-8">
          {/* Linked user (display only) */}
          <section className="rounded-lg border p-4">
            <h2 className="font-semibold text-gray-900 mb-3">Linked User</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2 text-gray-800">
                <FiUser />
                <span className="truncate">
                  <span className="font-medium">Name:</span>{" "}
                  {linkedUser?.name || "—"}
                </span>
              </div>
              <div className="flex items-center gap-2 text-gray-800">
                <FiMail />
                <span className="truncate">
                  <span className="font-medium">Email:</span>{" "}
                  {linkedUser?.email || "—"}
                </span>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              The linked user cannot be changed here.
            </p>
          </section>

          {/* Identity */}
          <section className="rounded-lg border p-4">
            <h2 className="font-semibold text-gray-900 mb-3">Applicant</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label required>First Name</Label>
                <input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full rounded border px-3 py-2"
                  placeholder="First name"
                  required
                />
              </div>
              <div>
                <Label required>Last Name</Label>
                <input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full rounded border px-3 py-2"
                  placeholder="Last name"
                  required
                />
              </div>
              <div>
                <Label required>Email</Label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded border px-3 py-2"
                  placeholder="student@example.com"
                  required
                />
              </div>
              <div>
                <Label>Phone</Label>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded border px-3 py-2"
                  placeholder="Phone"
                />
              </div>
              <div>
                <Label>Gender</Label>
                <select
                  className="w-full rounded border px-3 py-2"
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                >
                  {["male","female","other","prefer_not_to_say"].map((g)=>
                    <option key={g} value={g}>{g.replaceAll("_"," ")}</option>
                  )}
                </select>
              </div>
              <div>
                <Label>Date of Birth</Label>
                <input
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  className="w-full rounded border px-3 py-2"
                />
              </div>
              <div>
                <Label>Nationality</Label>
                <input
                  value={nationality}
                  onChange={(e) => setNationality(e.target.value)}
                  className="w-full rounded border px-3 py-2"
                  placeholder="Nationality"
                />
              </div>
              <div>
                <Label>Category</Label>
                <input
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded border px-3 py-2"
                  placeholder="Category"
                />
              </div>
            </div>
          </section>

          {/* Addresses */}
          <section className="rounded-lg border p-4">
            <h2 className="font-semibold text-gray-900 mb-3">Addresses</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Current */}
              <div>
                <div className="flex items-center gap-2 mb-2 font-medium">
                  <FiHome /> Current Address
                </div>
                <div className="space-y-2">
                  <input className="w-full rounded border px-3 py-2" placeholder="Line 1"
                    value={address.line1} onChange={e=>setAddress(a=>({...a,line1:e.target.value}))}/>
                  <input className="w-full rounded border px-3 py-2" placeholder="Line 2"
                    value={address.line2} onChange={e=>setAddress(a=>({...a,line2:e.target.value}))}/>
                  <div className="grid grid-cols-2 gap-2">
                    <input className="rounded border px-3 py-2" placeholder="City"
                      value={address.city} onChange={e=>setAddress(a=>({...a,city:e.target.value}))}/>
                    <input className="rounded border px-3 py-2" placeholder="State"
                      value={address.state} onChange={e=>setAddress(a=>({...a,state:e.target.value}))}/>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input className="rounded border px-3 py-2" placeholder="Country"
                      value={address.country} onChange={e=>setAddress(a=>({...a,country:e.target.value}))}/>
                    <input className="rounded border px-3 py-2" placeholder="Postal Code"
                      value={address.postalCode} onChange={e=>setAddress(a=>({...a,postalCode:e.target.value}))}/>
                  </div>
                </div>
              </div>

              {/* Permanent */}
              <div>
                <div className="flex items-center gap-2 mb-2 font-medium">
                  <FiMapPin /> Permanent Address
                </div>
                <div className="space-y-2">
                  <input className="w-full rounded border px-3 py-2" placeholder="Line 1"
                    value={permanentAddress.line1} onChange={e=>setPermanentAddress(a=>({...a,line1:e.target.value}))}/>
                  <input className="w-full rounded border px-3 py-2" placeholder="Line 2"
                    value={permanentAddress.line2} onChange={e=>setPermanentAddress(a=>({...a,line2:e.target.value}))}/>
                  <div className="grid grid-cols-2 gap-2">
                    <input className="rounded border px-3 py-2" placeholder="City"
                      value={permanentAddress.city} onChange={e=>setPermanentAddress(a=>({...a,city:e.target.value}))}/>
                    <input className="rounded border px-3 py-2" placeholder="State"
                      value={permanentAddress.state} onChange={e=>setPermanentAddress(a=>({...a,state:e.target.value}))}/>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input className="rounded border px-3 py-2" placeholder="Country"
                      value={permanentAddress.country} onChange={e=>setPermanentAddress(a=>({...a,country:e.target.value}))}/>
                    <input className="rounded border px-3 py-2" placeholder="Postal Code"
                      value={permanentAddress.postalCode} onChange={e=>setPermanentAddress(a=>({...a,postalCode:e.target.value}))}/>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Enrollment */}
          <section className="rounded-lg border p-4">
            <h2 className="font-semibold text-gray-900 mb-3">Intended Enrollment</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label required>Academic Year</Label>
                <input
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  className="w-full rounded border px-3 py-2"
                  placeholder="e.g., 2025-26"
                  required
                />
              </div>

              <div>
                <Label required>Degree</Label>
                <select
                  className="w-full rounded border px-3 py-2"
                  value={degreeId}
                  onChange={(e) => setDegreeId(e.target.value)}
                  required
                >
                  <option value="">-- Select Degree --</option>
                  {degrees.map((d) => (
                    <option key={d._id || d.id} value={d._id || d.id}>
                      {degreeLabel(d)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label>Semester (optional)</Label>
                <select
                  className="w-full rounded border px-3 py-2"
                  value={semesterId}
                  onChange={(e) => setSemesterId(e.target.value)}
                  disabled={!degreeId || semesters.length === 0}
                >
                  <option value="">-- Select Semester --</option>
                  {semesters.map((s) => (
                    <option key={s._id || s.id} value={s._id || s.id}>
                      {semesterLabel(s)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label>Course (optional)</Label>
                <select
                  className="w-full rounded border px-3 py-2"
                  value={courseId}
                  onChange={(e) => setCourseId(e.target.value)}
                  disabled={!degreeId || courses.length === 0}
                >
                  <option value="">-- Select Course --</option>
                  {courses.map((c) => (
                    <option key={c._id || c.id} value={c._id || c.id}>
                      {courseLabel(c)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label>Preferred Batch (optional)</Label>
                <input
                  value={preferredBatch}
                  onChange={(e) => setPreferredBatch(e.target.value)}
                  className="w-full rounded border px-3 py-2"
                  placeholder="Batch name/code"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    className="h-4 w-4"
                  />
                  <span className="text-sm">
                    I confirm the details are correct and terms are accepted.
                  </span>
                </label>
              </div>
            </div>
          </section>

          {/* Submit row */}
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={saving}
              className="rounded bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save Changes"}
            </button>
            <Link
              to={`/single-admission/${id}`}
              className="rounded border px-4 py-2 hover:bg-gray-50"
            >
              Cancel
            </Link>
          </div>
        </form>

        {/* Extra info (read-only chips) */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-lg border p-4">
            <h3 className="font-semibold text-gray-900 mb-2">Quick Info</h3>
            <p className="text-sm text-gray-700 flex items-center gap-2">
              <FiBookOpen />
              <span>
                <span className="font-medium">Status:</span> {appStatus.replace("_"," ")}
              </span>
            </p>
            <p className="text-sm text-gray-700 flex items-center gap-2">
              <FiCalendar />
              <span>
                <span className="font-medium">DOB:</span>{" "}
                {dateOfBirth ? new Date(dateOfBirth).toLocaleDateString() : "—"}
              </span>
            </p>
            <p className="text-sm text-gray-700 flex items-center gap-2">
              <FiFlag />
              <span>
                <span className="font-medium">Nationality:</span>{" "}
                {pretty(nationality)}
              </span>
            </p>
          </div>

          <div className="rounded-lg border p-4">
            <h3 className="font-semibold text-gray-900 mb-2">Contact</h3>
            <p className="text-sm text-gray-700 flex items-center gap-2">
              <FiMail />
              <span>
                <span className="font-medium">Email:</span> {pretty(email)}
              </span>
            </p>
            <p className="text-sm text-gray-700 flex items-center gap-2">
              <FiPhone />
              <span>
                <span className="font-medium">Phone:</span> {pretty(phone)}
              </span>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            to="/all-admissions"
            className="inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-gray-900 text-sm font-semibold border hover:bg-gray-50"
          >
            Back to All Admissions
          </Link>
          <Link
            to={`/single-admission/${id}`}
            className="inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-gray-900 text-sm font-semibold border hover:bg-gray-50"
          >
            View Admission
          </Link>
        </div>
      </div>
    </div>
  );
};

export default UpdateStudentAdmission;

