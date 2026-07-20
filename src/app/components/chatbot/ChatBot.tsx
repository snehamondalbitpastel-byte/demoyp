"use client";

/**
 * ChatBot — a lightweight, rule-based FAQ assistant rendered as a
 * floating bubble in the bottom-right corner of EVERY page (mounted
 * once in the root layout).
 *
 * Features:
 *   • No external API / no cost / works offline — replies come from
 *     keyword matching in `getBotReply()`.
 *   • MULTI-CHAT HISTORY: every conversation is saved to localStorage.
 *     A history panel lists past chats (auto-titled by your first
 *     message); you can reopen, start a "New Chat", or delete one.
 *   • Theme-aware: reads light/dark from ThemeContext and stamps
 *     `data-theme` on its own root so it flips palette with the app.
 */

import { useEffect, useRef, useState } from "react";
import { useTheme } from "@/app/context/ThemeContext";
import styles from "./ChatBot.module.css";

type Msg = { id: number; role: "user" | "bot"; text: string };
type Conversation = {
  id: string;
  title: string;
  messages: Msg[];
  updatedAt: number;
};

const QUICK_REPLIES = ["Jobs", "Events", "Resources", "Career Talks"];

const GREETING =
  "Hi! 👋 I'm the Young Pro assistant. Ask me about Jobs, Events, Resources, Career Talks, or Companies.";

// localStorage key holding ALL conversations + the active one. Bump the
// suffix if the stored shape changes.
const STORAGE_KEY = "yp.chatbot.history.v1";

const initialMessages = (): Msg[] => [{ id: 0, role: "bot", text: GREETING }];

function newConversation(): Conversation {
  return {
    id: `c_${Date.now()}_${Math.floor(Math.random() * 1e6)}`,
    title: "New chat",
    messages: initialMessages(),
    updatedAt: Date.now(),
  };
}

/** Rule-based reply engine — keyword match → canned answer. */
function getBotReply(input: string): string {
  const t = input.toLowerCase().trim();

  if (/\b(hi|hii|hello|hey|hola|namaste)\b/.test(t))
    return "Hey! 👋 How can I help? Try Jobs, Events, Resources, Career Talks, or Company.";
  if (/\b(bye|goodbye|see ya|see you)\b/.test(t)) return "Bye! 👋 Come back anytime.";
  if (/\b(thanks|thank you|thx|ty)\b/.test(t))
    return "You're welcome! 😊 Anything else I can help with?";

  if (t.includes("job"))
    return "💼 Jobs: open the Jobs tab to browse listings. Click a job to see details and press Apply. You can also save jobs for later.";
  if (t.includes("event"))
    return "📅 Events: the Events tab shows upcoming events. Open one for details + availability, then book (free or paid).";
  if (t.includes("resource"))
    return "📚 Resources: articles, videos, audio, and PDFs. Use search + categories to filter, and click a card to read/watch.";
  if (t.includes("career") || t.includes("talk"))
    return "🎤 Career Talks: recorded talks and sessions — open the Career Talks tab to watch.";
  if (t.includes("company") || t.includes("companies") || t.includes("employer"))
    return "🏢 Company: browse companies under the Company tab, view details, and follow the ones you like.";
  if (t.includes("apply") || t.includes("application"))
    return "📝 To apply: open a Job → click the Apply button. It shows 'Applied' once done.";
  if (t.includes("login") || t.includes("log in") || t.includes("sign in") || t.includes("signup") || t.includes("sign up") || t.includes("register"))
    return "🔐 Use the login / signup screen to create an account or sign in. You can also sign in with Google.";
  if (t.includes("profile") || t.includes("account"))
    return "👤 Your profile shows your info, education, and skills — open it from the avatar at the top-right.";
  if (t.includes("dark") || t.includes("light") || t.includes("theme") || t.includes("mode"))
    return "🌗 Toggle Light / Dark mode from the profile menu at the top-right.";
  if (t.includes("help") || t.includes("what can you") || t.includes("options"))
    return "I can help with: 💼 Jobs, 📅 Events, 📚 Resources, 🎤 Career Talks, 🏢 Company. Just type a topic!";

  return "🤔 I'm not sure about that one. Try asking about Jobs, Events, Resources, Career Talks, or Company.";
}

/** timestamp → "just now" / "5m ago" / "3h ago" / "2d ago" / date. */
function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  return new Date(ts).toLocaleDateString();
}

export default function ChatBot() {
  const { theme } = useTheme();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"chat" | "history">("chat");
  const [input, setInput] = useState("");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const hydrated = useRef(false);

  // ── Load saved chats on mount (client-only, post-hydration). ──
  useEffect(() => {
    let convs: Conversation[] | null = null;
    let savedActive = "";
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { conversations?: Conversation[]; activeId?: string };
        if (Array.isArray(parsed.conversations)) convs = parsed.conversations;
        savedActive = parsed.activeId ?? "";
      }
    } catch {
      /* corrupt storage — start fresh */
    }
    if (convs && convs.length > 0) {
      setConversations(convs);
      setActiveId(convs.some((c) => c.id === savedActive) ? savedActive : convs[0].id);
    } else {
      const c = newConversation();
      setConversations([c]);
      setActiveId(c.id);
    }
    hydrated.current = true;
  }, []);

  // ── Persist chats whenever they change (skip the first empty render). ──
  useEffect(() => {
    if (!hydrated.current) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ conversations, activeId }));
    } catch {
      /* storage blocked — ignore */
    }
  }, [conversations, activeId]);

  const active = conversations.find((c) => c.id === activeId) ?? null;
  const messages = active?.messages ?? initialMessages();

  // Auto-scroll to newest message.
  useEffect(() => {
    const el = scrollRef.current;
    if (el && view === "chat") el.scrollTop = el.scrollHeight;
  }, [messages, open, view]);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || !active) return;
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id !== activeId) return c;
        const baseId = c.messages.length ? Math.max(...c.messages.map((m) => m.id)) : 0;
        const userMsg: Msg = { id: baseId + 1, role: "user", text: trimmed };
        const botMsg: Msg = { id: baseId + 2, role: "bot", text: getBotReply(trimmed) };
        const isFirstUserMsg = !c.messages.some((m) => m.role === "user");
        return {
          ...c,
          // Auto-title the chat from the user's first message.
          title: isFirstUserMsg ? trimmed.slice(0, 40) : c.title,
          messages: [...c.messages, userMsg, botMsg],
          updatedAt: Date.now(),
        };
      })
    );
    setInput("");
  }

  function newChat() {
    const c = newConversation();
    setConversations((prev) => [c, ...prev]);
    setActiveId(c.id);
    setView("chat");
    setInput("");
  }

  function openChat(id: string) {
    setActiveId(id);
    setView("chat");
  }

  function deleteChat(id: string) {
    let remaining = conversations.filter((c) => c.id !== id);
    if (remaining.length === 0) remaining = [newConversation()];
    setConversations(remaining);
    if (id === activeId) setActiveId(remaining[0].id);
  }

  const showQuickReplies = view === "chat" && messages.length === 1;
  const sortedHistory = [...conversations].sort((a, b) => b.updatedAt - a.updatedAt);

  return (
    <div className={styles.root} data-theme={theme}>
      {open && (
        <div className={styles.panel} role="dialog" aria-label="Chat assistant">
          {/* ── Header ── */}
          <div className={styles.header}>
            <span className={styles.headerTitle}>
              {view === "history" ? (
                <button
                  type="button"
                  className={styles.iconBtn}
                  onClick={() => setView("chat")}
                  aria-label="Back to chat"
                  title="Back"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 18l-6-6 6-6" />
                  </svg>
                </button>
              ) : (
                <span className={styles.dot} aria-hidden="true" />
              )}
              {view === "history" ? "Chat history" : "Young Pro Assistant"}
            </span>
            <div className={styles.headerActions}>
              {view === "chat" && (
                <button
                  type="button"
                  className={styles.iconBtn}
                  onClick={() => setView("history")}
                  aria-label="Chat history"
                  title="History"
                >
                  {/* clock/history icon */}
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 7v5l3 2" />
                  </svg>
                </button>
              )}
              <button
                type="button"
                className={styles.iconBtn}
                onClick={newChat}
                aria-label="New chat"
                title="New chat"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </button>
              <button
                type="button"
                className={styles.iconBtn}
                onClick={() => setOpen(false)}
                aria-label="Close chat"
                title="Close"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          </div>

          {/* ── History view ── */}
          {view === "history" ? (
            <div className={styles.history}>
              {sortedHistory.map((c) => (
                <div
                  key={c.id}
                  className={`${styles.historyItem} ${c.id === activeId ? styles.historyActive : ""}`}
                >
                  <button
                    type="button"
                    className={styles.historyOpen}
                    onClick={() => openChat(c.id)}
                  >
                    <span className={styles.historyTitle}>{c.title}</span>
                    <span className={styles.historyTime}>{timeAgo(c.updatedAt)}</span>
                  </button>
                  <button
                    type="button"
                    className={styles.historyDelete}
                    onClick={() => deleteChat(c.id)}
                    aria-label="Delete chat"
                    title="Delete"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <>
              {/* ── Messages ── */}
              <div className={styles.messages} ref={scrollRef}>
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`${styles.msg} ${m.role === "user" ? styles.user : styles.bot}`}
                  >
                    {m.text}
                  </div>
                ))}
                {showQuickReplies && (
                  <div className={styles.quickReplies}>
                    {QUICK_REPLIES.map((q) => (
                      <button key={q} type="button" className={styles.chip} onClick={() => send(q)}>
                        {q}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* ── Input ── */}
              <form
                className={styles.inputRow}
                onSubmit={(e) => {
                  e.preventDefault();
                  send(input);
                }}
              >
                <input
                  className={styles.input}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type a message…"
                  aria-label="Type a message"
                />
                <button type="submit" className={styles.sendBtn} aria-label="Send" disabled={!input.trim()}>
                  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M3.4 20.4l17.45-7.48a1 1 0 0 0 0-1.84L3.4 3.6a1 1 0 0 0-1.39 1.19L4.6 11.5 2 18.21a1 1 0 0 0 1.4 1.19zM6.16 12.5l-1.3-3.36 11.9 3.36-11.9 3.36z" />
                  </svg>
                </button>
              </form>
            </>
          )}
        </div>
      )}

      {/* Floating bubble */}
      <button
        type="button"
        className={styles.bubble}
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close chat" : "Open chat"}
        aria-expanded={open}
      >
        {open ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
          </svg>
        )}
      </button>
    </div>
  );
}
