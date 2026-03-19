export type Mode = "general" | "teaching" | "coding" | "writing" | "creative";

export const ALLOWED_MODELS = [
  "gpt-4o-mini",
  "gpt-4o",
  "gpt-4-turbo",
  "gpt-3.5-turbo",
  "o1-mini",
] as const;

export type AllowedModel = (typeof ALLOWED_MODELS)[number];

export interface ChatRequestBody {
  message?: string;
  mode?: Mode;
  model?: string;
  maxTokens?: number;
}

export const DEFAULT_MODEL: AllowedModel = "gpt-4o-mini";
export const MIN_TOKENS = 50;
export const MAX_TOKENS = 4096;
export const DEFAULT_MAX_TOKENS = 150;

export const MODES: readonly { value: Mode; label: string; icon: string }[] = [
  { value: "general", label: "General", icon: "\u{1F4AC}" },
  { value: "teaching", label: "Teaching", icon: "\u{1F4DA}" },
  { value: "coding", label: "Coding", icon: "\u{1F4BB}" },
  { value: "writing", label: "Writing", icon: "\u270D\uFE0F" },
  { value: "creative", label: "Creative", icon: "\u{1F3A8}" },
];

export const MODELS = [
  { value: "gpt-4o-mini", label: "GPT-4o Mini", desc: "Fast & affordable" },
  { value: "gpt-4o", label: "GPT-4o", desc: "Most capable" },
  { value: "gpt-4-turbo", label: "GPT-4 Turbo", desc: "High throughput" },
  { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo", desc: "Legacy, low cost" },
  { value: "o1-mini", label: "o1-mini", desc: "Reasoning model" },
] as const;

export const SYSTEM_PROMPTS: Record<Mode, string> = {
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
