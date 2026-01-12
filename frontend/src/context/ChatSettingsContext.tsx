import { createContext, useContext } from "react";
import { usePersistedState } from "../hooks/usePersistedState";
import { ChatMode } from "../types/chat";

interface ChatSettings {
  model: string;
  maxTokens: number;
  mode: ChatMode;
  sessionId: string;
  setModel: (m: string) => void;
  setMaxTokens: (n: number) => void;
  setMode: (m: ChatMode) => void;
}

const ChatSettingsContext = createContext<ChatSettings | null>(null);

export const ChatSettingsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [model, setModel] = usePersistedState("chat:model", "gpt-4o-mini");
  const [maxTokens, setMaxTokens] = usePersistedState("chat:tokens", 512);
  const [mode, setMode] = usePersistedState<ChatMode>("chat:mode", "chat");
  const [sessionId] = usePersistedState("chat:session_id", crypto.randomUUID());

  return (
    <ChatSettingsContext.Provider
      value={{ model, maxTokens, mode, sessionId, setModel, setMaxTokens, setMode }}
    >
      {children}
    </ChatSettingsContext.Provider>
  );
};

export const useChatSettings = () => {
  const ctx = useContext(ChatSettingsContext);
  if (!ctx) throw new Error("useChatSettings must be inside provider");
  return ctx;
};
