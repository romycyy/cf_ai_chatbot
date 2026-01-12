import { useChatSettings } from "../context/ChatSettingsContext";
import { ChatMode } from "../types/chat";

const MODES: ChatMode[] = ["chat", "explain", "code", "debug"];

export const ModeSelector = () => {
  const { mode, setMode } = useChatSettings();

  return (
    <div className="mode-selector">
      {MODES.map((m) => (
        <button
          key={m}
          className={mode === m ? "active" : ""}
          onClick={() => setMode(m)}
        >
          {m}
        </button>
      ))}
    </div>
  );
};
