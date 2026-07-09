import { LedgerEngine } from "@asstro/ledger";
import { WmsProjectionEngine } from "@asstro/projection";
import { Subject, BehaviorSubject } from "rxjs";

export const ledger = new LedgerEngine();
export const wmsProjector = new WmsProjectionEngine();
export const eventBus = new Subject<any>();
export const errorBus = new Subject<string>();
export const networkStatus = new BehaviorSubject<boolean>(navigator.onLine);

window.addEventListener("online", () => networkStatus.next(true));
window.addEventListener("offline", () => networkStatus.next(false));

const originalAppend = ledger.appendEvent.bind(ledger);
ledger.appendEvent = async (type: string, payload: any, meta?: any) => {
  const result = await originalAppend(type, payload, meta);
  // Pass the event directly to projector to compute state locally instantly
  wmsProjector.processEvent({
     type,
     payload,
     metadata: meta || {},
     id: result?.id || "local-id",
     seq: result?.seq || 0,
     hash: "",
     prevHash: "",
     ts: Date.now(),
     logical: 0,
     node: "",
     hlc: "",
     sig: "",
     pubkey: ""
  });
  eventBus.next({ type, payload, meta, timestamp: Date.now() });
  return result;
};

// Hook the ledger replay process to feed events to projector
export const initializeWmsProjector = async () => {
   await ledger.replay((ev: any) => {
      wmsProjector.processEvent(ev);
   });
   console.log("[instances] WMS Projector fully initialized from Ledger");
};
