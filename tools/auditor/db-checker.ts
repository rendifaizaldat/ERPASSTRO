// tools/auditor/db-checker.ts
import { Pool } from "pg";
import * as dotenv from "dotenv";

dotenv.config({ path: "../../apps/backend/.env" });

let pool: Pool | null = null;
let isPoolClosed = false;

const getPool = () => {
  if (!pool || isPoolClosed) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
    isPoolClosed = false;
  }

  return pool;
};

export const dbChecker = {
  async getLatestShift() {
    const res = await getPool().query(
      "SELECT * FROM pos_shifts ORDER BY opened_at DESC LIMIT 1",
    );
    return res.rows[0] || null;
  },

  async getDeviceProfile(deviceId: string) {
    const res = await getPool().query(
      "SELECT * FROM device_profiles WHERE id = $1",
      [deviceId],
    );
    return res.rows[0] || null;
  },

  async getCategoryByName(name: string) {
    const res = await getPool().query(
      "SELECT * FROM product_categories WHERE name = $1 LIMIT 1",
      [name],
    );
    return res.rows[0] || null;
  },

  async getProductBySku(sku: string) {
    const res = await getPool().query(
      "SELECT * FROM products WHERE sku = $1 LIMIT 1",
      [sku],
    );
    return res.rows[0] || null;
  },

  async getEventByType(eventType: string, limit = 20) {
    const res = await getPool().query(
      "SELECT * FROM event_journal WHERE event_type = $1 ORDER BY recorded_at DESC LIMIT $2",
      [eventType, limit],
    );
    return res.rows;
  },

  async getEventByTypeAndPayloadField(
    eventType: string,
    field: string,
    value: string,
  ) {
    const res = await getPool().query(
      `SELECT * FROM event_journal WHERE event_type = $1 AND payload->>$2 = $3 ORDER BY recorded_at DESC LIMIT 1`,
      [eventType, field, value],
    );
    return res.rows[0] || null;
  },

  async getOrphanProducts() {
    const res = await getPool().query(
      `SELECT p.* FROM products p
       LEFT JOIN product_categories c ON p.category_id = c.id
       WHERE c.id IS NULL`,
    );
    return res.rows;
  },

  async resetDatabase() {
    console.log("[DB] Mereset data transaksi server untuk audit...");
    await getPool().query("TRUNCATE transactions, journal, shifts CASCADE");
    console.log("[DB] Database Server bersih.");
  },

  async close() {
    if (isPoolClosed || !pool) return;
    isPoolClosed = true;
    const currentPool = pool;
    pool = null;
    await currentPool.end();
  },
};
