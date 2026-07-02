import { RxJsonSchema } from "rxdb";

export interface LedgerEventDoc {
  id: string;
  seq: number;
  prevHash: string;
  hash: string;
  hlc: string;
  type: string;
  payload: object;
  metadata: object;
  sig?: string;
  pubkey?: string;
  _rev?: string;
}

export const EventSchema: RxJsonSchema<LedgerEventDoc> = {
  title: "event ledger schema",
  version: 1, // Increased version from 0 to 1 for migration
  primaryKey: "id",
  type: "object",

  properties: {
    id: { type: "string", maxLength: 100 },
    seq: { type: "number", minimum: 1, multipleOf: 1 },
    prevHash: { type: "string" },
    hash: { type: "string" },
    hlc: { type: "string" },
    type: { type: "string" },
    payload: { type: "object", additionalProperties: true },
    metadata: { type: "object", additionalProperties: true },
    sig: { type: "string" },
    pubkey: { type: "string" },
    _rev: { type: "string" },
  },
  required: [
    "id",
    "seq",
    "hlc",
    "hash",
    "type",
    "payload",
    "metadata",
    "sig",
    "pubkey",
  ],

  indexes: ["seq", "hlc", "type"],
};
