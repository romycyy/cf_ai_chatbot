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
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Session-Id",
};

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    const url = new URL(request.url);

    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS_HEADERS });
    }

    // Route: POST /chat
    if (request.method === "POST" && url.pathname === "/chat") {
      return handleChat(request, env, ctx);
    }

    return new Response("Not Found", {
      status: 404,
      headers: { "Access-Control-Allow-Origin": "*" },
    });
  },
};
