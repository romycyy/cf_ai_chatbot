import { useState } from "react";
import { ControlPanel } from "./components/ControlPanel";
import { ChatWindow } from "./components/ChatWindow";
import { MessageInput } from "./components/MessageInput";
import { Message } from "./types/chat";

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);

  const addUserMessage = (content: string) => {
    setMessages((m) => [...m, { role: "user", content }]);
  };

  const addAssistantToken = (token: string) => {
    setMessages((m) => {
      const last = m[m.length - 1];
      if (last && last.role === "assistant") {
        return [
          ...m.slice(0, -1),
          { ...last, content: last.content + token },
        ];
      }
      return [...m, { role: "assistant", content: token }];
    });
  };

  return (
    <div className="app">
      <ControlPanel />
      <ChatWindow messages={messages} />
      <MessageInput
        onUserMessage={addUserMessage}
        onAssistantToken={addAssistantToken}
      />
    </div>
  );
}