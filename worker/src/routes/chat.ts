import OpenAI from "openai";
import { Env, CORS_HEADERS } from "../index";
import {
  type Mode,
  type AllowedModel,
  type ChatRequestBody,
  ALLOWED_MODELS,
  DEFAULT_MODEL,
  MIN_TOKENS,
  MAX_TOKENS,
  DEFAULT_MAX_TOKENS,
  SYSTEM_PROMPTS,
} from "@cf-ai/shared";

type HistoryMessage = { role: "user" | "assistant"; content: string };

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

function getMemoryStub(env: Env, sessionId: string): DurableObjectStub {
  return env.CHAT_MEMORY.get(env.CHAT_MEMORY.idFromName(sessionId));
}

async function getHistory(
  stub: DurableObjectStub,
  limit = 20
): Promise<HistoryMessage[]> {
  const res = await stub.fetch(`https://memory/history?limit=${limit}`);
  if (!res.ok) return [];
  const data = (await res.json()) as { messages?: HistoryMessage[] };
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

export async function handleChat(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    const sessionId = request.headers.get("X-Session-Id");
    if (!sessionId) {
      return json({ error: "Missing X-Session-Id header" }, 400);
    }

    const memory = getMemoryStub(env, sessionId);

    let body: ChatRequestBody;
    try {
      body = (await request.json()) as ChatRequestBody;
    } catch {
      return json({ error: "Invalid JSON" }, 400);
    }

    const { message, mode = "general", model, maxTokens } = body;
    if (!message) {
      return json({ error: "Message is required" }, 400);
    }

    const resolvedModel: AllowedModel =
      model && (ALLOWED_MODELS as readonly string[]).includes(model)
        ? (model as AllowedModel)
        : DEFAULT_MODEL;

    const resolvedMaxTokens = Math.max(
      MIN_TOKENS,
      Math.min(MAX_TOKENS, typeof maxTokens === "number" ? maxTokens : DEFAULT_MAX_TOKENS)
    );

    const systemPrompt = SYSTEM_PROMPTS[mode] ?? SYSTEM_PROMPTS.general;

    const history = await getHistory(memory);
    await appendMessage(memory, "user", message);

    const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

    const completion = await openai.chat.completions.create({
      model: resolvedModel,
      stream: true,
      max_completion_tokens: resolvedMaxTokens,
      messages: [
        { role: "system", content: systemPrompt },
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
          controller.enqueue(encoder.encode("\n[Error generating response]"));
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
    console.error("handleChat error:", err);
    return json({ error: "Internal server error" }, 500);
  }
}
