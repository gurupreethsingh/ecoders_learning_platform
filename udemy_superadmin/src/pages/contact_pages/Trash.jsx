// src/pages/contact_pages/Trash.jsx
import React, { useEffect, useMemo, useState } from "react";
import { FiTrash2, FiRefreshCcw, FiSearch } from "react-icons/fi";
import globalBackendRoute from "../../config/Config";

const Trash = () => {
  const API =
    globalBackendRoute ||
    import.meta?.env?.VITE_BACKEND_URL ||
    "http://localhost:5000";

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);

        // Optional: purge >30 days old
        await fetch(`${API}/api/messages/purge-trashed`, { method: "POST" });

        const res = await fetch(`${API}/api/messages/trashed`);
        const json = await res.json();
        if (!res.ok)
          throw new Error(json?.error || "Failed to fetch trashed messages.");

        if (active) setMessages(Array.isArray(json) ? json : []);
      } catch (e) {
        if (active) setErr(e.message || "Something went wrong.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [API]);

  const filtered = useMemo(() => {
    if (!q.trim()) return messages;
    const needle = q.toLowerCase();
    return messages.filter((m) => {
      const parts = [
        m.firstName,
        m.lastName,
        m.email,
        m.phone,
        m.message_text,
        new Date(m.trashedAt || m.createdAt || "").toLocaleString(),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return parts.includes(needle);
    });
  }, [messages, q]);

  const restoreMessage = async (id) => {
    const ok = window.confirm("Restore this message back to Inbox?");
    if (!ok) return;
    try {
      const res = await fetch(`${API}/api/messages/${id}/restore`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to restore message.");
      // Remove from current list
      setMessages((prev) => prev.filter((m) => m._id !== id));
      alert("Message restored to Inbox.");
    } catch (e) {
      alert(e.message || "Failed to restore.");
    }
  };

  const permanentlyDelete = async (id) => {
    const ok = window.confirm(
      "Permanently delete this message? This cannot be undone."
    );
    if (!ok) return;
    try {
      const res = await fetch(`${API}/api/messages/${id}/permanent`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok)
        throw new Error(json?.error || "Failed to permanently delete.");
      setMessages((prev) => prev.filter((m) => m._id !== id));
      alert("Message deleted permanently.");
    } catch (e) {
      alert(e.message || "Failed to delete permanently.");
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto w-full px-5 md:px-8 py-8">
        <div className="max-w-5xl mx-auto bg-white p-6 md:p-8">
          <div className="h-6 w-40 bg-gray-200 mb-6" />
          <div className="h-10 w-full bg-gray-200 mb-4" />
          <div className="h-10 w-full bg-gray-200 mb-2" />
          <div className="h-10 w-full bg-gray-200" />
        </div>
      </div>
    );
  }

  if (err) {
    return (
      <div className="max-w-7xl mx-auto w-full px-5 md:px-8 py-8">
        <div className="max-w-5xl mx-auto bg-white p-6 md:p-8">
          <div className="rounded-lg px-4 py-3 text-sm bg-red-50 text-red-800 border border-red-200">
            {err}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto w-full px-5 md:px-8 py-8">
      <div className="max-w-6xl mx-auto bg-white p-6 md:p-8">
        {/* Header / Search */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            Trash
          </h1>
          <div className="w-full md:max-w-xl">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search trashed messages…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="w-full rounded-full border border-gray-300 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 pl-10 pr-4 py-2.5 text-gray-900 placeholder-gray-400"
              />
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Auto-purged after 30 days.
            </p>
          </div>
        </div>

        {/* Table */}
        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-600 border-b">
                <th className="py-3 pr-4">Name</th>
                <th className="py-3 pr-4">Email</th>
                <th className="py-3 pr-4 hidden md:table-cell">Phone</th>
                <th className="py-3 pr-4">Message</th>
                <th className="py-3 pr-4 hidden lg:table-cell">Trashed At</th>
                <th className="py-3 pl-2 pr-0 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-gray-500">
                    Trash is empty.
                  </td>
                </tr>
              ) : (
                filtered.map((m) => {
                  const fullName = [m.firstName, m.lastName]
                    .filter(Boolean)
                    .join(" ");
                  const preview =
                    (m.message_text || "").length > 80
                      ? `${m.message_text.slice(0, 80)}…`
                      : m.message_text || "—";
                  const trashedLabel = m.trashedAt
                    ? new Date(m.trashedAt).toLocaleString()
                    : "—";

                  return (
                    <tr key={m._id} className="border-b">
                      <td className="py-3 pr-4">
                        <div className="font-medium text-gray-900">
                          {fullName || "—"}
                        </div>
                        <div className="text-xs text-gray-500 lg:hidden">
                          {trashedLabel}
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-gray-700">
                        {m.email || "—"}
                      </td>
                      <td className="py-3 pr-4 text-gray-700 hidden md:table-cell">
                        {m.phone || "—"}
                      </td>
                      <td className="py-3 pr-4 text-gray-700">{preview}</td>
                      <td className="py-3 pr-4 hidden lg:table-cell text-gray-700">
                        {trashedLabel}
                      </td>
                      <td className="py-3 pl-2 pr-0 text-right space-x-2">
                        {/* RESTORE: always visible, icon + text, green palette */}
                        <button
                          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full
                                     border border-green-200 bg-green-50 text-green-700
                                     hover:bg-green-100"
                          title="Restore to Inbox"
                          aria-label="Restore to Inbox"
                          onClick={() => restoreMessage(m._id)}
                        >
                          <FiRefreshCcw className="h-4 w-4" />
                          <span>Restore</span>
                        </button>

                        {/* DELETE PERMANENTLY */}
                        <button
                          className="inline-flex items-center justify-center p-2 rounded
                                     hover:bg-red-50 text-red-600"
                          title="Delete Permanently"
                          aria-label="Delete Permanently"
                          onClick={() => permanentlyDelete(m._id)}
                        >
                          <FiTrash2 className="h-5 w-5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Trash;
