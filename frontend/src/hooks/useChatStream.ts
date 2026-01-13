import { ChatRequest } from "../types/chat";

export async function streamChat(
  payload: ChatRequest,
  sessionId: string,
  onToken: (t: string) => void
) {
  const apiBase =
    import.meta.env.VITE_API_BASE ??
    (import.meta.env.DEV ? "http://127.0.0.1:8787" : "");

  if (!apiBase) {
    throw new Error(
      "Missing VITE_API_BASE. Set frontend/.env (e.g. VITE_API_BASE=http://127.0.0.1:8787) or configure it in your deployment environment."
    );
  }

  const res = await fetch(apiBase.replace(/\/+$/, "") + "/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Session-Id": sessionId,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const raw = await res.text().catch(() => "");
    const errorData = (() => {
      try {
        return JSON.parse(raw) as { error?: string };
      } catch {
        return { error: undefined };
      }
    })();
    throw new Error(
      errorData.error ||
        (raw ? `${res.status} ${res.statusText}: ${raw}` : `${res.status} ${res.statusText}`)
    );
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error("No reader available");
  
  const decoder = new TextDecoder();

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      onToken(decoder.decode(value));
    }
  } finally {
    reader.releaseLock();
  }
}
