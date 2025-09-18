// src/components/chatbot/ChatBot.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import {
  FiMessageSquare,
  FiSend,
  FiX,
  FiMinus,
  FiMaximize2,
  FiThumbsUp,
  FiThumbsDown,
  FiLoader,
  FiCpu,      // <- replaced FiBot with FiCpu
  FiUser,
} from "react-icons/fi";

import globalBackendRoute from "../../config/Config";
import {
  getAuthorizationHeader,
  getTokenUserId,
} from "../auth_components/AuthManager";

const API = globalBackendRoute;
const CHAT_BASE = `${API}/api/chat-interactions`;
const ASK_API = `${API}/api/ai/ask`;

const SID_KEY = "chat_widget_sid_v1";
const UI_KEY = "chat_widget_collapsed_v1";

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

function Bubble({ role, text, time }) {
  const isUser = role === "user";
  return (
    <div className={`flex items-start gap-2 ${isUser ? "justify-end" : "justify-start"} mb-3`}>
      {!isUser && (
        <div className="mt-1 shrink-0 rounded-full p-2 bg-indigo-100">
          <FiCpu className="w-4 h-4 text-indigo-600" /> {/* <- here */}
        </div>
      )}
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm shadow ${
          isUser ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-900"
        }`}
      >
        <div className="whitespace-pre-wrap break-words">{text}</div>
        {time && (
          <div className={`text-[10px] mt-1 ${isUser ? "text-indigo-100/80" : "text-gray-500"}`}>
            {new Date(time).toLocaleTimeString()}
          </div>
        )}
      </div>
      {isUser && (
        <div className="mt-1 shrink-0 rounded-full p-2 bg-indigo-100">
          <FiUser className="w-4 h-4 text-indigo-600" />
        </div>
      )}
    </div>
  );
}

function Header({ onClose, onMinimize }) {
  return (
    <div className="flex items-center justify-between p-3 border-b">
      <div className="flex items-center gap-2">
        <div className="rounded-full p-2 bg-indigo-600 text-white">
          <FiMessageSquare className="w-4 h-4" />
        </div>
        <div className="font-medium">Assistant</div>
        <div className="ml-2 text-xs text-gray-500">How may I help you today?</div>
      </div>
      <div className="flex items-center gap-2">
        <button onClick={onMinimize} className="p-2 rounded hover:bg-gray-100" title="Minimize" aria-label="Minimize">
          <FiMinus />
        </button>
        <button onClick={onClose} className="p-2 rounded hover:bg-gray-100" title="Close" aria-label="Close">
          <FiX />
        </button>
      </div>
    </div>
  );
}

export default function ChatBot({ askApi = ASK_API }) {
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(UI_KEY) === "1");
  const [messages, setMessages] = useState(() => [
    { id: "welcome", role: "ai", text: "🤖 Hi! How may I help you today?", time: Date.now() },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const listRef = useRef(null);
  const sid = useMemo(() => ensureSessionId(), []);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, collapsed]);

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem(UI_KEY, next ? "1" : "0");
  };

  const headers = useMemo(() => {
    const h = { "X-Session-Id": sid, "X-Channel": "widget" };
    const auth = getAuthorizationHeader?.();
    if (auth?.Authorization) h["Authorization"] = auth.Authorization;
    return h;
  }, [sid]);

  async function handleSend() {
    const question = input.trim();
    if (!question || busy) return;

    setError("");
    setBusy(true);

    const userMsg = { id: "u_" + cryptoRandomId(8), role: "user", text: question, time: Date.now() };
    setMessages((m) => [...m, userMsg]);
    setInput("");

    let interactionId = null;
    try {
      const startPayload = {
        questionText: question,
        questionLanguage: "en",
        questionContentType: "text",
        pageUrl: window.location.href,
        referrer: document.referrer,
        pathname: window.location.pathname,
        locale: navigator.language || "en-IN",
        appVersion: "web@widget",
      };
      const startRes = await axios.post(`${CHAT_BASE}/start-interaction`, startPayload, { headers });
      interactionId = startRes?.data?.data?._id;
    } catch (e) {
      console.warn("start-interaction failed:", e?.response?.data || e.message);
    }

    let aiText = "";
    try {
      const aiRes = await axios.post(askApi, { question }, { headers });
      aiText = aiRes?.data?.answer || aiRes?.data?.data?.answer || aiRes?.data?.message || "";
    } catch (e) {
      aiText = "";
      setError(e?.response?.data?.message || "Sorry, I'm having trouble responding right now.");
    }

    try {
      if (interactionId) {
        await axios.post(
          `${CHAT_BASE}/attach-response/${interactionId}`,
          {
            responseText: aiText || "No response from model.",
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
            responseText: aiText || "No response from model.",
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

    const aiMsg = {
      id: "a_" + cryptoRandomId(8),
      role: "ai",
      text: aiText || "🙂 I couldn't reach the AI service. Please try again.",
      time: Date.now(),
      interactionId: interactionId || null,
    };
    setMessages((m) => [...m, aiMsg]);
    setBusy(false);
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

  function onKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <>
      {collapsed ? (
        <button
          onClick={toggleCollapsed}
          className="fixed bottom-6 right-6 md:bottom-8 md:right-8 z-50 rounded-full shadow-lg bg-indigo-600 hover:bg-indigo-700 text-white p-4 focus:outline-none focus:ring-2 focus:ring-indigo-300"
          aria-label="Open chat"
          title="Chat with us"
        >
          <FiMessageSquare className="w-6 h-6" />
        </button>
      ) : null}

      {!collapsed && (
        <div className="fixed bottom-6 right-6 md:bottom-8 md:right-8 z-50 w-[90vw] max-w-md h-[70vh] max-h-[600px] bg-white rounded-2xl shadow-2xl border flex flex-col overflow-hidden">
          <Header
            onClose={toggleCollapsed}
            onMinimize={() => {
              setCollapsed(true);
              localStorage.setItem(UI_KEY, "1");
            }}
          />

          <div ref={listRef} className="flex-1 overflow-y-auto p-3 bg-white">
            {messages.map((m) => (
              <div key={m.id}>
                <Bubble role={m.role} text={m.text} time={m.time} />
                {m.role === "ai" && m.interactionId && (
                  <div className="flex gap-2 ml-10 mb-2">
                    <button
                      onClick={() => rate(m.interactionId, "up")}
                      className="px-2 py-1 text-xs rounded border hover:bg-gray-50 flex items-center gap-1"
                      title="Helpful"
                    >
                      <FiThumbsUp /> Helpful
                    </button>
                    <button
                      onClick={() => rate(m.interactionId, "down")}
                      className="px-2 py-1 text-xs rounded border hover:bg-gray-50 flex items-center gap-1"
                      title="Not helpful"
                    >
                      <FiThumbsDown /> Not helpful
                    </button>
                  </div>
                )}
              </div>
            ))}
            {busy && (
              <div className="flex items-center gap-2 text-sm text-gray-500 pl-2">
                <FiLoader className="animate-spin" /> thinking…
              </div>
            )}
            {error && <div className="mt-2 text-xs text-red-600 px-2">{error}</div>}
          </div>

          <div className="border-t p-3">
            <div className="flex items-end gap-2">
              <textarea
                className="flex-1 resize-none rounded-xl border p-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                rows={2}
                placeholder="Type your question… (Shift+Enter for newline)"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                disabled={busy}
              />
              <button
                onClick={handleSend}
                disabled={busy || !input.trim()}
                className={`rounded-xl px-3 py-2 text-sm flex items-center gap-2 ${
                  busy || !input.trim()
                    ? "bg-gray-200 text-gray-500"
                    : "bg-indigo-600 text-white hover:bg-indigo-700"
                }`}
              >
                <FiSend /> Send
              </button>
            </div>
            <div className="mt-2 text-[10px] text-gray-500 flex items-center gap-1">
              <FiMaximize2 className="w-3 h-3" />
              Press Enter to send • Shift+Enter for newline
            </div>
          </div>
        </div>
      )}
    </>
  );
}
