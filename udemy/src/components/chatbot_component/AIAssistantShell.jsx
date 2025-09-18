// src/components/ai_components/AIAssistantShell.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import {
  FiSend,
  FiMenu,
  FiPlus,
  FiClock,
  FiChevronRight,
  FiTrash2,
  FiLoader,
  FiThumbsUp,
  FiThumbsDown,
} from "react-icons/fi";

import globalBackendRoute from "../../config/Config";
import { getAuthorizationHeader } from "../auth_components/AuthManager";

const API = globalBackendRoute;                    // e.g., http://localhost:3011
const CHAT_BASE = `${API}/api/chat-interactions`;  // your routes
const ASK_API = `${API}/api/ai/ask`;               // your AI endpoint (accepts {question, mode})

const SID_KEY = "chat_workspace_sid_v1";
function ensureSessionId() {
  let sid = localStorage.getItem(SID_KEY);
  if (!sid) {
    sid = cryptoRandomId();
    localStorage.setItem(SID_KEY, sid);
  }
  return sid;
}
function cryptoRandomId(len = 24) {
  const arr = new Uint8Array(len);
  (window.crypto || window.msCrypto).getRandomValues(arr);
  return Array.from(arr, (x) => ("0" + x.toString(16)).slice(-2)).join("");
}

// LocalStorage helpers (per scope)
function lsKey(scope, suffix) {
  return `ai_${scope}_${suffix}_v1`;
}

export default function AIAssistantShell({
  title,
  scope,                     // "tutor" | "codegen" | "summary" | "roadmap" | "dashboard"
  placeholder = "Ask me anything…",
  starterPrompts = [],
}) {
  const sid = useMemo(() => ensureSessionId(), []);
  const headers = useMemo(() => {
    const h = { "X-Session-Id": sid, "X-Channel": "widget" };
    const auth = getAuthorizationHeader?.();
    if (auth?.Authorization) h["Authorization"] = auth.Authorization;
    return h;
  }, [sid]);

  // ----------------------- UI State -----------------------
  const [sidebarOpen, setSidebarOpen] = useState(false); // mobile drawer
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [input, setInput] = useState("");

  // Conversation state (array of {role:'user'|'ai', text, time, interactionId?})
  const [messages, setMessages] = useState(() => {
    const saved = localStorage.getItem(lsKey(scope, "active_convo"));
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return [{ id: "welcome", role: "ai", text: `👋 Welcome to ${title}. How may I help?`, time: Date.now() }];
  });

  // Topic history (left sidebar): [{id, title, at}]
  const [topics, setTopics] = useState(() => {
    const saved = localStorage.getItem(lsKey(scope, "topics"));
    if (saved) { try { return JSON.parse(saved) || []; } catch {} }
    return [];
  });

  const listRef = useRef(null);
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
    localStorage.setItem(lsKey(scope, "active_convo"), JSON.stringify(messages));
  }, [messages, scope]);

  // ----------------------- Actions -----------------------
  function newChat() {
    setMessages([{ id: "welcome", role: "ai", text: `🆕 New chat in ${title}.`, time: Date.now() }]);
    setInput("");
    setError("");
  }

  function addTopic(titleText) {
    const t = (titleText || "").trim();
    if (!t) return;
    const topic = { id: cryptoRandomId(8), title: t.slice(0, 80), at: Date.now() };
    const next = [topic, ...topics].slice(0, 200); // cap
    setTopics(next);
    localStorage.setItem(lsKey(scope, "topics"), JSON.stringify(next));
  }

  function removeTopic(id) {
    const next = topics.filter((t) => t.id !== id);
    setTopics(next);
    localStorage.setItem(lsKey(scope, "topics"), JSON.stringify(next));
  }

  function pickTopic(t) {
    // simple behavior: put topic text into composer
    setInput(t.title);
  }

  async function rate(interactionId, thumb) {
    if (!interactionId) return;
    try {
      const rating = thumb === "up" ? 5 : 1;
      await axios.post(`${CHAT_BASE}/rate-interaction/${interactionId}`, { rating, thumb }, { headers });
    } catch (e) {
      console.warn("rate failed:", e?.response?.data || e.message);
    }
  }

  async function send() {
    const question = input.trim();
    if (!question || busy) return;
    setBusy(true);
    setError("");

    // UX: push user msg
    const userMsg = { id: "u_" + cryptoRandomId(8), role: "user", text: question, time: Date.now() };
    setMessages((m) => [...m, userMsg]);
    setInput("");

    // Add to topics (left)
    addTopic(question);

    // 1) start-interaction (store question)
    let interactionId = null;
    try {
      const startPayload = {
        questionText: question,
        questionLanguage: "en",
        questionContentType: "text",
        questionTags: [scope],
        pageUrl: window.location.href,
        referrer: document.referrer,
        pathname: window.location.pathname,
        locale: navigator.language || "en-IN",
        appVersion: `web@${scope}`,
      };
      const r = await axios.post(`${CHAT_BASE}/start-interaction`, startPayload, { headers });
      interactionId = r?.data?.data?._id || null;
    } catch (e) {
      console.warn("start-interaction failed:", e?.response?.data || e.message);
    }

    // 2) call AI for this scope
    let aiText = "";
    try {
      const ai = await axios.post(ASK_API, { question, mode: scope }, { headers });
      aiText = ai?.data?.answer || ai?.data?.data?.answer || ai?.data?.message || "";
    } catch (e) {
      setError(e?.response?.data?.message || "Model is unavailable at the moment.");
    }

    // 3) attach/log response
    try {
      if (interactionId) {
        await axios.post(
          `${CHAT_BASE}/attach-response/${interactionId}`,
          {
            responseText: aiText || "No response.",
            responseStatus: aiText ? "good" : "no_response",
            model: "your-model",
            modelVersion: "v1",
          },
          { headers }
        );
      } else {
        await axios.post(
          `${CHAT_BASE}/log-interaction`,
          {
            questionText: question,
            questionTags: [scope],
            responseText: aiText || "No response.",
            responseStatus: aiText ? "good" : "no_response",
            model: "your-model",
            modelVersion: "v1",
            pageUrl: window.location.href,
            pathname: window.location.pathname,
          },
          { headers }
        );
      }
    } catch (e) {
      console.warn("attach/log failed:", e?.response?.data || e.message);
    }

    // 4) show AI msg
    const aiMsg = {
      id: "a_" + cryptoRandomId(8),
      role: "ai",
      text:
        aiText ||
        `I couldn't reach the AI service for ${title}. Please try again.`,
      time: Date.now(),
      interactionId: interactionId || null,
    };
    setMessages((m) => [...m, aiMsg]);
    setBusy(false);
  }

  function onKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  // ----------------------- UI -----------------------
  return (
    <div className="w-full min-h-[calc(100vh-8rem)] sm:min-h-[calc(100vh-10rem)]">
      {/* Top bar (mobile) */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 border-b bg-white sticky top-0 z-10">
        <button
          className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm bg-gray-50"
          onClick={() => setSidebarOpen(true)}
        >
          <FiMenu /> Topics
        </button>
        <div className="text-base font-semibold">{title}</div>
        <button
          onClick={newChat}
          className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm bg-gray-50"
        >
          <FiPlus /> New
        </button>
      </div>

      <div className="mx-auto max-w-7xl grid md:grid-cols-[280px,1fr]">
        {/* Sidebar */}
        <aside
          className={`${
            sidebarOpen ? "fixed inset-0 z-40 bg-black/40 md:bg-transparent" : ""
          } md:static`}
        >
          <div
            className={`${
              sidebarOpen ? "absolute left-0 top-0 bottom-0" : "hidden md:block"
            } w-[80%] max-w-[320px] md:w-[280px] h-full md:h-auto bg-white md:bg-transparent border-r md:border-r p-4`}
          >
            <div className="hidden md:flex items-center justify-between mb-3">
              <div className="text-sm font-semibold">{title} Topics</div>
              <button
                onClick={newChat}
                className="inline-flex items-center gap-1 text-xs border rounded px-2 py-1 bg-gray-50"
              >
                <FiPlus /> New
              </button>
            </div>
            <ul className="space-y-1 max-h-[70vh] md:max-h-[calc(100vh-18rem)] overflow-y-auto">
              {topics.length === 0 && (
                <li className="text-xs text-gray-500">No topics yet. Ask your first question!</li>
              )}
              {topics.map((t) => (
                <li
                  key={t.id}
                  className="group flex items-center justify-between gap-2 rounded-lg border px-3 py-2 hover:bg-indigo-50 hover:border-indigo-200 cursor-pointer"
                >
                  <button
                    onClick={() => pickTopic(t)}
                    className="flex items-center gap-2 text-left flex-1"
                    title={t.title}
                  >
                    <FiChevronRight className="shrink-0 text-gray-400" />
                    <span className="text-sm line-clamp-1">{t.title}</span>
                  </button>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <FiClock />
                    {new Date(t.at).toLocaleTimeString()}
                    <button
                      onClick={() => removeTopic(t.id)}
                      className="opacity-0 group-hover:opacity-100 transition"
                      title="Remove"
                    >
                      <FiTrash2 />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            {sidebarOpen && (
              <button
                className="absolute top-3 right-3 text-white" onClick={() => setSidebarOpen(false)}
                aria-label="Close topics"
              >
                ✕
              </button>
            )}
          </div>
        </aside>

        {/* Chat area */}
        <main className="min-h-[70vh] flex flex-col">
          {/* Header (desktop) */}
          <div className="hidden md:flex items-center justify-between px-6 py-4 border-b bg-white sticky top-0 z-10">
            <h1 className="text-xl font-bold text-gray-900">{title}</h1>
            <button
              onClick={newChat}
              className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm bg-gray-50 hover:bg-gray-100"
            >
              <FiPlus /> New chat
            </button>
          </div>

          {/* Messages */}
          <div ref={listRef} className="flex-1 overflow-y-auto px-4 md:px-6 py-4 bg-white">
            <div className="mx-auto max-w-3xl">
              {messages.map((m) => (
                <div key={m.id} className={`mb-4 ${m.role === "user" ? "text-right" : "text-left"}`}>
                  <div
                    className={`inline-block rounded-2xl px-4 py-2 text-sm shadow ${
                      m.role === "user"
                        ? "bg-indigo-600 text-white"
                        : "bg-gray-50 text-gray-900 border"
                    }`}
                  >
                    <div className="whitespace-pre-wrap break-words">{m.text}</div>
                    <div
                      className={`text-[10px] mt-1 ${
                        m.role === "user" ? "text-indigo-100/80" : "text-gray-500"
                      }`}
                    >
                      {new Date(m.time).toLocaleTimeString()}
                    </div>
                  </div>
                  {m.role === "ai" && m.interactionId && (
                    <div className="mt-2 flex gap-2 text-xs">
                      <button
                        onClick={() => rate(m.interactionId, "up")}
                        className="inline-flex items-center gap-1 border rounded px-2 py-1 hover:bg-gray-50"
                      >
                        <FiThumbsUp /> Helpful
                      </button>
                      <button
                        onClick={() => rate(m.interactionId, "down")}
                        className="inline-flex items-center gap-1 border rounded px-2 py-1 hover:bg-gray-50"
                      >
                        <FiThumbsDown /> Not helpful
                      </button>
                    </div>
                  )}
                </div>
              ))}
              {busy && (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <FiLoader className="animate-spin" /> thinking…
                </div>
              )}
              {error && <div className="mt-2 text-xs text-red-600">{error}</div>}
            </div>
          </div>

          {/* Quick starters */}
          {starterPrompts?.length > 0 && (
            <div className="px-4 md:px-6">
              <div className="mx-auto max-w-3xl flex flex-wrap gap-2 pb-2">
                {starterPrompts.map((p) => (
                  <button
                    key={p}
                    onClick={() => setInput(p)}
                    className="text-xs border rounded-full px-3 py-1 bg-gray-50 hover:bg-indigo-50 hover:border-indigo-200"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Composer */}
          <div className="border-t bg-white px-4 md:px-6 py-3">
            <div className="mx-auto max-w-3xl">
              <div className="flex items-end gap-2">
                <textarea
                  rows={2}
                  className="flex-1 resize-none rounded-xl border p-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  placeholder={placeholder}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                  disabled={busy}
                />
                <button
                  onClick={send}
                  disabled={busy || !input.trim()}
                  className={`rounded-xl px-3 py-2 text-sm inline-flex items-center gap-2 ${
                    busy || !input.trim()
                      ? "bg-gray-200 text-gray-500"
                      : "bg-indigo-600 text-white hover:bg-indigo-700"
                  }`}
                >
                  <FiSend /> Send
                </button>
              </div>
              <div className="mt-1 text-[10px] text-gray-500">
                Press Enter to send • Shift+Enter for newline
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
