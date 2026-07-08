// tools/auditor/diagnostic-engine.ts
import { dbChecker } from "./db-checker";
import { Server } from "socket.io";

// --- KAMUS EVENT STATIS ---
const EVENT_DICTIONARY = {
  TYPE_A_CREATE: [
    "SYSTEM_INITIALIZED",
    "ORDER_CREATED",
    "INVOICE_CREATED",
    "PAYMENT_RECEIVED",
    "TABLE_ADDED",
    "CATEGORY_ADDED",
    "PRODUCT_ADDED",
    "MEMBER_REGISTERED",
    "SHIFT_OPENED",
    "PETTY_CASH_ISSUED",
    "SALE_CREATED",
    "TABLE_ORDER_PLACED",
  ],
  TYPE_B_UPDATE: [
    "SETTINGS_UPDATED",
    "ORDER_UPDATED",
    "ORDER_VOIDED",
    "ORDER_REFUNDED",
    "INVOICE_STATUS_UPDATED",
    "PAYMENT_REFUNDED",
    "TABLE_DELETED",
    "TABLE_TOGGLED",
    "TABLE_CLEARED",
    "TABLE_PAYMENT_PROCESSED",
    "SALE_VOIDED",
    "CATEGORY_DELETED",
    "PRODUCT_EDITED",
    "PRODUCT_TOGGLED",
    "PRODUCT_ARCHIVED",
    "PRODUCT_DELETED",
    "STAFF_UPDATED",
    "STAFF_TOGGLED",
    "MEMBER_POINT_EARNED",
    "MEMBER_TIER_UPGRADED",
    "STOCK_ADJUSTED",
    "PRICE_CHANGED",
    "SHIFT_CLOSED",
    "PETTY_CASH_RESOLVED",
    "KDS_STATUS_UPDATED",
  ],
};

export interface EvidenceBuffer {
  domMutations: number;
  networkRequests: number;
  storageMutations: number;
  ledgerEvents: Array<{ type: string; payload: any }>; // Array Payload murni
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
  private activeInteractions = new Map<
    string,
    { meta: InteractionMeta; serverPreState?: any }
  >();
  public initialBaseline: { local?: any; server?: any } = {};

  constructor(private io: Server) {}

  public async onAppReady(localBaseline: any) {
    console.log("[Diagnostic] App Ready event received.");
    this.initialBaseline.local = localBaseline;
    this.io.emit("log", "APP READY: Monitoring started.");
  }

  public async onInteractionStart(
    interactionId: string,
    meta: InteractionMeta,
    timestamp: number,
  ) {
    console.log(`[Diagnostic] Interaction Started: ${interactionId}`);
    this.activeInteractions.set(interactionId, { meta });
    this.io.emit("interaction_start", { interactionId, meta, timestamp });
  }

  public async onInteractionComplete(
    interactionId: string,
    evidence: EvidenceBuffer,
  ) {
    const interactionInfo = this.activeInteractions.get(interactionId);
    if (!interactionInfo) return;

    const { meta } = interactionInfo;
    this.activeInteractions.delete(interactionId);

    // --- PAYLOAD-BASED SMART COMPARATOR ---
    let diagnosis = "";
    let isError = false;
    let confidence = "0%";
    let score = 0;
    const payloadAnalyses: string[] = [];

    const ledgerCount = evidence.ledgerEvents.length;

    if (evidence.domMutations > 0) score++;
    if (evidence.networkRequests > 0) score++;
    if (evidence.storageMutations > 0) score++;
    if (evidence.urlChanges > 0) score++;
    if (evidence.toasts > 0) score++;
    if (ledgerCount > 0) score++;

    if (score === 0) {
      diagnosis = "Dead Button - No system activity detected.";
      confidence = "99%";
      isError = true;
    } else if (
      evidence.toasts > 0 &&
      evidence.networkRequests === 0 &&
      ledgerCount === 0
    ) {
      diagnosis = "Exception before execution (Only Toast/UI error shown).";
      confidence = "80%";
      isError = true;
    } else if (ledgerCount === 0 && evidence.domMutations > 0) {
      diagnosis = "UI Interaction only (No Events Generated).";
      confidence = "95%";
    } else if (ledgerCount > 0) {
      diagnosis = "Automated Payload Audit: SUCCESS";
      confidence = "99%";

      // Analisa setiap payload berdasarkan Kamus Statis
      evidence.ledgerEvents.forEach((ev, idx) => {
        if (EVENT_DICTIONARY.TYPE_A_CREATE.includes(ev.type)) {
          payloadAnalyses.push(
            `[TYPE A: CREATE] '${ev.type}' memuat ${Object.keys(ev.payload).length} key data baru.`,
          );
        } else if (EVENT_DICTIONARY.TYPE_B_UPDATE.includes(ev.type)) {
          payloadAnalyses.push(
            `[TYPE B: UPDATE] '${ev.type}' memodifikasi entitas terkait.`,
          );
        } else {
          payloadAnalyses.push(
            `[UNKNOWN TYPE] '${ev.type}' tidak terdaftar di Kamus Event.`,
          );
        }
      });
    }

    const report = {
      interactionId,
      element: meta,
      evidenceSummary: {
        dom: evidence.domMutations,
        network: evidence.networkRequests,
        storage: evidence.storageMutations,
        ledger: ledgerCount,
        toast: evidence.toasts,
        url: evidence.urlChanges,
      },
      score,
      diagnosis,
      confidence,
      isError,
      payloadAnalyses, // Kirim ke UI untuk ditampilkan
    };

    console.log(`[Diagnostic] Verdict: ${diagnosis}`);
    this.io.emit("diagnosis_report", { report, diffReport: null }); // Diff report null karena tabel ditangani di UI
  }
}
