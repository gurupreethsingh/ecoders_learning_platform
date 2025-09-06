// src/pages/instructors/UpdateInstructor.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import axios from "axios";
import globalBackendRoute from "../../config/Config";
import { motion } from "framer-motion";
import { FaSave, FaTimes, FaArrowLeft } from "react-icons/fa";

/* ---------- utils ---------- */
const isHex24 = (s) => typeof s === "string" && /^[a-fA-F0-9]{24}$/.test(s);
const prettyDate = (d) => (d ? new Date(d).toLocaleString() : "-");
const slugify = (s = "") =>
  s
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const field = (obj, k, def = "") => obj?.[k] ?? def;

/* ================================= COMPONENT ================================ */
export default function UpdateInstructor() {
  // 👈 MUST match your route: /update-instructor/:slug/:id
  const { slug, id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadErr, setLoadErr] = useState("");
  const [saveErr, setSaveErr] = useState("");
  const [okMsg, setOkMsg] = useState("");

  // working copy used by the form
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    avatarUrl: "",
    bio: "",
    gender: "",
    dateOfBirth: "",
    hourlyRate: "",
    website: "",
    linkedin: "",
    github: "",
    youtube: "",
    twitter: "",
    upiId: "",
    payoutPreference: "UPI",
    isActive: true,
    isEmailVerified: false,
    isKycVerified: false,
    applicationStatus: "pending",
  });

  // guards
  if (!id || !isHex24(id)) {
    return <div className="text-center py-8">Invalid URL.</div>;
  }

  /* ================================ FETCH ONE =============================== */
  useEffect(() => {
    let alive = true;
    const ctrl = new AbortController();

    (async () => {
      setLoading(true);
      setLoadErr("");
      setOkMsg("");

      try {
        const url = `${globalBackendRoute}/api/instructors/get-by-id/${id}`;
        const res = await axios.get(url, { signal: ctrl.signal });
        const doc = res?.data?.data;

        if (!alive) return;

        if (!doc) {
          setLoadErr("Instructor not found.");
          setLoading(false);
          return;
        }

        // prefill form (only the fields you expose in PATCH)
        setForm({
          firstName: field(doc, "firstName"),
          lastName: field(doc, "lastName"),
          email: field(doc, "email"),
          phone: field(doc, "phone"),
          avatarUrl: field(doc, "avatarUrl"),
          bio: field(doc, "bio"),
          gender: field(doc, "gender"),
          dateOfBirth: doc?.dateOfBirth ? doc.dateOfBirth.slice(0, 10) : "",
          hourlyRate:
            typeof doc?.hourlyRate === "number" ? String(doc.hourlyRate) : "",
          website: field(doc, "website"),
          linkedin: field(doc, "linkedin"),
          github: field(doc, "github"),
          youtube: field(doc, "youtube"),
          twitter: field(doc, "twitter"),
          upiId: field(doc, "upiId"),
          payoutPreference: field(doc, "payoutPreference", "UPI"),
          isActive: !!doc?.isActive,
          isEmailVerified: !!doc?.isEmailVerified,
          isKycVerified: !!doc?.isKycVerified,
          applicationStatus: field(doc, "applicationStatus", "pending"),
        });

        // if slug is stale, you *could* redirect to canonical route (optional)
        const canonicalSlug = slugify(
          `${doc?.firstName || ""} ${doc?.lastName || ""}`.trim() ||
            "instructor"
        );
        if (slug && slug !== canonicalSlug) {
          navigate(`/update-instructor/${canonicalSlug}/${id}`, {
            replace: true,
          });
        }
      } catch (e) {
        if (!alive) return;
        setLoadErr(
          e?.response?.data?.message || e?.message || "Failed to load."
        );
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
      ctrl.abort();
    };
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ================================== SAVE ================================= */
  const onChange = (k) => (e) => {
    const v =
      e?.target?.type === "checkbox" ? e.target.checked : e?.target?.value;
    setForm((f) => ({ ...f, [k]: v }));
  };

  const submit = async (e) => {
    e?.preventDefault?.();
    setSaving(true);
    setSaveErr("");
    setOkMsg("");

    try {
      const url = `${globalBackendRoute}/api/instructors/update/${id}`;
      // build patch object with only allowed fields (matches your controller)
      const payload = {
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        phone: form.phone,
        avatarUrl: form.avatarUrl,
        bio: form.bio,
        gender: form.gender,
        dateOfBirth: form.dateOfBirth || undefined,
        hourlyRate:
          form.hourlyRate === "" ? undefined : Number(form.hourlyRate),
        website: form.website,
        linkedin: form.linkedin,
        github: form.github,
        youtube: form.youtube,
        twitter: form.twitter,
        upiId: form.upiId,
        payoutPreference: form.payoutPreference || "UPI",
        isActive: !!form.isActive,
        isEmailVerified: !!form.isEmailVerified,
        isKycVerified: !!form.isKycVerified,
        applicationStatus: form.applicationStatus || "pending",
        // (languages/skills/etc. not shown here, but you can add them)
      };

      const res = await axios.patch(url, payload, {
        validateStatus: (s) => s >= 200 && s < 300,
      });

      const updated = res?.data?.data;
      setOkMsg("Saved successfully.");
      // keep form in sync (use returned doc)
      if (updated?._id) {
        setForm((f) => ({
          ...f,
          firstName: field(updated, "firstName"),
          lastName: field(updated, "lastName"),
          email: field(updated, "email"),
          phone: field(updated, "phone"),
          avatarUrl: field(updated, "avatarUrl"),
          bio: field(updated, "bio"),
          gender: field(updated, "gender"),
          dateOfBirth: updated?.dateOfBirth
            ? updated.dateOfBirth.slice(0, 10)
            : "",
          hourlyRate:
            typeof updated?.hourlyRate === "number"
              ? String(updated.hourlyRate)
              : "",
          website: field(updated, "website"),
          linkedin: field(updated, "linkedin"),
          github: field(updated, "github"),
          youtube: field(updated, "youtube"),
          twitter: field(updated, "twitter"),
          upiId: field(updated, "upiId"),
          payoutPreference: field(updated, "payoutPreference", "UPI"),
          isActive: !!updated?.isActive,
          isEmailVerified: !!updated?.isEmailVerified,
          isKycVerified: !!updated?.isKycVerified,
          applicationStatus: field(updated, "applicationStatus", "pending"),
        }));
      }
    } catch (e) {
      setSaveErr(
        e?.response?.data?.message || e?.message || "Failed to save instructor."
      );
    } finally {
      setSaving(false);
    }
  };

  /* ================================= RENDER ================================ */
  if (loading) return <div className="text-center py-8">Loading…</div>;
  if (loadErr)
    return (
      <div className="max-w-xl mx-auto py-8 text-center">
        <div className="text-red-600 font-medium mb-2">{loadErr}</div>
        <Link
          to="/all-instructors"
          className="inline-flex items-center gap-2 px-4 py-2 rounded border hover:bg-gray-50"
        >
          <FaArrowLeft /> Back to All Instructors
        </Link>
      </div>
    );

  const title =
    `${form.firstName || ""} ${form.lastName || ""}`.trim() || "Instructor";

  return (
    <motion.div
      className="containerWidth my-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35 }}
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Update: {title}</h2>
        <Link
          to={`/single-instructor/${id}/${slugify(title)}`}
          className="text-sm text-indigo-600 hover:underline"
        >
          View details
        </Link>
      </div>

      {(okMsg || saveErr) && (
        <div className="mb-4">
          {okMsg ? (
            <div className="rounded-md bg-green-50 text-green-800 px-3 py-2 text-sm">
              {okMsg}
            </div>
          ) : null}
          {saveErr ? (
            <div className="rounded-md bg-rose-50 text-rose-700 px-3 py-2 text-sm">
              {saveErr}
            </div>
          ) : null}
        </div>
      )}

      <form
        onSubmit={submit}
        className="grid grid-cols-1 md:grid-cols-2 gap-4 border rounded-lg p-4 bg-white"
      >
        {/* Left column */}
        <div className="space-y-3">
          <Field
            label="First Name"
            value={form.firstName}
            onChange={onChange("firstName")}
          />
          <Field
            label="Last Name"
            value={form.lastName}
            onChange={onChange("lastName")}
          />
          <Field
            label="Email"
            type="email"
            value={form.email}
            onChange={onChange("email")}
          />
          <Field
            label="Phone"
            value={form.phone}
            onChange={onChange("phone")}
          />
          <Field
            label="Gender"
            value={form.gender}
            onChange={onChange("gender")}
            placeholder="male | female | other"
          />
          <Field
            label="Date of Birth"
            type="date"
            value={form.dateOfBirth}
            onChange={onChange("dateOfBirth")}
          />
          <Field
            label="Hourly Rate"
            type="number"
            step="1"
            value={form.hourlyRate}
            onChange={onChange("hourlyRate")}
          />
          <Field
            label="Avatar URL"
            value={form.avatarUrl}
            onChange={onChange("avatarUrl")}
          />
          <TextArea label="Bio" value={form.bio} onChange={onChange("bio")} />
        </div>

        {/* Right column */}
        <div className="space-y-3">
          <Field
            label="Website"
            value={form.website}
            onChange={onChange("website")}
          />
          <Field
            label="LinkedIn"
            value={form.linkedin}
            onChange={onChange("linkedin")}
          />
          <Field
            label="GitHub"
            value={form.github}
            onChange={onChange("github")}
          />
          <Field
            label="YouTube"
            value={form.youtube}
            onChange={onChange("youtube")}
          />
          <Field
            label="Twitter"
            value={form.twitter}
            onChange={onChange("twitter")}
          />
          <Field
            label="UPI ID"
            value={form.upiId}
            onChange={onChange("upiId")}
          />
          <Select
            label="Payout Preference"
            value={form.payoutPreference}
            onChange={onChange("payoutPreference")}
            options={["UPI", "Bank", "PayPal"]}
          />
          <Select
            label="Application Status"
            value={form.applicationStatus}
            onChange={onChange("applicationStatus")}
            options={["pending", "approved", "rejected", "deleted"]}
          />

          <div className="grid grid-cols-2 gap-3 pt-2">
            <Checkbox
              label="Active"
              checked={form.isActive}
              onChange={onChange("isActive")}
            />
            <Checkbox
              label="Email Verified"
              checked={form.isEmailVerified}
              onChange={onChange("isEmailVerified")}
            />
            <Checkbox
              label="KYC Verified"
              checked={form.isKycVerified}
              onChange={onChange("isKycVerified")}
            />
          </div>

          <div className="text-xs text-gray-500 pt-2">
            <div>
              Instructor ID: <code>{id}</code>
            </div>
            <div>
              Last updated at: <em>{prettyDate(new Date())}</em>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="md:col-span-2 flex items-center justify-end gap-2 pt-2">
          <Link
            to={`/single-instructor/${id}/${slugify(title)}`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded border hover:bg-gray-50"
          >
            <FaArrowLeft /> Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded text-white ${
              saving ? "bg-gray-400" : "bg-indigo-600 hover:bg-indigo-500"
            }`}
          >
            {saving ? (
              <>
                <FaTimes className="opacity-0" />
                Saving…
              </>
            ) : (
              <>
                <FaSave /> Save
              </>
            )}
          </button>
        </div>
      </form>
    </motion.div>
  );
}

/* =============================== SMALL PARTS =============================== */
function Field({ label, type = "text", value, onChange, placeholder }) {
  return (
    <label className="block">
      <span className="text-sm text-gray-700">{label}</span>
      <input
        type={type}
        value={value ?? ""}
        onChange={onChange}
        placeholder={placeholder}
        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm"
      />
    </label>
  );
}

function TextArea({ label, value, onChange, rows = 4 }) {
  return (
    <label className="block">
      <span className="text-sm text-gray-700">{label}</span>
      <textarea
        value={value ?? ""}
        onChange={onChange}
        rows={rows}
        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm"
      />
    </label>
  );
}

function Checkbox({ label, checked, onChange }) {
  return (
    <label className="inline-flex items-center gap-2 text-sm text-gray-700">
      <input
        type="checkbox"
        checked={!!checked}
        onChange={onChange}
        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
      />
      {label}
    </label>
  );
}

function Select({ label, value, onChange, options = [] }) {
  const opts = useMemo(
    () =>
      options.map((o) => (typeof o === "string" ? { value: o, label: o } : o)),
    [options]
  );

  return (
    <label className="block">
      <span className="text-sm text-gray-700">{label}</span>
      <select
        value={value ?? ""}
        onChange={onChange}
        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm"
      >
        {opts.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
