import { useChatSettings } from "../context/ChatSettingsContext";

export const TokenSlider = () => {
  const { maxTokens, setMaxTokens } = useChatSettings();

  return (
    <label>
      Max Tokens: {maxTokens}
      <input
        type="range"
        min={64}
        max={4096}
        step={64}
        value={maxTokens}
        onChange={(e) => setMaxTokens(Number(e.target.value))}
      />
    </label>
  );
};
