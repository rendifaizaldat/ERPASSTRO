import React, { createContext, useState, useEffect } from "react";
import { initWmsDb } from "../database/rx-db";
import { useAuth } from "./contexts_auth";
import { useKatalog } from "./contexts_katalog";
import { usePiutang } from "./contexts_piutang";
import { useReceivings } from "./contexts_receivings";
import { useOutletBalance } from "./contexts_outletBalance";
import { useSync } from "./contexts_sync";
import { useEWallet } from "./contexts_ewallet";
import { useCoa, CoaData } from "./contexts_coa";
import type { WmsDatabase } from "../database/rx-db";
import { fetchKatalog, saveKatalogCache } from "../service";
import { initializeWmsProjector } from "../instances";

export interface WmsContextProps {
  db: WmsDatabase | null;
  wmsState: ReturnType<typeof useAuth>["wmsState"];
  currentOperator: ReturnType<typeof useAuth>["currentOperator"];
  isScreenLocked: ReturnType<typeof useAuth>["isScreenLocked"];
  isInitialized: ReturnType<typeof useAuth>["isInitialized"];
  validatePin: ReturnType<typeof useAuth>["validatePin"];
  loginOperator: ReturnType<typeof useAuth>["loginOperator"];
  unlockScreen: ReturnType<typeof useAuth>["unlockScreen"];
  lockScreen: ReturnType<typeof useAuth>["lockScreen"];
  logoutOperator: ReturnType<typeof useAuth>["logoutOperator"];

  categories: ReturnType<typeof useKatalog>["categories"];
  masterProducts: ReturnType<typeof useKatalog>["masterProducts"];
  outletProducts: ReturnType<typeof useKatalog>["outletProducts"];
  regions: ReturnType<typeof useKatalog>["regions"];
  branches: ReturnType<typeof useKatalog>["branches"];
  uomOptions: ReturnType<typeof useKatalog>["uomOptions"];
  vendors: ReturnType<typeof useKatalog>["vendors"];

  piutangPusat: ReturnType<typeof usePiutang>["piutangPusat"];
  fetchPiutangPusat: ReturnType<typeof usePiutang>["fetchPiutangPusat"];
  processPayment: ReturnType<typeof usePiutang>["processPayment"];
  updateReceivingTransaction: ReturnType<
    typeof usePiutang
  >["updateReceivingTransaction"];
  archiveReceiving: ReturnType<typeof usePiutang>["archiveReceiving"];
  restoreReceiving: ReturnType<typeof usePiutang>["restoreReceiving"];
  voidLastPayment: ReturnType<typeof usePiutang>["voidLastPayment"];
  processBulkPayment: ReturnType<typeof usePiutang>["processBulkPayment"];

  receivings: ReturnType<typeof useReceivings>["receivings"];
  fetchReceivings: ReturnType<typeof useReceivings>["fetchReceivings"];
  processPaymentHutang: ReturnType<
    typeof useReceivings
  >["processPaymentHutang"];
  processPaymentApOutlet: ReturnType<
    typeof useReceivings
  >["processPaymentApOutlet"];

  outletBalances: ReturnType<typeof useOutletBalance>["outletBalances"];
  fetchOutletBalances: ReturnType<
    typeof useOutletBalance
  >["fetchOutletBalances"];
  mutateOutletBalance: ReturnType<
    typeof useOutletBalance
  >["mutateOutletBalance"];

  isOnline: ReturnType<typeof useSync>["isOnline"];
  isSyncing: ReturnType<typeof useSync>["isSyncing"];
  syncData: ReturnType<typeof useSync>["syncData"];
  addSyncTask: ReturnType<typeof useSync>["addSyncTask"];
  showToast: ReturnType<typeof useSync>["showToast"];

  walletAccounts: ReturnType<typeof useEWallet>["walletAccounts"];
  financialConfigs: ReturnType<typeof useEWallet>["financialConfigs"];
  walletLedgers: ReturnType<typeof useEWallet>["walletLedgers"];
  fetchEWalletData: ReturnType<typeof useEWallet>["fetchEWalletData"];

  // COA & Fetcher
  coas: CoaData[];
  fetchCoaData: ReturnType<typeof useCoa>["fetchCoaData"];
}

export const WmsContext = createContext<WmsContextProps | undefined>(undefined);

export const WmsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [db, setDb] = useState<WmsDatabase | null>(null);

  // Flag for ensuring we only initialize projector once
  const [projectorInitialized, setProjectorInitialized] = useState(false);

  useEffect(() => {
    // We still initialize RxDB for other uses (Auth, Sync logic) for now,
    // but the main data goes to Ledger + Projector.
    initWmsDb().then(setDb);
  }, []);

  const auth = useAuth();

  useEffect(() => {
      if (auth.isInitialized && !projectorInitialized) {
          initializeWmsProjector().then(() => setProjectorInitialized(true));
      }
  }, [auth.isInitialized, projectorInitialized]);

  // Context hooks
  const katalog = useKatalog(auth.isInitialized && projectorInitialized);
  const piutang = usePiutang(db, auth.wmsState);
  const receivingsContext = useReceivings(db, auth.wmsState);
  const outletBalance = useOutletBalance(db);
  const ewallet = useEWallet(db, auth.wmsState);
  const coaContext = useCoa(auth.isInitialized && projectorInitialized);

  const triggerDeltaSync = async () => {
    try {
      if (receivingsContext.fetchReceivings)
        await receivingsContext.fetchReceivings();
      if (piutang.fetchPiutangPusat) await piutang.fetchPiutangPusat();
      if (outletBalance.fetchOutletBalances)
        await outletBalance.fetchOutletBalances();
      if (ewallet.fetchEWalletData) await ewallet.fetchEWalletData();

      // We will let sync handle fetching events and replaying into Ledger,
      // which will naturally update Projector.
      console.log("[WMS_PROVIDER] Triggering delta sync...");
    } catch (err) {
      console.error("[WMS_PROVIDER] Gagal menjalankan Delta Sync:", err);
    }
  };

  const sync = useSync(auth.wmsState, triggerDeltaSync);

  useEffect(() => {
    if (auth.isInitialized && auth.wmsState && db) {
      receivingsContext.fetchReceivings();
      ewallet.fetchEWalletData();
    }
  }, [auth.isInitialized, auth.wmsState, db]);

  const contextValue: WmsContextProps = {
    db,
    ...auth,
    ...katalog,
    ...piutang,
    ...receivingsContext,
    ...outletBalance,
    ...sync,
    ...ewallet,
    ...coaContext,
  };

  return (
    <WmsContext.Provider value={contextValue}>{children}</WmsContext.Provider>
  );
};
