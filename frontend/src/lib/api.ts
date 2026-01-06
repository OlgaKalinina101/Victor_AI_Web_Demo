import type {
  AssistantState,
  ChatHistoryResponse,
  SearchResult,
  UpdateEmojiResponse,
  Usage,
  WebDemoLoginResponse,
  WebDemoResolveResponse
} from "./types";

function inferDefaultApiBase(): string {
  // 0) URL override: ?api=https://... (handy for ngrok)
  if (typeof window !== "undefined") {
    const url = new URL(window.location.href);
    const api = url.searchParams.get("api") || url.searchParams.get("api_base");
    if (api && /^https?:\/\//i.test(api.trim())) return api.trim().replace(/\/+$/, "");
  }

  // 0.5) Known ngrok setup: UI on victor-web-*, API on victor-api-*
  if (typeof window !== "undefined") {
    const host = window.location.hostname || "";
    const m = host.match(/^victor-web-(.+)\.ngrok-free\.dev$/i);
    if (m?.[1]) {
      return `https://victor-api-${m[1]}.ngrok-free.dev`;
    }
  }

  // 1) If app is opened via ngrok domain, backend is usually reachable on same origin
  if (typeof window !== "undefined") {
    const host = window.location.hostname || "";
    if (host.endsWith("ngrok-free.dev")) {
      return window.location.origin;
    }
  }

  // 2) Local dev default (FastAPI on 8000)
  if (import.meta.env.DEV) {
    return "http://127.0.0.1:8000";
  }

  // 3) Fallback: same origin
  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  return "http://127.0.0.1:8000";
}

export function getApiBase(): string {
  const fromEnv = import.meta.env.VITE_API_BASE as string | undefined;
  const base = fromEnv?.trim() || inferDefaultApiBase();
  return base.replace(/\/+$/, "");
}

export async function checkConnection(): Promise<boolean> {
  const apiBase = getApiBase();
  try {
    const res = await fetch(`${apiBase}/`, { method: "GET" });
    if (!res.ok) return false;
    const json = (await res.json()) as { status?: string };
    return json?.status === "ok";
  } catch {
    return false;
  }
}

export async function webDemoResolve(params: {
  demoKey: string;
}): Promise<WebDemoResolveResponse> {
  const apiBase = getApiBase();
  const res = await fetch(`${apiBase}/auth/resolve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      demo_key: params.demoKey
    })
  });

  const text = await res.text();
  if (!res.ok) {
    // FastAPI usually returns {detail: ...}; but keep it generic.
    throw new Error(text || `HTTP ${res.status}`);
  }

  try {
    return JSON.parse(text) as WebDemoResolveResponse;
  } catch {
    throw new Error("Invalid JSON response from server");
  }
}

export async function webDemoRegister(params: {
  demoKey: string;
  accountId: string;
  gender: "мужчина" | "девушка";
}): Promise<WebDemoLoginResponse> {
  const apiBase = getApiBase();
  const res = await fetch(`${apiBase}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      demo_key: params.demoKey,
      account_id: params.accountId,
      gender: params.gender
    })
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(text || `HTTP ${res.status}`);
  }

  try {
    return JSON.parse(text) as WebDemoLoginResponse;
  } catch {
    throw new Error("Invalid JSON response from server");
  }
}

export async function getAssistantState(accountId: string): Promise<AssistantState[]> {
  const apiBase = getApiBase();
  const url = new URL(`${apiBase}/assistant/assistant-state`);
  url.searchParams.set("account_id", accountId);
  const res = await fetch(url.toString(), { method: "GET" });
  const text = await res.text();
  if (!res.ok) throw new Error(text || `HTTP ${res.status}`);
  return JSON.parse(text) as AssistantState[];
}

export async function getUsage(accountId: string): Promise<Usage[]> {
  const apiBase = getApiBase();
  const url = new URL(`${apiBase}/assistant/usage`);
  url.searchParams.set("account_id", accountId);
  const res = await fetch(url.toString(), { method: "GET" });
  const text = await res.text();
  if (!res.ok) throw new Error(text || `HTTP ${res.status}`);
  return JSON.parse(text) as Usage[];
}

export async function communicateStream(params: {
  accountId: string;
  text: string;
  functionCall: string;
  geo?: string;
  extraContext?: string;
  imageFile?: File;
}): Promise<ReadableStreamDefaultReader<Uint8Array>> {
  const apiBase = getApiBase();
  const form = new FormData();
  form.set("account_id", params.accountId);
  form.set("text", params.text);
  form.set("function_call", params.functionCall);
  if (params.geo !== undefined) form.set("geo", params.geo);
  if (params.extraContext !== undefined) form.set("extra_context", params.extraContext);
  if (params.imageFile) {
    form.set("image", params.imageFile);
    form.set("mime_type", params.imageFile.type || "image/png");
  }

  const res = await fetch(`${apiBase}/chat/communicate_stream`, {
    method: "POST",
    body: form
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `HTTP ${res.status}`);
  }
  if (!res.body) throw new Error("No response body (stream not supported?)");
  return res.body.getReader();
}

export async function updateMessageEmoji(params: {
  accountId: string;
  backendId: number;
  emoji: string | null;
}): Promise<UpdateEmojiResponse> {
  const apiBase = getApiBase();
  const res = await fetch(`${apiBase}/chat/update_emoji`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      account_id: params.accountId,
      backend_id: params.backendId,
      emoji: params.emoji || null
    })
  });
  const text = await res.text();
  if (!res.ok) throw new Error(text || `HTTP ${res.status}`);
  return JSON.parse(text) as UpdateEmojiResponse;
}

export async function getChatHistory(params: {
  accountId: string;
  limit?: number;
  beforeId?: number | null;
}): Promise<ChatHistoryResponse> {
  const apiBase = getApiBase();
  const url = new URL(`${apiBase}/chat/get_history`);
  url.searchParams.set("account_id", params.accountId);
  url.searchParams.set("limit", String(params.limit ?? 25));
  if (params.beforeId != null) url.searchParams.set("before_id", String(params.beforeId));
  const res = await fetch(url.toString(), { method: "GET" });
  const text = await res.text();
  if (!res.ok) throw new Error(text || `HTTP ${res.status}`);
  return JSON.parse(text) as ChatHistoryResponse;
}

export async function searchChatHistory(params: {
  accountId: string;
  query: string;
  offset?: number;
  contextBefore?: number;
  contextAfter?: number;
}): Promise<SearchResult> {
  const apiBase = getApiBase();
  const url = new URL(`${apiBase}/chat/history/search`);
  url.searchParams.set("account_id", params.accountId);
  url.searchParams.set("query", params.query);
  url.searchParams.set("offset", String(params.offset ?? 0));
  url.searchParams.set("context_before", String(params.contextBefore ?? 10));
  url.searchParams.set("context_after", String(params.contextAfter ?? 10));
  const res = await fetch(url.toString(), { method: "GET" });
  const text = await res.text();
  if (!res.ok) throw new Error(text || `HTTP ${res.status}`);
  return JSON.parse(text) as SearchResult;
}


