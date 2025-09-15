import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import globalBackendRoute from "@/config/Config.js";

/** ---------- small utils ---------- */
const toAY = (d = new Date()) => {
  // Academic year: if month >= April (3), AY is YYYY-(YY+1), else (YYYY-1)-YY
  const m = d.getMonth(); // 0-based
  const y = d.getFullYear();
  const start = m >= 3 ? y : y - 1;
  const end2 = String((start + 1) % 100).padStart(2, "0");
  return `${start}-${end2}`;
};

const splitName = (full = "") => {
  const parts = String(full).trim().split(/\s+/);
  if (parts.length === 0) return { first: "", last: "" };
  if (parts.length === 1) return { first: parts[0], last: "" };
  return { first: parts.slice(0, -1).join(" "), last: parts.slice(-1).join(" ") };
};

const coerce = (v) => (v == null ? "" : v);

const CreateAdmission = () => {
  const navigate = useNavigate();

  // ---------- lists ----------
  const [students, setStudents] = useState([]);
  const [degrees, setDegrees] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [courses, setCourses] = useState([]);

  // ---------- selections ----------
  const [studentId, setStudentId] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);

  const [degreeId, setDegreeId] = useState("");
  const [semesterId, setSemesterId] = useState("");
  const [courseId, setCourseId] = useState("");

  // ---------- form ----------
  const [academicYear, setAcademicYear] = useState(toAY());
  const [preferredBatch, setPreferredBatch] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(true);

  // auto-filled identity fields (editable)
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName]   = useState("");
  const [email, setEmail]         = useState("");
  const [phone, setPhone]         = useState("");

  // addresses: map user.address.{street,city,...} -> admission.address.{line1,...}
  const [address, setAddress] = useState({
    line1: "",
    line2: "",
    city: "",
    state: "",
    country: "",
    postalCode: "",
  });
  const [permanentAddress, setPermanentAddress] = useState({
    line1: "",
    line2: "",
    city: "",
    state: "",
    country: "",
    postalCode: "",
  });

  // ---------- UI state ----------
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [loadingDegrees, setLoadingDegrees] = useState(true);
  const [loadingSemesters, setLoadingSemesters] = useState(false);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [successText, setSuccessText] = useState("");

  /** ---------- load degrees (dropdown only) ---------- */
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await axios.get(`${globalBackendRoute}/api/list-degrees`, {
          params: { page: 1, limit: 500, sortBy: "createdAt", sortDir: "desc" },
        });
        const list = res?.data?.data || res?.data || [];
        if (!alive) return;
        setDegrees(Array.isArray(list) ? list : []);
      } catch (err) {
        console.error("Failed to load degrees:", err);
      } finally {
        if (alive) setLoadingDegrees(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  /** ---------- load students who DO NOT have an active admission ---------- */
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoadingStudents(true);
      try {
        // 1) get all students
        const stuRes = await axios.get(`${globalBackendRoute}/api/get-students`, {
          params: { page: 1, limit: 5000 },
        });
        const allStudents = Array.isArray(stuRes?.data?.data)
          ? stuRes.data.data
          : Array.isArray(stuRes?.data)
          ? stuRes.data
          : [];

        // 2) get admissions (exclude withdrawn/deleted)
        const admRes = await axios.get(`${globalBackendRoute}/api/list-admissions`, {
          params: { page: 1, limit: 5000, sortBy: "createdAt", sortDir: "desc" },
        });
        const allAdmissions = Array.isArray(admRes?.data?.data)
          ? admRes.data.data
          : Array.isArray(admRes?.data)
          ? admRes.data
          : [];

        const activeUserIds = new Set(
          allAdmissions
            .filter(a => a && a.applicationStatus !== "withdrawn" && a.isDeleted !== true)
            .map(a => String(a.user?._id || a.user))
            .filter(Boolean)
        );

        const notAdmitted = allStudents.filter(u => !activeUserIds.has(String(u._id || u.id)));

        if (!alive) return;
        setStudents(
          notAdmitted.map(u => ({
            _id: u._id || u.id,
            name: u.name || `${u.firstName || ""} ${u.lastName || ""}`.trim(),
            email: u.email,
            phone: u.phone,
            avatar: u.avatar,
            role: u.role,
            address: u.address || {},
          }))
        );
      } catch (err) {
        console.error("Failed to load students/admissions:", err);
        if (alive) setStudents([]);
      } finally {
        if (alive) setLoadingStudents(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  /** ---------- when student is selected, prefill identity + addresses ---------- */
  useEffect(() => {
    if (!studentId) {
      setSelectedUser(null);
      setFirstName(""); setLastName(""); setEmail(""); setPhone("");
      setAddress({ line1: "", line2: "", city: "", state: "", country: "", postalCode: ""});
      setPermanentAddress({ line1: "", line2: "", city: "", state: "", country: "", postalCode: ""});
      return;
    }
    const u = students.find(s => String(s._id) === String(studentId));
    if (!u) return;

    setSelectedUser(u);
    const { first, last } = splitName(u?.name || "");
    setFirstName(first);
    setLastName(last);
    setEmail(coerce(u?.email));
    setPhone(coerce(u?.phone));

    const a = u?.address || {};
    const baseAddr = {
      line1: coerce(a.street),
      line2: "",
      city: coerce(a.city),
      state: coerce(a.state),
      country: coerce(a.country),
      postalCode: coerce(a.postalCode),
    };
    setAddress(baseAddr);
    setPermanentAddress(baseAddr);
  }, [studentId, students]);

  /** ---------- fetch semesters for selected degree ---------- */
  useEffect(() => {
    setSemesters([]);
    setSemesterId("");
    if (!degreeId) return;
    let alive = true;

    (async () => {
      setLoadingSemesters(true);
      try {
        const res = await axios.get(`${globalBackendRoute}/api/semesters`, {
          params: { page: 1, limit: 200, degree: degreeId },
        });
        const list = res?.data?.data || res?.data || [];
        if (!alive) return;
        setSemesters(Array.isArray(list) ? list : []);
      } catch (err) {
        console.warn("Fetching semesters with degree filter failed; falling back to all:", err?.response?.status);
        try {
          const res2 = await axios.get(`${globalBackendRoute}/api/semesters`, {
            params: { page: 1, limit: 200 },
          });
          const list2 = res2?.data?.data || res2?.data || [];
          if (!alive) return;
          const filtered = Array.isArray(list2)
            ? list2.filter(s => {
                const did = s?.degree?._id || s?.degree || "";
                return String(did) === String(degreeId);
              })
            : [];
          setSemesters(filtered.length ? filtered : (Array.isArray(list2) ? list2 : []));
        } catch (e2) {
          if (!alive) return;
          console.error("Failed to load semesters:", e2);
          setSemesters([]);
        }
      } finally {
        if (alive) setLoadingSemesters(false);
      }
    })();

    return () => { alive = false; };
  }, [degreeId]);

  /** ---------- fetch courses for selected degree/semester (best-effort) ---------- */
  useEffect(() => {
    setCourses([]);
    setCourseId("");
    if (!degreeId) return;
    let alive = true;

    (async () => {
      setLoadingCourses(true);
      try {
        const params = { page: 1, limit: 200, sortBy: "createdAt", sortDir: "desc", degree: degreeId };
        if (semesterId) params.semester = semesterId;

        const res = await axios.get(`${globalBackendRoute}/api/list-courses`, { params });
        const list = res?.data?.data || res?.data || [];
        if (!alive) return;

        let arr = Array.isArray(list) ? list : [];
        arr = arr.filter(c => {
          const dOk = c.degree?._id ? String(c.degree._id) === String(degreeId)
                    : c.degree ? String(c.degree) === String(degreeId) : true;
          const sOk = !semesterId
            ? true
            : c.semester?._id
              ? String(c.semester._id) === String(semesterId)
              : c.semester
                ? String(c.semester) === String(semesterId)
                : false;
          return dOk && sOk;
        });

        setCourses(arr);
      } catch (err) {
        console.error("Failed to load courses:", err);
        if (alive) setCourses([]);
      } finally {
        if (alive) setLoadingCourses(false);
      }
    })();

    return () => { alive = false; };
  }, [degreeId, semesterId]);

  /** ---------- submit ---------- */
  const onSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorText("");
    setSuccessText("");

    try {
      if (!studentId) {
        setSubmitting(false);
        return setErrorText("Please select a student.");
      }
      if (!degreeId) {
        setSubmitting(false);
        return setErrorText("Please select a degree.");
      }
      if (!academicYear.trim()) {
        setSubmitting(false);
        return setErrorText("Please provide academic year (e.g., 2025-26).");
      }
      if (!termsAccepted) {
        setSubmitting(false);
        return setErrorText("Please accept the terms to proceed.");
      }

      const payload = {
        user: studentId,                 // link existing student by user _id
        email,                           // controller accepts either; safe to include
        firstName,
        lastName,
        phone,
        address,
        permanentAddress,
        intendedEnrollment: {
          academicYear,
          degree: degreeId,
          semester: semesterId || undefined,
          course: courseId || undefined,
          preferredBatch: preferredBatch || undefined,
        },
        termsAccepted: true,
      };

      const res = await axios.post(`${globalBackendRoute}/api/create-admission`, payload);
      const doc = res?.data?.data;

      setSuccessText("Admission created successfully.");
      // ✅ show alert for success
      window.alert("✅ Admission created successfully.");

      // NOTE: no navigation after success (per your request)
      // if (doc?._id) navigate(`/single-admission/${doc._id}`);

    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to create admission.";
      setErrorText(msg);
      // ✅ show alert for error
      window.alert(`❌ ${msg}`);
    } finally {
      setSubmitting(false);
    }
  };

  /** ---------- UI ---------- */
  const Req = () => <span className="text-red-600">*</span>;

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">Create Admission</h1>

      {errorText && (
        <div className="mb-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-red-700">
          {errorText}
        </div>
      )}
      {successText && (
        <div className="mb-4 rounded border border-green-200 bg-green-50 px-4 py-3 text-green-700">
          {successText}
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-8">
        {/* Student selection (dropdown only) */}
        <section className="rounded-lg border bg-white p-4 shadow-sm">
          <h2 className="font-semibold mb-3">Select Student</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Student (no active admissions) <Req />
              </label>
              <select
                className="w-full rounded border px-3 py-2"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                disabled={loadingStudents}
                required
              >
                <option value="">
                  {loadingStudents ? "Loading students..." : "-- Select Student --"}
                </option>
                {students.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name || s.email} {s.email ? `— ${s.email}` : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Identity fields (auto-filled, editable) */}
            <div>
              <label className="block text-sm font-medium mb-1">
                First Name <Req />
              </label>
              <input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full rounded border px-3 py-2"
                placeholder="First name"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Last Name <Req />
              </label>
              <input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full rounded border px-3 py-2"
                placeholder="Last name"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Email <Req />
              </label>
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
              <label className="block text-sm font-medium mb-1">Phone</label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded border px-3 py-2"
                placeholder="Phone"
              />
            </div>
          </div>

          {/* Address */}
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <h3 className="font-medium mb-2">Current Address</h3>
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
            <div>
              <h3 className="font-medium mb-2">Permanent Address</h3>
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

        {/* Enrollment section */}
        <section className="rounded-lg border bg-white p-4 shadow-sm">
          <h2 className="font-semibold mb-3">Enrollment</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Degree (required) */}
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-1">
                Degree <span className="text-red-600">*</span>
              </label>
              <select
                className="w-full rounded border px-3 py-2"
                value={degreeId}
                onChange={(e) => setDegreeId(e.target.value)}
                disabled={loadingDegrees}
                required
              >
                <option value="">
                  {loadingDegrees ? "Loading degrees..." : "-- Select Degree --"}
                </option>
                {degrees.map((d) => (
                  <option key={d._id || d.id} value={d._id || d.id}>
                    {d.name} {d.code ? `(${d.code})` : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Semester (optional) */}
            <div>
              <label className="block text-sm font-medium mb-1">Semester (optional)</label>
              <select
                className="w-full rounded border px-3 py-2"
                value={semesterId}
                onChange={(e) => setSemesterId(e.target.value)}
                disabled={!degreeId || loadingSemesters || semesters.length === 0}
              >
                <option value="">
                  {loadingSemesters ? "Loading…" : "-- Select Semester --"}
                </option>
                {semesters.map((s) => (
                  <option key={s._id || s.id} value={s._id || s.id}>
                    {s.semester_name || s.title || (s.semNumber ? `Semester ${s.semNumber}` : "Semester")}
                  </option>
                ))}
              </select>
            </div>

            {/* Course (optional) */}
            <div>
              <label className="block text-sm font-medium mb-1">Course (optional)</label>
              <select
                className="w-full rounded border px-3 py-2"
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
                disabled={!degreeId || loadingCourses || courses.length === 0}
              >
                <option value="">
                  {loadingCourses ? "Loading…" : "-- Select Course --"}
                </option>
                {courses.map((c) => (
                  <option key={c._id || c.id} value={c._id || c.id}>
                    {c.title || c.name || "Untitled"}
                  </option>
                ))}
              </select>
            </div>

            {/* Academic Year (required) */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Academic Year <span className="text-red-600">*</span>
              </label>
              <input
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                className="w-full rounded border px-3 py-2"
                placeholder="e.g., 2025-26"
                required
              />
            </div>

            {/* Preferred Batch */}
            <div>
              <label className="block text-sm font-medium mb-1">Preferred Batch (optional)</label>
              <input
                value={preferredBatch}
                onChange={(e) => setPreferredBatch(e.target.value)}
                className="w-full rounded border px-3 py-2"
                placeholder="Batch name/code"
              />
            </div>
          </div>

          {/* Terms (required) */}
          <div className="mt-4">
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                className="h-4 w-4"
                required
              />
              <span className="text-sm">
                I confirm the details are correct and terms are accepted <span className="text-red-600">*</span>
              </span>
            </label>
          </div>
        </section>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={submitting}
            className={`rounded bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 disabled:opacity-60`}
          >
            {submitting ? "Creating…" : "Create Admission"}
          </button>
          <button
            type="button"
            onClick={() => navigate("/all-admissions")}
            className="rounded border px-4 py-2 hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateAdmission;
