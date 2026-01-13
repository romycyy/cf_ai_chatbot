// worker/src/index.ts
import { handleChat } from "./routes/chat";
import { ChatMemoryDO } from "./chatMemoryDO";

export { ChatMemoryDO };

export interface Env {
  CHAT_MEMORY: DurableObjectNamespace;
  OPENAI_API_KEY: string;
}

export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Session-Id",
};

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    const url = new URL(request.url);
    const pathname = url.pathname.replace(/\/+$/, "") || "/";

    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS_HEADERS });
    }

    // Health check (easy to test directly in browser)
    if (request.method === "GET" && (pathname === "/" || pathname === "/health")) {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    // Route: POST /chat
    if (request.method === "POST" && pathname === "/chat") {
      return handleChat(request, env, ctx);
    }

    // Helpful errors for direct access / debugging
    if (pathname === "/chat") {
      return new Response(
        JSON.stringify({ error: "Method Not Allowed. Use POST /chat." }),
        {
          status: 405,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(JSON.stringify({ error: "Not Found" }), {
      status: 404,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  },
};
