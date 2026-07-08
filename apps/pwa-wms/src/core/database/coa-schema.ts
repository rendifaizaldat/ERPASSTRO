import { RxJsonSchema } from "rxdb";

export const wmsCoaSchema: RxJsonSchema<any> = {
  version: 0,
  primaryKey: "id",
  type: "object",
  properties: {
    id: { type: "string", maxLength: 100 },
    code: { type: "string" },
    name: { type: "string" },
    type: { type: "string" },
    normalBalance: { type: "string" },
    isHeader: { type: "boolean" },
    parent: { type: ["string", "null"] },
    desc: { type: ["string", "null"] },
    status: { type: "string" },
  },
  required: [
    "id",
    "code",
    "name",
    "type",
    "normalBalance",
    "isHeader",
    "status",
  ],
};
