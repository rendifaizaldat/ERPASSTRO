import { addRxPlugin, createRxDatabase, RxCollection, RxDatabase } from "rxdb";
import { getRxStorageDexie } from "rxdb/plugins/storage-dexie";
import { RxDBDevModePlugin } from "rxdb/plugins/dev-mode";
import CryptoJS from "crypto-js";
import nacl from "tweetnacl";
import { encodeBase64, decodeBase64, decodeUTF8 } from "tweetnacl-util";
import { EventSchema } from "./schema";
import { ulid } from "ulidx";
import { RxDBMigrationSchemaPlugin } from "rxdb/plugins/migration-schema";

addRxPlugin(RxDBMigrationSchemaPlugin);
// ======================================================
// TYPES
// ======================================================
export interface LedgerEvent {
  id: string;
  seq: number;
  type: string;
  payload: Record<string, unknown>;
  metadata: Record<string, unknown>;
  hash: string;
  prevHash: string;
  ts: number;
  logical: number;
  node: string;
  hlc: string;
  sig: string;
  pubkey: string;
  _rev?: string;
}

interface AsstroDatabaseCollections {
  events: RxCollection<LedgerEvent>;
}

// ======================================================
// GLOBAL WINDOW CACHE
// ======================================================
declare global {
  interface Window {
    __ASSTRO_LEDGER_DB__?: RxDatabase<AsstroDatabaseCollections>;
    __ASSTRO_LEDGER_INIT__?: Promise<RxDatabase<AsstroDatabaseCollections>>;
    __ASSTRO_LEDGER_ENGINE__?: LedgerEngine;
  }
}

// ======================================================
// GLOBAL FLAGS
// ======================================================
let devPluginLoaded = false;

// ======================================================
// HELPERS
// ======================================================
declare var process: any;

function isDevelopment(): boolean {
  if (typeof process !== "undefined" && process.env?.NODE_ENV) {
    return process.env.NODE_ENV === "development";
  }
  return false;
}

function stableStringify(value: unknown): string {
  return JSON.stringify(sortRecursively(value));
}

function sortRecursively(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortRecursively);
  }
  if (value !== null && typeof value === "object" && !(value instanceof Date)) {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce(
        (acc, key) => {
          acc[key] = sortRecursively((value as Record<string, unknown>)[key]);
          return acc;
        },
        {} as Record<string, unknown>,
      );
  }
  return value;
}

function generateId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return ulid();
  }
  return `${Date.now()}-${Math.random()}`;
}

// ======================================================
// LEDGER ENGINE
// ======================================================
export class LedgerEngine {
  private db!: RxDatabase<AsstroDatabaseCollections>;
  private initialized = false;
  private appendQueue: Promise<unknown> = Promise.resolve();
  private keyPair!: nacl.SignKeyPair;
  private nodeId!: string;
  private lastTs = 0;
  private logical = 0;

  async init(): Promise<void> {
    if (this.initialized) {
      return;
    }
    if (typeof window === "undefined") {
      throw new Error("LedgerEngine requires browser runtime");
    }

    await this.loadOrCreateIdentity();

    if (isDevelopment() && !devPluginLoaded) {
      addRxPlugin(RxDBDevModePlugin);
      devPluginLoaded = true;
    }

    if (window.__ASSTRO_LEDGER_DB__ && !window.__ASSTRO_LEDGER_DB__.closed) {
      this.db = window.__ASSTRO_LEDGER_DB__;
      this.initialized = true;
      return;
    }

    if (window.__ASSTRO_LEDGER_INIT__) {
      this.db = await window.__ASSTRO_LEDGER_INIT__;
      window.__ASSTRO_LEDGER_ENGINE__ = this;
      this.initialized = true;
      return;
    }

    window.__ASSTRO_LEDGER_INIT__ = (async () => {
      try {
        const db = await createRxDatabase<AsstroDatabaseCollections>({
          name: "asstro_ledger",
          storage: getRxStorageDexie(),
          multiInstance: false,
        });

        await db.addCollections({
          events: {
            schema: EventSchema,
            migrationStrategies: {
              1: function (oldDoc) {
                if (oldDoc.metadata) {
                  if (oldDoc.metadata.operator_id) {
                    oldDoc.metadata.operatorId = oldDoc.metadata.operator_id;
                    delete oldDoc.metadata.operator_id;
                  }
                  if (oldDoc.metadata.branch_id) {
                    oldDoc.metadata.branchId = oldDoc.metadata.branch_id;
                    delete oldDoc.metadata.branch_id;
                  }
                  if (oldDoc.metadata.origin_device_id) {
                    oldDoc.metadata.originDeviceId =
                      oldDoc.metadata.origin_device_id;
                    delete oldDoc.metadata.origin_device_id;
                  }
                  if (oldDoc.metadata.prev_hash) {
                    oldDoc.metadata.prevHash = oldDoc.metadata.prev_hash;
                    delete oldDoc.metadata.prev_hash;
                  }
                }
                if (oldDoc.prev_hash) {
                  oldDoc.prevHash = oldDoc.prev_hash;
                  delete oldDoc.prev_hash;
                }
                return oldDoc;
              },
            },
          },
        });
        window.__ASSTRO_LEDGER_DB__ = db;
        return db;
      } catch (err) {
        delete window.__ASSTRO_LEDGER_INIT__;
        throw err;
      }
    })();
    this.db = await window.__ASSTRO_LEDGER_INIT__;
    this.initialized = true;
  }

  private async loadOrCreateIdentity(): Promise<void> {
    if (typeof localStorage === "undefined") {
      throw new Error("localStorage unavailable");
    }
    const STORAGE_KEY = "__asstro_ledger_identity__";
    const NODE_KEY = "__asstro_ledger_node__";

    let nodeId = localStorage.getItem(NODE_KEY);
    if (!nodeId) {
      nodeId = generateId();
      localStorage.setItem(NODE_KEY, nodeId);
    }
    this.nodeId = nodeId;

    let secretKeyBase64 = localStorage.getItem(STORAGE_KEY);
    if (!secretKeyBase64) {
      const pair = nacl.sign.keyPair();
      secretKeyBase64 = encodeBase64(pair.secretKey);
      localStorage.setItem(STORAGE_KEY, secretKeyBase64);
      this.keyPair = pair;
    } else {
      this.keyPair = nacl.sign.keyPair.fromSecretKey(
        decodeBase64(secretKeyBase64),
      );
    }
  }

  async getPublicKey(): Promise<string> {
    if (!this.initialized) {
      await this.init();
    }
    return encodeBase64(this.keyPair.publicKey);
  }

  private generateHLC(): {
    ts: number;
    logical: number;
    hlc: string;
  } {
    const now = Date.now();
    if (now > this.lastTs) {
      this.lastTs = now;
      this.logical = 0;
    } else {
      this.logical++;
    }
    return {
      ts: this.lastTs,
      logical: this.logical,
      hlc: `${this.lastTs}:${this.logical}:${this.nodeId}`,
    };
  }

  private generateHash(data: {
    seq: number;
    prevHash: string;
    type: string;
    payload: Record<string, unknown>;
    metadata: Record<string, unknown>;
    hlc: string;
  }): string {
    const canonical = stableStringify({
      seq: data.seq,
      prevHash: data.prevHash,
      type: data.type,
      payload: data.payload,
      metadata: data.metadata,
      hlc: data.hlc,
    });
    return CryptoJS.SHA256(canonical).toString(CryptoJS.enc.Hex);
  }

  async appendEvent(
    type: string,
    payload: Record<string, unknown>,
    metadata: Record<string, unknown> = {},
  ): Promise<LedgerEvent> {
    return (this.appendQueue = this.appendQueue.then(async () => {
      if (!this.initialized) {
        await this.init();
      }
      const lastEvent = await this.getLastEvent();
      const nextSeq = lastEvent ? lastEvent.seq + 1 : 1;
      const prevHash = lastEvent ? lastEvent.hash : "0";

      const { ts, logical, hlc } = this.generateHLC();

      const hash = this.generateHash({
        seq: nextSeq,
        prevHash: prevHash,
        type,
        payload,
        metadata,
        hlc,
      });

      const signature = nacl.sign.detached(
        decodeUTF8(hash),
        this.keyPair.secretKey,
      );
      const sig = encodeBase64(signature);
      const pubkey = encodeBase64(this.keyPair.publicKey);

      const eventEntry: LedgerEvent = {
        id: generateId(),
        seq: nextSeq,
        type,
        payload,
        metadata,
        hash,
        prevHash: prevHash,
        ts,
        logical,
        node: this.nodeId,
        hlc,
        sig,
        pubkey,
      };

      await this.db.collections.events.insert(eventEntry);
      return eventEntry;
    })) as Promise<LedgerEvent>;
  }

  async getLastEvent(): Promise<LedgerEvent | null> {
    if (!this.initialized) {
      await this.init();
    }
    const doc = await this.db.collections.events
      .findOne({
        sort: [
          {
            seq: "desc",
          },
        ],
      })
      .exec();
    return doc ? (doc.toMutableJSON() as LedgerEvent) : null;
  }

  async replay(
    handler: (event: LedgerEvent) => void | Promise<void>,
  ): Promise<void> {
    if (!this.initialized) {
      await this.init();
    }
    const docs = await this.db.collections.events
      .find({
        sort: [
          {
            seq: "asc",
          },
        ],
      })
      .exec();
    for (const doc of docs) {
      await handler(doc.toMutableJSON() as LedgerEvent);
    }
  }

  async validateIntegrity(): Promise<{
    valid: boolean;
    checked: number;
    error?: string;
  }> {
    let previousHash = "0";
    let previousSeq = 0;
    let checked = 0;
    try {
      await this.replay((event) => {
        checked++;
        if (event.seq !== previousSeq + 1) {
          throw new Error(`Sequence gap at ${event.seq}`);
        }
        if (event.prevHash !== previousHash) {
          throw new Error(`Broken chain at ${event.seq}`);
        }
        const recalculatedHash = this.generateHash({
          seq: event.seq,
          prevHash: event.prevHash,
          type: event.type,
          payload: event.payload,
          metadata: event.metadata,
          hlc: event.hlc,
        });
        if (recalculatedHash !== event.hash) {
          throw new Error(`Hash mismatch at ${event.seq}`);
        }
        const validSignature = nacl.sign.detached.verify(
          decodeUTF8(event.hash),
          decodeBase64(event.sig),
          decodeBase64(event.pubkey),
        );
        if (!validSignature) {
          throw new Error(`Invalid signature at ${event.seq}`);
        }
        previousSeq = event.seq;
        previousHash = event.hash;
      });
      return {
        valid: true,
        checked,
      };
    } catch (err) {
      return {
        valid: false,
        checked,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  async close(): Promise<void> {
    if (this.db && !this.db.closed) {
      await this.db.close();
    }
    if (typeof window !== "undefined") {
      delete window.__ASSTRO_LEDGER_DB__;
      delete window.__ASSTRO_LEDGER_INIT__;
    }
    this.initialized = false;
  }

  async clearAllData(): Promise<void> {
    if (!this.initialized) {
      await this.init();
    }
    const db = this.db;
    await this.close();
    await db.remove();
  }

  get database(): RxDatabase<AsstroDatabaseCollections> {
    return this.db;
  }
}
