// src/pages/common_pages/ContactUs.jsx
import React, { useState } from "react";
import { Link } from "react-router-dom";
import globalBackendRoute from "../../config/config";

const ContactUs = () => {
  const API_ROOT =
    globalBackendRoute ||
    import.meta?.env?.VITE_BACKEND_URL ||
    "http://localhost:5000";

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    message_text: "",
    agreeToLicense: false,
  });

  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const validate = () => {
    if (!form.firstName.trim()) {
      setMessage({ type: "error", text: "First name is required." });
      return false;
    }
    if (!form.lastName.trim()) {
      // Controller currently requires lastName (even though schema marks it optional)
      setMessage({ type: "error", text: "Last name is required." });
      return false;
    }
    if (!/^\S+@\S+\.\S+$/.test(form.email)) {
      setMessage({ type: "error", text: "Please enter a valid email." });
      return false;
    }
    if (!form.message_text.trim()) {
      setMessage({ type: "error", text: "Message is required." });
      return false;
    }
    if (!form.agreeToLicense) {
      setMessage({
        type: "error",
        text: "You must agree to the license to continue.",
      });
      return false;
    }
    return true;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: "", text: "" });

    if (!validate()) return;

    try {
      setSubmitting(true);
      const res = await fetch(`${API_ROOT}/api/add-contact-message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (!res.ok)
        throw new Error(data?.error || "Failed to submit your message.");

      setMessage({
        type: "success",
        text: data?.message || "Your message has been sent successfully!",
      });

      // Reset form
      setForm({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        message_text: "",
        agreeToLicense: false,
      });
    } catch (err) {
      setMessage({
        type: "error",
        text: err.message || "Something went wrong.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto w-full px-5 md:px-8 py-8">
      <div className="max-w-3xl mx-auto bg-white p-6 md:p-8">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 text-center">
          Contact Us
        </h1>
        <p className="text-gray-600 text-center mt-2">
          Have a question or feedback? Send us a message.
        </p>

        {/* alerts */}
        {message.text ? (
          <div
            className={`mt-4 rounded-lg px-4 py-3 text-sm ${
              message.type === "success"
                ? "bg-green-50 text-green-800 border border-green-200"
                : "bg-red-50 text-red-800 border border-red-200"
            }`}
          >
            {message.text}
          </div>
        ) : null}

        <form className="mt-6 space-y-5" onSubmit={onSubmit} noValidate>
          {/* Name Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* First Name */}
            <div>
              <label
                htmlFor="firstName"
                className="block text-sm font-medium text-gray-800"
              >
                First Name <span className="text-red-600">*</span>
              </label>
              <input
                id="firstName"
                name="firstName"
                type="text"
                required
                value={form.firstName}
                onChange={onChange}
                placeholder="John"
                className="mt-2 w-full rounded-lg border border-gray-300 focus:border-gray-400 focus:ring-0 px-4 py-2.5 text-gray-900 placeholder-gray-400"
              />
            </div>

            {/* Last Name */}
            <div>
              <label
                htmlFor="lastName"
                className="block text-sm font-medium text-gray-800"
              >
                Last Name <span className="text-red-600">*</span>
              </label>
              <input
                id="lastName"
                name="lastName"
                type="text"
                required
                value={form.lastName}
                onChange={onChange}
                placeholder="Doe"
                className="mt-2 w-full rounded-lg border border-gray-300 focus:border-gray-400 focus:ring-0 px-4 py-2.5 text-gray-900 placeholder-gray-400"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-800"
            >
              Email <span className="text-red-600">*</span>
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              value={form.email}
              onChange={onChange}
              placeholder="you@example.com"
              className="mt-2 w-full rounded-lg border border-gray-300 focus:border-gray-400 focus:ring-0 px-4 py-2.5 text-gray-900 placeholder-gray-400"
            />
          </div>

          {/* Phone (optional) */}
          <div>
            <label
              htmlFor="phone"
              className="block text-sm font-medium text-gray-800"
            >
              Phone
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              value={form.phone}
              onChange={onChange}
              placeholder="(+91) 99999 99999"
              className="mt-2 w-full rounded-lg border border-gray-300 focus:border-gray-400 focus:ring-0 px-4 py-2.5 text-gray-900 placeholder-gray-400"
            />
          </div>

          {/* Message */}
          <div>
            <label
              htmlFor="message_text"
              className="block text-sm font-medium text-gray-800"
            >
              Message <span className="text-red-600">*</span>
            </label>
            <textarea
              id="message_text"
              name="message_text"
              rows={5}
              required
              value={form.message_text}
              onChange={onChange}
              placeholder="Type your message here..."
              className="mt-2 w-full rounded-lg border border-gray-300 focus:border-gray-400 focus:ring-0 px-4 py-2.5 text-gray-900 placeholder-gray-400"
            />
          </div>

          {/* License agreement */}
          <div className="flex items-center gap-2">
            <input
              id="agreeToLicense"
              name="agreeToLicense"
              type="checkbox"
              checked={form.agreeToLicense}
              onChange={onChange}
              className="h-4 w-4 text-gray-900 border-gray-300"
            />
            <label htmlFor="agreeToLicense" className="text-sm text-gray-800">
              I agree to the license & terms.{" "}
              <span className="text-red-600">*</span>
            </label>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={submitting}
              className={`inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-white text-sm font-semibold ${
                submitting
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-gray-900 hover:bg-gray-800"
              }`}
            >
              {submitting ? "Sending..." : "Send Message"}
            </button>
            <Link
              to="/home"
              className="inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-gray-900 text-sm font-semibold border hover:bg-gray-50"
            >
              Back to Homepage
            </Link>
          </div>
        </form>

        <p className="text-xs text-gray-500 text-center mt-4">
          We’ll use your information to respond to your inquiry. Read our
          Privacy Policy for more details.
        </p>
      </div>
    </div>
  );
};

export default ContactUs;
