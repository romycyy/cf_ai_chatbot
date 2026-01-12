import { Message } from "../types/chat";

export const ChatWindow = ({ messages }: { messages: Message[] }) => (
  <div className="chat-window">
    {messages.map((m, i) => (
      <div key={i} className={`message ${m.role}`}>
        <div className="role-label">{m.role === "user" ? "You" : "AI"}</div>
        <div className="content">{m.content}</div>
      </div>
    ))}
  </div>
);