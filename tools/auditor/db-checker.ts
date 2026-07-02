// tools/auditor/db-checker.ts
import { Pool } from "pg";
import * as dotenv from "dotenv";

dotenv.config({ path: "../../apps/backend/.env" }); // Arahkan ke env backend

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const dbChecker = {
  async getLatestTransaction() {
    const res = await pool.query(
      "SELECT * FROM transactions ORDER BY created_at DESC LIMIT 1",
    );
    return res.rows[0] || null;
  },

  async getDeviceProfile(deviceId: string) {
    const res = await pool.query(
      "SELECT * FROM device_profiles WHERE id = $1",
      [deviceId],
    );
    return res.rows[0] || null;
  },

  async resetDatabase() {
    // Sesuaikan dengan skenario reset Anda (misal truncate tabel transaksi)
    console.log("[DB] Mereset data transaksi server untuk audit...");
    await pool.query("TRUNCATE transactions, journal, shifts CASCADE");
    console.log("[DB] Database Server bersih.");
  },

  async close() {
    await pool.end();
  },
};
