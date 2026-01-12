import { ChatRequest } from "../types/chat";

export async function streamChat(
  payload: ChatRequest,
  sessionId: string,
  onToken: (t: string) => void
) {
  const res = await fetch(import.meta.env.VITE_API_BASE + "/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Session-Id": sessionId,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(errorData.error || `HTTP error! status: ${res.status}`);
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
