// tools/auditor/diagnostic-engine.ts
import { dbChecker } from "./db-checker";
import { Server } from "socket.io";

export interface EvidenceBuffer {
  domMutations: number;
  networkRequests: number;
  storageMutations: number;
  ledgerEvents: number;
  toasts: number;
  urlChanges: number;
  preState: any;
  postState: any;
}

export interface InteractionMeta {
  tagName: string;
  id: string;
  className: string;
  text: string;
}

export class DiagnosticEngine {
  private activeInteractions = new Map<string, { meta: InteractionMeta; serverPreState?: any }>();

  constructor(private io: Server) {}

  public async onInteractionStart(interactionId: string, meta: InteractionMeta, timestamp: number) {
    console.log(`[Diagnostic] Interaction Started: ${interactionId} on <${meta.tagName}> "${meta.text.trim()}"`);

    // Asynchronously fetch server pre-state
    let serverPreState = null;
    try {
       serverPreState = await dbChecker.getServerState();
    } catch (e) {
       console.error("Failed to fetch server pre-state", e);
    }

    this.activeInteractions.set(interactionId, { meta, serverPreState });

    this.io.emit("interaction_start", {
       interactionId,
       meta,
       timestamp
    });
  }

  public async onInteractionComplete(interactionId: string, evidence: EvidenceBuffer) {
    const interactionInfo = this.activeInteractions.get(interactionId);
    if (!interactionInfo) return;

    console.log(`[Diagnostic] Evaluating Evidence for ${interactionId}...`);

    let serverPostState = null;
    try {
       serverPostState = await dbChecker.getServerState();
    } catch (e) {
       console.error("Failed to fetch server post-state", e);
    }

    const { meta, serverPreState } = interactionInfo;
    this.activeInteractions.delete(interactionId);

    // --- SCORING SYSTEM ---
    let score = 0;
    if (evidence.domMutations > 0) score++;
    if (evidence.networkRequests > 0) score++;
    if (evidence.storageMutations > 0) score++;
    if (evidence.ledgerEvents > 0) score++;
    if (evidence.urlChanges > 0) score++;
    if (evidence.toasts > 0) score++; // Toast provides evidence of activity (e.g. error boundary/notification)

    // --- DIAGNOSIS LOGIC ---
    let diagnosis = "";
    let confidence = "0%";
    let isError = false;

    if (score === 0) {
      diagnosis = "Dead Button - No system activity detected.";
      confidence = "99%";
      isError = true;
    } else if (evidence.toasts > 0 && evidence.networkRequests === 0 && evidence.ledgerEvents === 0) {
      diagnosis = "Exception before execution (Only Toast/UI error shown).";
      confidence = "80%";
      isError = true;
    } else if (evidence.domMutations > 0 && score === 1) {
      diagnosis = "UI Interaction (e.g., Modal Open/Close). No data mutation.";
      confidence = "95%";
    } else if (evidence.ledgerEvents > 0 || evidence.networkRequests > 0 || evidence.storageMutations > 0) {
      diagnosis = "Action executed successfully.";
      confidence = "90%";
    } else {
      diagnosis = `Activity detected but inconclusive (Score: ${score}/6).`;
      confidence = "50%";
    }

    const report = {
      interactionId,
      element: meta,
      evidenceSummary: {
        dom: evidence.domMutations,
        network: evidence.networkRequests,
        storage: evidence.storageMutations,
        ledger: evidence.ledgerEvents,
        toast: evidence.toasts,
        url: evidence.urlChanges
      },
      score,
      diagnosis,
      confidence,
      isError
    };

    console.log(`[Diagnostic] Verdict: ${diagnosis} (Score: ${score}/6)`);

    // --- STATE COMPARATOR (Mode 2) ---
    let diffReport = null;
    if (evidence.preState && evidence.postState) {
        diffReport = this.compareStates(
          { local: evidence.preState, server: serverPreState },
          { local: evidence.postState, server: serverPostState }
        );
    }

    // Emit result to UI
    this.io.emit("diagnosis_report", { report, diffReport });
  }

  private compareStates(pre: { local: any, server: any }, post: { local: any, server: any }) {
    const changes: string[] = [];

    const compareObjects = (preObj: any, postObj: any, prefix: string) => {
      if (!preObj && !postObj) return;
      if (!preObj && postObj) {
         changes.push(`[NEW] Data added in ${prefix}`);
         return;
      }
      if (preObj && !postObj) {
         changes.push(`[REMOVED] Data removed from ${prefix}`);
         return;
      }

      if (Array.isArray(preObj) && Array.isArray(postObj)) {
         if (postObj.length > preObj.length) {
            changes.push(`[INSERT] ${postObj.length - preObj.length} row(s) added to ${prefix}.`);
         } else if (postObj.length < preObj.length) {
            changes.push(`[DELETE] ${preObj.length - postObj.length} row(s) removed from ${prefix}.`);
         }
      } else if (typeof preObj === 'object' && typeof postObj === 'object') {
         const keys = new Set([...Object.keys(preObj), ...Object.keys(postObj)]);
         for (const key of keys) {
            if (JSON.stringify(preObj[key]) !== JSON.stringify(postObj[key])) {
               const preVal = typeof preObj[key] === 'object' ? '...' : preObj[key];
               const postVal = typeof postObj[key] === 'object' ? '...' : postObj[key];
               changes.push(`[UPDATE] ${prefix}.${key} changed from '${preVal}' to '${postVal}'.`);
            }
         }
      }
    };

    // Compare Local State
    compareObjects(pre.local, post.local, "Local State");

    // Compare Server State
    if (pre.server && post.server) {
      if (pre.server.shifts || post.server.shifts) compareObjects(pre.server.shifts, post.server.shifts, "Server.Shifts");
      if (pre.server.categories || post.server.categories) compareObjects(pre.server.categories, post.server.categories, "Server.Categories");
      if (pre.server.products || post.server.products) compareObjects(pre.server.products, post.server.products, "Server.Products");
      if (pre.server.journal || post.server.journal) compareObjects(pre.server.journal, post.server.journal, "Server.Journal");
    }

    return {
       hasChanges: changes.length > 0,
       changes,
       raw: { pre, post }
    };
  }
}
