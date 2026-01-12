import { useChatSettings } from "../context/ChatSettingsContext";

export const ModelSelector = () => {
  const { model, setModel } = useChatSettings();

  return (
    <label>
      Model
      <select value={model} onChange={(e) => setModel(e.target.value)}>
        <option value="gpt-4o-mini">GPT-4o Mini</option>
        <option value="gpt-4.1">GPT-4.1</option>
        <option value="gpt-3.5-turbo">GPT-3.5</option>
      </select>
    </label>
  );
};
