// apps/pwa-pos/src/core/hooks/usePosSync.ts
import { useState, useRef, useEffect } from "react";
import { ledger, projector, eventBus, errorBus } from "../instances";
import { backgroundSync } from "../BackgroundSync";

export interface ExtendedProjectorState {
  isInitialized?: boolean;
  companyName?: string;
  branchId?: string;
  staffList?: any[];
  tables?: any[];
  categories?: any[];
  products?: any[];
  activeOperator?: any;
  sales?: any;
  transactions?: any[];
  pettyCashTransactions?: any[];
  auditLogs?: any[];
  currentShiftInitialCash?: number;
  settings?: {
    pajak?: {
      ppn: number;
      serviceCharge: number;
    };
    [key: string]: any;
  };
  report?: {
    totalTrx: number;
    initialCash: number;
    cashSales: number;
    systemCash: number;
    totalGross: number;
    totalNet: number;
    totalTax: number;
    totalService: number;
    catSales: Record<string, { qty: number; total: number }>;
    paymentSales: Record<string, number>;
    pettyCashOut: number;
    totalVoid: number;
    totalRefund: number;
    staffList: string[];
    pluData: [string, { qty: number; total: number }][];
  };
  recon?: {
    activeTables: number;
  };
  [key: string]: any;
}

export interface ViewStateContract {
  activeTab: "DINE_IN" | "TAKE_AWAY" | "MENU";
  viewMode: "TABLES" | "MENU";
  selectedTable: string | null;
}

export const usePosSync = () => {
  const [state, setState] = useState<ExtendedProjectorState>(
    projector.getInitialState() as unknown as ExtendedProjectorState,
  );
  const [isReady, setIsReady] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [currentOperator, setCurrentOperator] = useState<any | null>(null);
  const [isScreenLocked, setIsScreenLocked] = useState(true);
  const [viewState, setViewState] = useState<ViewStateContract>({
    activeTab: "DINE_IN",
    viewMode: "TABLES",
    selectedTable: null,
  });

  const isFirstLoadRef = useRef(true);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ============================================================
  // 🚀 IN-MEMORY STATE (THE O(1) ENGINE)
  // ============================================================
  const memRef = useRef({
    txMap: new Map(),
    pcMap: new Map(),
    activeOrdersMap: new Map(),
    auditArr: [] as any[],
    activeOperatorIdFromLedger: null as string | null,
  });

  const getCombinedStaff = () => {
    const ledgerStaff = state?.staffList || [];
    let hydratedStaff: any[] = [];
    try {
      const stored = localStorage.getItem("ASSTRO_OFFLINE_STAFF");
      if (stored) hydratedStaff = JSON.parse(stored);
    } catch (err) {}
    return [...ledgerStaff, ...hydratedStaff];
  };

  const setViewStateDirect = (view: Partial<ViewStateContract>) => {
    setViewState((prev) => ({ ...prev, ...view }));
  };

  // ============================================================
  // 🔧 FUNGSI LOAD KONFIGURASI FINANSIAL DARI HYDRATE
  // ============================================================
  const loadFinancialConfig = () => {
    try {
      const stored = localStorage.getItem("ASSTRO_FINANCIAL_CONFIG");
      if (stored) {
        const config = JSON.parse(stored);
        return {
          ppn: Number(config.taxRate) || 0,
          serviceCharge: Number(config.serviceRate) || 0,
        };
      }
    } catch (err) {
      console.error("[FINANCIAL_CONFIG] Failed to parse config:", err);
    }
    return { ppn: 0, serviceCharge: 0 };
  };

  // ============================================================
  // 🧮 FUNGSI MURNI KALKULASI REPORT (Pure Function)
  // ============================================================
  const calculateReport = (computedState: ExtendedProjectorState) => {
    const transactions = computedState.transactions || [];
    const pettyCash = computedState.pettyCashTransactions || [];
    const audits = computedState.auditLogs || [];

    const completedTransactions = transactions.filter(
      (tx: any) =>
        tx.status === "PAID" ||
        tx.status === "COMPLETED" ||
        !tx.status ||
        tx.status !== "PENDING",
    );

    let totalGross = 0;
    let totalNet = 0;
    let totalTax = 0;
    let totalService = 0;
    const catSales: Record<string, { qty: number; total: number }> = {};
    const paymentSales: Record<string, number> = {};
    const staffSet = new Set<string>();
    let cashSales = 0;

    completedTransactions.forEach((tx: any) => {
      totalNet += tx.subtotal || 0;
      totalTax += tx.tax_amount || 0;
      totalService += tx.service_amount || 0;
      totalGross += tx.grand_total || 0;

      if (tx.cashierName) staffSet.add(tx.cashierName);
      if (tx.waiterName) staffSet.add(tx.waiterName);

      const method = (tx.payment_method || "CASH").toUpperCase();
      paymentSales[method] =
        (paymentSales[method] || 0) + (tx.grand_total || 0);

      if (method === "CASH" || method === "TUNAI") {
        cashSales += tx.grand_total || 0;
      }

      (tx.items || []).forEach((item: any) => {
        const activeQty = item.qty - (item.refundedQty || 0);
        if (activeQty > 0) {
          const catName = item.category_name || "UNCATEGORIZED";
          if (!catSales[catName]) catSales[catName] = { qty: 0, total: 0 };
          catSales[catName].qty += activeQty;
          catSales[catName].total += item.price * activeQty;
        }
      });
    });

    let pettyCashOut = 0;
    pettyCash.forEach((pc: any) => {
      pettyCashOut += pc.amount_requested || 0;
      if (pc.status === "COMPLETED") pettyCashOut -= pc.amount_returned || 0;
      if (pc.cashier_issued_name) staffSet.add(pc.cashier_issued_name);
    });

    let totalVoid = 0;
    let totalRefund = 0;
    audits.forEach((a: any) => {
      if (a.type === "VOID") totalVoid += a.totalAmount || 0;
      if (a.type === "REFUND") totalRefund += a.totalAmount || 0;
    });

    const initialCash = computedState.currentShiftInitialCash || 0;
    const systemCash = initialCash + cashSales - pettyCashOut - totalRefund;

    const pluMap: Record<string, { qty: number; total: number }> = {};
    completedTransactions.forEach((tx: any) => {
      (tx.items || []).forEach((item: any) => {
        const activeQty = item.qty - (item.refundedQty || 0);
        if (activeQty > 0) {
          const itemName = item.name || item.nameSnapshot || "UNKNOWN";
          const itemPrice = item.price || item.basePriceSnapshot || 0;
          const currentRecord = pluMap[itemName] || { qty: 0, total: 0 };
          currentRecord.qty += activeQty;
          currentRecord.total += itemPrice * activeQty;
          pluMap[itemName] = currentRecord;
        }
      });
    });
    const pluData = Object.entries(pluMap).sort((a, b) => b[1].qty - a[1].qty);

    return {
      totalTrx: completedTransactions.length,
      initialCash,
      cashSales,
      systemCash,
      totalGross,
      totalNet,
      totalTax,
      totalService,
      catSales,
      paymentSales,
      pettyCashOut,
      totalVoid,
      totalRefund,
      staffList: Array.from(staffSet),
      pluData,
    };
  };

  // ------------------------------------------------------------
  // 1. ENGINE PEMROSES EVENT (Reducer Murni)
  // ------------------------------------------------------------
  const processEvent = (ev: any, mem: typeof memRef.current) => {
    if (ev.type === "SHIFT_OPENED") {
      mem.activeOperatorIdFromLedger = ev.payload.operator_id;
    }
    if (ev.type === "SHIFT_CLOSED" || ev.type === "END_OF_DAY_PROCESSED") {
      mem.activeOperatorIdFromLedger = null;
    }
    if (ev.type === "LOCAL_DATA_PURGED") {
      mem.txMap.clear();
      mem.pcMap.clear();
      mem.activeOrdersMap.clear();
      mem.auditArr.length = 0;
      mem.activeOperatorIdFromLedger = null;
    }

    if (ev.type === "ORDER_CREATED" || ev.type === "ORDER_UPDATED") {
      mem.activeOrdersMap.set(
        ev.payload.orderId,
        JSON.parse(JSON.stringify(ev.payload)),
      );
    }

    if (ev.type === "KDS_STATUS_UPDATED") {
      const order = mem.activeOrdersMap.get(ev.payload.orderId);
      if (order && order.items) {
        order.items = order.items.map((i: any) => {
          if ((i.skuSnapshot || i.sku) === ev.payload.sku) {
            return { ...i, status: ev.payload.status };
          }
          return i;
        });
      }
    }

    if (ev.type === "INVOICE_CREATED") {
      const p = ev.payload;
      const relatedOrder = mem.activeOrdersMap.get(p.orderId);
      mem.txMap.set(p.invoiceId, {
        orderId: p.orderId,
        invoice_id: p.invoiceNumber,
        timestamp: ev.timestamp || Date.now(),
        tableLabel: relatedOrder?.tableLabel || "UNKNOWN",
        customerName: relatedOrder?.customerName || null,
        waiterName: "WAITRESS",
        cashierName: "CASHIER",
        subtotal: p.subtotal,
        tax_amount: p.taxAmount,
        service_amount: p.serviceAmount,
        grand_total: p.grandTotal,
        payment_method: "PENDING",
        status: p.status,
        items: relatedOrder
          ? relatedOrder.items.map((i: any) => ({
              sku: i.skuSnapshot,
              name: i.nameSnapshot,
              price: i.basePriceSnapshot,
              qty: i.qty,
              refundedQty: 0,
            }))
          : [],
      });
    }

    if (ev.type === "PAYMENT_RECEIVED") {
      const p = ev.payload;
      const tx = mem.txMap.get(p.invoiceId);
      if (tx) {
        tx.payment_method = p.method;
        tx.status = "PAID";
        if (tx.orderId) {
          const order = mem.activeOrdersMap.get(tx.orderId);
          if (order) order.isClosed = true;
        } else {
          mem.activeOrdersMap.forEach((order) => {
            if (order.tableLabel === tx.tableLabel) order.isClosed = true;
          });
        }
      }
    }

    if (ev.type === "PETTY_CASH_ISSUED") {
      mem.pcMap.set(ev.payload.petty_cash_id, ev.payload);
    }
    if (ev.type === "PETTY_CASH_RESOLVED") {
      const pc = mem.pcMap.get(ev.payload.petty_cash_id);
      if (pc) pc.resolved = true;
    }

    if (
      ev.type === "ORDER_VOIDED" ||
      ev.type === "ORDER_CANCELLED" ||
      ev.type === "PAYMENT_REFUNDED"
    ) {
      mem.auditArr.push({
        timestamp: ev.payload.timestamp || Date.now(),
        tableOrInvoice:
          ev.payload.tableLabel || ev.payload.invoiceId || "Meja/Invoice",
        customerName: ev.payload.customerName || "-",
        itemsInfo: ev.payload.sku
          ? `${ev.payload.qtyToVoid}x ${ev.payload.sku}`
          : ev.payload.items
            ? `${ev.payload.items.length} Menu`
            : "Seluruh Pesanan",
        totalAmount: ev.payload.totalRefundAmount || 0,
        cashierName: ev.payload.operator_id || "KASIR",
        managerName: ev.payload.manager_id || "SPV/MANAGER",
        note: ev.payload.voidNote || ev.payload.reason || "Tidak ada catatan",
        type: ev.type.includes("REFUND") ? "REFUND" : "VOID",
      });
    }

    // =========================================================
    // [PERBAIKAN] TANGANI FINANCIAL CONFIG DARI KEDUA TIPE EVENT
    // =========================================================
    if (ev.type === "WMS_FINANCIAL_CONFIG_UPDATED") {
      const config = {
        taxRate: ev.payload.taxRate || 0,
        serviceRate: ev.payload.serviceRate || 0,
      };
      localStorage.setItem("ASSTRO_FINANCIAL_CONFIG", JSON.stringify(config));
      console.log(
        "[FINANCIAL_CONFIG] Updated from WMS_FINANCIAL_CONFIG_UPDATED:",
        config,
      );
    }

    // =========================================================
    // [TAMBAHAN] Tangani FINANCIAL_CONFIG_SYNCED yang dikirim dari server
    // =========================================================
    if (ev.type === "FINANCIAL_CONFIG_SYNCED") {
      const config = {
        taxRate: ev.payload.taxRate || 0,
        serviceRate: ev.payload.serviceRate || 0,
      };
      localStorage.setItem("ASSTRO_FINANCIAL_CONFIG", JSON.stringify(config));
      console.log(
        "[FINANCIAL_CONFIG] Updated from FINANCIAL_CONFIG_SYNCED:",
        config,
      );
    }

    if (ev.type === "TABLE_CLEARED") {
      mem.activeOrdersMap.forEach((order) => {
        if (order.tableLabel === ev.payload.tableLabel) order.isClosed = true;
      });
    }
  };

  // ------------------------------------------------------------
  // 2. BUILD STATE (Menerjemahkan Memory ke UI React)
  // ------------------------------------------------------------
  const buildAndSetState = (mem: typeof memRef.current) => {
    const computedState =
      projector.getState() as unknown as ExtendedProjectorState;
    const combinedStaff = getCombinedStaff();

    if (!computedState.tables) computedState.tables = [];
    computedState.tables.forEach((t: any) => {
      t.savedItems = [];
      t.currentBill = 0;
    });

    mem.activeOrdersMap.forEach((order) => {
      if (order.isClosed) return;
      let table = computedState.tables!.find(
        (t: any) => t.label === order.tableLabel,
      );
      if (!table) {
        table = {
          id: `MEJA-ID-${order.tableLabel}`,
          label: order.tableLabel,
          type: "VIRTUAL",
          capacity: 4,
          currentBill: 0,
          savedItems: [],
        };
        computedState.tables!.push(table);
      }
      table.savedItems = order.items.map((i: any) => ({
        id: i.id || i.productId,
        sku: i.skuSnapshot || i.sku,
        name: i.nameSnapshot || i.name,
        price: i.basePriceSnapshot || i.price,
        qty: i.qty,
        note: i.notes || i.note,
        status: i.status || "PENDING",
        voidedQty: i.voidedQty || 0,
        refundedQty: i.refundedQty || 0,
        voidReason: i.voidReason || null,
      }));
      table.currentBill = table.savedItems.reduce(
        (acc: number, curr: any) =>
          acc +
          curr.price *
            Math.max(
              0,
              curr.qty - (curr.voidedQty || 0) - (curr.refundedQty || 0),
            ),
        0,
      );
    });

    if (mem.activeOperatorIdFromLedger) {
      const foundStaff = combinedStaff.find(
        (s) => s.id === mem.activeOperatorIdFromLedger,
      );
      if (foundStaff) computedState.activeOperator = foundStaff;
    } else {
      computedState.activeOperator = null;
    }

    // =======================================================
    // [FIX TERBESAR] MENYUNTIKKAN DATA MEMORI KE REACT STATE
    // =======================================================
    computedState.transactions = Array.from(mem.txMap.values());
    computedState.pettyCashTransactions = Array.from(mem.pcMap.values());
    computedState.auditLogs = [...mem.auditArr].sort(
      (a, b) => b.timestamp - a.timestamp,
    );

    // =======================================================
    // [+] KALKULASI REPORT REAKTIF
    // =======================================================
    computedState.report = calculateReport(computedState);

    // =======================================================
    // [+] KALKULASI RECON DATA (Active Tables Count)
    // =======================================================
    const activeTables =
      computedState.tables?.filter(
        (t: any) =>
          t.savedItems && t.savedItems.length > 0 && t.currentBill > 0,
      ).length || 0;
    computedState.recon = { activeTables };

    // =======================================================
    // [+] LOAD KONFIGURASI FINANSIAL (dari localStorage)
    // =======================================================
    const financialConfig = loadFinancialConfig();
    computedState.settings = {
      ...(computedState.settings || {}),
      pajak: financialConfig,
    };

    console.log(
      "[REACT STATE FINANCIAL CONFIG]",
      computedState.settings?.pajak,
    );
    setState({ ...computedState });
    setIsInitialized(
      !!computedState?.isInitialized ||
        Boolean(localStorage.getItem("ASSTRO_DEVICE_TOKEN")),
    );

    if (computedState?.activeOperator) {
      setCurrentOperator(computedState.activeOperator);
      if (isFirstLoadRef.current) {
        setIsScreenLocked(true);
        setViewState({
          activeTab: "DINE_IN",
          viewMode: "TABLES",
          selectedTable: null,
        });
      }
    } else {
      setCurrentOperator(null);
      setIsScreenLocked(true);
    }
    isFirstLoadRef.current = false;
  };

  // ------------------------------------------------------------
  // 3. JALUR EKSEKUSI (Full Scan vs Delta)
  // ------------------------------------------------------------
  const fullRebuild = async () => {
    try {
      const events: any[] = [];
      await ledger.replay((ev) => {
        events.push(ev);
      });
      await projector.runProjection(events);

      memRef.current.txMap.clear();
      memRef.current.pcMap.clear();
      memRef.current.activeOrdersMap.clear();
      memRef.current.auditArr = [];
      memRef.current.activeOperatorIdFromLedger = null;

      events.forEach((ev) => processEvent(ev, memRef.current));
      buildAndSetState(memRef.current);
    } catch (err: any) {
      errorBus.next(`Gagal memuat data: ${err.message || "Unknown error"}`);
    }
  };

  const applyDelta = async (newEv: any) => {
    try {
      await projector.runProjection([newEv]);
      processEvent(newEv, memRef.current);
      buildAndSetState(memRef.current);
    } catch (err: any) {
      console.error("Delta Sync Error:", err);
    }
  };

  useEffect(() => {
    const subscription = eventBus.subscribe((evPayload) => {
      if (evPayload && evPayload.type) {
        applyDelta(evPayload);
      } else {
        fullRebuild();
      }
      backgroundSync.triggerPush();
    });

    const handleRemoteSync = async (e: any) => {
      console.log("[REMOTE SYNC] Received pull success event");

      if (e.detail && Array.isArray(e.detail)) {
        console.log("[REMOTE SYNC] Processing events:", e.detail.length);

        const remoteEvents = e.detail.map((ev: any) => ({
          type: ev.type,
          payload: ev.payload,
          timestamp: ev.timestamp,
          metadata: { _isRemote: true },
        }));

        await projector.runProjection(remoteEvents);

        remoteEvents.forEach((ev: any) => processEvent(ev, memRef.current));

        buildAndSetState(memRef.current);

        console.log("[REMOTE SYNC] State updated successfully");
      } else {
        console.log("[REMOTE SYNC] Full rebuild triggered");
        fullRebuild();
      }
    };

    window.addEventListener("SYNC_PULL_SUCCESS", handleRemoteSync);
    window.addEventListener("FORCE_FULL_REBUILD", fullRebuild);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener("SYNC_PULL_SUCCESS", handleRemoteSync);
      window.removeEventListener("FORCE_FULL_REBUILD", fullRebuild);
    };
  }, []);

  const resetIdleTimer = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (currentOperator && !isScreenLocked) {
      timeoutRef.current = setTimeout(() => setIsScreenLocked(true), 60000);
    }
  };

  useEffect(() => {
    const activityEvents = [
      "mousedown",
      "mousemove",
      "keypress",
      "scroll",
      "touchstart",
      "click",
    ];
    if (currentOperator && !isScreenLocked) {
      resetIdleTimer();
      activityEvents.forEach((evt) =>
        window.addEventListener(evt, resetIdleTimer),
      );
    }
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      activityEvents.forEach((evt) =>
        window.removeEventListener(evt, resetIdleTimer),
      );
    };
  }, [currentOperator, isScreenLocked]);

  useEffect(() => {
    let isMounted = true;
    const init = async () => {
      await ledger.init();
      if (isMounted) {
        await fullRebuild();
        setIsReady(true);
        backgroundSync.start();
      }
    };
    init();
    return () => {
      isMounted = false;
      backgroundSync.stop();
    };
  }, []);

  return {
    state,
    isReady,
    isInitialized,
    currentOperator,
    isScreenLocked,
    viewState,
    getCombinedStaff,
    setIsScreenLocked,
    setViewStateDirect,
    setCurrentOperator,
  };
};
