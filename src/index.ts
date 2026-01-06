import OpenAI from "openai";
import { ChatMemoryDO } from "./chatMemoryDO";

export { ChatMemoryDO };

export interface Env {
  CHAT_MEMORY: DurableObjectNamespace;
  OPENAI_API_KEY: string;
}

interface ChatRequestBody {
  message?: string;
}

/* ---------- helpers ---------- */

function getSessionId(req: Request): string {
  const id = req.headers.get("X-Session-Id");
  if (!id) throw new Error("Missing X-Session-Id header");
  return id;
}

function getMemoryStub(env: Env, sessionId: string): DurableObjectStub {
  return env.CHAT_MEMORY.get(env.CHAT_MEMORY.idFromName(sessionId));
}

async function getHistory(
  stub: DurableObjectStub,
  limit = 20
): Promise<Array<{ role: "user" | "assistant"; content: string }>> {
  const res = await stub.fetch(`https://memory/history?limit=${limit}`);
  const data = await res.json();
  return data.messages ?? [];
}

async function appendMessage(
  stub: DurableObjectStub,
  role: "user" | "assistant",
  content: string
) {
  await stub.fetch("https://memory/append", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role, content }),
  });
}

/* ---------- worker ---------- */

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, X-Session-Id",
        },
      });
    }

    if (request.method !== "POST" || new URL(request.url).pathname !== "/chat") {
      return new Response("POST /chat", {
        headers: { "Access-Control-Allow-Origin": "*" },
      });
    }

    try {
      const sessionId = getSessionId(request);
      const memory = getMemoryStub(env, sessionId);

      const { message } = (await request.json()) as ChatRequestBody;
      if (!message) {
        return Response.json({ error: "Message is required" }, { status: 400 });
      }

      const history = await getHistory(memory);

      await appendMessage(memory, "user", message);

      const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        stream: true,
        max_tokens: 150,
        messages: [
          { role: "system", content: "You are a helpful assistant." },
          ...history,
          { role: "user", content: message },
        ],
      });

      let fullReply = "";
      const encoder = new TextEncoder();
      const abort = new AbortController();

      const stream = new ReadableStream<Uint8Array>({
        async start(controller) {
          try {
            for await (const chunk of completion) {
              const token = chunk.choices[0]?.delta?.content;
              if (!token) continue;

              fullReply += token;
              controller.enqueue(encoder.encode(token));
            }

            await appendMessage(memory, "assistant", fullReply);
            controller.close();
          } catch (err) {
            controller.enqueue(
              encoder.encode("\n[Error generating response]")
            );
            controller.close();
          }
        },

        cancel() {
          abort.abort();
        },
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-cache",
          "Access-Control-Allow-Origin": "*",
        },
      });

    } catch (err) {
      console.error(err);
      return Response.json({ error: String(err) }, { status: 500 });
    }
  },
};
