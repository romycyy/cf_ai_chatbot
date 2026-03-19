import { useEffect, useMemo, useRef, useState } from "react";

type ChatMessage = {
  id: string;
  text: string;
  isUser: boolean;
};

const API_URL = "https://chatbot-dev.cyy20041234.workers.dev/chat";
const SESSION_STORAGE_KEY = "session_id";

type Mode = "general" | "teaching" | "coding" | "writing" | "creative";

const MODES: { value: Mode; label: string; icon: string }[] = [
  { value: "general", label: "General", icon: "💬" },
  { value: "teaching", label: "Teaching", icon: "📚" },
  { value: "coding", label: "Coding", icon: "💻" },
  { value: "writing", label: "Writing", icon: "✍️" },
  { value: "creative", label: "Creative", icon: "🎨" },
];

const MODELS = [
  { value: "gpt-4o-mini", label: "GPT-4o Mini", desc: "Fast & affordable" },
  { value: "gpt-4o", label: "GPT-4o", desc: "Most capable" },
  { value: "gpt-4-turbo", label: "GPT-4 Turbo", desc: "High throughput" },
  { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo", desc: "Legacy, low cost" },
  { value: "o1-mini", label: "o1-mini", desc: "Reasoning model" },
] as const;

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
  const [mode, setMode] = useState<Mode>("general");
  const [model, setModel] = useState("gpt-4o-mini");
  const [maxTokens, setMaxTokens] = useState(1024);
  const [panelOpen, setPanelOpen] = useState(false);

  const messagesElRef = useRef<HTMLDivElement | null>(null);
  const sessionId = useMemo(() => getSessionId(), []);

  useEffect(() => {
    const el = messagesElRef.current;
    if (!el) return;
    // Only auto-scroll if the user is already near the bottom.
    // This lets users scroll up to read older messages without being yanked down,
    // while still keeping the "chat sticks to latest" behavior for normal usage.
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const NEAR_BOTTOM_PX = 48;
    if (distanceFromBottom < NEAR_BOTTOM_PX) {
      el.scrollTop = el.scrollHeight;
    }
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
        body: JSON.stringify({ message: text, mode, model, maxTokens }),
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
    <div className="app-layout">
      <div className="chat-container">
        <div className="top-bar">
          <div className="mode-bar">
            {MODES.map((m) => (
              <button
                key={m.value}
                className={`mode-btn ${mode === m.value ? "active" : ""}`}
                onClick={() => setMode(m.value)}
              >
                <span className="mode-icon">{m.icon}</span>
                {m.label}
              </button>
            ))}
          </div>
          <button
            className="settings-toggle"
            onClick={() => setPanelOpen((o) => !o)}
            aria-label="Toggle settings"
          >
            &#9881;
          </button>
        </div>

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

      <div className={`settings-panel ${panelOpen ? "open" : ""}`}>
        <div className="panel-header">
          <h3>Settings</h3>
          <button className="panel-close" onClick={() => setPanelOpen(false)}>
            &times;
          </button>
        </div>

        <div className="panel-section">
          <label className="panel-label">Model</label>
          {MODELS.map((m) => (
            <button
              key={m.value}
              className={`model-option ${model === m.value ? "active" : ""}`}
              onClick={() => setModel(m.value)}
            >
              <span className="model-name">{m.label}</span>
              <span className="model-desc">{m.desc}</span>
            </button>
          ))}
        </div>

        <div className="panel-section">
          <label className="panel-label">
            Max Tokens: <strong>{maxTokens}</strong>
          </label>
          <input
            type="range"
            className="token-slider"
            min={50}
            max={4096}
            step={10}
            value={maxTokens}
            onChange={(e) => setMaxTokens(Number(e.target.value))}
          />
          <div className="token-range-labels">
            <span>50</span>
            <span>4096</span>
          </div>
        </div>
      </div>

      {panelOpen && (
        <div className="panel-overlay" onClick={() => setPanelOpen(false)} />
      )}
    </div>
  );
}