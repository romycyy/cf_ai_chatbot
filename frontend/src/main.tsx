import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { ChatSettingsProvider } from "./context/ChatSettingsContext";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <ChatSettingsProvider>
    <App />
  </ChatSettingsProvider>
);