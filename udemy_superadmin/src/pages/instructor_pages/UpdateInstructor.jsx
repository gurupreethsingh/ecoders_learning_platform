import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import axios from "axios";
import globalBackendRoute from "@/config/Config.js";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaSave,
  FaTimes,
  FaArrowLeft,
  FaIdBadge,
  FaCheck,
  FaExclamationTriangle,
} from "react-icons/fa";

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

/* ---------- shared UI primitives ---------- */
function Field({ label, type = "text", value, onChange, placeholder }) {
  return (
    <label className="block">
      <span className="text-sm text-gray-700">{label}</span>
      <input
        type={type}
        value={value ?? ""}
        onChange={onChange}
        placeholder={placeholder}
        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-gray-900 focus:ring-gray-900/20 text-sm"
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
        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-gray-900 focus:ring-gray-900/20 text-sm"
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
        className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900/30"
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
        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-gray-900 focus:ring-gray-900/20 text-sm bg-white"
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

/* ---------- plus/minus accordion (neutral gray, slower animation) ---------- */
function PlusMinus({ open }) {
  // Simple gray plus/minus icon using SVG strokes (no blue)
  return (
    <div className="w-5 h-5 rounded border border-gray-300 flex items-center justify-center text-gray-600">
      <svg
        width="12"
        height="12"
        viewBox="0 0 12 12"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="pointer-events-none"
      >
        {/* horizontal line */}
        <path d="M2 6H10" stroke="currentColor" strokeWidth="1.5" />
        {/* vertical line (hidden when open) */}
        {!open && <path d="M6 2V10" stroke="currentColor" strokeWidth="1.5" />}
      </svg>
    </div>
  );
}

function Section({ title, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border bg-white overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <span className="text-sm font-semibold text-gray-900">{title}</span>
        {/* Plus / Minus, neutral gray */}
        <motion.div
          initial={false}
          animate={{ rotate: open ? 0 : 0 }} // no rotation, just plus/minus swap
          transition={{ duration: 0.36, ease: "easeInOut" }}
        >
          <PlusMinus open={open} />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.36, ease: "easeInOut" }}
            className="border-t"
          >
            <div className="divide-y divide-gray-100">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ================================= COMPONENT ================================ */
export default function UpdateInstructor() {
  // route: /update-instructor/:slug/:id
  const { slug, id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadErr, setLoadErr] = useState("");
  const [saveErr, setSaveErr] = useState("");
  const [okMsg, setOkMsg] = useState("");

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
  const loadOne = useCallback(async () => {
    setLoading(true);
    setLoadErr("");
    setOkMsg("");

    try {
      const url = `${globalBackendRoute}/api/instructors/get-by-id/${id}`;
      const res = await axios.get(url);
      const doc = res?.data?.data;

      if (!doc) {
        setLoadErr("Instructor not found.");
        setLoading(false);
        return;
      }

      // prefill form (only fields you expose in PATCH)
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

      // optional: redirect to canonical slug if stale
      const canonicalSlug = slugify(
        `${doc?.firstName || ""} ${doc?.lastName || ""}`.trim() || "instructor"
      );
      if (slug && slug !== canonicalSlug) {
        navigate(`/update-instructor/${canonicalSlug}/${id}`, {
          replace: true,
        });
      }
    } catch (e) {
      setLoadErr(e?.response?.data?.message || e?.message || "Failed to load.");
    } finally {
      setLoading(false);
    }
  }, [id, slug, navigate]);

  useEffect(() => {
    loadOne();
  }, [loadOne]);

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
      };

      const res = await axios.patch(url, payload, {
        validateStatus: (s) => s >= 200 && s < 300,
      });

      const updated = res?.data?.data;
      setOkMsg("Saved successfully.");

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
        <div className="text-rose-600 font-medium mb-2">{loadErr}</div>
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
      {/* Header row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <h2 className="text-xl font-semibold">Update: {title}</h2>

        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-full bg-gray-100 border px-3 py-1 text-xs text-gray-800">
            <FaIdBadge className="text-gray-500" />
            <span className="font-semibold">ID</span>
            <code className="bg-white border px-1.5 py-0.5 rounded">{id}</code>
          </span>

          <Link
            to={`/single-instructor/${id}/${slugify(title)}`}
            className="text-sm text-gray-900 underline underline-offset-2 hover:opacity-80"
          >
            View details
          </Link>
        </div>
      </div>

      {(okMsg || saveErr) && (
        <div className="mb-4">
          {okMsg ? (
            <div className="rounded-md bg-green-50 text-green-800 px-3 py-2 text-sm">
              {okMsg}
            </div>
          ) : null}
          {saveErr ? (
            <div className="rounded-md bg-rose-50 text-rose-700 px-3 py-2 text-sm flex items-center gap-2">
              <FaExclamationTriangle /> {saveErr}
            </div>
          ) : null}
        </div>
      )}

      {/* Form inside sections */}
      <form onSubmit={submit} className="space-y-4">
        {/* Meta Snapshot */}
        <Section title="Meta Snapshot" defaultOpen={false}>
          <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            <div>
              <div className="text-gray-500">Instructor ID</div>
              <code className="bg-gray-100 border px-2 py-1 rounded inline-block break-all">
                {id}
              </code>
            </div>
            <div>
              <div className="text-gray-500">Now</div>
              <div className="text-gray-900">{prettyDate(new Date())}</div>
            </div>
            <div>
              <div className="text-gray-500">Active</div>
              <div className="text-gray-900">
                {form.isActive ? (
                  <span className="inline-flex items-center gap-1 text-green-700">
                    <FaCheck /> true
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-gray-600">
                    <FaTimes /> false
                  </span>
                )}
              </div>
            </div>
          </div>
        </Section>

        {/* Profile */}
        <Section title="Profile" defaultOpen>
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
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
            <div className="md:col-span-2">
              <TextArea
                label="Bio"
                value={form.bio}
                onChange={onChange("bio")}
              />
            </div>
          </div>
        </Section>

        {/* Contact & Links */}
        <Section title="Contact & Links">
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
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
          </div>
        </Section>

        {/* Payout & Verification */}
        <Section title="Payout & Verification">
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
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
            <div className="grid grid-cols-2 gap-3">
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
          </div>
        </Section>

        {/* Actions */}
        <div className="sticky bottom-4 md:static md:bottom-auto bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/50 border rounded-xl p-3 md:p-0 md:border-0">
          <div className="md:col-span-2 flex items-center justify-end gap-2">
            <Link
              to={`/single-instructor/${id}/${slugify(title)}`}
              className="inline-flex items-center gap-2 px-4 py-2 rounded border hover:bg-gray-50 text-sm"
              title="Cancel and view instructor"
            >
              <FaArrowLeft /> Cancel
            </Link>

            <button
              type="submit"
              disabled={saving}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded text-sm text-white ${
                saving ? "bg-gray-400" : "bg-gray-900 hover:bg-gray-800"
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
        </div>
      </form>
    </motion.div>
  );
}
