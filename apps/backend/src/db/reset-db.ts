import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import pkg from "pg";
import { sql } from "drizzle-orm";

const { Client } = pkg;

async function resetDatabase() {
  console.log("⏳ Menghubungkan ke database PostgreSQL...");

  // Pastikan Anda memiliki DATABASE_URL di file .env backend Anda
  if (!process.env.DATABASE_URL) {
    console.error("❌ ERROR: DATABASE_URL tidak ditemukan di .env!");
    process.exit(1);
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    const db = drizzle(client);

    console.log("🔥 Menghapus seluruh tabel dan data (DROP SCHEMA CASCADE)...");

    // Menghapus skema public beserta seluruh isinya secara paksa
    await db.execute(sql`DROP SCHEMA public CASCADE;`);

    // Membuat ulang skema public yang kosong
    await db.execute(sql`CREATE SCHEMA public;`);

    // Memberikan kembali hak akses standar
    await db.execute(sql`GRANT ALL ON SCHEMA public TO public;`);

    console.log(
      "✅ Database berhasil direset ke kondisi Ground Zero (Kosong)!",
    );
  } catch (error) {
    console.error("❌ Gagal mereset database:", error);
  } finally {
    await client.end();
    process.exit(0);
  }
}

resetDatabase();
