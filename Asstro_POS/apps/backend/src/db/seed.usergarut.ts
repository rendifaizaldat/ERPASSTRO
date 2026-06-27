import { db } from "./index";
import { companies, regions, branches, users } from "./schema";
import { eq } from "drizzle-orm";
import { ulid } from "ulidx";

async function seedUserGarut() {
  console.log("🌱 Memulai penambahan User & Region Garut...");

  try {
    // 1. Ambil Company ID (Asstro) dari database yang sudah ada
    const companyList = await db.select().from(companies).limit(1);
    if (companyList.length === 0) {
      throw new Error(
        "Perusahaan induk belum ada di database. Harap pastikan data Asstro ada.",
      );
    }
    const companyId = companyList[0].id;

    // 2. Cek atau Buat Region Garut
    let regionGarutId: string;
    const existingRegion = await db
      .select()
      .from(regions)
      .where(eq(regions.code, "GRT"))
      .limit(1);

    if (existingRegion.length > 0) {
      regionGarutId = existingRegion[0].id;
      console.log("ℹ️ Region Garut sudah ada. Melewati pembuatan region.");
    } else {
      regionGarutId = ulid();
      await db.insert(regions).values({
        id: regionGarutId,
        name: "Garut",
        code: "GRT",
      });
      console.log("✅ Region Garut berhasil dibuat.");
    }

    // 3. Cek atau Buat Branch Pusat Garut
    let pusatGarutId: string;
    const existingBranch = await db
      .select()
      .from(branches)
      .where(eq(branches.code, "WMS-P-GRT"))
      .limit(1);

    if (existingBranch.length > 0) {
      pusatGarutId = existingBranch[0].id;
      console.log(
        "ℹ️ Branch Pusat Garut sudah ada. Melewati pembuatan branch.",
      );
    } else {
      pusatGarutId = ulid();
      await db.insert(branches).values({
        id: pusatGarutId,
        companyId: companyId,
        regionId: regionGarutId,
        name: "pusat-garut",
        code: "WMS-P-GRT",
      });
      console.log("✅ Branch Pusat Garut berhasil dibuat.");
    }

    // 4. Cek atau Buat User WMS Garut
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, "wms.grt@asstro.com"))
      .limit(1);

    if (existingUser.length > 0) {
      console.log(
        "ℹ️ User Admin WMS Garut sudah ada. Melewati pembuatan user.",
      );
    } else {
      await db.insert(users).values({
        id: ulid(),
        branchId: pusatGarutId,
        name: "Admin WMS Garut",
        email: "wms.grt@asstro.com",
        passwordHash: "wms123",
        pin: "123456",
        role: "manager",
      });
      console.log("✅ User Admin WMS Garut berhasil dibuat.");
    }

    console.log("==================================================");
    console.log("🎉 Proses Selesai! Data lama tidak tersentuh.");
    console.log("Gunakan akun berikut untuk menguji filtering:");
    console.log("🏢 Pusat Garut   : wms.grt@asstro.com / wms123");
    console.log("==================================================");
    process.exit(0);
  } catch (error) {
    console.error("❌ Gagal Seeding:", error);
    process.exit(1);
  }
}

seedUserGarut();
