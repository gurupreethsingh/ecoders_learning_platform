import React, { useMemo, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import globalBackendRoute from "../../config/Config";

const ROUTES = {
  APPLY_INSTRUCTOR: `${globalBackendRoute}/api/instructors/apply`,
};

const defaultEducation = {
  degree: "",
  institute: "",
  fieldOfStudy: "",
  startYear: "",
  endYear: "",
  grade: "",
};

const defaultCertification = {
  name: "",
  issuer: "",
  credentialId: "",
  credentialUrl: "",
  issueDate: "",
  expiryDate: "",
};

const defaultAvailability = {
  dayOfWeek: "", // e.g., Monday
  startTime: "", // "09:00"
  endTime: "", // "17:00"
  mode: "Online", // Online | Offline | Hybrid
  timezone: "", // e.g., Asia/Kolkata
};

const defaultAddress = {
  line1: "",
  line2: "",
  city: "",
  state: "",
  country: "",
  postalCode: "",
};

const defaultForm = {
  // ---- Identity / Profile ----
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  avatarUrl: "",
  bio: "",
  gender: "prefer_not_to_say",
  dateOfBirth: "", // yyyy-mm-dd
  address: { ...defaultAddress },

  // ---- Arrays of strings (CSV in UI) ----
  languages: "",
  skills: "",
  areasOfExpertise: "",

  // ---- Arrays of objects ----
  education: [],
  certifications: [],
  availability: [],

  // ---- Numbers ----
  hourlyRate: "",

  // ---- Documents ----
  resumeUrl: "",
  idProofUrl: "",

  // ---- Social / Portfolio ----
  website: "",
  linkedin: "",
  github: "",
  youtube: "",
  twitter: "",

  // ---- Payouts ----
  upiId: "",
  payoutPreference: "UPI",
};

const ApplyToBecomeInstructor = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");

  const token = localStorage.getItem("token");
  const authHeader = token ? { Authorization: `Bearer ${token}` } : undefined;

  // ====== Helpers ======
  const csvToArray = (v) =>
    (v || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

  const safeNumber = (v) => {
    if (v === "" || v === null || typeof v === "undefined") return "";
    const n = Number(v);
    return Number.isNaN(n) ? "" : n;
  };

  const someAddressProvided = (addr = {}) =>
    Object.values(addr || {}).some((x) => String(x || "").trim().length > 0);

  // ====== Field Handlers ======
  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "hourlyRate") {
      setForm((p) => ({ ...p, [name]: safeNumber(value) }));
      return;
    }

    if (name === "dateOfBirth") {
      setForm((p) => ({ ...p, [name]: value }));
      return;
    }

    setForm((p) => ({ ...p, [name]: value }));
  };

  const handleAddressChange = (e) => {
    const { name, value } = e.target; // name like "line1", "city", etc.
    setForm((p) => ({ ...p, address: { ...p.address, [name]: value } }));
  };

  // ---------- Education ----------
  const addEducation = () =>
    setForm((p) => ({
      ...p,
      education: [...p.education, { ...defaultEducation }],
    }));

  const updateEducation = (idx, key, value) =>
    setForm((p) => {
      const education = [...p.education];
      education[idx] = { ...education[idx], [key]: value };
      return { ...p, education };
    });

  const removeEducation = (idx) =>
    setForm((p) => ({
      ...p,
      education: p.education.filter((_, i) => i !== idx),
    }));

  // ---------- Certification ----------
  const addCertification = () =>
    setForm((p) => ({
      ...p,
      certifications: [...p.certifications, { ...defaultCertification }],
    }));

  const updateCertification = (idx, key, value) =>
    setForm((p) => {
      const certifications = [...p.certifications];
      certifications[idx] = { ...certifications[idx], [key]: value };
      return { ...p, certifications };
    });

  const removeCertification = (idx) =>
    setForm((p) => ({
      ...p,
      certifications: p.certifications.filter((_, i) => i !== idx),
    }));

  // ---------- Availability ----------
  const addAvailability = () =>
    setForm((p) => ({
      ...p,
      availability: [...p.availability, { ...defaultAvailability }],
    }));

  const updateAvailability = (idx, key, value) =>
    setForm((p) => {
      const availability = [...p.availability];
      availability[idx] = { ...availability[idx], [key]: value };
      return { ...p, availability };
    });

  const removeAvailability = (idx) =>
    setForm((p) => ({
      ...p,
      availability: p.availability.filter((_, i) => i !== idx),
    }));

  // ====== Validation (basic) ======
  const emailRx = useMemo(() => /^\S+@\S+\.\S+$/, []);

  const errors = useMemo(() => {
    const errs = [];
    if (!String(form.firstName || "").trim())
      errs.push("Please provide your first name.");
    if (!String(form.lastName || "").trim())
      errs.push("Please provide your last name.");
    if (!String(form.email || "").trim() || !emailRx.test(form.email))
      errs.push("Please provide a valid email.");
    if (!csvToArray(form.languages).length)
      errs.push("Please provide at least one language.");
    if (!csvToArray(form.skills).length)
      errs.push("Please provide at least one skill.");
    if (!csvToArray(form.areasOfExpertise).length)
      errs.push("Please provide at least one area of expertise.");
    if (form.hourlyRate !== "" && Number(form.hourlyRate) < 0)
      errs.push("Hourly rate cannot be negative.");
    return errs;
  }, [form, emailRx]);

  // ====== Submit ======
  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatusMsg("");

    if (errors.length) {
      setStatusMsg(`❌ ${errors[0]}`);
      return;
    }

    setSaving(true);
    try {
      const addr = form.address || {};
      const addressPayload = someAddressProvided(addr)
        ? { ...addr }
        : undefined;

      const payload = {
        // ---- Identity / Profile ----
        firstName: form.firstName || undefined,
        lastName: form.lastName || undefined,
        email: (form.email || "").toLowerCase(),
        phone: form.phone || undefined,
        avatarUrl: form.avatarUrl || undefined,
        bio: form.bio || undefined,
        gender: form.gender || undefined,
        dateOfBirth: form.dateOfBirth || undefined, // backend converts

        address: addressPayload,

        // ---- Teaching profile ----
        languages: csvToArray(form.languages),
        skills: csvToArray(form.skills),
        areasOfExpertise: csvToArray(form.areasOfExpertise),

        // ---- Arrays of objects ----
        education: (form.education || []).map((ed) => ({
          degree: ed.degree || undefined,
          institute: ed.institute || undefined,
          fieldOfStudy: ed.fieldOfStudy || undefined,
          startYear: ed.startYear || undefined,
          endYear: ed.endYear || undefined,
          grade: ed.grade || undefined,
        })),
        certifications: (form.certifications || []).map((c) => ({
          name: c.name || undefined,
          issuer: c.issuer || undefined,
          credentialId: c.credentialId || undefined,
          credentialUrl: c.credentialUrl || undefined,
          issueDate: c.issueDate || undefined,
          expiryDate: c.expiryDate || undefined,
        })),
        availability: (form.availability || []).map((a) => ({
          dayOfWeek: a.dayOfWeek || undefined,
          startTime: a.startTime || undefined,
          endTime: a.endTime || undefined,
          mode: a.mode || undefined,
          timezone: a.timezone || undefined,
        })),

        // ---- Billing ----
        hourlyRate:
          form.hourlyRate === "" ? undefined : Number(form.hourlyRate),

        // ---- Documents ----
        resumeUrl: form.resumeUrl || undefined,
        idProofUrl: form.idProofUrl || undefined,

        // ---- Social ----
        website: form.website || undefined,
        linkedin: form.linkedin || undefined,
        github: form.github || undefined,
        youtube: form.youtube || undefined,
        twitter: form.twitter || undefined,

        // ---- Payouts ----
        upiId: form.upiId || undefined,
        payoutPreference: form.payoutPreference || "UPI",

        // (Optional) Relations you may add later:
        // degrees: [...],
        // semesters: [...],
        // courses: [...],
      };

      await axios.post(ROUTES.APPLY_INSTRUCTOR, payload, {
        headers: { "Content-Type": "application/json", ...(authHeader || {}) },
      });

      setStatusMsg("✅ Application submitted! We'll notify you after review.");
      setForm(defaultForm);
      // navigate("/dashboard"); // optional
    } catch (err) {
      console.error(err);
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err.message ||
        "Failed to submit application";
      setStatusMsg(`❌ ${msg}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-8">
      <h1 className="text-2xl font-semibold mb-6">
        Apply to Become an Instructor
      </h1>

      {statusMsg && (
        <div className="mb-4 rounded-lg border p-3 text-sm">{statusMsg}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Headnote */}
        <div className="text-sm text-gray-600">
          Fill your profile details below. You can update information later
          after approval.
        </div>

        {/* Identity */}
        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm mb-1">First Name *</label>
            <input
              name="firstName"
              value={form.firstName}
              onChange={handleChange}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="First name"
              required
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Last Name *</label>
            <input
              name="lastName"
              value={form.lastName}
              onChange={handleChange}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="Last name"
              required
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Email *</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="you@example.com"
              required
            />
          </div>
        </div>

        {/* Profile */}
        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm mb-1">Phone</label>
            <input
              name="phone"
              value={form.phone}
              onChange={handleChange}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="+91-XXXXXXXXXX"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Gender</label>
            <select
              name="gender"
              value={form.gender}
              onChange={handleChange}
              className="w-full border rounded-lg px-3 py-2"
            >
              <option value="prefer_not_to_say">Prefer not to say</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm mb-1">Date of Birth</label>
            <input
              type="date"
              name="dateOfBirth"
              value={form.dateOfBirth}
              onChange={handleChange}
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm mb-1">Avatar URL</label>
          <input
            name="avatarUrl"
            value={form.avatarUrl}
            onChange={handleChange}
            className="w-full border rounded-lg px-3 py-2"
            placeholder="https://..."
          />
        </div>

        <div>
          <label className="block text-sm mb-1">Short Bio</label>
          <textarea
            name="bio"
            value={form.bio}
            onChange={handleChange}
            className="w-full border rounded-lg px-3 py-2"
            rows={3}
            placeholder="Tell us about your experience, interests, and teaching style..."
          />
        </div>

        {/* Address */}
        <div>
          <h2 className="text-lg font-medium mb-2">Address</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <input
              name="line1"
              value={form.address.line1}
              onChange={handleAddressChange}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="Address line 1"
            />
            <input
              name="line2"
              value={form.address.line2}
              onChange={handleAddressChange}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="Address line 2 (optional)"
            />
            <input
              name="city"
              value={form.address.city}
              onChange={handleAddressChange}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="City"
            />
            <input
              name="state"
              value={form.address.state}
              onChange={handleAddressChange}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="State"
            />
            <input
              name="country"
              value={form.address.country}
              onChange={handleAddressChange}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="Country"
            />
            <input
              name="postalCode"
              value={form.address.postalCode}
              onChange={handleAddressChange}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="Postal code"
            />
          </div>
        </div>

        {/* Row: Languages / Skills / Expertise */}
        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm mb-1">
              Languages (comma-separated) *
            </label>
            <input
              name="languages"
              value={form.languages}
              onChange={handleChange}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="English, Hindi, Kannada"
              required
            />
          </div>
          <div>
            <label className="block text-sm mb-1">
              Skills (comma-separated) *
            </label>
            <input
              name="skills"
              value={form.skills}
              onChange={handleChange}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="Java, React, Data Structures"
              required
            />
          </div>
          <div>
            <label className="block text-sm mb-1">
              Areas of Expertise (comma-separated) *
            </label>
            <input
              name="areasOfExpertise"
              value={form.areasOfExpertise}
              onChange={handleChange}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="Backend, Algorithms, Cloud"
              required
            />
          </div>
        </div>

        {/* Hourly Rate */}
        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm mb-1">Hourly Rate (₹/hr)</label>
            <input
              type="number"
              name="hourlyRate"
              value={form.hourlyRate}
              onChange={handleChange}
              className="w-full border rounded-lg px-3 py-2"
              min={0}
              step="0.5"
              placeholder="e.g., 1000"
            />
          </div>
        </div>

        {/* Documents */}
        <div>
          <h2 className="text-lg font-medium mb-2">Documents</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <input
              name="resumeUrl"
              value={form.resumeUrl}
              onChange={handleChange}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="Resume URL (Drive / public link)"
            />
            <input
              name="idProofUrl"
              value={form.idProofUrl}
              onChange={handleChange}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="ID Proof URL (Aadhaar/Passport - masked)"
            />
          </div>
        </div>

        {/* Social & Portfolio */}
        <div>
          <h2 className="text-lg font-medium mb-2">Social & Portfolio</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <input
              name="website"
              value={form.website}
              onChange={handleChange}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="Website / Portfolio URL"
            />
            <input
              name="linkedin"
              value={form.linkedin}
              onChange={handleChange}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="LinkedIn URL"
            />
            <input
              name="github"
              value={form.github}
              onChange={handleChange}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="GitHub URL"
            />
            <input
              name="youtube"
              value={form.youtube}
              onChange={handleChange}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="YouTube Channel URL"
            />
            <input
              name="twitter"
              value={form.twitter}
              onChange={handleChange}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="Twitter URL"
            />
          </div>
        </div>

        {/* Payouts */}
        <div>
          <h2 className="text-lg font-medium mb-2">Payout Preferences</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <input
              name="upiId"
              value={form.upiId}
              onChange={handleChange}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="UPI ID (e.g., name@upi)"
            />
            <select
              name="payoutPreference"
              value={form.payoutPreference}
              onChange={handleChange}
              className="w-full border rounded-lg px-3 py-2"
            >
              <option value="UPI">UPI</option>
              <option value="BankTransfer">BankTransfer</option>
              <option value="PayPal">PayPal</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>

        {/* Education */}
        <div>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">Education</h2>
            <button
              type="button"
              onClick={addEducation}
              className="px-3 py-1 rounded-lg border hover:bg-gray-50"
            >
              + Add Education
            </button>
          </div>

          {form.education.length === 0 && (
            <p className="text-sm text-gray-500 mt-2">
              No education added yet.
            </p>
          )}

          <div className="space-y-4 mt-3">
            {form.education.map((ed, idx) => (
              <div key={idx} className="border rounded-xl p-4">
                <div className="grid md:grid-cols-3 gap-4">
                  <input
                    value={ed.degree}
                    onChange={(e) =>
                      updateEducation(idx, "degree", e.target.value)
                    }
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="Degree (e.g., B.Tech)"
                  />
                  <input
                    value={ed.institute}
                    onChange={(e) =>
                      updateEducation(idx, "institute", e.target.value)
                    }
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="Institute/University"
                  />
                  <input
                    value={ed.fieldOfStudy}
                    onChange={(e) =>
                      updateEducation(idx, "fieldOfStudy", e.target.value)
                    }
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="Field of study (e.g., CSE)"
                  />
                  <input
                    value={ed.startYear}
                    onChange={(e) =>
                      updateEducation(idx, "startYear", e.target.value)
                    }
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="Start Year"
                  />
                  <input
                    value={ed.endYear}
                    onChange={(e) =>
                      updateEducation(idx, "endYear", e.target.value)
                    }
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="End Year"
                  />
                  <input
                    value={ed.grade}
                    onChange={(e) =>
                      updateEducation(idx, "grade", e.target.value)
                    }
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="Grade / CGPA (optional)"
                  />
                </div>

                <div className="mt-2">
                  <button
                    type="button"
                    onClick={() => removeEducation(idx)}
                    className="text-sm text-red-600 hover:underline"
                  >
                    Remove Education
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Certifications */}
        <div>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">Certifications</h2>
            <button
              type="button"
              onClick={addCertification}
              className="px-3 py-1 rounded-lg border hover:bg-gray-50"
            >
              + Add Certification
            </button>
          </div>

          {form.certifications.length === 0 && (
            <p className="text-sm text-gray-500 mt-2">No certifications yet.</p>
          )}

          <div className="space-y-4 mt-3">
            {form.certifications.map((c, idx) => (
              <div key={idx} className="border rounded-xl p-4">
                <div className="grid md:grid-cols-3 gap-4">
                  <input
                    value={c.name}
                    onChange={(e) =>
                      updateCertification(idx, "name", e.target.value)
                    }
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="Certification Name"
                  />
                  <input
                    value={c.issuer}
                    onChange={(e) =>
                      updateCertification(idx, "issuer", e.target.value)
                    }
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="Issuer (e.g., Coursera)"
                  />
                  <input
                    value={c.credentialId}
                    onChange={(e) =>
                      updateCertification(idx, "credentialId", e.target.value)
                    }
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="Credential ID (optional)"
                  />
                  <input
                    value={c.credentialUrl}
                    onChange={(e) =>
                      updateCertification(idx, "credentialUrl", e.target.value)
                    }
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="Credential URL (optional)"
                  />
                  <input
                    type="date"
                    value={c.issueDate}
                    onChange={(e) =>
                      updateCertification(idx, "issueDate", e.target.value)
                    }
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="Issue Date"
                  />
                  <input
                    type="date"
                    value={c.expiryDate}
                    onChange={(e) =>
                      updateCertification(idx, "expiryDate", e.target.value)
                    }
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="Expiry Date (optional)"
                  />
                </div>

                <div className="mt-2">
                  <button
                    type="button"
                    onClick={() => removeCertification(idx)}
                    className="text-sm text-red-600 hover:underline"
                  >
                    Remove Certification
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Availability */}
        <div>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">Availability</h2>
            <button
              type="button"
              onClick={addAvailability}
              className="px-3 py-1 rounded-lg border hover:bg-gray-50"
            >
              + Add Slot
            </button>
          </div>

          {form.availability.length === 0 && (
            <p className="text-sm text-gray-500 mt-2">
              No availability slots yet.
            </p>
          )}

          <div className="space-y-4 mt-3">
            {form.availability.map((a, idx) => (
              <div key={idx} className="border rounded-xl p-4">
                <div className="grid md:grid-cols-5 gap-4">
                  <select
                    value={a.dayOfWeek}
                    onChange={(e) =>
                      updateAvailability(idx, "dayOfWeek", e.target.value)
                    }
                    className="w-full border rounded-lg px-3 py-2"
                  >
                    <option value="">Day of Week</option>
                    {[
                      "Monday",
                      "Tuesday",
                      "Wednesday",
                      "Thursday",
                      "Friday",
                      "Saturday",
                      "Sunday",
                    ].map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                  <input
                    type="time"
                    value={a.startTime}
                    onChange={(e) =>
                      updateAvailability(idx, "startTime", e.target.value)
                    }
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="Start"
                  />
                  <input
                    type="time"
                    value={a.endTime}
                    onChange={(e) =>
                      updateAvailability(idx, "endTime", e.target.value)
                    }
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="End"
                  />
                  <select
                    value={a.mode}
                    onChange={(e) =>
                      updateAvailability(idx, "mode", e.target.value)
                    }
                    className="w-full border rounded-lg px-3 py-2"
                  >
                    <option>Online</option>
                    <option>Offline</option>
                    <option>Hybrid</option>
                  </select>
                  <input
                    value={a.timezone}
                    onChange={(e) =>
                      updateAvailability(idx, "timezone", e.target.value)
                    }
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="Timezone (e.g., Asia/Kolkata)"
                  />
                </div>

                <div className="mt-2">
                  <button
                    type="button"
                    onClick={() => removeAvailability(idx)}
                    className="text-sm text-red-600 hover:underline"
                  >
                    Remove Slot
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2 rounded-lg bg-black text-white hover:opacity-90 disabled:opacity-60"
          >
            {saving ? "Submitting…" : "Submit Application"}
          </button>
          <span className="text-sm text-gray-500">
            Tip: Add links to your resume and portfolio for quicker approval.
          </span>
        </div>
      </form>
    </div>
  );
};

export default ApplyToBecomeInstructor;
