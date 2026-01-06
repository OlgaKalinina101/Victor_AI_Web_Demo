import { useEffect, useMemo, useRef, useState } from "react";
import {
  checkConnection,
  communicateStream,
  getChatHistory,
  getAssistantState,
  getUsage,
  searchChatHistory,
  updateMessageEmoji
} from "../lib/api";
import { clearAuth, loadAuth, loadInitialState } from "../lib/storage";
import type { AssistantState, ChatHistoryMessage, Usage, WebDemoInitialState } from "../lib/types";
import { renderMarkdown } from "../lib/markdown";

type ChatMsg = {
  id: string;
  role: "assistant" | "user";
  text: string;
  timestamp: number;
  backendId?: number;
  emoji?: string | null;
  imageCount?: number;
  visionContext?: string | null;
  isStreaming?: boolean;
};

const AVAILABLE_EMOJIS = [
  "🌸",
  "🙈",
  "❤️",
  "😂",
  "😍",
  "🥰",
  "😁",
  "🫠",
  "🤗",
  "🤔",
  "😏",
  "💔",
  "💯",
  "🫶",
  "🧐",
  "🫂",
  "😱",
  "😥",
  "🥹",
  "😎",
  "🥴",
  "😮‍💨",
  "😔",
  "😵‍💫",
  "🤯",
  "🤧",
  "😡",
  "😤",
  "😳",
  "😌",
  "😔",
  "👌",
  "🙌",
  "🤝"
];

const DEFAULT_FUNCTION_CALL = (import.meta.env.VITE_FUNCTION_CALL as string | undefined)?.trim() || "default";
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const ALLOWED_IMAGE_MIMES = new Set(["image/png", "image/jpeg", "image/webp"]);
const ENERGY_MAX = Number((import.meta.env.VITE_ENERGY_MAX as string | undefined)?.trim());
// Приведение стоимости к формуле из приложения:
// spent = input_tokens_used * input_token_price + output_tokens_used * output_token_price
// Если backend отдаёт price "за N токенов" (например, за 1_000_000), можно задать N здесь.
const TOKEN_PRICE_PER = Number((import.meta.env.VITE_TOKEN_PRICE_PER as string | undefined)?.trim() || "1");

function calcUsageSpentRow(u: Usage): number {
  const per = Number.isFinite(TOKEN_PRICE_PER) && TOKEN_PRICE_PER > 0 ? TOKEN_PRICE_PER : 1;
  const inTokens = u.input_tokens_used ?? 0;
  const outTokens = u.output_tokens_used ?? 0;
  const inPrice = u.input_token_price ?? 0;
  const outPrice = u.output_token_price ?? 0;
  return (inTokens * inPrice) / per + (outTokens * outPrice) / per;
}

function clamp01(n: number) {
  return Math.min(1, Math.max(0, n));
}

function parsePythonDateTimeToMs(raw: string): number | null {
  // Expected backend formats:
  // - "2025-12-18 20:29:30.105055" (space + microseconds)
  // - "2025-12-18 20:29:30" (no fraction)
  // - "2025-12-18T20:29:30.105055" (T separator)
  const s = raw.trim();
  const m = s.match(
    /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,6}))?$/
  );
  if (!m) return null;

  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  const hour = Number(m[4]);
  const minute = Number(m[5]);
  const second = Number(m[6]);
  const frac = m[7] ?? "";
  const ms = frac ? Number((frac + "000").slice(0, 3)) : 0; // microseconds -> milliseconds

  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day) ||
    !Number.isFinite(hour) ||
    !Number.isFinite(minute) ||
    !Number.isFinite(second) ||
    !Number.isFinite(ms)
  ) {
    return null;
  }

  // Interpret as local time (backend doesn't provide timezone).
  return new Date(year, month - 1, day, hour, minute, second, ms).getTime();
}

function parseTs(ts: ChatHistoryMessage["timestamp"]): number {
  if (typeof ts === "number" && Number.isFinite(ts)) {
    // Accept both seconds and milliseconds since epoch.
    return ts < 100_000_000_000 ? ts * 1000 : ts;
  }
  if (typeof ts === "string") {
    const parsedPy = parsePythonDateTimeToMs(ts);
    if (parsedPy !== null) return parsedPy;

    const d = new Date(ts);
    const n = d.getTime();
    if (Number.isFinite(n)) return n;

    const asNum = Number(ts);
    if (Number.isFinite(asNum)) {
      return asNum < 100_000_000_000 ? asNum * 1000 : asNum;
    }
  }
  return Date.now();
}

function toIntPct(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return Math.round(v);
  if (typeof v === "string") {
    const n = Number(v);
    if (Number.isFinite(n)) return Math.round(n);
  }
  return null;
}

function toTrust(v: unknown): number {
  const n = toIntPct(v);
  if (n === null) return 0;
  return Math.min(100, Math.max(0, n));
}

function emotionEmoji(emotion: string | null | undefined): string {
  if (!emotion) return "🤖";
  switch (emotion.toLowerCase()) {
    case "радость":
      return "😊";
    case "грусть":
      return "😔";
    case "злость":
      return "😠";
    case "страх":
      return "😨";
    case "удивление":
      return "😮";
    case "разочарование":
      return "😞";
    case "вдохновение":
      return "🌟";
    case "усталость":
      return "🥱";
    case "нежность":
      return "💗";
    case "неуверенность":
      return "😟";
    case "любопытство":
      return "🧐";
    case "растерянность":
      return "😕";
    case "смущение":
      return "😳";
    case "спокойствие":
      return "🌿";
    case "решимость":
      return "💪";
    case "восхищение":
      return "🤩";
    case "отчуждение":
      return "🌫️";
    case "облегчение":
      return "😌";
    default:
      return "🤖";
  }
}

function trustTier(trustLevel: number): 0 | 1 | 2 | 3 | 4 {
  if (!Number.isFinite(trustLevel)) return 0;
  const t = Math.floor(Math.max(0, Math.min(100, trustLevel)) / 20);
  return (Math.min(4, Math.max(0, t)) as 0 | 1 | 2 | 3 | 4);
}

function isEmojiAllowedByTrust(emoji: string, trustLevel: number): boolean {
  // Tier semantics (step 20):
  // 0 STRANGER, 1 ACQUAINTANCE, 2 FRIEND, 3 CLOSE_FRIEND, 4 BEST_FRIEND
  const tier = trustTier(trustLevel);
  if (tier >= 4) return true;

  const base = new Set(["🤖", "🧐", "😮", "😕", "🌿"]);
  const t1 = new Set(["😊", "😞", "🥱", "😟", "😳", "💪"]);
  const t2 = new Set(["😔", "🌟", "😌", "🤩"]);
  const t3 = new Set(["😠", "😨", "💗"]);

  if (base.has(emoji)) return true;
  if (tier >= 1 && t1.has(emoji)) return true;
  if (tier >= 2 && t2.has(emoji)) return true;
  if (tier >= 3 && t3.has(emoji)) return true;
  return false;
}

function formatEmotionalShift(raw: unknown, trustLevel: number): string {
  const NULL_TEXT = "Эмоциональный сдвиг: Null";
  if (typeof raw !== "string" || !raw.trim()) return NULL_TEXT;
  if (raw === NULL_TEXT) return raw;

  // Backend may send "state1 → state2" or "state1→state2" or with an optional prefix.
  let s = raw.trim();
  const prefix = "Эмоциональный сдвиг:";
  if (s.startsWith(prefix)) s = s.slice(prefix.length).trim();

  const parts = s
    .split(/→/g)
    .map((p) => p.trim())
    .filter(Boolean);

  if (parts.length < 2) return NULL_TEXT;

  const emojis = parts.map((p) => {
    const e = emotionEmoji(p);
    return isEmojiAllowedByTrust(e, trustLevel) ? e : "🤖";
  });
  return emojis.join(" → ");
}

export function ChatScreen(props: { onLogout?: () => void }) {
  const auth = useMemo(() => loadAuth(), []);
  const initialState = useMemo(
    () => (loadInitialState<WebDemoInitialState>() ?? null),
    []
  );

  const accountId = auth.accountId || "";
  useEffect(() => {
    if (!accountId) {
      props.onLogout?.();
    }
  }, [accountId, props]);
  const [connection, setConnection] = useState<"checking" | "online" | "offline">("checking");
  const [assistantStates, setAssistantStates] = useState<AssistantState[]>([]);
  const [usage, setUsage] = useState<Usage[] | null>(null);

  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [hasMoreHistory, setHasMoreHistory] = useState(false);
  const [oldestId, setOldestId] = useState<number | null>(null);

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOffset, setSearchOffset] = useState(0);
  const [searchMeta, setSearchMeta] = useState<{
    total: number;
    hasNext: boolean;
    hasPrev: boolean;
    matchedId: number | null;
  } | null>(null);
  const [highlightId, setHighlightId] = useState<number | null>(null);

  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [composerError, setComposerError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [attachedImages, setAttachedImages] = useState<File[]>([]);
  const [attachedPreviews, setAttachedPreviews] = useState<Array<{ file: File; url: string }>>([]);
  const composerAreaRef = useRef<HTMLDivElement | null>(null);
  const headerRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [emojiPickerFor, setEmojiPickerFor] = useState<string | null>(null);
  const isAtBottomRef = useRef(true);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const prevLastMsgIdRef = useRef<string | null>(null);
  const historyAnchorTokenRef = useRef(0);

  useEffect(() => {
    // Auto-scroll to bottom only when user is already near bottom
    if (isAtBottomRef.current) {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
      setUnreadCount(0);
    }
  }, [messages.length]);

  useEffect(() => {
    // Keep previews stable and revoke object URLs to avoid leaks
    const urls = attachedImages.map((file) => ({ file, url: URL.createObjectURL(file) }));
    setAttachedPreviews(urls);
    return () => {
      for (const u of urls) URL.revokeObjectURL(u.url);
    };
  }, [attachedImages]);

  useEffect(() => {
    // Mobile keyboard support:
    // - --kb: keyboard overlap in px
    // - --composerAreaH: composer area height (for chat padding)
    // - --headerH: header height (for chat padding)
    const root = document.documentElement;

    const update = () => {
      const vv = window.visualViewport;
      let kb = 0;
      if (vv) {
        kb = Math.max(0, window.innerHeight - (vv.height + vv.offsetTop));
      }
      root.style.setProperty("--kb", `${Math.round(kb)}px`);
      const composerH = composerAreaRef.current?.offsetHeight ?? 0;
      root.style.setProperty("--composerAreaH", `${composerH}px`);
      const headerH = headerRef.current?.offsetHeight ?? 0;
      root.style.setProperty("--headerH", `${headerH}px`);
    };

    update();
    const vv = window.visualViewport;
    vv?.addEventListener("resize", update);
    vv?.addEventListener("scroll", update);
    window.addEventListener("resize", update);

    return () => {
      vv?.removeEventListener("resize", update);
      vv?.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      root.style.setProperty("--kb", "0px");
      root.style.setProperty("--composerAreaH", "0px");
      root.style.setProperty("--headerH", "0px");
    };
  }, [searchOpen]);

  useEffect(() => {
    // Unread counter: only count new assistant messages appended at bottom,
    // not history prepends / search replaces.
    const last = messages.at(-1);
    if (!last) return;
    const prevId = prevLastMsgIdRef.current;
    prevLastMsgIdRef.current = last.id;
    if (prevId === last.id) return;
    if (isHistoryLoading || searchMeta) return;
    if (isAtBottomRef.current) return;
    if (last.role === "assistant") setUnreadCount((c) => Math.min(99, c + 1));
  }, [isHistoryLoading, messages, searchMeta]);

  useEffect(() => {
    if (!accountId) return;
    let alive = true;

    async function loadLatest() {
      setIsHistoryLoading(true);
      try {
        const res = await getChatHistory({ accountId, limit: 25, beforeId: null });
        if (!alive) return;

        // Backend returns newest->oldest. UI wants oldest->newest.
        const normalized = [...res.messages]
          .reverse()
          .map((m): ChatMsg => ({
            id: `h_${m.id}`,
            backendId: m.id,
            role: m.is_user ? "user" : "assistant",
            text: m.text ?? "",
            timestamp: parseTs(m.timestamp),
            emoji: m.emoji ?? null,
            imageCount: m.image_count ?? 0,
            visionContext: m.vision_context ?? null,
            isStreaming: false
          }));

        setMessages(normalized);
        setHasMoreHistory(Boolean(res.has_more));
        setOldestId(res.oldest_id ?? null);
      } finally {
        if (alive) setIsHistoryLoading(false);
      }
    }

    loadLatest();
    return () => {
      alive = false;
    };
  }, [accountId]);

  useEffect(() => {
    let alive = true;

    async function ping() {
      setConnection("checking");
      const ok = await checkConnection();
      if (!alive) return;
      setConnection(ok ? "online" : "offline");
    }

    // 1) once on mount
    ping();

    // 2) on focus / tab becomes visible
    const onFocus = () => {
      if (document.visibilityState === "visible") ping();
    };
    const onVis = () => {
      if (document.visibilityState === "visible") ping();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVis);

    // 3) very rare keepalive while visible (avoid spamming backend)
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") ping();
    }, 60000);

    return () => {
      alive = false;
      window.clearInterval(id);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  async function refreshHud() {
    if (!accountId) return;
    try {
      const [states, usageList] = await Promise.all([
        getAssistantState(accountId),
        getUsage(accountId).catch(() => null)
      ]);
      setAssistantStates(states);
      if (usageList) setUsage(usageList);
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    if (!accountId) return;
    // Only once when chat opens (plus refresh after sending messages)
    void refreshHud();
  }, [accountId]);

  const moodText = useMemo(() => {
    const last = assistantStates.at(-1)?.state;
    if (last) return String(last);
    if (initialState?.mood != null) return String(initialState.mood);
    return "🌿";
  }, [assistantStates, initialState?.mood]);

  const trustLevel = useMemo(() => toTrust(initialState?.trust_level), [initialState?.trust_level]);

  const emotionalShiftText = useMemo(
    () => formatEmotionalShift(initialState?.emotional_shift, trustLevel),
    [initialState?.emotional_shift, trustLevel]
  );

  const usagePct = useMemo(() => {
    const first = usage?.[0];
    const provider = first?.provider;
    const balance = first?.account_balance;

    // Match Android logic: pick displayProvider = currentProvider ?: firstProvider
    // In web we don't track current model yet, so we treat first row provider as selected.
    if (provider && typeof balance === "number" && Number.isFinite(balance) && balance > 0) {
      const entries = (usage ?? []).filter((x) => x.provider === provider);
      if (entries.length > 0) {
        const totalSpent = entries.reduce((acc, row) => acc + calcUsageSpentRow(row), 0);
        const safeBalance = Math.max(0.01, balance);
        const percentRemaining = Math.max(0, Math.min(1, 1 - totalSpent / safeBalance));

        // Preserve ENERGY_MAX behavior (optional normalization); default matches Android when maxEnergy=balance.
        const maxEnergy = Number.isFinite(ENERGY_MAX) && ENERGY_MAX > 0 ? ENERGY_MAX : safeBalance;
        return Math.min(100, Math.max(0, Math.round((percentRemaining * safeBalance / maxEnergy) * 100)));
      }
    }

    // Fallback: if backend still provides context_usage_pct, show it.
    const pct = toIntPct(initialState?.context_usage_pct);
    if (pct !== null) return Math.min(100, Math.max(0, pct));

    return 94;
  }, [initialState?.context_usage_pct, usage]);

  const connectionSymbol = connection === "checking" ? "⏳" : connection === "online" ? "✓" : "✗";
  const connectionClass =
    connection === "online"
      ? "hud-connOk"
      : connection === "offline"
        ? "hud-connBad"
        : "";

  function formatTimestamp(ts: number): string {
    const d = new Date(ts);
    return d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  }

  function renderMessageText(text: string) {
    const q = searchMeta && searchQuery.trim() ? searchQuery.trim() : "";
    return renderMarkdown(text, { highlightQuery: q });
  }

  async function onCopy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // ignore
    }
  }

  async function setEmoji(messageId: string, emoji: string | null) {
    let backendId: number | undefined;
    setMessages((prev) => {
      backendId = prev.find((m) => m.id === messageId)?.backendId;
      return prev.map((m) => (m.id === messageId ? { ...m, emoji } : m));
    });
    if (!backendId) return;
    if (!accountId) return;
    try {
      await updateMessageEmoji({ accountId, backendId, emoji });
    } catch {
      // keep local state even if backend update failed (demo UX)
    }
  }

  function validateImage(file: File): string | null {
    const mime = file.type || "";
    if (!ALLOWED_IMAGE_MIMES.has(mime)) return "Unsupported mime_type (allowed: png, jpeg, webp)";
    if (file.size > MAX_IMAGE_BYTES) return "Image too large (max 8MB)";
    return null;
  }

  function onAttachClick() {
    if (isSending) return;
    if (attachedImages.length >= 1) return;
    fileInputRef.current?.click();
  }

  function onFilesSelected(files: FileList | null) {
    if (!files) return;
    setComposerError(null);

    // Only 1 attachment allowed. New selection replaces previous attachment.
    let picked: File | null = null;
    for (const f of Array.from(files)) {
      const err = validateImage(f);
      if (err) {
        setComposerError(err);
        continue;
      }
      picked = f;
      break;
    }

    if (picked) setAttachedImages([picked]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeAttachedImage(idx: number) {
    setAttachedImages((prev) => prev.filter((_, i) => i !== idx));
  }

  async function onSend() {
    const text = draft.trim();
    if (!accountId) return;
    if (!text) {
      setComposerError("Введите сообщение");
      return;
    }
    setComposerError(null);
    setDraft("");
    setIsSending(true);

    const userId = `u_${Date.now()}`;
    const assistantId = `a_${Date.now()}`;
    const file = attachedImages[0];
    for (const f of attachedImages) {
      const err = validateImage(f);
      if (err) {
        setIsSending(false);
        setComposerError(err);
        return;
      }
    }
    const now = Date.now();
    setMessages((m) => [
      ...m,
      {
        id: userId,
        role: "user",
        text,
        timestamp: now,
        imageCount: attachedImages.length,
        isStreaming: false
      },
      {
        id: assistantId,
        role: "assistant",
        text: "",
        timestamp: now + 1,
        emoji: null,
        imageCount: 0,
        isStreaming: true
      }
    ]);

    try {
      const reader = await communicateStream({
        accountId,
        text,
        functionCall: DEFAULT_FUNCTION_CALL,
        imageFile: file
      });

      setAttachedImages([]);
      const decoder = new TextDecoder("utf-8");

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        if (!chunk) continue;
        setMessages((prev) =>
          prev.map((msg) => (msg.id === assistantId ? { ...msg, text: msg.text + chunk } : msg))
        );
      }
      setMessages((prev) =>
        prev.map((m) => (m.id === assistantId ? { ...m, isStreaming: false } : m))
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Ошибка отправки";
      setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, text: msg, isStreaming: false } : m)));
    } finally {
      setIsSending(false);
      // After any send attempt, refresh HUD once (mood/usage can change)
      void refreshHud();
    }
  }

  async function loadMoreHistory() {
    if (!accountId) return;
    if (!hasMoreHistory || !oldestId) return;
    if (isHistoryLoading) return;

    // Token to invalidate stale anchor callbacks (e.g. user tapped "scroll to bottom" while request was in-flight)
    const token = ++historyAnchorTokenRef.current;

    const el = scrollRef.current;
    const prevScrollHeight = el?.scrollHeight ?? 0;
    const prevScrollTop = el?.scrollTop ?? 0;

    setIsHistoryLoading(true);
    try {
      const res = await getChatHistory({ accountId, limit: 25, beforeId: oldestId });
      const normalized = [...res.messages]
        .reverse()
        .map((m): ChatMsg => ({
          id: `h_${m.id}`,
          backendId: m.id,
          role: m.is_user ? "user" : "assistant",
          text: m.text ?? "",
          timestamp: parseTs(m.timestamp),
          emoji: m.emoji ?? null,
          imageCount: m.image_count ?? 0,
          visionContext: m.vision_context ?? null,
          isStreaming: false
        }));

      setMessages((prev) => [...normalized, ...prev]);
      setHasMoreHistory(Boolean(res.has_more));
      setOldestId(res.oldest_id ?? oldestId);

      // keep scroll position anchored
      window.requestAnimationFrame(() => {
        // If a newer scroll intent happened (or user went to bottom), don't overwrite their position.
        if (historyAnchorTokenRef.current !== token) return;
        if (isAtBottomRef.current) return;
        const nextScrollHeight = el?.scrollHeight ?? 0;
        const delta = nextScrollHeight - prevScrollHeight;
        if (el) el.scrollTop = prevScrollTop + delta;
      });
    } finally {
      setIsHistoryLoading(false);
    }
  }

  async function runSearch(offset: number) {
    if (!accountId) return;
    const q = searchQuery.trim();
    if (!q) return;
    setIsHistoryLoading(true);
    try {
      const res = await searchChatHistory({
        accountId,
        query: q,
        offset,
        contextBefore: 10,
        contextAfter: 10
      });

      const normalized = [...res.messages]
        .reverse()
        .map((m): ChatMsg => ({
          id: `h_${m.id}`,
          backendId: m.id,
          role: m.is_user ? "user" : "assistant",
          text: m.text ?? "",
          timestamp: parseTs(m.timestamp),
          emoji: m.emoji ?? null,
          imageCount: m.image_count ?? 0,
          visionContext: m.vision_context ?? null,
          isStreaming: false
        }));

      setMessages(normalized);
      setSearchOffset(offset);
      setSearchMeta({
        total: res.total_matches,
        hasNext: res.has_next,
        hasPrev: res.has_prev,
        matchedId: res.matched_message_id
      });
      setHighlightId(res.matched_message_id);
      setHasMoreHistory(false);
      setOldestId(null);

      window.requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
      });
    } finally {
      setIsHistoryLoading(false);
    }
  }

  function exitSearch() {
    setSearchOpen(false);
    setSearchMeta(null);
    setHighlightId(null);
    setSearchOffset(0);
    // reload normal history
    if (accountId) {
      void (async () => {
        setIsHistoryLoading(true);
        try {
          const res = await getChatHistory({ accountId, limit: 25, beforeId: null });
          const normalized = [...res.messages]
            .reverse()
            .map((m): ChatMsg => ({
              id: `h_${m.id}`,
              backendId: m.id,
              role: m.is_user ? "user" : "assistant",
              text: m.text ?? "",
              timestamp: parseTs(m.timestamp),
              emoji: m.emoji ?? null,
              imageCount: m.image_count ?? 0,
              visionContext: m.vision_context ?? null,
              isStreaming: false
            }));
          setMessages(normalized);
          setHasMoreHistory(Boolean(res.has_more));
          setOldestId(res.oldest_id ?? null);
        } finally {
          setIsHistoryLoading(false);
        }
      })();
    }
  }

  return (
    <div className="chat-screen">
      <div className="chat-header" ref={headerRef}>
        <div className="topbar">
          <button
            className="topbar-btn"
            aria-label="Menu"
            onClick={() => {
              clearAuth();
              props.onLogout?.();
            }}
          >
            ☰
          </button>
          <div className="topbar-title">Victor AI</div>
          <button
            className="topbar-btn"
            aria-label="Search"
            onClick={() => setSearchOpen((v) => !v)}
          >
            🔍
          </button>
        </div>

        {searchOpen ? (
          <div className="searchbar">
            <input
              className="search-input"
              placeholder="поиск..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") runSearch(0);
                if (e.key === "Escape") exitSearch();
              }}
            />
            <button className="search-btn" onClick={() => runSearch(0)} disabled={!searchQuery.trim()}>
              найти
            </button>
            <button className="search-btn" onClick={exitSearch}>
              ✕
            </button>
            {searchMeta ? (
              <div className="search-meta">
                {searchOffset + 1}/{searchMeta.total}
                <button
                  className="search-nav"
                  onClick={() => runSearch(searchOffset - 1)}
                  disabled={!searchMeta.hasPrev}
                >
                  ←
                </button>
                <button
                  className="search-nav"
                  onClick={() => runSearch(searchOffset + 1)}
                  disabled={!searchMeta.hasNext}
                >
                  →
                </button>
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="sep" />

        <div className="hud">
          <div className="hud-line">
            <span>[ связь: </span>
            <span className={["hud-conn", connectionClass].join(" ")}>{connectionSymbol}</span>
            <span> ]</span>
          </div>

          <div className="hud-block">
            <div className="hud-shift">{emotionalShiftText ?? "\u00A0"}</div>
            <div className="hud-pct">{usagePct}%</div>
            <div className="hud-mood">Эмоция: {moodText}</div>
          </div>

          <div className="hud-trust">
            <div className="hud-trustBar">
              <div className="hud-trustLine" />
              <div className="hud-trustThumb" style={{ left: `${clamp01(trustLevel / 100) * 100}%` }} />
            </div>
          </div>
        </div>

        <div className="sep" />
      </div>

      <div
        className="chat-area"
        ref={scrollRef}
        onScroll={() => {
          const el = scrollRef.current;
          if (!el) return;
          const bottomGap = el.scrollHeight - (el.scrollTop + el.clientHeight);
          isAtBottomRef.current = bottomGap < 40;
          setShowScrollToBottom(!isAtBottomRef.current);
          if (isAtBottomRef.current) setUnreadCount(0);
          if (el.scrollTop < 40 && !searchMeta) {
            void loadMoreHistory();
          }
        }}
      >
        <div className="chat-title"></div>

        {messages.map((m) => {
          const isUser = m.role === "user";
          const showFooter = Boolean(m.text.trim()) && !m.isStreaming;
          const isHighlighted = Boolean(highlightId && m.backendId === highlightId);
          return (
            <div key={m.id} className={isUser ? "msg msg-u" : "msg msg-a"}>
              <div className="msg-role">{isUser ? "(user)" : "(assistant)"}</div>
              <div
                className={[
                  isUser ? "bubble bubble-u" : "bubble bubble-a",
                  isHighlighted ? "bubble-hl" : ""
                ].join(" ")}
              >
                {m.imageCount && m.imageCount > 0 ? (
                  <div className="msg-metaRow">
                    <span className="msg-metaIcon">🖼</span>
                    <span className="msg-metaText">{m.imageCount}</span>
                  </div>
                ) : null}

                <div className="msg-text">{renderMessageText(m.text)}</div>

                {showFooter ? (
                  <div className="msg-footer">
                    <div className="msg-footerLeft">
                      {m.emoji ? <span className="msg-emoji">{m.emoji}</span> : null}
                      <span className="msg-ts">{formatTimestamp(m.timestamp)}</span>
                    </div>

                    <div className="msg-footerRight">
                      {!isUser ? (
                        <button
                          className="msg-iconBtn"
                          aria-label="Add reaction"
                          onClick={() => setEmojiPickerFor(m.id)}
                          title="Реакция"
                        >
                          🙂
                        </button>
                      ) : null}

                      <button
                        className="msg-iconBtn"
                        aria-label="Copy"
                        onClick={() => onCopy(m.text)}
                        title="Копировать"
                      >
                        ⧉
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      <div className="composer-area" ref={composerAreaRef}>
        <div className="sep" />

        {attachedPreviews.length ? (
          <div className="attach-previews" aria-label="Attached images">
            <div className="attach-row">
              {attachedPreviews.map((p, idx) => (
                <div key={`${p.file.name}_${idx}`} className="attach-item">
                  <img className="attach-img" src={p.url} alt="attachment preview" />
                  <button
                    className="attach-remove"
                    onClick={() => removeAttachedImage(idx)}
                    aria-label="Remove"
                    disabled={isSending}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="composer">
          <button
            className="composer-btn"
            aria-label="Attach"
            onClick={onAttachClick}
            disabled={isSending || attachedImages.length >= 1}
          >
            {isSending ? <span className="spinner" aria-label="Loading" /> : "📎"}
          </button>
          <input
            ref={fileInputRef}
            className="composer-file"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(e) => onFilesSelected(e.target.files)}
          />

          <div className="composer-inputShell">
            <input
              className="composer-input"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="текст..."
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  if (!draft.trim() || isSending) return;
                  onSend();
                }
              }}
              disabled={isSending}
            />
          </div>

          <button
            className="composer-send"
            aria-label="Send"
            onClick={onSend}
            disabled={isSending || !draft.trim()}
          >
            ▶
          </button>
        </div>

        {composerError ? <div className="composer-error">{composerError}</div> : null}
      </div>

      <button
        className={["scroll-bottom", showScrollToBottom ? "is-visible" : ""].join(" ")}
        onClick={() => {
          // Cancel any pending history "anchor" adjustment to avoid jumping back up.
          historyAnchorTokenRef.current += 1;
          scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
          setUnreadCount(0);
          setShowScrollToBottom(false);
          isAtBottomRef.current = true;
        }}
        aria-label="Scroll to bottom"
      >
        {unreadCount > 0 ? <span className="scroll-badge">{unreadCount > 9 ? "9+" : unreadCount}</span> : null}
        <span className="scroll-arrow">↓</span>
      </button>

      {usage ? <div className="hud-debug" aria-hidden="true">{/* keep reserved */}</div> : null}

      {emojiPickerFor ? (
        <div
          className="emoji-overlay"
          onClick={() => setEmojiPickerFor(null)}
          role="dialog"
          aria-label="Emoji picker"
        >
          <div className="emoji-panel" onClick={(e) => e.stopPropagation()}>
            <div className="emoji-title">Реакция</div>
            <div className="emoji-grid">
              {AVAILABLE_EMOJIS.map((e) => (
                <button
                  key={e}
                  className="emoji-btn"
                  onClick={() => {
                    setEmoji(emojiPickerFor, e);
                    setEmojiPickerFor(null);
                  }}
                >
                  {e}
                </button>
              ))}
              <button
                className="emoji-btn emoji-clear"
                onClick={() => {
                  setEmoji(emojiPickerFor, null);
                  setEmojiPickerFor(null);
                }}
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}


