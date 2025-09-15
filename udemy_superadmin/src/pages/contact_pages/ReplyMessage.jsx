import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  FiMail,
  FiPhone,
  FiUser,
  FiClock,
  FiCornerDownLeft,
  FiInbox,
  FiCheckCircle,
  FiSearch,
  FiTrash,
  FiChevronLeft,
  FiDownload,
  FiMoreHorizontal,
  FiBookOpen,
  FiRefreshCcw,
  FiFlag,
} from "react-icons/fi";
import globalBackendRoute from "../../config/Config";

const ReplyMessage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const API =
    globalBackendRoute ||
    import.meta?.env?.VITE_BACKEND_URL ||
    "http://localhost:5000";

  // Single message
  const [msg, setMsg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // Sidebar counts
  const [allMessages, setAllMessages] = useState([]);
  const [countsLoading, setCountsLoading] = useState(true);

  // Reply form
  const [replying, setReplying] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [alert, setAlert] = useState({ type: "", text: "" });

  // Filter replies inside thread
  const [rq, setRq] = useState("");

  const textareaRef = useRef(null);

  const fullName = useMemo(() => {
    if (!msg) return "";
    return [msg.firstName, msg.lastName].filter(Boolean).join(" ");
  }, [msg]);

  const initials = useMemo(() => {
    const s = fullName || msg?.email || "U";
    const parts = s.trim().split(/\s+/);
    const i = (parts[0]?.[0] || "") + (parts[1]?.[0] || "");
    return (i || "U").toUpperCase();
  }, [fullName, msg?.email]);

  const subject = useMemo(() => {
    const preview = (msg?.message_text || "").replace(/\s+/g, " ").trim();
    const short = preview.length > 42 ? preview.slice(0, 42) + "…" : preview;
    return short || `Message from ${fullName || msg?.email || "User"}`;
  }, [msg?.message_text, fullName, msg?.email]);

  // Fetch single message + mark read
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API}/api/reply-message/${id}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || "Failed to fetch message.");
        if (active) setMsg(json);
      } catch (e) {
        if (active) setErr(e.message || "Something went wrong.");
      } finally {
        if (active) setLoading(false);
      }

      // Mark as read (server) – fire-and-forget
      try {
        await fetch(`${API}/api/messages/mark-as-read`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messageId: id }),
        });
        if (active) setMsg((prev) => (prev ? { ...prev, isRead: true } : prev));
      } catch {
        /* no-op */
      }
    })();
    return () => {
      active = false;
    };
  }, [API, id]);

  // Fetch all messages for sidebar counts
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setCountsLoading(true);
        const res = await fetch(`${API}/api/all-messages`);
        const json = await res.json();
        if (!res.ok)
          throw new Error(json?.error || "Failed to fetch messages.");
        if (active) setAllMessages(Array.isArray(json) ? json : []);
      } catch {
        if (active) setAllMessages([]);
      } finally {
        if (active) setCountsLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [API]);

  // Sidebar buckets
  const inbox = useMemo(
    () => allMessages.filter((m) => !m.isTrashed),
    [allMessages]
  );
  const trash = useMemo(
    () => allMessages.filter((m) => !!m.isTrashed),
    [allMessages]
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

  const sidebarCounts = {
    inbox: inbox.length,
    unread: unread.length,
    replied: replied.length,
    notreplied: notReplied.length,
    trash: trash.length,
  };

  // Helpers
  const markUnreadLocal = () =>
    setMsg((prev) => (prev ? { ...prev, isRead: false } : prev));

  const markUnreadServer = async () => {
    try {
      // If your backend adds support, send a hint flag. Safe to ignore if not supported.
      await fetch(`${API}/api/messages/mark-as-read`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId: id, unread: true }),
      });
    } catch {
      // ignore
    }
  };

  const handleMarkUnread = async () => {
    markUnreadLocal();
    await markUnreadServer();
  };

  const handleTrash = async () => {
    const ok = window.confirm("Move this conversation to Trash?");
    if (!ok) return;
    try {
      const res = await fetch(`${API}/api/messages/${id}/trash`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to move to trash.");
      navigate("/all-messages");
    } catch (e) {
      alert(e.message || "Failed to move to trash.");
    }
  };

  const onFormChange = (e) => {
    const { name, value } = e.target;
    setAlert({ type: "", text: "" });
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setAlert({ type: "", text: "" });

    if (!form.name.trim() || !form.message.trim()) {
      setAlert({
        type: "error",
        text: "Your name and reply message are required.",
      });
      return;
    }

    try {
      setReplying(true);
      const res = await fetch(`${API}/api/give-message-reply/${id}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to send reply.");

      // Optimistically append
      setMsg((prev) =>
        prev
          ? { ...prev, replies: [...(prev.replies || []), json.newReply] }
          : prev
      );
      setAlert({
        type: "success",
        text: "Reply sent and email notification triggered.",
      });
      setForm({ name: "", email: "", message: "" });

      // focus input again for quick follow-up
      textareaRef.current?.focus();
    } catch (e) {
      setAlert({ type: "error", text: e.message || "Failed to send reply." });
    } finally {
      setReplying(false);
    }
  };

  // Filtered replies (search within thread)
  const filteredReplies = useMemo(() => {
    const list = msg?.replies || [];
    if (!rq.trim()) return list;
    const needle = rq.toLowerCase();
    return list.filter((r) => {
      const block = `${r?.name || ""} ${r?.email || ""} ${r?.message || ""}`
        .toLowerCase()
        .trim();
      return block.includes(needle);
    });
  }, [msg?.replies, rq]);

  const NavItem = ({ icon, colorClass, label, count, onClick }) => (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition hover:bg-gray-50 text-gray-700"
      title={label}
    >
      <span className="flex items-center gap-2">
        <span className={colorClass}>{icon}</span>
        {label}
      </span>
      <span
        className={`ml-3 inline-flex items-center justify-center min-w-[28px] h-6 px-2 rounded-full text-xs
          ${
            count > 0
              ? "bg-gray-100 text-gray-700"
              : "bg-gray-100 text-gray-400"
          }`}
      >
        {countsLoading ? "…" : count}
      </span>
    </button>
  );

  const TopActionButton = ({ icon, label, onClick }) => (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border hover:bg-gray-50 text-sm"
      title={label}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto w-full px-5 md:px-8 py-8">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
          Inbox
        </h1>
        <div className="border-y bg-white p-6 md:p-8">
          <div className="h-8 w-56 bg-gray-200 mb-4" />
          <div className="h-16 w-full bg-gray-200 mb-4" />
          <div className="h-40 w-full bg-gray-200" />
        </div>
      </div>
    );
  }

  if (err) {
    return (
      <div className="max-w-7xl mx-auto w-full px-5 md:px-8 py-8">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
          Inbox
        </h1>
        <div className="border-y bg-white p-6 md:p-8">
          <div className="rounded-lg px-4 py-3 text-sm bg-red-50 text-red-800 border border-red-200">
            {err}
          </div>
          <div className="mt-4">
            <Link to="/all-messages" className="text-gray-900 underline">
              ← Back to Inbox
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!msg) return null;

  const createdAtLabel = msg.createdAt
    ? new Date(msg.createdAt).toLocaleString()
    : "—";

  return (
    <div className="max-w-7xl mx-auto w-full px-5 md:px-8 py-8">
      {/* Page title (outside, left) */}
      <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
        Inbox
      </h1>

      {/* Main sheet with only top & bottom borders */}
      <div className="border-y bg-white">
        <div className="flex flex-col md:flex-row">
          {/* SIDEBAR */}
          <aside className="w-full md:w-64 border-b md:border-b-0 md:border-r p-4 bg-white">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-1 mb-2">
              Mailboxes
            </h2>
            <div className="space-y-1">
              <NavItem
                icon={<FiInbox />}
                colorClass="text-sky-500"
                label="Inbox"
                count={sidebarCounts.inbox}
                onClick={() => navigate("/all-messages")}
              />
              <NavItem
                icon={<FiMail />}
                colorClass="text-yellow-500"
                label="Unread"
                count={sidebarCounts.unread}
                onClick={() => navigate("/all-messages?filter=unread")}
              />
              <NavItem
                icon={<FiCheckCircle />}
                colorClass="text-green-600"
                label="Replied"
                count={sidebarCounts.replied}
                onClick={() => navigate("/all-messages?filter=replied")}
              />
              <NavItem
                icon={<FiClock />}
                colorClass="text-amber-600"
                label="Not Replied"
                count={sidebarCounts.notreplied}
                onClick={() => navigate("/all-messages?filter=notreplied")}
              />
              <NavItem
                icon={<FiTrash />}
                colorClass="text-rose-600"
                label="Trash"
                count={sidebarCounts.trash}
                onClick={() => navigate("/all-messages?filter=trash")}
              />
            </div>
          </aside>

          {/* CONTENT */}
          <main className="flex-1 p-4 md:p-6">
            {/* TOP ACTION BAR (gmail-like) */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate("/all-messages")}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border hover:bg-gray-50 text-sm"
                  title="Back to inbox"
                >
                  <FiChevronLeft />
                  <span className="hidden sm:inline">Back</span>
                </button>

                <TopActionButton
                  icon={<FiRefreshCcw />}
                  label="Mark Unread"
                  onClick={handleMarkUnread}
                />
              </div>

              <div className="text-xs sm:text-sm text-gray-500">
                {msg.isRead ? "Read" : "Unread"} • {createdAtLabel}
              </div>
            </div>

            {/* MESSAGE HEADER (gmail look) */}
            <div className="pb-3">
              <div className="mt-3 flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-semibold">
                    {initials}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-semibold text-gray-900">
                        {fullName || "Unknown Sender"}
                      </span>
                      <span className="text-gray-500">
                        &lt;{msg.email || "—"}&gt;
                      </span>
                    </div>
                    <div className="text-xs text-gray-500">
                      to <span className="font-medium">Ecoders Support</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {msg.isRead ? (
                    <span className="inline-flex items-center rounded-full bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 text-xs">
                      Read
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-yellow-50 text-yellow-700 border border-yellow-200 px-2 py-0.5 text-xs">
                      Unread
                    </span>
                  )}
                  {(msg.replies?.length || 0) > 0 && (
                    <span className="inline-flex items-center rounded-full bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 text-xs">
                      {msg.replies.length} Reply
                      {msg.replies.length > 1 ? "ies" : ""}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* ORIGINAL MESSAGE */}
            <div className="rounded-lg border p-4">
              <div className="text-sm text-gray-800 whitespace-pre-wrap">
                {msg.message_text || "—"}
              </div>

              {/* Sender meta (like Gmail detail strip) */}
              <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-2 text-xs text-gray-600">
                <div className="flex items-center gap-1">
                  <FiUser /> {fullName || "—"}
                </div>
                <div className="flex items-center gap-1 break-all">
                  <FiMail /> {msg.email || "—"}
                </div>
                <div className="flex items-center gap-1">
                  <FiPhone /> {msg.phone || "—"}
                </div>
              </div>
            </div>

            {/* SEARCH IN THREAD + REPLIES */}
            <div className="mt-6">
              {(msg.replies || []).length > 0 && (
                <div className="mt-4 space-y-3">
                  {filteredReplies.length === 0 ? (
                    <div className="text-sm text-gray-500 px-2">
                      No replies match your search.
                    </div>
                  ) : (
                    filteredReplies.map((r, idx) => (
                      <div
                        key={idx}
                        className="rounded-lg border p-3 bg-gray-50"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-700 text-xs font-semibold">
                              {(r?.name?.[0] || "S").toUpperCase()}
                            </div>
                            <div className="text-sm">
                              <div className="font-medium text-gray-900">
                                {r.name || "Support"}
                                {r.email ? (
                                  <span className="text-gray-500 font-normal">
                                    {" "}
                                    • {r.email}
                                  </span>
                                ) : null}
                              </div>
                              <div className="text-xs text-gray-500">
                                {r.timestamp
                                  ? new Date(r.timestamp).toLocaleString()
                                  : "—"}
                              </div>
                            </div>
                          </div>
                          <button
                            className="inline-flex items-center gap-2 px-2 py-1 rounded-lg border hover:bg-white text-xs"
                            onClick={() =>
                              navigator.clipboard
                                .writeText(r.message || "")
                                .then(() => alert("Copied"))
                                .catch(() => {})
                            }
                          >
                            Copy
                          </button>
                        </div>
                        <div className="mt-2 text-sm text-gray-800 whitespace-pre-wrap">
                          {r.message}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* INLINE REPLY COMPOSER */}
            <div className="mt-6 rounded-lg border">
              <form onSubmit={onSubmit} className="p-3 sm:p-4">
                {alert.text ? (
                  <div
                    className={`mb-4 rounded-lg px-4 py-3 text-sm ${
                      alert.type === "success"
                        ? "bg-green-50 text-green-800 border border-green-200"
                        : "bg-red-50 text-red-800 border border-red-200"
                    }`}
                  >
                    {alert.text}
                  </div>
                ) : null}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Your Name <span className="text-red-600">*</span>
                    </label>
                    <input
                      name="name"
                      type="text"
                      required
                      value={form.name}
                      onChange={onFormChange}
                      placeholder="e.g., Ecoders Support"
                      className="w-full rounded-lg border border-gray-300 focus:border-gray-400 focus:ring-0 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Your Email (optional)
                    </label>
                    <input
                      name="email"
                      type="email"
                      value={form.email}
                      onChange={onFormChange}
                      placeholder="you@company.com"
                      className="w-full rounded-lg border border-gray-300 focus:border-gray-400 focus:ring-0 px-3 py-2 text-sm"
                    />
                  </div>
                </div>

                <div className="mt-3">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Your Reply <span className="text-red-600">*</span>
                  </label>
                  <textarea
                    ref={textareaRef}
                    name="message"
                    required
                    rows={5}
                    value={form.message}
                    onChange={onFormChange}
                    placeholder="Type your reply… (Enter to send • Shift+Enter for a newline)"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        !replying && onSubmit(e);
                      }
                    }}
                    className="w-full rounded-lg border border-gray-300 focus:border-gray-400 focus:ring-0 px-3 py-2 text-sm"
                  />
                </div>

                <div className="mt-3 flex items-center gap-2 flex-wrap">
                  <button
                    type="submit"
                    disabled={replying}
                    className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-white text-sm font-semibold ${
                      replying
                        ? "bg-gray-400 cursor-not-allowed"
                        : "bg-indigo-600 hover:bg-indigo-700"
                    }`}
                  >
                    <FiCornerDownLeft className="h-4 w-4" />
                    {replying ? "Sending…" : "Send"}
                  </button>

                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-full px-4 py-2 border text-sm hover:bg-gray-50"
                    onClick={() =>
                      setForm({ name: "", email: "", message: "" })
                    }
                  >
                    Discard
                  </button>
                </div>

                {/* Tiny toolbar (mock) */}
                <div className="mt-3 flex items-center gap-2 text-gray-500 text-xs">
                  <FiBookOpen />
                  Smart reply
                  <span className="mx-1">•</span>
                  <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                    Thanks for reaching out!
                  </span>
                  <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-700 hidden sm:inline">
                    We’ll get back shortly.
                  </span>
                </div>
              </form>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default ReplyMessage;
