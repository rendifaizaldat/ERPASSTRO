import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { PosProvider } from "./core/PosProvider";
import { ToastUniversalProvider } from "./components/Toast";
import { ledger, projector } from "./core/instances";
import "./index.css";

// --- DEKLARASI TIPE UNTUK TYPESCRIPT ---
// Memberitahu TypeScript bahwa objek 'window' memiliki properti kustom ini
declare global {
  interface Window {
    deferredPWAInstallPrompt: any;
    __AUDITOR__?: {
      ledger: typeof ledger;
      projector: typeof projector;
    };
  }
}
// ---------------------------------------

// --- Tangkap event sebelum React mulai me-render ---
window.deferredPWAInstallPrompt = null;
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  window.deferredPWAInstallPrompt = e;
});
// ---------------------------------------------------

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

// Expose auditor API only in development/testing
if (import.meta.env.DEV || import.meta.env.MODE === "test") {
  (window as any).__AUDITOR__ = { ledger, projector };
}
