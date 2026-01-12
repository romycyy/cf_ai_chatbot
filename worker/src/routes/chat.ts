// worker/src/routes/chat.ts
import OpenAI from "openai";
import { Env, CORS_HEADERS } from "../index";

/* ---------- types ---------- */

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
  if (!res.ok) return [];
  const data = (await res.json()) as { messages?: Array<{ role: "user" | "assistant"; content: string }> };
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

/* ---------- handler ---------- */

export async function handleChat(
  request: Request,
  env: Env,
  ctx: ExecutionContext
): Promise<Response> {
  try {
    const sessionId = getSessionId(request);
    const memory = getMemoryStub(env, sessionId);

    let body: ChatRequestBody;
    try {
      body = (await request.json()) as ChatRequestBody;
    } catch (e) {
      return new Response(JSON.stringify({ error: "Invalid JSON" }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const { message } = body;
    if (!message) {
      return new Response(JSON.stringify({ error: "Message is required" }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
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

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for await (const chunk of completion) {
            const token = chunk.choices[0]?.delta?.content;
            if (!token) continue;

            fullReply += token;
            controller.enqueue(encoder.encode(token));
          }
        } catch (err) {
          console.error("Stream error:", err);
          controller.enqueue(
            encoder.encode("\n[Error generating response]")
          );
        } finally {
          if (fullReply) {
            await appendMessage(memory, "assistant", fullReply);
          }
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        ...CORS_HEADERS,
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
      },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
}
