import React, { useState, useContext } from "react";
import axios from "axios";
import { HiMiniLockClosed } from "react-icons/hi2"; // tintable icon
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
      case "admin":
        navigate("/admin-dashboard", { replace: true });
        break;
      case "superadmin":
        navigate("/superadmin-dashboard", { replace: true });
        break;
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

      // Save token (updates context)
      login(data.token);

      // Decode role from the same JWT you issued: { id, name, role }
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
    <div className="min-h-[50vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Header (compact + subtle gradient text icon) */}
        <div className="text-center">
          <HiMiniLockClosed
            className="mx-auto h-10 w-10 text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500"
            aria-hidden="true"
          />
          <h2 className="text-lg font-semibold mt-2 text-gray-800">
            Sign in to your account
          </h2>
        </div>

        {error && (
          <p className="text-red-600 text-sm text-center mt-3">{error}</p>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {/* Email */}
          <div>
            <label
              htmlFor="email"
              className="block text-xs font-medium text-gray-700"
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
              className="mt-1 w-full border-b border-gray-300 focus:border-indigo-600 focus:outline-none text-sm py-2"
              placeholder="you@example.com"
            />
          </div>

          {/* Password */}
          <div>
            <div className="flex items-center justify-between">
              <label
                htmlFor="password"
                className="block text-xs font-medium text-gray-700"
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
                className="mt-1 w-full border-b border-gray-300 focus:border-indigo-600 focus:outline-none text-sm py-2 pr-9"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword((p) => !p)}
                className="absolute inset-y-0 right-0 flex items-center pr-2 text-gray-500 hover:text-gray-700"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
              </button>
            </div>
          </div>

          {/* Submit (subtle indigo) */}
          <button
            type="submit"
            className="w-full bg-indigo-600/90 hover:bg-indigo-700 text-white text-sm font-medium py-2.5 rounded-md transition"
          >
            Login
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-gray-600">
          Don&apos;t have an account?{" "}
          <a href="/register" className="text-indigo-600 hover:underline">
            Register
          </a>
        </p>
      </div>
    </div>
  );
};

export default Login;
