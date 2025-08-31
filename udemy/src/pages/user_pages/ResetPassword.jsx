import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { FaLock } from "react-icons/fa";
import globalBackendRoute from "../../config/Config";

const ResetPassword = () => {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  const email = location.state?.email;
  const otp = location.state?.otp;

  const validatePassword = (password) => {
    const regex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*#?&^_-])[A-Za-z\d@$!%*#?&^_-]{8,}$/;
    return regex.test(password);
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();

    if (!validatePassword(newPassword)) {
      setError(
        "Password must be at least 8 characters long, include 1 uppercase letter, 1 lowercase letter, 1 number, and 1 symbol."
      );
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match. Please try again.");
      return;
    }

    try {
      await axios.post(`${globalBackendRoute}/api/reset-password`, {
        email,
        otp,
        newPassword,
      });
      alert("Password reset successfully! Redirecting to login page...");
      navigate("/login");
    } catch (error) {
      console.error(
        "Password reset error:",
        error.response?.data || error.message
      );
      setError("Failed to reset password. Please try again.");
    }
  };

  return (
    <div className="w-full border-b pt-5 pb-5">
      <div className="mx-auto max-w-md px-4 sm:px-6 pt-8 pb-10">
        {/* Top: centered gradient icon */}
        <div className="flex flex-col items-center justify-center gap-3">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full text-white bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600">
            <FaLock className="h-4 w-4" aria-hidden="true" />
          </span>
        </div>

        {/* Centered heading */}
        <div className="mt-3 flex flex-col items-center justify-center">
          <h1 className="text-xl md:text-2xl font-semibold text-gray-900 text-center">
            Reset password
          </h1>
          <div className="h-0.5 w-16 bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 rounded-full mt-1"></div>
        </div>

        {error && (
          <p className="mt-4 text-sm text-red-600 text-center">{error}</p>
        )}

        <form onSubmit={handleResetPassword} className="mt-6 space-y-5">
          {/* New Password */}
          <div className="space-y-1.5">
            <label
              htmlFor="new-password"
              className="text-sm font-medium text-gray-800"
            >
              New password
            </label>
            <div className="relative">
              <input
                id="new-password"
                name="newPassword"
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                placeholder="Enter your new password"
                className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              />
              <FaLock
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={14}
              />
            </div>
            <p className="text-xs text-gray-500">
              8+ chars with upper, lower, number & symbol.
            </p>
          </div>

          {/* Confirm Password */}
          <div className="space-y-1.5">
            <label
              htmlFor="confirm-password"
              className="text-sm font-medium text-gray-800"
            >
              Confirm new password
            </label>
            <div className="relative">
              <input
                id="confirm-password"
                name="confirmPassword"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                placeholder="Re-enter your password"
                className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              />
              <FaLock
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={14}
              />
            </div>
          </div>

          <div className="text-center">
            <button
              type="submit"
              className="inline-flex w-auto items-center justify-center rounded-md bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 px-4 py-2 text-sm font-medium text-white hover:from-indigo-700 hover:via-violet-700 hover:to-fuchsia-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              Reset Password
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
