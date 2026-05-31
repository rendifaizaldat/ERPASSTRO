import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
} from "react";
import { ledger, projector, eventBus, errorBus } from "./instances";

interface ExtendedProjectorState {
  isInitialized?: boolean;
  companyName?: string;
  branchId?: string;
  staffList?: Array<{
    id: string;
    name: string;
    role: string;
    pin: string;
    isActive?: boolean;
  }>;
  tables?: any[];
  categories?: Array<{ id: string; name: string }>;
  products?: Array<{
    sku: string;
    name: string;
    price: number;
    categoryId: string;
    isActive?: boolean;
    isArchived?: boolean;
  }>;
  activeOperator?: {
    id: string;
    name: string;
    role: string;
    pin: string;
  } | null;
  sales?: {
    total_revenue: number;
    total_transactions: number;
    last_invoice: string | null;
    current_cash_in_drawer: number;
  };
  transactions?: any[];
  pettyCashTransactions?: Array<{
    id: string;
    requester_name: string;
    requester_division: string;
    notes: string;
    amount_requested: number;
    amount_returned: number;
    has_receipt: boolean;
    status: "ON_PROCESS" | "COMPLETED";
    cashier_issued_name: string;
    cashier_resolved_name?: string;
    timestamp_issued: number;
    timestamp_resolved?: number;
  }>;
  auditLogs?: Array<{
    id: string;
    type: "VOID" | "REFUND";
    timestamp: number;
    tableOrInvoice: string;
    customerName?: string;
    itemsInfo: string;
    totalAmount: number;
    cashierName: string;
    managerName: string;
    note: string;
  }>;
  [key: string]: any;
}

export interface ViewStateContract {
  activeTab: "DINE_IN" | "TAKE_AWAY" | "MENU";
  viewMode: "TABLES" | "MENU";
  selectedTable: string | null;
}

interface PosContextType {
  state: any;
  isReady: boolean;
  isInitialized: boolean;
  currentOperator: any | null;
  isScreenLocked: boolean;
  viewState: ViewStateContract;
  setViewStateDirect: (view: Partial<ViewStateContract>) => void;
  initializeSystem: (data: any) => Promise<void>;
  registerStaff: (data: any) => Promise<void>;
  editStaff: (id: string, data: any) => Promise<void>;
  toggleStaffStatus: (id: string, isActive: boolean) => Promise<void>;
  addMasterTable: (data: any) => Promise<void>;
  deleteMasterTable: (id: string, label: string) => Promise<void>;
  toggleMasterTableStatus: (
    tableId: string,
    isActive: boolean,
  ) => Promise<void>;
  addMasterCategory: (name: string) => Promise<void>;
  deleteMasterCategory: (id: string) => Promise<void>;
  addMasterProduct: (data: any) => Promise<void>;
  editMasterProduct: (data: any) => Promise<void>;
  deleteMasterProduct: (sku: string) => Promise<void>;
  toggleProductStatus: (sku: string, isActive: boolean) => Promise<void>;
  validatePinOnly: (
    pin: string,
  ) => Promise<{ valid: boolean; staff?: any; message?: string }>;
  openShiftWithModal: (pin: string, initialCash: number) => Promise<void>;
  logoutWithReconciliation: (
    actualCash: number,
    systemCash: number,
  ) => Promise<void>;
  executeSale: (enterprisePayload: any) => Promise<void>;
  placeTableOrder: (
    tableLabel: string,
    grandTotal: number,
    items: any[],
    isVirtual?: boolean,
    parentTableId?: string,
  ) => Promise<void>;
  processTablePayment: (tableLabel: string) => Promise<void>;
  clearTableStatus: (tableLabel: string) => Promise<void>;
  voidTableOrder: (
    tableLabel: string,
    sku: string,
    qtyToVoid: number,
    voidType: "SALAH_INPUT" | "BARANG_KOSONG" | "CANCEL",
    managerPin?: string,
    voidNote?: string,
  ) => Promise<void>;
  refundTransaction: (
    invoice_id: string,
    items: Array<{ sku: string; qty: number }>,
    refundType: "CANCEL" | "SOLD_OUT",
    managerPin: string,
    refundNote: string,
  ) => Promise<void>;
  issuePettyCash: (data: {
    name: string;
    division: string;
    notes: string;
    amount: number;
  }) => Promise<void>;
  resolvePettyCash: (
    id: string,
    amountReturned: number,
    hasReceipt: boolean,
  ) => Promise<void>;
}

const PosContext = createContext<PosContextType | null>(null);

export const PosProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
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
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const setViewStateDirect = (view: Partial<ViewStateContract>) => {
    setViewState((prev) => ({ ...prev, ...view }));
  };

  const syncState = async () => {
    try {
      const events: any[] = [];
      await ledger.replay((ev) => {
        events.push(ev);
      });
      await projector.runProjection(events);

      const computedState =
        projector.getState() as unknown as ExtendedProjectorState;

      const txMap = new Map();
      const pcMap = new Map();
      const auditArr: any[] = [];

      let initialShiftCash = 0;
      let cashSalesRevenue = 0;
      let totalPettyCashDeduction = 0;

      events.forEach((ev) => {
        if (ev.type === "SHIFT_OPENED") {
          initialShiftCash = ev.payload.initial_cash;
          cashSalesRevenue = 0;
          totalPettyCashDeduction = 0;
        }

        if (ev.type === "SALE_CREATED") {
          const p = ev.payload;
          txMap.set(p.identity.invoice_number, {
            invoice_id: p.identity.invoice_number,
            timestamp: p.identity.created_at,
            tableLabel: p.table_info.table_name,
            customerName: p.customer.customer_name,
            waiterName: p.staff.waiter_name,
            cashierName: p.staff.cashier_name,
            subtotal: p.summary.subtotal,
            tax_amount: p.summary.total_tax,
            service_amount: p.summary.total_service,
            grand_total: p.summary.grand_total,
            payment_method: p.payment.payment_method,
            status: p.identity.transaction_status,
            items: p.items.map((i: any) => ({
              ...i,
              name: i.product_name,
              price: i.selling_price,
              category_name: i.category_name,
              refundedQty: 0,
            })),
          });

          if (p.payment.payment_method === "CASH") {
            cashSalesRevenue += p.summary.grand_total;
          }
        }

        if (ev.type === "ORDER_REFUNDED") {
          const p = ev.payload;
          const tx = txMap.get(p.invoice_id);

          let refundAmountTotal = 0;
          let itemsInfoStr = "";

          if (tx) {
            p.items.forEach((refItem: any) => {
              const item = tx.items.find((i: any) => i.sku === refItem.sku);
              if (item) {
                item.refundedQty += refItem.qty;
                refundAmountTotal += item.price * refItem.qty;
                itemsInfoStr += `${item.name} (x${refItem.qty}), `;
              }
            });

            let totalItems = 0,
              totalRefunded = 0,
              newSubtotal = 0;
            tx.items.forEach((i: any) => {
              totalItems += i.qty;
              totalRefunded += i.refundedQty || 0;
              const activeQty = i.qty - (i.refundedQty || 0);
              if (activeQty > 0) newSubtotal += i.price * activeQty;
            });

            const originalGrandTotal = tx.grand_total;
            tx.status =
              totalRefunded >= totalItems ? "FULL_REFUND" : "PARTIAL_REFUND";
            tx.subtotal = newSubtotal;
            tx.tax_amount = newSubtotal * 0.15;
            tx.service_amount = newSubtotal * 0.05;
            tx.grand_total = newSubtotal + tx.tax_amount + tx.service_amount;

            if (tx.payment_method === "CASH") {
              cashSalesRevenue -= originalGrandTotal - tx.grand_total;
            }

            // SIMPAN KE AUDIT LOG
            const manager = computedState.staffList?.find(
              (s) => s.id === p.manager_id,
            );
            auditArr.push({
              id: `AUDIT-REF-${p.timestamp || Date.now()}`,
              type: "REFUND",
              timestamp: p.timestamp || Date.now(),
              tableOrInvoice: `INV: ${p.invoice_id}`,
              customerName: tx.customerName,
              itemsInfo: itemsInfoStr.slice(0, -2),
              totalAmount: refundAmountTotal,
              cashierName: tx.cashierName,
              managerName: manager?.name || "SYS ADMIN",
              note: p.refundNote || p.refundType,
            });
          }
        }

        if (ev.type === "ORDER_VOIDED") {
          const p = ev.payload;
          const prod = computedState.products?.find(
            (x: any) => x.sku === p.sku,
          );
          const manager = computedState.staffList?.find(
            (s: any) => s.id === p.manager_id,
          );
          const op = computedState.staffList?.find(
            (s: any) => s.id === p.operator_id,
          );

          auditArr.push({
            id: `AUDIT-VOID-${p.timestamp || Date.now()}`,
            type: "VOID",
            timestamp: p.timestamp || Date.now(),
            tableOrInvoice: `MEJA: ${p.tableLabel}`,
            customerName: "Active Table",
            itemsInfo: `${prod?.name || p.sku} (x${p.qtyToVoid})`,
            totalAmount: (prod?.price || 0) * p.qtyToVoid,
            cashierName: op?.name || "KASIR",
            managerName: manager?.name || "TIDAK ADA",
            note: p.voidNote || p.voidType,
          });
        }

        if (ev.type === "PETTY_CASH_ISSUED") {
          const p = ev.payload;
          pcMap.set(p.petty_cash_id, {
            id: p.petty_cash_id,
            requester_name: p.requester_name,
            requester_division: p.requester_division,
            notes: p.notes,
            amount_requested: p.amount_requested,
            amount_returned: 0,
            has_receipt: false,
            status: "ON_PROCESS",
            cashier_issued_name: p.cashier_name,
            timestamp_issued: p.timestamp,
          });
          totalPettyCashDeduction += p.amount_requested;
        }

        if (ev.type === "PETTY_CASH_RESOLVED") {
          const p = ev.payload;
          const pc = pcMap.get(p.petty_cash_id);
          if (pc) {
            pc.amount_returned = p.amount_returned;
            pc.has_receipt = p.has_receipt;
            pc.status = "COMPLETED";
            pc.cashier_resolved_name = p.cashier_name;
            pc.timestamp_resolved = p.timestamp;
            totalPettyCashDeduction -= p.amount_returned;
          }
        }
      });

      const currentCashInDrawer =
        initialShiftCash + cashSalesRevenue - totalPettyCashDeduction;

      if (!computedState.sales) {
        computedState.sales = {
          total_revenue: 0,
          total_transactions: 0,
          last_invoice: null,
          current_cash_in_drawer: 0,
        };
      }
      computedState.sales.current_cash_in_drawer = currentCashInDrawer;

      computedState.transactions = Array.from(txMap.values()).sort(
        (a, b) => b.timestamp - a.timestamp,
      );
      computedState.pettyCashTransactions = Array.from(pcMap.values()).sort(
        (a, b) => b.timestamp_issued - a.timestamp_issued,
      );
      computedState.auditLogs = auditArr.sort(
        (a, b) => b.timestamp - a.timestamp,
      );

      setState(computedState);
      setIsInitialized(!!computedState?.isInitialized);

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
    } catch (err: any) {
      errorBus.next(`Gagal memuat data: ${err.message || "Unknown error"}`);
    }
  };

  useEffect(() => {
    const subscription = eventBus.subscribe(() => syncState());
    return () => subscription.unsubscribe();
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
        await syncState();
        setIsReady(true);
      }
    };
    init();
    return () => {
      isMounted = false;
    };
  }, []);

  const initializeSystem = async (data: any) => {
    try {
      await ledger.appendEvent("SYSTEM_INITIALIZED", data);
      eventBus.next();
    } catch (err: any) {
      errorBus.next(`Gagal inisialisasi: ${err.message}`);
    }
  };

  const registerStaff = async (data: any) => {
    try {
      await ledger.appendEvent("MEMBER_REGISTERED", {
        member_id: `STF-${Date.now()}`,
        name: data.name,
        tier: "LEGENDARY",
        phone: `${data.role}:${data.pin}`,
      });
      eventBus.next();
    } catch (err: any) {
      errorBus.next(`Gagal mendaftar staf: ${err.message}`);
    }
  };

  const editStaff = async (id: string, data: any) => {
    try {
      await ledger.appendEvent("STAFF_UPDATED", { id, ...data });
      eventBus.next();
    } catch (err: any) {
      errorBus.next(`Gagal update staf: ${err.message}`);
    }
  };

  const toggleStaffStatus = async (id: string, isActive: boolean) => {
    try {
      await ledger.appendEvent("STAFF_TOGGLED", { id, isActive });
      eventBus.next();
    } catch (err: any) {
      errorBus.next(`Gagal toggle status staf: ${err.message}`);
    }
  };

  const addMasterTable = async (data: any) => {
    try {
      await ledger.appendEvent("TABLE_ADDED", {
        id: `MEJA-ID-${data.label.trim().toUpperCase()}`,
        label: data.label.trim().toUpperCase(),
        type: data.type,
        capacity: Number(data.capacity) || 4,
        created_by: data.created_by || "USER",
      });
      eventBus.next();
    } catch (err: any) {
      errorBus.next(`Gagal menambah meja: ${err.message}`);
    }
  };

  const deleteMasterTable = async (id: string, label: string) => {
    try {
      await ledger.appendEvent("TABLE_DELETED", { id, label });
      eventBus.next();
    } catch (err: any) {
      errorBus.next(`Gagal menghapus meja: ${err.message}`);
    }
  };

  const toggleMasterTableStatus = async (
    tableId: string,
    isActive: boolean,
  ) => {
    try {
      await ledger.appendEvent("TABLE_TOGGLED", { id: tableId, isActive });
      eventBus.next();
    } catch (err: any) {
      errorBus.next(`Gagal mengubah status meja: ${err.message}`);
    }
  };

  const addMasterCategory = async (name: string) => {
    try {
      await ledger.appendEvent("CATEGORY_ADDED", {
        id: `CAT-${Date.now()}`,
        name: name.trim().toUpperCase(),
      });
      eventBus.next();
    } catch (err: any) {
      errorBus.next(`Gagal menambah kategori: ${err.message}`);
    }
  };

  const deleteMasterCategory = async (id: string) => {
    try {
      const hasProducts = state?.products?.some(
        (p: any) => p.categoryId === id && !p.isArchived,
      );
      if (hasProducts) {
        errorBus.next("GAGAL: Kategori masih digunakan!");
        return;
      }
      await ledger.appendEvent("CATEGORY_DELETED", { id });
      eventBus.next();
    } catch (err: any) {
      errorBus.next(`Gagal menghapus kategori: ${err.message}`);
    }
  };

  const addMasterProduct = async (data: any) => {
    try {
      await ledger.appendEvent("PRODUCT_ADDED", {
        sku: data.sku.trim().toUpperCase(),
        name: data.name.trim().toUpperCase(),
        price: Number(data.price) || 0,
        categoryId: data.categoryId,
      });
      eventBus.next();
    } catch (err: any) {
      errorBus.next(`Gagal menambah produk: ${err.message}`);
    }
  };

  const editMasterProduct = async (data: any) => {
    try {
      await ledger.appendEvent("PRODUCT_EDITED", {
        sku: data.sku.trim().toUpperCase(),
        name: data.name.trim().toUpperCase(),
        price: Number(data.price) || 0,
        categoryId: data.categoryId,
      });
      eventBus.next();
    } catch (err: any) {
      errorBus.next(`Gagal mengedit produk: ${err.message}`);
    }
  };

  const toggleProductStatus = async (sku: string, isActive: boolean) => {
    try {
      await ledger.appendEvent("PRODUCT_TOGGLED", { sku, isActive });
      eventBus.next();
    } catch (err: any) {
      errorBus.next(`Gagal mengubah status produk: ${err.message}`);
    }
  };

  const deleteMasterProduct = async (sku: string) => {
    try {
      await ledger.appendEvent("PRODUCT_ARCHIVED", { sku });
      eventBus.next();
    } catch (err: any) {
      errorBus.next(`Gagal mengarsipkan produk: ${err.message}`);
    }
  };

  const validatePinOnly = async (pin: string) => {
    const staffList = state?.staffList || [];
    if (isScreenLocked && currentOperator) {
      if (currentOperator.pin === pin) {
        setIsScreenLocked(false);
        const targetTable = state?.tables?.find(
          (t: any) => t.label === viewState.selectedTable,
        );
        const hasActiveBill =
          targetTable &&
          (targetTable.currentBill > 0 ||
            (targetTable.savedItems && targetTable.savedItems.length > 0));

        if (viewState.selectedTable && hasActiveBill)
          setViewState({
            activeTab: "MENU",
            viewMode: "MENU",
            selectedTable: viewState.selectedTable,
          });
        else
          setViewState({
            activeTab: "DINE_IN",
            viewMode: "TABLES",
            selectedTable: null,
          });
        return { valid: true, staff: currentOperator };
      }
      return {
        valid: false,
        message: `LAYAR INI MILIK KASIR ${currentOperator.name}. USER LAIN DILARANG MASUK!`,
      };
    }
    if (state?.activeOperator)
      return {
        valid: false,
        message: `KASIR ${state.activeOperator.name} MASIH AKTIF MEMEGANG SHIFT!`,
      };

    const targetStaff =
      staffList.find((s: any) => s.pin === pin && s.isActive !== false) ||
      (state?.isInitialized && pin === "112233"
        ? {
            id: "ADMIN-000",
            name: "ADMINISTRATOR",
            role: "ADMIN",
            pin: "112233",
            isActive: true,
          }
        : null);

    if (targetStaff) return { valid: true, staff: targetStaff };
    return {
      valid: false,
      message: "PIN SALAH ATAU AKUN NONAKTIF. OTORISASI DITOLAK.",
    };
  };

  const openShiftWithModal = async (pin: string, initialCash: number) => {
    try {
      const staffList = state?.staffList || [];
      const targetStaff = staffList.find(
        (s: any) => s.pin === pin && s.isActive !== false,
      );
      if (targetStaff) {
        await ledger.appendEvent("SHIFT_OPENED", {
          initial_cash: initialCash,
          operator_id: targetStaff.id,
        });
        setCurrentOperator(targetStaff);
        setIsScreenLocked(false);
        setViewState({
          activeTab: "DINE_IN",
          viewMode: "TABLES",
          selectedTable: null,
        });
        eventBus.next();
      }
    } catch (err: any) {
      errorBus.next(`Gagal membuka shift: ${err.message}`);
    }
  };

  const logoutWithReconciliation = async (
    actualCash: number,
    systemCash: number,
  ) => {
    try {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      await ledger.appendEvent("SHIFT_CLOSED", {
        actual_cash: actualCash,
        system_cash: systemCash,
      });
      setCurrentOperator(null);
      setIsScreenLocked(true);
      setViewState({
        activeTab: "DINE_IN",
        viewMode: "TABLES",
        selectedTable: null,
      });
      eventBus.next();
    } catch (err: any) {
      errorBus.next(`Gagal menutup shift: ${err.message}`);
    }
  };

  const executeSale = async (enterprisePayload: any) => {
    try {
      await ledger.appendEvent("SALE_CREATED", enterprisePayload);
      eventBus.next();
    } catch (err: any) {
      errorBus.next(`Gagal mengeksekusi penjualan: ${err.message}`);
    }
  };

  const placeTableOrder = async (
    tableLabel: string,
    grandTotal: number,
    items: any[] = [],
    isVirtual: boolean = false,
    parentTableId?: string,
  ) => {
    try {
      const labelUpper = tableLabel.trim().toUpperCase();
      await ledger.appendEvent("TABLE_ORDER_PLACED", {
        id: `MEJA-ID-${labelUpper}`,
        tableLabel: labelUpper,
        grandTotal: Number(grandTotal) || 0,
        isVirtual,
        parentTableId,
        items,
      });
      eventBus.next();
    } catch (err: any) {
      errorBus.next(`Gagal menyimpan pesanan meja: ${err.message}`);
    }
  };

  const processTablePayment = async (tableLabel: string) => {
    try {
      const labelUpper = tableLabel.trim().toUpperCase();
      await ledger.appendEvent("TABLE_PAYMENT_PROCESSED", {
        id: `MEJA-ID-${labelUpper}`,
        tableLabel: labelUpper,
      });
      eventBus.next();
    } catch (err: any) {
      errorBus.next(`Gagal memproses pembayaran meja: ${err.message}`);
    }
  };

  const clearTableStatus = async (tableLabel: string) => {
    try {
      const labelUpper = tableLabel.trim().toUpperCase();
      await ledger.appendEvent("TABLE_CLEARED", {
        id: `MEJA-ID-${labelUpper}`,
        tableLabel: labelUpper,
        isVirtual: labelUpper.includes("-"),
      });
      eventBus.next();
    } catch (err: any) {
      errorBus.next(`Gagal mengosongkan meja: ${err.message}`);
    }
  };

  const voidTableOrder = async (
    tableLabel: string,
    sku: string,
    qtyToVoid: number,
    voidType: "SALAH_INPUT" | "BARANG_KOSONG" | "CANCEL",
    managerPin?: string,
    voidNote?: string,
  ) => {
    try {
      let manager_id = undefined;
      if (voidType === "CANCEL" && managerPin) {
        const manager =
          (state?.staffList || []).find(
            (s: any) =>
              s.pin === managerPin &&
              s.isActive !== false &&
              s.role === "ADMIN",
          ) ||
          (state?.isInitialized && managerPin === "112233"
            ? {
                id: "ADMIN-000",
                name: "ADMINISTRATOR",
                role: "ADMIN",
                pin: "112233",
                isActive: true,
              }
            : null);
        if (!manager) throw new Error("PIN Manager Salah atau Bukan Admin!");
        manager_id = manager.id;
      }
      await ledger.appendEvent("ORDER_VOIDED", {
        tableLabel,
        sku,
        qtyToVoid,
        voidType,
        operator_id: currentOperator?.id || "UNKNOWN",
        manager_id,
        voidNote,
        timestamp: Date.now(),
      });
      eventBus.next();
    } catch (err: any) {
      errorBus.next(`Gagal void pesanan: ${err.message}`);
      throw err;
    }
  };

  const refundTransaction = async (
    invoice_id: string,
    items: Array<{ sku: string; qty: number }>,
    refundType: "CANCEL" | "SOLD_OUT",
    managerPin: string,
    refundNote: string,
  ) => {
    try {
      const manager =
        (state?.staffList || []).find(
          (s: any) =>
            s.pin === managerPin && s.isActive !== false && s.role === "ADMIN",
        ) ||
        (state?.isInitialized && managerPin === "112233"
          ? {
              id: "ADMIN-000",
              name: "ADMINISTRATOR",
              role: "ADMIN",
              pin: "112233",
              isActive: true,
            }
          : null);
      if (!manager)
        throw new Error("PIN Otorisasi Refund Salah atau Bukan Admin!");
      await ledger.appendEvent("ORDER_REFUNDED", {
        invoice_id,
        items,
        refundType,
        operator_id: currentOperator?.id || "UNKNOWN",
        manager_id: manager.id,
        refundNote,
        timestamp: Date.now(),
      });
      eventBus.next();
    } catch (err: any) {
      errorBus.next(`Gagal memproses refund: ${err.message}`);
      throw err;
    }
  };

  const issuePettyCash = async (data: {
    name: string;
    division: string;
    notes: string;
    amount: number;
  }) => {
    try {
      const now = Date.now();
      await ledger.appendEvent("PETTY_CASH_ISSUED", {
        petty_cash_id: `PC-${now}`,
        requester_name: data.name.trim().toUpperCase(),
        requester_division: data.division.trim().toUpperCase(),
        notes: data.notes.trim(),
        amount_requested: data.amount,
        cashier_id: currentOperator?.id || "SYS",
        cashier_name: currentOperator?.name || "KASIR SYSTEM",
        timestamp: now,
      });
      eventBus.next();
    } catch (err: any) {
      errorBus.next(`Gagal mencatat kas keluar: ${err.message}`);
      throw err;
    }
  };

  const resolvePettyCash = async (
    id: string,
    amountReturned: number,
    hasReceipt: boolean,
  ) => {
    try {
      await ledger.appendEvent("PETTY_CASH_RESOLVED", {
        petty_cash_id: id,
        amount_returned: amountReturned,
        has_receipt: hasReceipt,
        cashier_id: currentOperator?.id || "SYS",
        cashier_name: currentOperator?.name || "KASIR SYSTEM",
        timestamp: Date.now(),
      });
      eventBus.next();
    } catch (err: any) {
      errorBus.next(`Gagal menyelesaikan kasbon kasir: ${err.message}`);
      throw err;
    }
  };

  return (
    <PosContext.Provider
      value={{
        state,
        isReady,
        isInitialized,
        currentOperator,
        isScreenLocked,
        viewState,
        setViewStateDirect,
        initializeSystem,
        registerStaff,
        editStaff,
        toggleStaffStatus,
        addMasterTable,
        deleteMasterTable,
        toggleMasterTableStatus,
        addMasterCategory,
        deleteMasterCategory,
        addMasterProduct,
        editMasterProduct,
        deleteMasterProduct,
        toggleProductStatus,
        validatePinOnly,
        openShiftWithModal,
        logoutWithReconciliation,
        executeSale,
        placeTableOrder,
        processTablePayment,
        clearTableStatus,
        voidTableOrder,
        refundTransaction,
        issuePettyCash,
        resolvePettyCash,
      }}
    >
      {children}
    </PosContext.Provider>
  );
};

export const usePos = () => {
  const ctx = useContext(PosContext);
  if (!ctx) throw new Error("usePos must be used within PosProvider");
  return ctx;
};
