import React, { useState, useContext } from "react";
import axios from "axios";
import { HiMiniLockClosed } from "react-icons/hi2";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../components/auth_components/AuthManager";
import globalBackendRoute from "../../config/Config";

const Login = () => {
  const navigate = useNavigate();
  const { login } = useContext(AuthContext);

  const [formData, setFormData] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const { email, password } = formData;

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const validateInputs = () => {
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();
    if (!trimmedEmail || !trimmedPassword)
      return "Email and password are required.";
    if (email !== trimmedEmail) return "Email cannot start or end with spaces.";
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!trimmedEmail.match(emailRegex))
      return "Please enter a valid email address.";
    if (password !== trimmedPassword)
      return "Password cannot start or end with spaces.";
    return null;
  };

  const routeByRole = (role) => {
    switch (role) {
      case "student":
        navigate("/student-dashboard", { replace: true });
        break;
      case "instructor":
        navigate("/instructor-dashboard", { replace: true });
        break;
      case "user":
      default:
        navigate("/user-dashboard", { replace: true });
        break;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationError = validateInputs();
    if (validationError) return setError(validationError);

    try {
      const { data } = await axios.post(`${globalBackendRoute}/api/login`, {
        email: email.trim().toLowerCase(),
        password,
      });

      login(data.token);

      const base64Url = data.token.split(".")[1];
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      const decoded = JSON.parse(atob(base64));
      const role = decoded?.role || data?.user?.role;

      setError("");
      routeByRole(role);
    } catch (err) {
      console.error("Login Failed:", err);
      setError(err.response?.data?.message || "Login failed. Try again.");
    }
  };

  return (
    <div className="w-full border-b pt-5 pb-5">
      <div className="mx-auto max-w-md px-4 sm:px-6 pt-8 pb-10">
        {/* Top: compact header with clear sign-in icon */}
        <div className="flex flex-col justify-center items-center gap-3">
          <span
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-white
                           bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600"
          >
            <HiMiniLockClosed className="h-4 w-4" aria-hidden="true" />
          </span>
        </div>

        {error && (
          <p className="mt-4 text-sm text-red-600 text-center">{error}</p>
        )}

        {/* Form (compact spacing, smaller controls) */}
        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <div className="flex flex-col items-center justify-center">
            <h1 className="text-xl md:text-2xl font-semibold text-gray-900">
              Sign in
            </h1>
            <div className="h-0.5 w-16 bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 rounded-full mt-1"></div>
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

          {/* Password */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="password"
                className="text-sm font-medium text-gray-800"
              >
                Password
              </label>
              <a
                href="/forgot-password"
                className="text-xs text-indigo-600 hover:underline"
              >
                Forgot?
              </a>
            </div>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
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
          </div>

          {/* Submit (smaller, brand gradient) */}
          <button
            type="submit"
            className="inline-flex w-full items-center justify-center rounded-md
                       bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600
                       px-4 py-2 text-sm font-medium text-white
                       hover:from-indigo-700 hover:via-violet-700 hover:to-fuchsia-700
                       focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            Login
          </button>
        </form>

        {/* Bottom links (compact) */}
        <p className="mt-4 text-center text-sm text-gray-700">
          Don&apos;t have an account?{" "}
          <a
            href="/register"
            className="font-medium text-indigo-600 hover:underline"
          >
            Register
          </a>
        </p>
      </div>
    </div>
  );
};

export default Login;
