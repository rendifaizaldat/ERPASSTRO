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

  const initializeCollector = () => {
    console.log("[Auditor] Evidence Collector Initialized");

    // Evidence Buffer
    let currentInteractionId: string | null = null;
    let evidenceBuffer: {
      domMutations: number;
      networkRequests: number;
      storageMutations: number;
      ledgerEvents: Array<{ type: string; payload: any }>; // [DIUBAH] Menangkap payload murni
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
        ledgerEvents: [], // [DIUBAH] Array kosong
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
        if (window.__AUDITOR__ && window.__AUDITOR__.projector) {
          try {
            evidenceBuffer.postState =
              await window.__AUDITOR__.projector.getState();
          } catch (e) {
            console.error("Failed to fetch postState", e);
          }
        }
        sendEvidence();
      }, 1000);
    }

    function registerEvidence(layer: keyof typeof evidenceBuffer, data?: any) {
      if (currentInteractionId) {
        if (layer === "ledgerEvents" && data) {
          (evidenceBuffer.ledgerEvents as Array<any>).push(data);
          triggerEvaluationWindow();
        } else if (typeof evidenceBuffer[layer] === "number") {
          (evidenceBuffer[layer] as number)++;
          triggerEvaluationWindow();
        }
      }
    }

    // --- LAYER 1: DOM Observer ---
    const domObserver = new MutationObserver((mutations) => {
      let significantChange = false;
      mutations.forEach((mutation) => {
        if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
          significantChange = true;
          mutation.addedNodes.forEach((node) => {
            if (node instanceof HTMLElement) {
              const htmlNode = node as HTMLElement;
              const className = htmlNode.className || "";
              if (
                typeof className === "string" &&
                (className.toLowerCase().includes("toast") ||
                  className.toLowerCase().includes("snackbar") ||
                  htmlNode.getAttribute("role") === "alert")
              ) {
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

    const targetRoot = document.body || document.documentElement;
    if (targetRoot) {
      domObserver.observe(targetRoot, {
        childList: true,
        subtree: true,
        attributes: true,
        characterData: true,
      });
    }

    // --- LAYER 2: Network Observer ---
    const originalFetch = window.fetch;
    window.fetch = async function (...args) {
      registerEvidence("networkRequests");
      return originalFetch.apply(this, args);
    };

    const originalXHR = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function (
      this: XMLHttpRequest,
      ...args: any[]
    ) {
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

    // --- LAYER 4: Ledger (Mode 2 Enhanced - Payload Capture) ---
    let ledgerPatched = false;
    const checkAuditorInterval = setInterval(() => {
      if (window.__AUDITOR__ && window.__AUDITOR__.ledger && !ledgerPatched) {
        const originalAppend = window.__AUDITOR__.ledger.appendEvent;
        window.__AUDITOR__.ledger.appendEvent = async function (
          type: string,
          payload: any,
        ) {
          registerEvidence("ledgerEvents", { type, payload }); // [DIUBAH] Merekam Tipe dan Payload
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
            window.sendAuditorEvent("app_ready", {
              baselineState: localBaseline,
            });
          }
          appReadySent = true;
          clearInterval(checkReadyInterval);
        } catch (e) {
          console.error("Failed to capture baseline state", e);
        }
      }
    }, 1000);

    // --- The Trigger: Interaction Observer ---
    document.addEventListener(
      "click",
      async (e) => {
        const target = e.target instanceof Element ? e.target : null;
        if (!target) return;
        const interactiveTarget = target.closest(
          "button, a, input, select, textarea, [role='button'], [role='link'], [tabindex]",
        );
        const resolvedTarget = interactiveTarget ?? target;
        const interactionId = `click_${Date.now()}_${Math.random().toString(36).substring(7)}`;

        if (currentInteractionId) {
          sendEvidence();
        }

        currentInteractionId = interactionId;
        evidenceBuffer = resetEvidenceBuffer();

        const elementMeta = {
          tagName: resolvedTarget.tagName,
          id: resolvedTarget.id,
          className:
            typeof resolvedTarget.className === "string"
              ? resolvedTarget.className
              : "",
          text: resolvedTarget.textContent?.substring(0, 50) || "",
        };

        if (window.sendAuditorEvent) {
          window.sendAuditorEvent("interaction_start", {
            interactionId,
            element: elementMeta,
            timestamp: Date.now(),
          });
        }

        if (window.__AUDITOR__ && window.__AUDITOR__.projector) {
          try {
            evidenceBuffer.preState =
              await window.__AUDITOR__.projector.getState();
          } catch (e) {
            console.error("Failed to fetch preState", e);
          }
        }
        triggerEvaluationWindow();
      },
      { capture: true },
    );
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeCollector, {
      once: true,
    });
  } else {
    initializeCollector();
  }
}
