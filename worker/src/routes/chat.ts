// worker/src/routes/chat.ts
import OpenAI from "openai";
import { Env, CORS_HEADERS } from "../index";

type Mode = "general" | "teaching" | "coding" | "writing" | "creative";

const ALLOWED_MODELS = [
  "gpt-4o-mini",
  "gpt-4o",
  "gpt-4-turbo",
  "gpt-3.5-turbo",
  "o1-mini",
] as const;
type AllowedModel = (typeof ALLOWED_MODELS)[number];

const DEFAULT_MODEL: AllowedModel = "gpt-4o-mini";
const MIN_TOKENS = 50;
const MAX_TOKENS = 4096;
const DEFAULT_MAX_TOKENS = 150;

interface ChatRequestBody {
  message?: string;
  mode?: Mode;
  model?: string;
  maxTokens?: number;
}

const SYSTEM_PROMPTS: Record<Mode, string> = {
  general:
    "You are a helpful assistant. Answer questions clearly and concisely.",
  teaching:
    "You are a patient and encouraging teacher. Explain concepts step by step, use analogies, ask guiding questions, and check for understanding. Adapt your explanation level to the learner.",
  coding:
    "You are an expert software engineer. Provide clear, idiomatic code with brief explanations. Mention edge cases, performance considerations, and best practices when relevant.",
  writing:
    "You are a skilled writing assistant. Help with grammar, tone, structure, and clarity. Offer concrete suggestions and alternatives while preserving the author's voice.",
  creative:
    "You are a creative brainstorming partner. Think outside the box, offer multiple ideas, build on concepts, and encourage exploration. Be imaginative and playful.",
};

type HistoryMessage = { role: "user" | "assistant"; content: string };

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

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

    const { message, mode = "general", model, maxTokens } = body;
    if (!message) {
      return new Response(JSON.stringify({ error: "Message is required" }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
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
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
}
