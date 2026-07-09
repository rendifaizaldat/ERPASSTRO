import { ExtractDocumentTypeFromTypedRxJsonSchema, RxJsonSchema } from "rxdb";

export const wmsOutboxSchemaLiteral = {
  title: "wms outbox schema",
  version: 0,
  primaryKey: "id",
  type: "object",
  properties: {
    id: { type: "string", maxLength: 100 },
    aggregateId: { type: "string" },
    type: { type: "string" },
    payload: { type: "object" },
    createdAt: { type: "string" },
    syncStatus: { type: "string", enum: ["PENDING", "SYNCED", "FAILED"] },
  },
  required: ["id", "aggregateId", "type", "payload", "createdAt", "syncStatus"],
} as const;
export type WmsOutboxDocType = ExtractDocumentTypeFromTypedRxJsonSchema<
  typeof wmsOutboxSchemaLiteral
>;
export const wmsOutboxSchema: RxJsonSchema<WmsOutboxDocType> =
  wmsOutboxSchemaLiteral;

export const wmsVendorsSchemaLiteral = {
  title: "wms vendors schema",
  version: 0,
  primaryKey: "id",
  type: "object",
  properties: {
    id: { type: "string", maxLength: 100 },
    regionId: { type: "string" },
    name: { type: "string" },
    contactPerson: { type: "string" },
    phone: { type: "string" },
    address: { type: "string" },
    bankName: { type: "string" },
    bankAccountName: { type: "string" },
    bankAccountNumber: { type: "string" },
    certifications: {
      type: "array",
      items: { type: "string" },
    },
    contractFileUrl: { type: "string" },
    isActive: { type: "boolean" },
  },
  required: ["id", "regionId", "name", "isActive"],
} as const;
export type WmsVendorsDocType = ExtractDocumentTypeFromTypedRxJsonSchema<
  typeof wmsVendorsSchemaLiteral
>;
export const wmsVendorsSchema: RxJsonSchema<WmsVendorsDocType> =
  wmsVendorsSchemaLiteral;

export const wmsGlobalProductsSchemaLiteral = {
  title: "wms global products schema",
  version: 0,
  primaryKey: "id",
  type: "object",
  properties: {
    id: { type: "string", maxLength: 100 },
    categoryId: { type: "string" },
    name: { type: "string" },
    baseUom: { type: "string" },
    status: { type: "string" },
  },
  required: ["id", "categoryId", "name", "baseUom", "status"],
} as const;
export type WmsGlobalProductsDocType = ExtractDocumentTypeFromTypedRxJsonSchema<
  typeof wmsGlobalProductsSchemaLiteral
>;
export const wmsGlobalProductsSchema: RxJsonSchema<WmsGlobalProductsDocType> =
  wmsGlobalProductsSchemaLiteral;

export const wmsRegionalItemsSchemaLiteral = {
  title: "wms regional items schema",
  version: 0,
  primaryKey: "id",
  type: "object",
  properties: {
    id: { type: "string", maxLength: 100 },
    regionId: { type: "string" },
    branchId: { type: "string" },
    globalId: { type: "string" },
    localName: { type: "string" },
    localCategory: { type: "string" },
    uom: { type: "string" },
    purchasePrice: { type: "number" },
    margin: { type: "number" },
    sellingPrice: { type: "number" },
    mergeStatus: { type: "string", enum: ["UNMERGED", "MERGED"] },
    status: { type: "string" },
  },
  required: [
    "id",
    "regionId",
    "localName",
    "uom",
    "purchasePrice",
    "sellingPrice",
    "mergeStatus",
    "status",
  ],
} as const;
export type WmsRegionalItemsDocType = ExtractDocumentTypeFromTypedRxJsonSchema<
  typeof wmsRegionalItemsSchemaLiteral
>;
export const wmsRegionalItemsSchema: RxJsonSchema<WmsRegionalItemsDocType> =
  wmsRegionalItemsSchemaLiteral;

export const wmsCategoriesSchemaLiteral = {
  title: "wms categories schema",
  version: 0,
  primaryKey: "id",
  type: "object",
  properties: {
    id: { type: "string", maxLength: 100 },
    name: { type: "string" },
    coaId: { type: "string" },
    status: { type: "string" },
    docType: { type: "string" }, // to distinguish between COA and Category if needed
    code: { type: "string" },
    type: { type: "string" },
    normalBalance: { type: "string" },
    isHeader: { type: "boolean" },
    parent: { type: "string" },
    desc: { type: "string" },
  },
  required: ["id"],
} as const;
export type WmsCategoriesDocType = ExtractDocumentTypeFromTypedRxJsonSchema<
  typeof wmsCategoriesSchemaLiteral
>;
export const wmsCategoriesSchema: RxJsonSchema<WmsCategoriesDocType> =
  wmsCategoriesSchemaLiteral;

export const wmsPiutangSchemaLiteral = {
    title: "wms piutang schema",
    version: 1,
    primaryKey: "id",
    type: "object",
    properties: {
      id: { type: "string", maxLength: 100 },
      branchId: { type: "string" },
      vendorId: { type: "string" },
      vendorName: { type: "string" },
      totalAmount: { type: "number" },
      totalPaid: { type: "number" },
      outstandingAmount: { type: "number" },
      status: { type: "string" },
      dueDate: { type: "string" },
      items: { type: "array" },
      payments: { type: "array" },
      createdAt: { type: "string" },
      updatedAt: { type: "string" },
    },
    required: ["id", "branchId"],
} as const;
export const wmsPiutangSchema: RxJsonSchema<any> = wmsPiutangSchemaLiteral;

export const wmsReceivingsSchemaLiteral = {
    title: "wms receivings schema",
    version: 0,
    primaryKey: "id",
    type: "object",
    properties: {
        id: { type: "string", maxLength: 100 },
        // ... (keep this minimalistic for now, we focus on master data)
    },
    required: ["id"],
} as const;
export const wmsReceivingsSchema: RxJsonSchema<any> = wmsReceivingsSchemaLiteral;


export const wmsOutletBalancesSchemaLiteral = {
    title: "wms outlet balances schema",
    version: 0,
    primaryKey: "id",
    type: "object",
    properties: {
      id: { type: "string", maxLength: 100 },
    },
    required: ["id"],
} as const;
export const wmsOutletBalancesSchema: RxJsonSchema<any> = wmsOutletBalancesSchemaLiteral;

export const wmsLedgerSchemaLiteral = {
    title: "wms ledger schema",
    version: 0,
    primaryKey: "id",
    type: "object",
    properties: {
      id: { type: "string", maxLength: 100 },
    },
    required: ["id"],
} as const;
export const wmsLedgerSchema: RxJsonSchema<any> = wmsLedgerSchemaLiteral;

