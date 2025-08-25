import React, { useEffect, useState } from "react";

// ✅ Define launchDate once outside the component
const launchDate = new Date("2025-07-15T00:00:00");

const TopHeader = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  // ✅ Update current time every second
  useEffect(() => {
    const clockInterval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(clockInterval);
  }, []);

  // ✅ Update countdown every second
  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const difference = launchDate - now;
      setTimeLeft({
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
      });
    };
    updateCountdown();
    const countdownInterval = setInterval(updateCountdown, 1000);
    return () => clearInterval(countdownInterval);
  }, []); // ✅ Removed launchDate from dependency

  const formatTime = (date) => {
    return date.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  return (
    <div className="top-0 left-0 w-full bg-gradient-to-r from-purple-600 via-pink-500 to-red-400 text-white text-sm py-2 px-4 z-60 h-auto">
      <div className="max-w-screen-2xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="text-center md:text-left flex-1">
          <p className="text-base sm:text-sm">
            New Course Launch Offer: Enroll before time runs out and get 50%
            OFF!
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-2">
          <div className="bg-black/20 rounded-full px-3 py-1 text-xs sm:text-sm">
            🕒 Current Time:{" "}
            <span className="font-medium">{formatTime(currentTime)}</span>
          </div>
          <div className="bg-black/20 rounded-full px-3 py-1 text-xs sm:text-sm">
            ⏳ Launch In:{" "}
            <span className="font-semibold">
              {timeLeft.days}d {timeLeft.hours}h {timeLeft.minutes}m{" "}
              {timeLeft.seconds}s
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TopHeader;
