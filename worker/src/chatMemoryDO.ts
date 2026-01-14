export type Role = "user" | "assistant" | "system";
export type Msg = { role: Role; content: string; ts: number };

type DurableObjectStateLike = {
  storage: {
    get<T>(key: string): Promise<T | undefined>;
    put(key: string, value: unknown): Promise<void>;
  };
};

export class ChatMemoryDO {
  private readonly state: DurableObjectStateLike;

  private static readonly STORAGE_KEY = "messages";
  private static readonly DEFAULT_LIMIT = 20;
  private static readonly MAX_MESSAGES = 40;

  constructor(state: DurableObjectStateLike) {
    this.state = state;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const pathname = url.pathname;

    if (request.method === "GET" && pathname === "/history") {
      const limit = Math.max(
        1,
        Math.min(200, Number(url.searchParams.get("limit") ?? ChatMemoryDO.DEFAULT_LIMIT))
      );
      const messages = (await this.state.storage.get<Msg[]>(ChatMemoryDO.STORAGE_KEY)) ?? [];
      return Response.json({ messages: messages.slice(-limit) });
    }

    if (request.method === "POST" && pathname === "/append") {
      const body = await request.json().catch(() => null) as null | { role?: Role; content?: string };
      if (!body?.role || typeof body.content !== "string") {
        return new Response("Bad Request", { status: 400 });
      }

      const messages = (await this.state.storage.get<Msg[]>(ChatMemoryDO.STORAGE_KEY)) ?? [];
      messages.push({ role: body.role, content: body.content, ts: Date.now() });

      const trimmed = messages.slice(-ChatMemoryDO.MAX_MESSAGES);

      await this.state.storage.put(ChatMemoryDO.STORAGE_KEY, trimmed);
      return new Response("OK");
    }

    return new Response("Not Found", { status: 404 });
  }
}
