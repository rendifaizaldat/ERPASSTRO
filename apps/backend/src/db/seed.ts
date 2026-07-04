import { db } from "./index";
import { companies, regions, branches, users, devices } from "./schema";
import { ulid } from "ulidx";

async function runSeed() {
  console.log("🌱 Memulai injeksi data awal (Seeding)...");

  try {
    // --- 0. FASE RESET (CLEANUP DATA LAMA) ---
    console.log("🧹 Membersihkan sisa data sebelumnya...");
    // Wajib dihapus berurutan dari tabel 'Anak' ke tabel 'Induk'
    await db.delete(users);
    await db.delete(devices);
    await db.delete(branches);
    await db.delete(regions);
    await db.delete(companies);
    console.log("✨ Database berhasil dibersihkan!");

    // --- 1. Buat Perusahaan Induk ---
    const companyId = ulid();
    await db.insert(companies).values({
      id: companyId,
      name: "Asstro",
      code: "AST",
    });

    // --- 2. Buat Wilayah (Region) ---
    const regionBandungId = ulid();
    await db.insert(regions).values({
      id: regionBandungId,
      name: "Bandung",
      code: "BDG",
    });

    const regionGarutId = ulid();
    await db.insert(regions).values({
      id: regionGarutId,
      name: "Garut",
      code: "GRT",
    });

    // --- 3. Buat Gudang Pusat & Cabang Reguler ---
    const pusatBandungId = ulid();
    const pusatGarutId = ulid();
    const branchLembangId = ulid();
    const branchHighlandId = ulid();
    const branchNagregId = ulid();

    await db.insert(branches).values([
      // --- INJEKSI GUDANG PUSAT (Wajib untuk WMS Mode Pusat) ---
      {
        id: pusatBandungId,
        companyId: companyId,
        regionId: regionBandungId,
        name: "pusat-bandung",
        code: "WMS-P-BDG",
      },
      {
        id: pusatGarutId,
        companyId: companyId,
        regionId: regionGarutId,
        name: "pusat-garut",
        code: "WMS-P-GRT",
      },
      // --- INJEKSI OUTLET REGULER ---
      {
        id: branchLembangId,
        companyId: companyId,
        regionId: regionBandungId,
        name: "Asstro Lembang",
        code: "LBG",
      },
      {
        id: branchHighlandId,
        companyId: companyId,
        regionId: regionBandungId,
        name: "Asstro Highland",
        code: "AHC",
      },
      {
        id: branchNagregId,
        companyId: companyId,
        regionId: regionGarutId,
        name: "Asstro Nagreg",
        code: "NGR",
      },
    ]);

    // --- 4. Buat Akun Users Secara Bersamaan ---
    await db.insert(users).values([
      // Super Admin (Lembang)
      {
        id: ulid(),
        branchId: branchLembangId,
        name: "Super Admin",
        email: "rendifaizal@asstro.com",
        passwordHash: "admin112233",
        pin: "112233",
        role: "superadmin",
      },
      {
        id: ulid(),
        branchId: pusatBandungId,
        name: "Admin WMS Bandung",
        email: "wms.bdg@asstro.com",
        passwordHash: "wms123",
        pin: "123456",
        role: "manager",
      },
      {
        id: ulid(),
        branchId: pusatGarutId,
        name: "Admin WMS Garut",
        email: "wms.grt@asstro.com",
        passwordHash: "wms123",
        pin: "123456",
        role: "manager",
      },
    ]);

    console.log("✅ Seeding berhasil! Data Master sudah siap.");
    console.log("==================================================");
    console.log("Gunakan akun berikut untuk menguji filtering:");
    console.log("🏢 Pusat Bandung : wms.bdg@asstro.com / wms123");
    console.log("🏢 Pusat Garut   : wms.grt@asstro.com / wms123");
    console.log("==================================================");
    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding gagal:", error);
    process.exit(1);
  }
}

runSeed();
