import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { PosProvider } from "./core/PosProvider";
import { ToastUniversalProvider } from "./components/Toast";
import "./index.css";

const container = document.getElementById("root");
if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <ToastUniversalProvider>
        <PosProvider>
          <App />
        </PosProvider>
      </ToastUniversalProvider>
    </React.StrictMode>,
  );
}
