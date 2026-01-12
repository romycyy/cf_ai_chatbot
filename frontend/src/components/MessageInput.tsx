import { useState } from "react";
import { useChatSettings } from "../context/ChatSettingsContext";
import { streamChat } from "../hooks/useChatStream";

interface Props {
  onUserMessage: (m: string) => void;
  onAssistantToken: (t: string) => void;
}

export const MessageInput = ({ onUserMessage, onAssistantToken }: Props) => {
  const [text, setText] = useState("");
  const settings = useChatSettings();

  const send = async () => {
    if (!text.trim()) return;
    const currentText = text;
    setText("");
    onUserMessage(currentText);

    try {
      await streamChat(
        { message: currentText, ...settings },
        settings.sessionId,
        (t) => onAssistantToken(t)
      );
    } catch (err) {
      console.error(err);
      onAssistantToken(
        `\n[Error: ${err instanceof Error ? err.message : String(err)}]`
      );
    }
  };

  return (
    <div className="input">
      <textarea value={text} onChange={(e) => setText(e.target.value)} />
      <button onClick={send}>Send</button>
    </div>
  );
};
