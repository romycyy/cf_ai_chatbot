import { useEffect, useMemo, useRef, useState } from "react";

type ChatMessage = {
  id: string;
  text: string;
  isUser: boolean;
};

const API_URL = "https://chatbot-dev.cyy20041234.workers.dev/chat";
const SESSION_STORAGE_KEY = "session_id";

function getSessionId() {
  let id = localStorage.getItem(SESSION_STORAGE_KEY);
  if (!id) {
    id = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    localStorage.setItem(SESSION_STORAGE_KEY, id);
  }
  return id;
}

export default function App() {
  const [inputText, setInputText] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const messagesElRef = useRef<HTMLDivElement | null>(null);
  const sessionId = useMemo(() => getSessionId(), []);

  useEffect(() => {
    const el = messagesElRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages]);

  const addMessage = (text: string, isUser: boolean) => {
    const id = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const msg: ChatMessage = { id, text, isUser };
    setMessages((m) => [...m, msg]);
    return id;
  };

  const appendToMessage = (id: string, chunk: string) => {
    setMessages((m) =>
      m.map((msg) => (msg.id === id ? { ...msg, text: msg.text + chunk } : msg))
    );
  };

  const sendMessage = async () => {
    const text = inputText.trim();
    if (!text) return;

    addMessage(text, true);
    setInputText("");

    const botId = addMessage("", false);

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Session-Id": sessionId,
        },
        body: JSON.stringify({ message: text }),
      });

      if (!res.ok || !res.body) {
        setMessages((m) =>
          m.map((msg) =>
            msg.id === botId ? { ...msg, text: "Error: failed to stream response" } : msg
          )
        );
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        appendToMessage(botId, decoder.decode(value, { stream: true }));
      }

      // Flush remaining UTF-8 bytes
      appendToMessage(botId, decoder.decode());
    } catch (err) {
      console.error(err);
      setMessages((m) =>
        m.map((msg) => (msg.id === botId ? { ...msg, text: "Error: failed to send" } : msg))
      );
    }
  };

  return (
    <div className="chat-container">
      <div id="messages" className="messages" ref={messagesElRef}>
        {messages.map((m) => (
          <div key={m.id} className={`message ${m.isUser ? "user" : "bot"}`}>
            {m.text}
          </div>
        ))}
      </div>
      <div className="input-bar">
        <input
          id="inputText"
          placeholder="Type a message..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") sendMessage();
          }}
        />
        <button onClick={sendMessage}>Send</button>
      </div>
    </div>
  );
}