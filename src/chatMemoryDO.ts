export type Role = "user" | "assistant" | "system";
export type Msg = { role: Role; content: string; ts: number };

export class ChatMemoryDO {
  state: DurableObjectState;

  constructor(state: DurableObjectState) {
    this.state = state;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const pathname = url.pathname;

    if (request.method === "GET" && pathname === "/history") {
      const limit = Math.max(1, Math.min(200, Number(url.searchParams.get("limit") ?? "20")));
      const messages = (await this.state.storage.get<Msg[]>("messages")) ?? [];
      return Response.json({ messages: messages.slice(-limit) });
    }

    if (request.method === "POST" && pathname === "/append") {
      const body = await request.json().catch(() => null) as null | { role?: Role; content?: string };
      if (!body?.role || typeof body.content !== "string") {
        return new Response("Bad Request", { status: 400 });
      }

      const messages = (await this.state.storage.get<Msg[]>("messages")) ?? [];
      messages.push({ role: body.role, content: body.content, ts: Date.now() });

      // trim
      const MAX = 40; // keep last 40 messages
      const trimmed = messages.slice(-MAX);

      await this.state.storage.put("messages", trimmed);
      return new Response("OK");
    }

    if (request.method === "POST" && pathname === "/reset") {
      await this.state.storage.delete("messages");
      return new Response("OK");
    }

    return new Response("Not Found", { status: 404 });
  }
}
