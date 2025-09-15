import React, { useEffect, useMemo, useState } from "react";
import {
  FiTrash2,
  FiInbox,
  FiMail,
  FiCheckCircle,
  FiClock,
  FiTrash,
  FiSearch,
  FiRefreshCcw,
  FiX,
  FiSend,
} from "react-icons/fi";
import globalBackendRoute from "../../config/Config";

const AllMessages = () => {
  const API =
    globalBackendRoute ||
    import.meta?.env?.VITE_BACKEND_URL ||
    "http://localhost:5000";

  // Data & UI
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");

  // Folders: inbox | unread | replied | notreplied | trash
  const [folder, setFolder] = useState("inbox");

  // Pagination
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  // Drawer for read/reply (replaces ReplyMessage.jsx)
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [replySending, setReplySending] = useState(false);

  // Fetch all messages
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API}/api/all-messages`);
        const json = await res.json();
        if (!res.ok)
          throw new Error(json?.error || "Failed to fetch messages.");
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

  // Buckets
  const inbox = useMemo(() => messages.filter((m) => !m.isTrashed), [messages]);
  const trash = useMemo(
    () => messages.filter((m) => !!m.isTrashed),
    [messages]
  );
  const unread = useMemo(() => inbox.filter((m) => !m.isRead), [inbox]);
  const replied = useMemo(
    () => inbox.filter((m) => (m.replies?.length || 0) > 0),
    [inbox]
  );
  const notReplied = useMemo(
    () => inbox.filter((m) => (m.replies?.length || 0) === 0),
    [inbox]
  );

  // Folder scope
  const scopeList = useMemo(() => {
    switch (folder) {
      case "unread":
        return unread;
      case "replied":
        return replied;
      case "notreplied":
        return notReplied;
      case "trash":
        return trash;
      case "inbox":
      default:
        return inbox;
    }
  }, [folder, inbox, unread, replied, notReplied, trash]);

  // Search within scoped list
  const searched = useMemo(() => {
    if (!q.trim()) return scopeList;
    const needle = q.toLowerCase();
    return scopeList.filter((m) => {
      const parts = [
        m.firstName,
        m.lastName,
        m.email,
        m.phone,
        m.message_text,
        m.isRead ? "read" : "unread",
        (m.replies || [])
          .map((r) => `${r.name} ${r.email} ${r.message}`)
          .join(" "),
        new Date(
          m.createdAt || m.timestamp || m.updatedAt || ""
        ).toLocaleString(),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return parts.includes(needle);
    });
  }, [scopeList, q]);

  // Pagination
  const totalPages = Math.max(
    1,
    Math.ceil(searched.length / Math.max(1, pageSize))
  );
  const currentPage = Math.min(page, totalPages);
  const startIdx = (currentPage - 1) * pageSize;
  const pageRows = searched.slice(startIdx, startIdx + pageSize);

  // Reset page on filters
  useEffect(() => {
    setPage(1);
  }, [q, pageSize, folder]);

  // Helpers
  const getById = (id) => messages.find((m) => m._id === id) || null;

  // Open drawer (mark as read best-effort)
  const openDrawer = async (id) => {
    setSelectedId(id);
    setDrawerOpen(true);
    setReplyText("");

    try {
      fetch(`${API}/api/messages/mark-as-read`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId: id }),
      }).catch(() => {});
      setMessages((prev) =>
        prev.map((m) => (m._id === id ? { ...m, isRead: true } : m))
      );
    } catch {
      // non-blocking
    }
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setSelectedId(null);
    setReplyText("");
  };

  // Actions
  const moveToTrash = async (id) => {
    const ok = window.confirm("Move this message to Trash?");
    if (!ok) return;
    try {
      const res = await fetch(`${API}/api/messages/${id}/trash`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to move to trash.");
      setMessages((prev) =>
        prev.map((m) =>
          m._id === id
            ? { ...m, isTrashed: true, trashedAt: new Date().toISOString() }
            : m
        )
      );
      if (selectedId === id) closeDrawer();
    } catch (e) {
      alert(e.message || "Failed to move message to trash.");
    }
  };

  const restoreMessage = async (id) => {
    const ok = window.confirm("Restore this message back to Inbox?");
    if (!ok) return;
    try {
      const res = await fetch(`${API}/api/messages/${id}/restore`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to restore message.");
      setMessages((prev) =>
        prev.map((m) =>
          m._id === id ? { ...m, isTrashed: false, trashedAt: null } : m
        )
      );
      // stay where you are; item will leave the Trash list automatically
      if (selectedId === id) closeDrawer();
      alert("Message restored to Inbox.");
    } catch (e) {
      alert(e.message || "Failed to restore.");
    }
  };

  const deletePermanent = async (id) => {
    const ok = window.confirm(
      "Permanently delete this message (and its replies)? This cannot be undone."
    );
    if (!ok) return;
    try {
      const res = await fetch(`${API}/api/messages/${id}/permanent`, {
        method: "DELETE",
      });
      const text = await res.text();
      if (!res.ok) throw new Error(`DELETE permanent ${res.status}: ${text}`);
      setMessages((prev) => prev.filter((m) => m._id !== id));
      if (selectedId === id) closeDrawer();
      alert("Message deleted permanently.");
    } catch (e) {
      alert(e.message || "Failed to delete permanently.");
    }
  };

  const sendReply = async () => {
    const id = selectedId;
    if (!id || !replyText.trim()) return;
    try {
      setReplySending(true);
      const res = await fetch(`${API}/api/messages/${id}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: replyText.trim() }),
      });

      // If your API returns updated message, use it; otherwise optimistic update
      let updated;
      try {
        updated = await res.json();
      } catch {
        updated = null;
      }
      if (!res.ok) throw new Error(updated?.error || "Failed to send reply.");

      if (updated && updated._id) {
        // Server sent back the updated message
        setMessages((prev) => prev.map((m) => (m._id === id ? updated : m)));
      } else {
        // Optimistic local append
        const optimisticReply = {
          name: "Support",
          email: "", // fill if your backend returns support email
          message: replyText.trim(),
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) =>
          prev.map((m) =>
            m._id === id
              ? { ...m, replies: [...(m.replies || []), optimisticReply] }
              : m
          )
        );
      }

      setReplyText("");
      alert("Reply sent.");
    } catch (e) {
      alert(e.message || "Failed to send reply.");
    } finally {
      setReplySending(false);
    }
  };

  // Sidebar nav item (colorful icons + badge)
  const NavItem = ({ id, icon, colorClass, label, count }) => {
    const active = folder === id;
    return (
      <button
        onClick={() => setFolder(id)}
        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition
          ${
            active
              ? "bg-indigo-50 text-indigo-700 border border-indigo-100"
              : "hover:bg-gray-50 text-gray-700"
          }`}
      >
        <span className="flex items-center gap-2">
          <span className={`${active ? "text-indigo-600" : colorClass}`}>
            {icon}
          </span>
          {label}
        </span>
        <span
          className={`ml-3 inline-flex items-center justify-center min-w-[28px] h-6 px-2 rounded-full text-xs
            ${
              count > 0
                ? active
                  ? "bg-indigo-100 text-indigo-700"
                  : "bg-gray-100 text-gray-700"
                : "bg-gray-100 text-gray-400"
            }`}
        >
          {count}
        </span>
      </button>
    );
  };

  const sidebarCounts = {
    inbox: inbox.length,
    unread: unread.length,
    replied: replied.length,
    notreplied: notReplied.length,
    trash: trash.length,
  };

  const folderTitle =
    folder === "inbox"
      ? "Inbox"
      : folder === "unread"
      ? "Unread"
      : folder === "replied"
      ? "Replied"
      : folder === "notreplied"
      ? "Not Replied"
      : "Trash";

  // Loading / Error
  if (loading) {
    return (
      <div className="max-w-7xl mx-auto w-full px-5 md:px-8 py-8">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
          Messages
        </h1>
        <div className="border-y bg-white p-6 md:p-8">
          <div className="h-6 w-40 bg-gray-200 mb-6" />
          <div className="h-10 w-full bg-gray-200 mb-4" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <div className="h-16 bg-gray-200 rounded" />
            <div className="h-16 bg-gray-200 rounded" />
            <div className="h-16 bg-gray-200 rounded" />
            <div className="h-16 bg-gray-200 rounded" />
          </div>
          <div className="h-10 w-full bg-gray-200 mb-2" />
          <div className="h-10 w-full bg-gray-200 mb-2" />
          <div className="h-10 w-full bg-gray-200" />
        </div>
      </div>
    );
  }

  if (err) {
    return (
      <div className="max-w-7xl mx-auto w-full px-5 md:px-8 py-8">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
          Messages
        </h1>
        <div className="border-y bg-white p-6 md:p-8">
          <div className="rounded-lg px-4 py-3 text-sm bg-red-50 text-red-800 border border-red-200">
            {err}
          </div>
        </div>
      </div>
    );
  }

  // Selected message for drawer
  const selected = selectedId ? getById(selectedId) : null;

  return (
    <div className="max-w-7xl mx-auto w-full px-5 md:px-8 py-8">
      {/* Page Title */}
      <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
        Messages
      </h1>

      {/* Shell */}
      <div className="border-y bg-white relative">
        <div className="flex flex-col md:flex-row">
          {/* Sidebar */}
          <aside className="w-full md:w-64 border-b md:border-b-0 md:border-r p-4 bg-white">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-1 mb-2">
              Mailboxes
            </h2>
            <div className="space-y-1">
              <NavItem
                id="inbox"
                icon={<FiInbox />}
                colorClass="text-sky-500"
                label="Inbox"
                count={sidebarCounts.inbox}
              />
              <NavItem
                id="unread"
                icon={<FiMail />}
                colorClass="text-yellow-500"
                label="Unread"
                count={sidebarCounts.unread}
              />
              <NavItem
                id="replied"
                icon={<FiCheckCircle />}
                colorClass="text-green-600"
                label="Replied"
                count={sidebarCounts.replied}
              />
              <NavItem
                id="notreplied"
                icon={<FiClock />}
                colorClass="text-amber-600"
                label="Not Replied"
                count={sidebarCounts.notReplied}
              />
              <NavItem
                id="trash"
                icon={<FiTrash />}
                colorClass="text-rose-600"
                label="Trash"
                count={sidebarCounts.trash}
              />
            </div>
          </aside>

          {/* Main */}
          <main className="flex-1 p-4 md:p-6">
            {/* Toolbar */}
            <div className="flex flex-col gap-3 md:gap-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="text-lg md:text-xl font-semibold text-gray-900">
                  {folderTitle}
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto md:ml-auto">
                  <div className="relative flex-1 md:w-[420px]">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      id="search"
                      type="text"
                      placeholder="Search messages…"
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      className="w-full rounded-full border border-gray-300 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 px-10 py-2 text-sm text-gray-900 placeholder-gray-400 shadow-sm"
                    />
                  </div>

                  <div className="shrink-0">
                    <select
                      className="rounded-full border border-gray-300 px-3 py-2 text-sm bg-white hover:border-gray-400"
                      value={pageSize}
                      onChange={(e) => setPageSize(Number(e.target.value))}
                      title="Page size"
                    >
                      {[10, 20, 40, 50].map((n) => (
                        <option key={n} value={n}>
                          {n} / page
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <p className="text-xs text-gray-500">
                Showing {pageRows.length} of {searched.length} (Filtered) •{" "}
                {scopeList.length} total in{" "}
                {folder === "trash" ? "Trash" : "Inbox"}
              </p>
            </div>

            {/* Table */}
            <div className="mt-3 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-600 border-b">
                    <th className="py-3 pr-4">Name</th>
                    <th className="py-3 pr-4">Email</th>
                    <th className="py-3 pr-4 hidden md:table-cell">Phone</th>
                    <th className="py-3 pr-4">Message</th>
                    <th className="py-3 pr-4 text-center hidden sm:table-cell">
                      Replies
                    </th>
                    <th className="py-3 pr-4 hidden lg:table-cell">Date</th>
                    <th className="py-3 pr-0 text-center">Status</th>
                    <th className="py-3 pl-2 pr-0 text-right">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {pageRows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="py-6 text-center text-gray-500"
                      >
                        No messages found.
                      </td>
                    </tr>
                  ) : (
                    pageRows.map((m) => {
                      const fullName = [m.firstName, m.lastName]
                        .filter(Boolean)
                        .join(" ");
                      const preview =
                        (m.message_text || "").length > 80
                          ? `${m.message_text.slice(0, 80)}…`
                          : m.message_text || "—";
                      const repliesCount = m.replies?.length || 0;
                      const dateLabel = m.createdAt
                        ? new Date(m.createdAt).toLocaleString()
                        : m.updatedAt
                        ? new Date(m.updatedAt).toLocaleString()
                        : "—";

                      const clickable = folder !== "trash";

                      return (
                        <tr
                          key={m._id}
                          className={`border-b hover:bg-gray-50 ${
                            clickable ? "cursor-pointer" : ""
                          }`}
                          onClick={() => {
                            if (clickable) openDrawer(m._id);
                          }}
                        >
                          <td className="py-3 pr-4">
                            <div className="font-medium text-gray-900">
                              {fullName || "—"}
                            </div>
                            <div className="text-xs text-gray-500 lg:hidden">
                              {dateLabel}
                            </div>
                          </td>
                          <td className="py-3 pr-4 text-gray-700">
                            {m.email || "—"}
                          </td>
                          <td className="py-3 pr-4 text-gray-700 hidden md:table-cell">
                            {m.phone || "—"}
                          </td>
                          <td className="py-3 pr-4 text-gray-700">{preview}</td>
                          <td className="py-3 pr-4 text-center hidden sm:table-cell">
                            <span className="inline-flex items-center justify-center rounded-full border px-2 py-0.5 text-xs text-gray-700">
                              {repliesCount}
                            </span>
                          </td>
                          <td className="py-3 pr-4 hidden lg:table-cell text-gray-700">
                            {dateLabel}
                          </td>
                          <td className="py-3 pr-0 text-center">
                            {m.isRead ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 text-xs">
                                <FiCheckCircle className="text-green-600" />{" "}
                                Read
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-yellow-50 text-yellow-700 border border-yellow-200 px-2 py-0.5 text-xs">
                                <FiMail className="text-yellow-600" /> Unread
                              </span>
                            )}
                          </td>
                          <td className="py-3 pl-2 pr-0 text-right space-x-2">
                            {folder !== "trash" ? (
                              <button
                                className="inline-flex items-center justify-center p-2 rounded hover:bg-red-50 text-red-600"
                                title="Move to Trash"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  moveToTrash(m._id);
                                }}
                              >
                                <FiTrash2 className="h-5 w-5" />
                              </button>
                            ) : (
                              <>
                                <button
                                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full
                                             border border-green-200 bg-green-50 text-green-700
                                             hover:bg-green-100"
                                  title="Restore to Inbox"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    restoreMessage(m._id);
                                  }}
                                >
                                  <FiRefreshCcw className="h-4 w-4" />
                                  <span>Restore</span>
                                </button>
                                <button
                                  className="inline-flex items-center justify-center p-2 rounded hover:bg-red-50 text-red-600"
                                  title="Delete Permanently"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deletePermanent(m._id);
                                  }}
                                >
                                  <FiTrash2 className="h-5 w-5" />
                                </button>
                              </>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                className="px-3 py-1.5 border rounded disabled:opacity-50"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                Prev
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`px-3 py-1.5 border rounded ${
                    p === currentPage
                      ? "bg-gray-100 font-semibold"
                      : "hover:bg-gray-50"
                  }`}
                >
                  {p}
                </button>
              ))}

              <button
                className="px-3 py-1.5 border rounded disabled:opacity-50"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </button>
            </div>

            <p className="mt-4 text-xs text-gray-500">
              Click a row to read and reply (except in Trash). Deleting moves it
              to Trash (auto-deletes after 30 days). In Trash, use{" "}
              <strong>Restore</strong> or <strong>Delete Permanently</strong>.
            </p>
          </main>
        </div>

        {/* RIGHT DRAWER (Read & Reply) */}
        {drawerOpen && selected && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/20 z-40"
              onClick={closeDrawer}
            />
            {/* Panel */}
            <aside
              className="fixed right-0 top-0 bottom-0 w-full sm:w-[520px] bg-white shadow-2xl z-50
                         flex flex-col"
            >
              {/* Header */}
              <div className="p-4 border-b flex items-center justify-between">
                <div className="min-w-0">
                  <div className="text-sm text-gray-500">
                    {selected.email || "—"}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 truncate">
                    {[selected.firstName, selected.lastName]
                      .filter(Boolean)
                      .join(" ") || "Message"}
                  </h3>
                  <div className="text-xs text-gray-500">
                    {selected.createdAt
                      ? new Date(selected.createdAt).toLocaleString()
                      : "—"}
                  </div>
                </div>
                <button
                  className="p-2 rounded hover:bg-gray-100"
                  onClick={closeDrawer}
                  title="Close"
                >
                  <FiX className="h-5 w-5" />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {/* Original message */}
                <section className="rounded border p-3">
                  <div className="text-xs font-semibold text-gray-700 mb-1">
                    Message
                  </div>
                  <div className="whitespace-pre-wrap text-sm text-gray-800">
                    {selected.message_text || "—"}
                  </div>
                </section>

                {/* Replies thread */}
                <section>
                  <div className="text-xs font-semibold text-gray-700 mb-2">
                    Replies
                  </div>
                  {selected.replies && selected.replies.length > 0 ? (
                    <ul className="space-y-2">
                      {selected.replies.map((r, i) => (
                        <li
                          key={i}
                          className="rounded border bg-white p-2 text-xs text-gray-700"
                        >
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <span className="font-semibold">
                              {r.name || "Support"}
                            </span>
                            {r.email && (
                              <span className="text-gray-500">• {r.email}</span>
                            )}
                            <span className="text-gray-500">
                              •{" "}
                              {r.timestamp
                                ? new Date(r.timestamp).toLocaleString()
                                : "—"}
                            </span>
                          </div>
                          <div className="mt-1 whitespace-pre-wrap">
                            {r.message || "—"}
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="text-xs text-gray-500">No replies yet.</div>
                  )}
                </section>
              </div>

              {/* Footer: Reply + quick actions */}
              <div className="border-t p-3">
                <div className="space-y-2">
                  <textarea
                    rows={3}
                    className="w-full border rounded p-2 text-sm"
                    placeholder="Type your reply…"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                  />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        className="inline-flex items-center gap-2 px-3 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
                        onClick={sendReply}
                        disabled={replySending || !replyText.trim()}
                        title="Send reply"
                      >
                        <FiSend className="h-4 w-4" />
                        {replySending ? "Sending…" : "Send Reply"}
                      </button>

                      <button
                        className="inline-flex items-center gap-2 px-3 py-2 rounded border hover:bg-gray-50"
                        onClick={() => moveToTrash(selected._id)}
                        title="Move to Trash"
                      >
                        <FiTrash2 className="h-4 w-4" />
                        Trash
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      {!selected.isTrashed ? null : (
                        <>
                          <button
                            className="inline-flex items-center gap-2 px-3 py-2 rounded border border-green-200 bg-green-50 text-green-700 hover:bg-green-100"
                            onClick={() => restoreMessage(selected._id)}
                            title="Restore to Inbox"
                          >
                            <FiRefreshCcw className="h-4 w-4" />
                            Restore
                          </button>
                          <button
                            className="inline-flex items-center gap-2 px-3 py-2 rounded border hover:bg-red-50 text-red-600"
                            onClick={() => deletePermanent(selected._id)}
                            title="Delete Permanently"
                          >
                            <FiTrash2 className="h-4 w-4" />
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </aside>
          </>
        )}
      </div>
    </div>
  );
};

export default AllMessages;
