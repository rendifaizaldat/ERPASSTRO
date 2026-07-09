import { Router, Request, Response } from "express";
import { db } from "../../db";
import { sql } from "drizzle-orm";
import { posShifts } from "../../db/schema/db_pos/shifts";
import {
  devices,
  branches,
  users,
  products,
  productCategories,
  eventJournal,
  branchProducts,
} from "../../db/schema";
import { eq, desc, and } from "drizzle-orm";

const router = Router();

const auditAuth = (req: Request, res: Response, next: any) => {
  const token = req.headers.authorization;
  const isLocalHost = ["localhost", "127.0.0.1", "::1"].includes(req.hostname);
  const isLocalEnv = ["development", "test", ""].includes(
    process.env.NODE_ENV || "development",
  );

  if (
    process.env.NODE_ENV === "production" &&
    token !== `Bearer ${process.env.AUDIT_SECRET_TOKEN}`
  ) {
    return res.status(401).json({ error: "Unauthorized access to audit API" });
  }

  // Allow local auditor traffic in dev/test and from localhost even without auth.
  if (isLocalHost || isLocalEnv || process.env.AUDIT_MODE_ENABLED) {
    return next();
  }

  return res
    .status(403)
    .json({
      error: "Audit API is only accessible in test or development environments",
    });
};

router.use(auditAuth);

router.get("/latest-shift", async (req: Request, res: Response) => {
  const result = await db
    .select()
    .from(posShifts)
    .orderBy(desc(posShifts.openedAt))
    .limit(1);
  res.json(result[0] || null);
});

router.get("/device-profile/:id", async (req: Request, res: Response) => {
  const result = await db
    .select()
    .from(devices)
    .where(eq(devices.id, req.params.id as string))
    .limit(1);
  res.json(result[0] || null);
});

router.get("/category-by-name/:name", async (req: Request, res: Response) => {
  const result = await db
    .select()
    .from(productCategories)
    .where(eq(productCategories.name, req.params.name as string))
    .limit(1);
  res.json(result[0] || null);
});

router.get("/product-by-sku/:sku", async (req: Request, res: Response) => {
  const result = await db
    .select()
    .from(products)
    .where(eq(products.sku, req.params.sku as string))
    .limit(1);
  res.json(result[0] || null);
});

router.get("/events-by-type/:type", async (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 20;
  const result = await db
    .select()
    .from(eventJournal)
    .where(eq(eventJournal.eventType, req.params.type as string))
    .orderBy(desc(eventJournal.recordedAt))
    .limit(limit);
  res.json(result);
});

router.post("/event-by-type-and-field", async (req: Request, res: Response) => {
  const { type, field, value } = req.body;
  // This is a bit tricky with Drizzle JSON operations depending on dialect, using sql operator
  const result = await db.execute(
    sql`SELECT * FROM event_journal WHERE event_type = ${type} AND payload->>${field} = ${value} ORDER BY recorded_at DESC LIMIT 1`,
  );
  res.json(result.rows[0] || null);
});

router.get("/orphan-products", async (req: Request, res: Response) => {
  const result = await db.execute(sql`
    SELECT p.* FROM products p
    LEFT JOIN product_categories c ON p.category_id = c.id
    WHERE c.id IS NULL
  `);
  res.json(result.rows);
});

router.post("/reset-database", async (req: Request, res: Response) => {
  // Danger zone
  await db.execute(
    sql`TRUNCATE pos_shifts, event_journal, pos_invoices, pos_payments, pos_order_items CASCADE`,
  );
  res.json({ success: true });
});

router.get("/state", async (req: Request, res: Response) => {
  const shifts = await db.select().from(posShifts);
  const categoriesResult = await db.select().from(productCategories);
  const productsResult = await db.select().from(products);
  const branchProductsResult = await db.select().from(branchProducts);
  const journalResult = await db
    .select()
    .from(eventJournal)
    .orderBy(desc(eventJournal.id));

  res.json({
    shifts,
    categories: categoriesResult,
    products: productsResult,
    branchProducts: branchProductsResult,
    journal: journalResult,
  });
});

export default router;
