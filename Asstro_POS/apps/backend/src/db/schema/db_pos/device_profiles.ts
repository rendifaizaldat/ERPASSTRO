import { pgTable, varchar, jsonb } from "drizzle-orm/pg-core";

export const deviceProfiles = pgTable("device_profiles", {
  id: varchar("id", { length: 26 }).primaryKey(),
  printerSettings: jsonb("printer_settings"),
  receiptSettings: jsonb("receipt_settings"),
  paymentGateways: jsonb("payment_gateways"),
});
