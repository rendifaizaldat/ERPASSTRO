// tools/auditor/evidence-collector.ts
// Script ini akan di-inject ke browser PWA oleh Playwright
// Berjalan di konteks browser klien.

declare global {
  interface Window {
    __AUDITOR__?: {
      projector: {
        getState: () => Promise<any>;
      };
      ledger: {
        appendEvent: (type: string, payload: any) => Promise<void>;
      };
    };
    sendAuditorEvent: (event: string, payload: any) => void;
  }
}

export function injectEvidenceCollector() {
  if ((window as any).__EVIDENCE_COLLECTOR_INITIALIZED) return;
  (window as any).__EVIDENCE_COLLECTOR_INITIALIZED = true;

  console.log("[Auditor] Evidence Collector Initialized");

  // Evidence Buffer
  let currentInteractionId: string | null = null;
  let evidenceBuffer: {
    domMutations: number;
    networkRequests: number;
    storageMutations: number;
    ledgerEvents: number;
    toasts: number;
    urlChanges: number;
    preState: any;
    postState: any;
  } = resetEvidenceBuffer();

  let debounceTimer: any = null;

  function resetEvidenceBuffer() {
    return {
      domMutations: 0,
      networkRequests: 0,
      storageMutations: 0,
      ledgerEvents: 0,
      toasts: 0,
      urlChanges: 0,
      preState: null,
      postState: null,
    };
  }

  function sendEvidence() {
    if (!currentInteractionId) return;

    // Send the accumulated evidence to the Node.js server via Playwright binding
    if (window.sendAuditorEvent) {
      window.sendAuditorEvent("interaction_complete", {
        interactionId: currentInteractionId,
        evidence: evidenceBuffer,
      });
    }

    currentInteractionId = null;
    evidenceBuffer = resetEvidenceBuffer();
  }

  async function triggerEvaluationWindow() {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    // We wait 1000ms for activities to settle down after an interaction
    debounceTimer = setTimeout(async () => {
      // Capture Post-State if in Mode 2
      if (window.__AUDITOR__ && window.__AUDITOR__.projector) {
        try {
          evidenceBuffer.postState = await window.__AUDITOR__.projector.getState();
        } catch (e) {
          console.error("Failed to fetch postState", e);
        }
      }
      sendEvidence();
    }, 1000);
  }

  function registerEvidence(layer: keyof typeof evidenceBuffer) {
    if (currentInteractionId && typeof evidenceBuffer[layer] === "number") {
      (evidenceBuffer[layer] as number)++;
      triggerEvaluationWindow(); // Extend window
    }
  }

  // --- LAYER 1: DOM Observer ---
  const domObserver = new MutationObserver((mutations) => {
    let significantChange = false;
    mutations.forEach((mutation) => {
      // Filter out trivial mutations if needed, but for now we count any node addition/removal or text change
      if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
        significantChange = true;
        // Check for Toasts or Modals based on common class names or roles
        mutation.addedNodes.forEach(node => {
          if (node instanceof HTMLElement) {
             const htmlNode = node as HTMLElement;
             const className = htmlNode.className || "";
             if (typeof className === 'string' && (className.toLowerCase().includes("toast") || className.toLowerCase().includes("snackbar") || htmlNode.getAttribute("role") === "alert")) {
                registerEvidence("toasts");
             }
          }
        });
      }
    });

    if (significantChange) {
      registerEvidence("domMutations");
    }
  });

  domObserver.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    characterData: true,
  });

  // --- LAYER 2: Network Observer ---
  const originalFetch = window.fetch;
  window.fetch = async function (...args) {
    registerEvidence("networkRequests");
    return originalFetch.apply(this, args);
  };

  const originalXHR = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (this: XMLHttpRequest, ...args: any[]) {
    registerEvidence("networkRequests");
    return originalXHR.apply(this, args as any);
  };

  // --- LAYER 3: Storage Observer ---
  const originalSetItem = Storage.prototype.setItem;
  Storage.prototype.setItem = function (...args) {
    registerEvidence("storageMutations");
    return originalSetItem.apply(this, args);
  };

  const originalRemoveItem = Storage.prototype.removeItem;
  Storage.prototype.removeItem = function (...args) {
    registerEvidence("storageMutations");
    return originalRemoveItem.apply(this, args);
  };

  const originalClear = Storage.prototype.clear;
  Storage.prototype.clear = function (...args) {
    registerEvidence("storageMutations");
    return originalClear.apply(this, args);
  };

  // --- LAYER 4: Ledger (Mode 2 Enhanced) ---
  // We monkey patch window.__AUDITOR__ if it exists.
  // Since __AUDITOR__ might be attached AFTER page load, we check periodically.
  let ledgerPatched = false;
  const checkAuditorInterval = setInterval(() => {
    if (window.__AUDITOR__ && window.__AUDITOR__.ledger && !ledgerPatched) {
      const originalAppend = window.__AUDITOR__.ledger.appendEvent;
      window.__AUDITOR__.ledger.appendEvent = async function (type: string, payload: any) {
        registerEvidence("ledgerEvents");
        return originalAppend.apply(this, [type, payload]);
      };
      ledgerPatched = true;
      console.log("[Auditor] Ledger monkey patched for evidence collection.");
      clearInterval(checkAuditorInterval);
    }
  }, 500);

  // --- LAYER 6: URL/History Observer ---
  const originalPushState = history.pushState;
  history.pushState = function (...args) {
    registerEvidence("urlChanges");
    return originalPushState.apply(this, args);
  };

  const originalReplaceState = history.replaceState;
  history.replaceState = function (...args) {
    registerEvidence("urlChanges");
    return originalReplaceState.apply(this, args);
  };

  window.addEventListener("popstate", () => {
    registerEvidence("urlChanges");
  });

  // --- Baseline State Initialization ---
  let appReadySent = false;
  const checkReadyInterval = setInterval(async () => {
    if (window.__AUDITOR__ && window.__AUDITOR__.projector && !appReadySent) {
      try {
        const localBaseline = await window.__AUDITOR__.projector.getState();
        if (window.sendAuditorEvent) {
          window.sendAuditorEvent("app_ready", { baselineState: localBaseline });
        }
        console.log("[Auditor] Baseline state captured.");
        appReadySent = true;
        clearInterval(checkReadyInterval);
      } catch (e) {
        console.error("Failed to capture baseline state", e);
      }
    }
  }, 1000);

  // --- The Trigger: Interaction Observer ---
  document.addEventListener("click", async (e) => {
    const target = e.target as HTMLElement;

    // Ignore clicks on non-interactive elements if they don't seem like buttons/links
    // But for broad coverage, we capture all clicks and let the diagnostic engine decide.

    const interactionId = `click_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // If a previous interaction is still collecting, flush it
    if (currentInteractionId) {
      sendEvidence();
    }

    currentInteractionId = interactionId;
    evidenceBuffer = resetEvidenceBuffer();

    // Capture element metadata
    const elementMeta = {
      tagName: target.tagName,
      id: target.id,
      className: typeof target.className === 'string' ? target.className : '',
      text: target.innerText?.substring(0, 50) || target.textContent?.substring(0, 50) || "",
    };

    if (window.sendAuditorEvent) {
      window.sendAuditorEvent("interaction_start", {
        interactionId,
        element: elementMeta,
        timestamp: Date.now(),
      });
    }

    // Capture Pre-State if Mode 2 is available
    if (window.__AUDITOR__ && window.__AUDITOR__.projector) {
      try {
        evidenceBuffer.preState = await window.__AUDITOR__.projector.getState();
      } catch (e) {
        console.error("Failed to fetch preState", e);
      }
    }

    // Start evaluation window
    triggerEvaluationWindow();
  }, { capture: true }); // Use capture to get the click before react handlers

}
