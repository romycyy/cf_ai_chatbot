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



function getSessionId(request: Request): string {
    const sessionId = request.headers.get("X-Session-Id");
    if (!sessionId) {
      throw new Error("Missing X-Session-Id header");
    }
    return sessionId;
  }

function getChatMemoryStub(env: Env, sessionId: string): DurableObjectStub {
    const id = env.CHAT_MEMORY.idFromName(sessionId);
    return env.CHAT_MEMORY.get(id);
  }
  
async function getHistory(
    stub: DurableObjectStub,
    limit = 20
  ): Promise<Array<{ role: string; content: string }>> {
    const url = new URL('https://memory/history');
    url.searchParams.set('limit', limit.toString());
    const res = await stub.fetch(url.toString(), {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    const data = await res.json();
    return data.messages ?? [];
  }

async function appendMessage(
    stub: DurableObjectStub,
    role: "user" | "assistant",
    content: string
  ): Promise<void> {
    await stub.fetch("https://memory/append", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role, content })
    });
  }
/**
 * Cloudflare Worker that accepts chat messages
 * and proxies them to OpenAI's ChatGPT API.
 */
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") {
      // Allow CORS so you can call this from browser
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, X-Session-Id",
        },
      });
    }

    if (request.method === "POST" && new URL(request.url).pathname === "/chat") {
      try {
        const sessionId = getSessionId(request);
        const chatMemoryStub = getChatMemoryStub(env, sessionId);
        const history = await getHistory(chatMemoryStub);

        const body = await request.json() as ChatRequestBody;
        const userMessage = body.message;

        // Validate input
        if (!userMessage) {
          return Response.json({ error: "Message is required" }, { status: 400 });
        }

        // Create OpenAI client with the secret you set in Cloudflare
        const openai = new OpenAI({
          apiKey: env.OPENAI_API_KEY, // secret stored with wrangler
        });

        const messages = [
          { role: "system", content: "You are a helpful assistant." },
          ...history,
          { role: "user", content: userMessage },
        ];

        // Call OpenAI's chat completions
        const response = await openai.chat.completions.create({
          model: "gpt-4o-mini",       // Choose whichever model you want
          messages: messages,
          max_tokens: 150,
        });

        // Extract the text reply
        const reply = response.choices?.[0]?.message?.content || "";
        
        if (!reply) {
          return Response.json({ error: "No response from OpenAI" }, { status: 500 });
        }

        // Save user message first, then assistant reply to maintain correct conversation order
        await appendMessage(chatMemoryStub, "user", userMessage);
        await appendMessage(chatMemoryStub, "assistant", reply);

        return Response.json({ reply }, {
          headers: { "Access-Control-Allow-Origin": "*" },
        });

      } catch (err) {
        console.error(err);
        return Response.json({ error: String(err) }, { status: 500 });
      }
    }

    return new Response("AI Chatbot Worker — POST to /chat", {
      headers: { "Access-Control-Allow-Origin": "*" },
    });
  },
};

