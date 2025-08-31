import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { FaUserPlus, FaEye, FaEyeSlash } from "react-icons/fa";
import globalBackendRoute from "../../config/Config";

const Register = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const { name, email, password } = formData;

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const validateInputs = () => {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName) return "Name cannot be empty or just spaces.";
    if (name !== trimmedName) return "Name cannot start or end with a space.";

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!trimmedEmail.match(emailRegex)) return "Enter a valid email address.";
    if (email !== trimmedEmail)
      return "Email cannot start or end with a space.";

    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d])[A-Za-z\d\S]{8,}$/;
    if (!password.match(passwordRegex))
      return "Password must be 8+ characters with uppercase, lowercase, number, and special character.";

    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationError = validateInputs();
    if (validationError) return setError(validationError);

    try {
      await axios.post(`${globalBackendRoute}/api/register`, {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
      });
      alert("Registration successful. Redirecting to login.");
      navigate("/login");
    } catch (err) {
      setError(
        err?.response?.data?.message || "Registration failed. Try again."
      );
    }
  };

  return (
    <div className="w-full border-b pt-5 pb-5">
      <div className="mx-auto max-w-md px-4 sm:px-6 pt-8 pb-10">
        {/* Top: centered icon */}
        <div className="flex flex-col items-center justify-center gap-3">
          <span
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-white
                       bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600"
          >
            <FaUserPlus className="h-4 w-4" aria-hidden="true" />
          </span>
        </div>

        {/* Centered heading directly under the icon */}
        <div className="mt-3 flex flex-col items-center justify-center">
          <h1 className="text-xl md:text-2xl font-semibold text-gray-900 text-center">
            Create account
          </h1>
          <div className="h-0.5 w-20 bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 rounded-full mt-1"></div>
        </div>

        {error && (
          <p className="mt-4 text-sm text-red-600 text-center">{error}</p>
        )}

        {/* Form (compact spacing, same as Login) */}
        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          {/* Name */}
          <div className="space-y-1.5">
            <label htmlFor="name" className="text-sm font-medium text-gray-800">
              Name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              value={name}
              onChange={handleChange}
              required
              placeholder="Your full name"
              className="block w-full rounded-md border border-gray-300 bg-white
                         px-3 py-2 text-sm placeholder:text-gray-400
                         focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <label
              htmlFor="email"
              className="text-sm font-medium text-gray-800"
            >
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={handleChange}
              required
              placeholder="you@example.com"
              className="block w-full rounded-md border border-gray-300 bg-white
                         px-3 py-2 text-sm placeholder:text-gray-400
                         focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          {/* Password with eye toggle */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="password"
                className="text-sm font-medium text-gray-800"
              >
                Password
              </label>
            </div>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                value={password}
                onChange={handleChange}
                required
                placeholder="••••••••"
                className="block w-full rounded-md border border-gray-300 bg-white
                           px-3 py-2 pr-10 text-sm placeholder:text-gray-400
                           focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword((p) => !p)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-700"
                aria-label={showPassword ? "Hide password" : "Show password"}
                tabIndex={-1}
              >
                {showPassword ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
              </button>
            </div>
            <p className="text-xs text-gray-500">
              8+ chars with upper, lower, number & special character.
            </p>
          </div>

          {/* Submit (brand gradient, compact) */}
          <button
            type="submit"
            className="inline-flex w-full items-center justify-center rounded-md
                       bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600
                       px-4 py-2 text-sm font-medium text-white
                       hover:from-indigo-700 hover:via-violet-700 hover:to-fuchsia-700
                       focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            Register
          </button>
        </form>

        {/* Bottom link */}
        <p className="mt-4 text-center text-sm text-gray-700">
          Already have an account?{" "}
          <a
            href="/login"
            className="font-medium text-indigo-600 hover:underline"
          >
            Sign in
          </a>
        </p>
      </div>
    </div>
  );
};

export default Register;
