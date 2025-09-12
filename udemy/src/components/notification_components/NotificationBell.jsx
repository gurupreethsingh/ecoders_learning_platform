import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { FaBell } from "react-icons/fa";
import globalBackendRoute from "../../config/Config";

const POLL_MS = 30000;

const NotificationBell = () => {
  const navigate = useNavigate();
  const [unseen, setUnseen] = useState(0);

  const fetchUnseen = useCallback(async () => {
    try {
      const res = await axios.get(
        `${globalBackendRoute}/api/notifications/my-unseen-notification-count`
      );
      const n =
        typeof res?.data?.unseen === "number"
          ? res.data.unseen
          : Number(res?.data) || 0;
      setUnseen(n);
    } catch {
      setUnseen(0);
    }
  }, []);

  useEffect(() => {
    fetchUnseen();
    const id = setInterval(fetchUnseen, POLL_MS);

    // Listen for app-wide updates (e.g., after marking seen)
    const onBump = () => fetchUnseen();
    window.addEventListener("notifications:updated", onBump);

    return () => {
      clearInterval(id);
      window.removeEventListener("notifications:updated", onBump);
    };
  }, [fetchUnseen]);

  return (
    <button
      type="button"
      onClick={() => navigate("/my-notifications")}
      className="relative inline-flex items-center justify-center p-2 rounded-md hover:bg-gray-100 transition"
      title="Notifications"
    >
      <FaBell className="text-gray-700 text-xl" />
      {unseen > 0 && (
        <span
          title={`${unseen} new`}
          className="absolute -top-0.5 -right-0.5 inline-flex items-center justify-center min-w-5 h-5 px-1 text-xs font-semibold rounded-full bg-red-500 text-white ring-2 ring-white"
        >
          {unseen}
        </span>
      )}
    </button>
  );
};

export default NotificationBell;
