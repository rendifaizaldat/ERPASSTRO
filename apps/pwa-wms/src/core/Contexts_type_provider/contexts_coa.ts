import { useState, useEffect } from "react";
import { getWmsDb } from "../database/rx-db";
import { API_BASE_URL } from "../constants";

export interface CoaData {
  id: string;
  code: string;
  name: string;
  type: string;
  normalBalance: string;
  isHeader: boolean;
  parent: string | null;
  desc: string | null;
  status: string;
}

export function useCoa(isInitialized: boolean) {
  const [coas, setCoas] = useState<CoaData[]>([]);

  // 1. Fungsi penarik data dari API ke RxDB (dipanggil oleh WmsProvider saat Delta Sync)
  const fetchCoaData = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/wms/coas/hydrate`);
      if (!response.ok) throw new Error("Gagal mengambil data COA dari server");

      const payload = await response.json();
      if (payload && payload.coas) {
        const db = await getWmsDb();

        // Transformasi untuk Single Table Design (Menambahkan docType: "COA")
        const rxdbPayloads = payload.coas.map((item: any) => ({
          ...item,
          docType: "COA",
          status: item.status || "ACTIVE",
          updatedAt: new Date().toISOString(),
        }));

        // Upsert ke RxDB, subscription di bawah akan otomatis mendeteksi perubahan
        await db.wms_categories.bulkUpsert(rxdbPayloads);
        console.log(
          `✅ [useCoa] Berhasil menyinkronkan ${rxdbPayloads.length} data ke RxDB`,
        );
      }
    } catch (error) {
      console.error("[useCoa] Gagal fetchCoaData:", error);
    }
  };

  // 2. Subscription RxDB (UI reaktif secara otomatis)
  useEffect(() => {
    if (!isInitialized) return;

    let subscription: any;

    const initSubscription = async () => {
      try {
        const db = await getWmsDb();
        subscription = db.wms_categories
          .find({
            selector: {
              docType: "COA",
            },
          })
          .$.subscribe((results: any) => {
            const data = results.map((doc: any) => doc.toJSON());
            setCoas(data);
          });
      } catch (error) {
        console.error("[CONTEXT_COA] Gagal inisialisasi subscription:", error);
      }
    };

    initSubscription();

    return () => {
      if (subscription) subscription.unsubscribe();
    };
  }, [isInitialized]);

  return {
    coas,
    fetchCoaData,
  };
}
