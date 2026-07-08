import { Router } from "express";
import { db } from "../../db";
import { coa } from "../../db/schema/db_wms/wms.coa";
import { wmsGlobalCategories } from "../../db/schema/db_wms/wms.pusatmasterproduk";

const router = Router();

// =========================================================================
// READ MODEL (QUERY)
// Endpoint disamakan stylenya dengan katalog WMS untuk Cold Start
// =========================================================================
router.get("/coas", async (req, res) => {
  try {
    // Tarik data Master WMS untuk COA
    const allCoas = await db.select().from(coa);
    const allCategories = await db.select().from(wmsGlobalCategories);

    // Dibuat flat JSON (tanpa wrapper {success, data}) agar konsisten
    res.status(200).json({
      coas: allCoas,
      categories: allCategories,
    });
  } catch (error) {
    console.error("[API_COA_coas_ERROR]", error);
    res.status(500).json({ error: "Gagal menarik data master COA WMS" });
  }
});

// Menggunakan named export menyesuaikan dengan standar wmsProductsRouter
export { router as coasRouter };
