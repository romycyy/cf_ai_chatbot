export type ChatMode = "chat" | "explain" | "code" | "debug";

export interface Message {
  role: "user" | "assistant";
  content: string;
}

export interface ChatRequest {
  message: string;
  model: string;
  maxTokens: number;
  mode: ChatMode;
}
