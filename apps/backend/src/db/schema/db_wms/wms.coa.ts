import {
  pgTable,
  text,
  varchar,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";

export const coa = pgTable("wms_coa", {
  id: varchar("id", { length: 100 }).primaryKey(),
  code: varchar("code", { length: 100 }).notNull().unique(),
  name: text("name").notNull(),
  type: varchar("type", { length: 50 }).notNull(),
  normalBalance: varchar("normal_balance", { length: 20 }).notNull(),
  isHeader: boolean("is_header").notNull().default(false),
  parent: varchar("parent", { length: 100 }),
  desc: text("desc"),
  status: varchar("status", { length: 20 }).notNull().default("ACTIVE"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
