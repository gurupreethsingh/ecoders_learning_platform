import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { FaEnvelope, FaKey } from "react-icons/fa";
import globalBackendRoute from "../../config/Config";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSendOtp = async () => {
    try {
      await axios.post(`${globalBackendRoute}/api/forgot-password`, {
        email: email.trim(),
      });
      alert("OTP sent successfully to your email!");
      setOtpSent(true);
      setError("");
    } catch (error) {
      console.error(
        "OTP sending error:",
        error.response?.data || error.message
      );
      setOtpSent(false);
      setError("Failed to send OTP. Please check your email and try again.");
      alert("Failed to send OTP. Check email or try again.");
    }
  };

  const handleVerifyOtp = async () => {
    try {
      await axios.post(`${globalBackendRoute}/api/verify-otp`, {
        email: email.trim(),
        otp: otp.trim(),
      });
      alert("OTP verified! Redirecting to reset password page...");
      navigate("/reset-password", {
        state: { email: email.trim(), otp: otp.trim() },
      });
    } catch (error) {
      setError("Invalid OTP. Please try again.");
    }
  };

  return (
    <div className="w-full border-b pt-5 pb-5">
      <div className="mx-auto max-w-md px-4 sm:px-6 pt-8 pb-10">
        {/* Top: centered gradient icon */}
        <div className="flex flex-col items-center justify-center gap-3">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full text-white bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600">
            <FaKey className="h-4 w-4" aria-hidden="true" />
          </span>
        </div>

        {/* Centered heading */}
        <div className="mt-3 flex flex-col items-center justify-center">
          <h1 className="text-xl md:text-2xl font-semibold text-gray-900 text-center">
            Forgot password
          </h1>
          <div className="h-0.5 w-16 bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 rounded-full mt-1"></div>
        </div>

        {error && (
          <p className="mt-4 text-sm text-red-600 text-center">{error}</p>
        )}

        {/* Form */}
        <form className="mt-6 space-y-5" onSubmit={(e) => e.preventDefault()}>
          {/* Email */}
          <div className="space-y-1.5">
            <label
              htmlFor="email"
              className="text-sm font-medium text-gray-800"
            >
              Email address
            </label>
            <div className="relative">
              <input
                id="email"
                name="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                placeholder="Enter your registered email"
                className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 pr-10 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              />
              <FaEnvelope
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={14}
              />
            </div>
          </div>

          {/* Send OTP */}
          <div className="text-center">
            <button
              type="button"
              onClick={handleSendOtp}
              className="inline-flex items-center justify-center rounded-md bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 px-4 py-2 text-sm font-medium text-white hover:from-indigo-700 hover:via-violet-700 hover:to-fuchsia-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              Send OTP
            </button>
          </div>

          {/* OTP */}
          {otpSent && (
            <>
              <div className="space-y-1.5">
                <label
                  htmlFor="otp"
                  className="text-sm font-medium text-gray-800"
                >
                  OTP
                </label>
                <div className="relative">
                  <input
                    id="otp"
                    name="otp"
                    type="text"
                    required
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="Enter OTP"
                    className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 pr-10 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <FaKey
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                    size={14}
                  />
                </div>
              </div>

              <div className="text-center">
                <button
                  type="button"
                  onClick={handleVerifyOtp}
                  className="inline-flex items-center justify-center rounded-md bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 px-4 py-2 text-sm font-medium text-white hover:from-indigo-700 hover:via-violet-700 hover:to-fuchsia-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  Verify OTP
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
};

export default ForgotPassword;
