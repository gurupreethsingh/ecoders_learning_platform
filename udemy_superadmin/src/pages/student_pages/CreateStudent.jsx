// src/pages/student_pages/CreateStudent.jsx
import React, { useMemo, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import globalBackendRoute from "../../config/Config";

const ROUTES = {
  REGISTER_STUDENT: `${globalBackendRoute}/api/register-student`,
};

const defaultAddress = {
  street: "",
  city: "",
  state: "",
  postalCode: "",
  country: "",
};

const defaultForm = {
  // Required by /register-student
  name: "",
  email: "",
  password: "",

  // Optional (future-proofing UI; backend registerStudent currently ignores these)
  phone: "",
  avatar: "",
  address: { ...defaultAddress },
};

const CreateStudent = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");

  const token = localStorage.getItem("token");
  const authHeader = token ? { Authorization: `Bearer ${token}` } : undefined;

  // helpers
  const emailRx = useMemo(() => /^\S+@\S+\.\S+$/, []);
  const someAddressProvided = (addr = {}) =>
    Object.values(addr || {}).some((x) => String(x || "").trim().length > 0);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  };

  const handleAddressChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, address: { ...p.address, [name]: value } }));
  };

  const validate = () => {
    const errs = [];
    if (!String(form.name || "").trim()) errs.push("Please provide full name.");
    if (!String(form.email || "").trim() || !emailRx.test(form.email))
      errs.push("Please provide a valid email.");
    if (!String(form.password || "").trim())
      errs.push("Please provide a password.");
    if (form.password && form.password.length < 6)
      errs.push("Password should be at least 6 characters.");
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatusMsg("");

    const errs = validate();
    if (errs.length) {
      setStatusMsg(`❌ ${errs[0]}`);
      return;
    }

    setSaving(true);
    try {
      // Only fields guaranteed by the registerStudent controller:
      const payload = {
        name: form.name.trim(),
        email: form.email.toLowerCase().trim(),
        password: form.password,
      };

      // NOTE: If you later extend registerStudent to accept phone/avatar/address,
      // you can pass them here (and update the controller accordingly):
      // if (form.phone) payload.phone = form.phone;
      // if (form.avatar) payload.avatar = form.avatar;
      // if (someAddressProvided(form.address)) payload.address = form.address;

      await axios.post(ROUTES.REGISTER_STUDENT, payload, {
        headers: { "Content-Type": "application/json", ...(authHeader || {}) },
      });

      setStatusMsg(
        "✅ Student registered successfully (role set to 'student')."
      );
      setForm(defaultForm);

      // optional redirect (uncomment if desired)
      // setTimeout(() => navigate("/students"), 700);
    } catch (err) {
      console.error(err);
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err.message ||
        "Failed to register student";
      setStatusMsg(`❌ ${msg}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-8 py-8">
      <h1 className="text-2xl font-semibold mb-6">Create Student</h1>

      {statusMsg && (
        <div
          className={`mb-4 rounded-lg border p-3 text-sm ${
            statusMsg.startsWith("✅")
              ? "border-green-200 bg-green-50 text-green-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {statusMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="text-sm text-gray-600">
          This will create a <b>User</b> with role <code>student</code> (same as
          a register flow but directly from admin tools). You can later edit
          profile details from the user update page.
        </div>

        {/* Identity */}
        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm mb-1">Full Name *</label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="e.g., Ananya Verma"
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
              placeholder="ananya@example.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Password *</label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="Set initial password"
              required
            />
          </div>
        </div>

        {/* Optional profile fields (UI only for now) */}
        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm mb-1">Phone (optional)</label>
            <input
              name="phone"
              value={form.phone}
              onChange={handleChange}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="+91-XXXXXXXXXX"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm mb-1">Avatar URL (optional)</label>
            <input
              name="avatar"
              value={form.avatar}
              onChange={handleChange}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="https://..."
            />
          </div>
        </div>

        {/* Address (Optional UI) */}
        <div>
          <h2 className="text-lg font-medium mb-2">Address (optional)</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <input
              name="street"
              value={form.address.street}
              onChange={handleAddressChange}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="Street"
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
              name="postalCode"
              value={form.address.postalCode}
              onChange={handleAddressChange}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="Postal Code"
            />
            <input
              name="country"
              value={form.address.country}
              onChange={handleAddressChange}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="Country"
            />
          </div>

          {/* Hint if backend not yet wired to accept address */}
          <p className="text-xs text-gray-500 mt-2">
            Note: The current <code>/register-student</code> API only requires{" "}
            <code>name</code>, <code>email</code>, and <code>password</code>. If
            you want to persist phone/avatar/address at registration time,
            extend the controller to accept those fields and pass them in the
            payload.
          </p>
        </div>

        {/* Submit */}
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2 rounded-lg bg-black text-white hover:opacity-90 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Register Student"}
          </button>

          <span className="text-sm text-gray-500">
            The user will be created with role <b>student</b>.
          </span>
        </div>
      </form>
    </div>
  );
};

export default CreateStudent;
