import { ModelSelector } from "./ModelSelector";
import { TokenSlider } from "./TokenSlider";
import { ModeSelector } from "./ModeSelector";
import { useState } from "react";

export const ControlPanel = () => {
  const [open, setOpen] = useState(true);

  return (
    <aside className="control-panel">
      <button onClick={() => setOpen(!open)}>⚙ Settings</button>
      {open && (
        <>
          <ModelSelector />
          <TokenSlider />
          <ModeSelector />
        </>
      )}
    </aside>
  );
};
