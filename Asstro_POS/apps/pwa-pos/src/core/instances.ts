// apps/pwa-pos/src/core/instances.ts
import { LedgerEngine } from "@asstro/ledger";
import { ProjectionEngine } from "@asstro/projection";
import { Subject } from "rxjs";

// Global instances (Singleton)
export const ledger = new LedgerEngine();
export const projector = new ProjectionEngine();

// Event Bus untuk reaktivitas UI (Jalur Sukses/Update)
export const eventBus = new Subject<void>();

// Error Bus untuk menyiarkan kegagalan sistem ke UI (Jalur Gagal/Alarm)
export const errorBus = new Subject<string>();
