import { ErrorBoundary } from "../../components/ErrorBoundary";
import React, { useState, useMemo, useEffect } from "react";
import { TableGrid } from "./TableGrid";
import { usePos } from "../../core/PosProvider";
import { useToast } from "../../components/Toast";
import { MenuKatalog } from "../../components/MenuKatalog";
import { KeranjangBelanja } from "../../components/KeranjangBelanja";
import { BillingModal } from "../../components/BillingModal";
import { SupervisorModal } from "../../components/SupervisorModal";
import { PrintDetailModal } from "../../components/PrintDetailModal";
import { SplitBillModal } from "../../components/SplitBillModal";
import { MoveOrderModal } from "../../components/MoveOrderModal";
import { ulid } from "ulidx";

interface PosModuleProps {
  viewMode: "TABLES" | "MENU";
  selectedTable: string | null;
  onSelectTable: (
    tableId: string,
    status: "KOSONG" | "TERISI" | "REQUEST_BAYAR" | "PAID" | "OPENED",
  ) => void;
  onBack: () => void;
}

interface CartItem {
  id: string;
  sku: string;
  name: string;
  price: number;
  qty: number;
  note: string;
  tableLabel: string;
  status: "CRUD" | "READ_ONLY" | "PENDING" | "COOKING" | "SERVED";
  isSaved?: boolean;
  voidedQty?: number;
  refundedQty?: number;
}

export const PosModule: React.FC<PosModuleProps> = ({
  viewMode,
  selectedTable,
  onSelectTable,
  onBack,
}) => {
  const {
    executeSale,
    state,
    currentOperator,
    placeTableOrder,
    processTablePayment,
    clearTableStatus,
    voidTableOrder,
    updateKdsItemStatus,
    updateOrderItems,
    executeSplitOrderV2,
    executeTransferToExistingTable,
    moveTableOrderV2,
  } = usePos();

  const { showToast } = useToast();

  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("SEMUA");
  const [activeTableStatus, setActiveTableStatus] = useState<
    "KOSONG" | "TERISI" | "REQUEST_BAYAR" | "PAID" | "OPENED"
  >("OPENED");

  const [cart, setCart] = useState<CartItem[]>([]);
  const [discountInput, setDiscountInput] = useState("");
  const [activeDiscount, setActiveDiscount] = useState(0);
  const [showManagerPinModal, setShowManagerPinModal] = useState(false);
  const [managerPin, setManagerPin] = useState("");

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentType, setPaymentType] = useState<
    "CASH" | "DEBIT" | "QRIS" | "PRIVE"
  >("CASH");
  const [cashReceived, setCashReceived] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [priveNote, setPriveNote] = useState("");

  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showSplitModal, setShowSplitModal] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);

  const dbCategories = state?.categories || [];
  const dbProducts = state?.products || [];
  const dbTables = state?.tables || [];

  const operatorObj = currentOperator!;
  const isWaiter =
    operatorObj.role === "WAITER" || operatorObj.role === "waiter";

  const taxSettings = state?.settings?.pajak || {
    ppn: 0,
    serviceCharge: 0,
    taxIncluded: false,
  };
  const taxRate = Number(taxSettings.ppn) / 100;
  const serviceRate = Number(taxSettings.serviceCharge) / 100;
  const isTaxIncluded = Boolean((taxSettings as any)?.taxIncluded);

  const targetTableObj = useMemo(
    () => dbTables.find((t: any) => t.label === selectedTable),
    [dbTables, selectedTable],
  );

  const categories = useMemo(
    () => ["SEMUA", ...dbCategories.map((c: any) => c.name)],
    [dbCategories],
  );

  useEffect(() => {
    if (viewMode === "MENU" && selectedTable) {
      const targetTable = dbTables.find((t: any) => t.label === selectedTable);
      if (
        targetTable &&
        targetTable.savedItems &&
        targetTable.savedItems.length > 0
      ) {
        const recoveredCart = targetTable.savedItems.map((item: any) => ({
          ...item,
          isSaved: true,
          status:
            item.status && item.status !== "CRUD" && item.status !== "READ_ONLY"
              ? item.status
              : "COOKING",
        }));
        setCart(recoveredCart);
      } else {
        setCart([]);
      }
    } else {
      setCart([]);
    }
  }, [viewMode, selectedTable, dbTables]);

  const productQuantities = useMemo(() => {
    const counts: Record<string, number> = {};
    cart.forEach((item) => {
      if (item.status === "CRUD") {
        counts[item.sku] = (counts[item.sku] || 0) + item.qty;
      }
    });
    return counts;
  }, [cart]);

  const filteredProducts = useMemo(() => {
    return dbProducts.filter((p: any) => {
      const parentCat = dbCategories.find((c: any) => c.id === p.categoryId);
      const categoryName = parentCat ? parentCat.name : "";
      if (activeCategory !== "SEMUA" && categoryName !== activeCategory)
        return false;
      if (
        searchQuery.trim() &&
        !p.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
        return false;
      return true;
    });
  }, [dbProducts, dbCategories, activeCategory, searchQuery]);

  const handleInterceptSelectTable = (
    tableId: string,
    status: "KOSONG" | "TERISI" | "REQUEST_BAYAR" | "PAID" | "OPENED",
  ) => {
    setActiveTableStatus(status);
    onSelectTable(tableId, status);
  };

  const handleAddToCartDirect = (p: any, requestedQty: number = 1) => {
    const namaTamuLokal =
      sessionStorage.getItem(`asstro_tamu_meja_${selectedTable}`) || "Tamu";

    const rawId = `ITM-${Date.now().toString(36)}-${Math.floor(Math.random() * 1000)}`;
    const safeItemId = rawId.substring(0, 26);

    setCart((prev) => [
      ...prev,
      {
        id: safeItemId,
        sku: p.sku,
        name: p.name,
        price: p.price,
        qty: requestedQty,
        note: "",
        tableLabel: namaTamuLokal,
        status: "CRUD",
        isSaved: false,
      },
    ]);
  };

  const handleProductCardIncrement = (sku: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const prod = dbProducts.find((p: any) => p.sku === sku);
    if (prod) handleAddToCartDirect(prod, 1);
  };

  const handleProductCardDecrement = (sku: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const targetItem = [...cart]
      .reverse()
      .find((item) => item.sku === sku && item.status === "CRUD");
    if (targetItem) {
      setCart(
        (prev) =>
          prev
            .map((item) =>
              item.id === targetItem.id
                ? item.qty - 1 > 0
                  ? { ...item, qty: item.qty - 1 }
                  : null
                : item,
            )
            .filter(Boolean) as CartItem[],
      );
    }
  };

  const handleUpdateRowQty = (rowId: string, delta: number) => {
    setCart((prev) =>
      prev.map((item) =>
        item.id === rowId && item.status === "CRUD"
          ? { ...item, qty: Math.max(1, item.qty + delta) }
          : item,
      ),
    );
  };

  const handleUpdateRowNote = (rowId: string, text: string) => {
    setCart((prev) =>
      prev.map((item) =>
        item.id === rowId && item.status === "CRUD"
          ? { ...item, note: text }
          : item,
      ),
    );
  };

  const cartSubtotal = cart.reduce(
    (acc, curr) => acc + curr.price * curr.qty,
    0,
  );
  const discountAmount = (cartSubtotal * activeDiscount) / 100;
  const afterDiscount = cartSubtotal - discountAmount;
  const serviceCharge = afterDiscount * serviceRate;
  const dasarPengenaanPajak = afterDiscount + serviceCharge;
  const restaurantTax = isTaxIncluded
    ? dasarPengenaanPajak - dasarPengenaanPajak / (1 + taxRate)
    : dasarPengenaanPajak * taxRate;
  const cartGrandTotal = isTaxIncluded
    ? dasarPengenaanPajak
    : dasarPengenaanPajak + restaurantTax;

  const handleApplyDiscountInput = (val: string) => {
    const cleaned = Number(val.replace(/\D/g, "")) || 0;
    setDiscountInput(val);
    if (cleaned <= 10) {
      setActiveDiscount(cleaned);
      setShowManagerPinModal(false);
    } else {
      setShowManagerPinModal(true);
      setManagerPin("");
    }
  };

  const handleVerifyManagerPin = (e: React.FormEvent) => {
    e.preventDefault();
    const staffList: any[] = state?.staffList || [];

    const staffAuthorized = staffList.some(
      (staff) =>
        (staff.role?.toUpperCase() === "MANAGER" ||
          staff.role?.toUpperCase() === "SUPERADMIN") &&
        staff.isActive !== false &&
        staff.pin === managerPin,
    );

    const operatorRole = currentOperator?.role?.toUpperCase();
    const operatorAuthorized =
      managerPin === currentOperator?.pin &&
      (operatorRole === "MANAGER" || operatorRole === "SUPERADMIN");

    if (staffAuthorized || operatorAuthorized) {
      setActiveDiscount(Number(discountInput) || 0);
      setShowManagerPinModal(false);
    } else {
      showToast("PIN MANAJER SALAH! DISKON DITOLAK.", "ERROR");
      setManagerPin("");
    }
  };

  const handleMainActionButtonClick = () => {
    setShowPaymentModal(true);
  };

  const handleExecuteReprintWithWatermark = (isWatermarked: boolean) => {
    const stamp = isWatermarked
      ? "\n[*** REPRINT / DUPLIKAT NOTA AUDIT ***]"
      : "\n[SLIP REPRINT ASLI KASIR]";
    showToast(
      `LOG PRINTER KDS:${stamp}\nMeja: ${selectedTable}\nNilai Tagihan: Rp ${targetTableObj?.currentBill?.toLocaleString()}\nPrinted By ID Operator: ${operatorObj.name}`,
      "INFO",
    );
    setShowPrintModal(false);
  };

  const handlePrintKitchenOnly = async () => {
    const newItems = cart.filter((i) => i.status === "CRUD");
    if (newItems.length === 0) {
      setShowPrintModal(true);
      return;
    }

    showToast(
      `MENCETAK ORDERAN TAMBAHAN KE DAPUR MEJA ${selectedTable}:\n` +
        newItems.map((i) => `- ${i.name} (x${i.qty})`).join("\n"),
      "INFO",
    );

    if (selectedTable) {
      const isExistingOrder = targetTableObj && targetTableObj.activeOrderId;

      // [+] Ambil nama customer yang sedang aktif dari session storage meja ini
      const customerNameLocal =
        sessionStorage.getItem(`asstro_tamu_meja_${selectedTable}`) || null;

      const updatedItems = cart.map((item) => ({
        ...item,
        status:
          item.status === "CRUD" || item.status === "READ_ONLY"
            ? "COOKING"
            : item.status,
        isSaved: true,
      }));

      if (isExistingOrder) {
        // Jika menambahkan menu baru ke meja yang sudah ada order-nya
        await updateOrderItems(
          targetTableObj.activeOrderId,
          selectedTable,
          updatedItems,
          customerNameLocal,
        );
      } else {
        // Jika pesanan pertama kali dibentuk pada meja kosong
        await placeTableOrder(
          selectedTable,
          cartGrandTotal,
          updatedItems,
          false,
          undefined,
          customerNameLocal,
        );
      }
    }
    setCart([]);
    showToast("Pesanan sukses dikunci & dikirim ke dapur!", "SUCCESS");
    onBack();
  };

  const handleFinalSplitSubmit = async (
    virtualTables: Array<any>,
    remainingSourceItems?: any[],
    sourceOrderId?: string | null,
    splitMode?: "NEW_VIRTUAL" | "EXISTING_TABLE",
  ) => {
    if (!selectedTable) return;
    const finalSourceOrderId =
      sourceOrderId ||
      sessionStorage.getItem(`asstro_order_id_${selectedTable}`);
    if (!finalSourceOrderId) return;

    try {
      const cleanRemainingItems = (remainingSourceItems || []).map((i) => ({
        ...i,
        status:
          i.status === "CRUD" || i.status === "READ_ONLY"
            ? "COOKING"
            : i.status,
      }));

      if (splitMode === "EXISTING_TABLE") {
        const targetConfig = virtualTables[0];
        await executeTransferToExistingTable(
          finalSourceOrderId,
          selectedTable,
          cleanRemainingItems,
          targetConfig.existingOrderId || null,
          targetConfig.label,
          targetConfig.customerName || null,
          targetConfig.items.map((i: any) => ({
            ...i,
            status:
              i.status === "CRUD" || i.status === "READ_ONLY"
                ? "COOKING"
                : i.status,
          })),
        );
      } else {
        const splitPayload = virtualTables.map((vt) => ({
          label: vt.label,
          customerName: vt.customerName || vt.label.split("-")[1] || "TAMU",
          items: vt.items.map((i: any) => ({
            ...i,
            status:
              i.status === "CRUD" || i.status === "READ_ONLY"
                ? "COOKING"
                : i.status,
          })),
        }));
        await executeSplitOrderV2(
          finalSourceOrderId,
          selectedTable,
          cleanRemainingItems,
          splitPayload,
        );
      }

      if (cleanRemainingItems.length === 0) {
        sessionStorage.removeItem(`asstro_tamu_meja_${selectedTable}`);
        sessionStorage.removeItem(`asstro_order_id_${selectedTable}`);
      }
      setShowSplitModal(false);
      setCart([]);
      onBack();
    } catch (err: any) {
      showToast(`Gagal memproses: ${err.message}`, "ERROR");
    }
  };

  const handleFinalMoveSubmit = async (
    targetTableLabel: string,
    itemsToMove: any[],
    sourceOrderId?: string | null,
    targetCustomerName?: string, // [FIX] Terima nama tamu dari modal MoveOrder
  ) => {
    if (!selectedTable) return;
    const finalSourceOrderId =
      sourceOrderId ||
      targetTableObj?.activeOrderId ||
      sessionStorage.getItem(`asstro_order_id_${selectedTable}`);

    if (!finalSourceOrderId) return;

    // [FIX] Gunakan nama target dari modal. Jika kosong (tidak mungkin karena ada fallback), gunakan "TAMU"
    const finalCustomerName = targetCustomerName || "TAMU";

    // Eksekusi Update Tabel ke Backend (Event Sourcing)
    await moveTableOrderV2(
      selectedTable,
      targetTableLabel,
      finalSourceOrderId,
      itemsToMove,
      finalCustomerName,
    );

    // [FIX] Swap Session Storage SECARA AMAN di sini.
    // Hapus sesi meja lama
    sessionStorage.removeItem(`asstro_tamu_meja_${selectedTable}`);
    sessionStorage.removeItem(`asstro_order_id_${selectedTable}`);
    sessionStorage.removeItem(`asstro_jam_order_${selectedTable}`);

    // Tetapkan sesi meja baru dengan nama yang benar (Bukan NULL)
    sessionStorage.setItem(
      `asstro_tamu_meja_${targetTableLabel}`,
      finalCustomerName,
    );
    sessionStorage.setItem(
      `asstro_order_id_${targetTableLabel}`,
      finalSourceOrderId,
    );

    setShowMoveModal(false);
    setCart([]);
    onBack();
  };

  const handleFinalCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const formData = new FormData(e.currentTarget as HTMLFormElement);
      const actualPaymentMethod =
        (formData.get("actualPaymentMethod") as string) || paymentType;
      const paymentProvider = (formData.get("paymentProvider") as string) || "";
      const captureMode = (formData.get("captureMode") as string) || "MANUAL";
      const approvalCode = (formData.get("approvalCode") as string) || "";
      const traceNumber = (formData.get("traceNumber") as string) || "";

      const preInvoiceId = (formData.get("preInvoiceId") as string) || "";
      const now = Date.now();
      const invoiceNumber = preInvoiceId || `INV-${now}`;
      const transactionId = preInvoiceId
        ? `TRX-${preInvoiceId}`
        : `TRX-${ulid()}`;
      const businessDate = new Date(now).toISOString().split("T")[0];
      const isTakeAway = selectedTable?.startsWith("TA-");
      const transactionType = isTakeAway ? "TAKEAWAY" : "DINE_IN";
      const customerNameLocal =
        sessionStorage.getItem(`asstro_tamu_meja_${selectedTable}`) ||
        (isTakeAway ? "Takeaway Guest" : "Walk-in Guest");

      const deviceToken =
        localStorage.getItem("ASSTRO_DEVICE_TOKEN") || "DEV-UNKNOWN";

      const hasExistingOrder = cart.some(
        (item) => item.status === "READ_ONLY" || item.isSaved,
      );

      const fallbackOrderId = sessionStorage.getItem(
        `asstro_order_id_${selectedTable}`,
      );
      const existingOrderId =
        targetTableObj?.currentOrderId ||
        targetTableObj?.lastOrderId ||
        fallbackOrderId ||
        null;

      // PEMBULATAN MATEMATIS AKURAT: Mencegah error payload desimal sebelum masuk payload
      const safeSubtotal = Math.round(cartSubtotal);
      const safeDiscount = Math.round(discountAmount);
      const safeTax = Math.round(restaurantTax);
      const safeService = Math.round(serviceCharge);
      const safeGrandTotal = Math.round(cartGrandTotal);

      const safeAmountPaid =
        actualPaymentMethod === "CASH"
          ? Math.round(Number(cashReceived)) || safeGrandTotal
          : safeGrandTotal;
      const safeChangeAmount =
        actualPaymentMethod === "CASH" ? Math.round(calculatedChange) : 0;

      const enterprisePayload = {
        identity: {
          transaction_id: transactionId,
          invoice_number: invoiceNumber,
          order_number: `ORD-${Math.floor(Math.random() * 10000)}`,
          transaction_type: transactionType,
          transaction_status: "PAID",
          business_date: businessDate,
          created_at: now,
          paid_at: now,
          closed_at: now,
          skip_order_layer: hasExistingOrder,
          existing_order_id: existingOrderId,
        },
        organization: {
          company_name:
            state?.companyName ||
            state?.settings?.sistem?.namaToko ||
            "ASSTRO HOLDING",
          branchId:
            state?.branchId ||
            state?.settings?.sistem?.cabangId ||
            "UNKNOWN_BRANCH",
        },
        table_info: {
          table_id: selectedTable ? `TBL-${selectedTable}` : "N/A",
          table_name: selectedTable || "TA",
        },
        customer: {
          customer_name: customerNameLocal,
        },
        items: cart.map((item) => {
          const prod = dbProducts.find((p: any) => p.sku === item.sku);
          const cat = dbCategories.find((c: any) => c.id === prod?.categoryId);
          const lineSubtotal = item.price * item.qty;
          const itemTax = lineSubtotal * taxRate;
          const itemService = lineSubtotal * serviceRate;

          const safeItemId = item.id
            ? item.id.substring(0, 26)
            : `ITM-${now.toString(36)}`;

          return {
            id: safeItemId,
            product_id: prod?.id || `PRD-${item.sku}`,
            sku: item.sku,
            product_name: item.name,
            category_id: cat?.id || "CAT-UNKNOWN",
            category_name: cat?.name || "UNCATEGORIZED",
            qty: item.qty,
            selling_price: item.price,
            discount_amount: 0,
            // Bulatkan pajak per baris produk juga
            tax_amount: Math.round(itemTax),
            service_amount: Math.round(itemService),
            line_total: Math.round(lineSubtotal + itemTax + itemService),
          };
        }),
        payment: {
          payment_id: `PAY-${now}`,
          payment_method: actualPaymentMethod,
          // PENYELAMAT ENUM: Jika "Local" atau string kosong, ubah jadi null
          payment_provider:
            paymentProvider && paymentProvider !== "Local"
              ? paymentProvider
              : null,
          payment_reference:
            actualPaymentMethod === "CARD"
              ? approvalCode || "MANUAL-EDC"
              : cardNumber || "CASH-TRX",
          amount_paid: safeAmountPaid,
          change_amount: safeChangeAmount,
          payment_time: now,
          capture_mode: captureMode,
          edc_metadata: {
            approval_code: approvalCode || null,
            trace_number: traceNumber || null,
          },
        },
        staff: {
          waiter_id: isWaiter ? operatorObj.id : "NONE",
          waiter_name: isWaiter ? operatorObj.name : "Self-Order / Cashier",
          cashier_id: operatorObj.id,
          cashier_name: operatorObj.name,
          supervisor_id: managerPin ? "SPV-AUTH" : undefined,
          shift_id: `SHIFT-${businessDate}`,
        },
        device: {
          device_id: deviceToken,
          local_event_id: `EVT-${now}`,
        },
        summary: {
          subtotal: safeSubtotal,
          total_discount: safeDiscount,
          total_tax: safeTax,
          total_service: safeService,
          grand_total: safeGrandTotal,
        },
      };

      await executeSale(enterprisePayload);

      if (selectedTable) {
        await processTablePayment(selectedTable);
        await clearTableStatus(selectedTable);

        sessionStorage.removeItem(`asstro_tamu_meja_${selectedTable}`);
        sessionStorage.removeItem(`asstro_order_id_${selectedTable}`);
        sessionStorage.removeItem(`asstro_jam_order_${selectedTable}`);
      }

      setCart([]);
      setDiscountInput("");
      setActiveDiscount(0);
      setShowPaymentModal(false);
      showToast(
        `TRANSAKSI MEJA ${selectedTable} LUNAS & TEREKAM KE LEDGER ENTERPRISE!`,
        "SUCCESS",
      );
      onBack();
    } catch (err) {
      showToast(
        "Gagal mengunci penjualan berskala enterprise ke ledger.",
        "ERROR",
      );
    }
  };

  const calculatedChange = useMemo(() => {
    const received = Number(cashReceived) || 0;
    return received >= cartGrandTotal ? received - cartGrandTotal : 0;
  }, [cashReceived, cartGrandTotal]);

  if (viewMode === "TABLES") {
    return <TableGrid onSelectTable={handleInterceptSelectTable} />;
  }

  return (
    <div className="w-full h-full flex flex-row overflow-hidden bg-[#F8FAFC]">
      <div className="w-[75%] flex flex-row overflow-hidden shrink-0">
        <MenuKatalog
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          categories={categories}
          activeCategory={activeCategory}
          setActiveCategory={setActiveCategory}
          filteredProducts={filteredProducts}
          dbCategories={dbCategories}
          productQuantities={productQuantities}
          selectedTable={selectedTable}
          onBack={onBack}
          handleAddToCartDirect={handleAddToCartDirect as any}
          handleProductCardIncrement={handleProductCardIncrement}
          handleProductCardDecrement={handleProductCardDecrement}
        />
      </div>
      <div className="w-[25%] h-full flex flex-col overflow-hidden shrink-0">
        <KeranjangBelanja
          cart={cart}
          setCart={setCart}
          selectedTable={selectedTable}
          activeTableStatus={activeTableStatus}
          discountInput={discountInput}
          handleApplyDiscountInput={handleApplyDiscountInput}
          handleUpdateRowQty={handleUpdateRowQty}
          handleUpdateRowNote={handleUpdateRowNote}
          cartSubtotal={cartSubtotal}
          discountAmount={discountAmount}
          serviceCharge={serviceCharge}
          restaurantTax={restaurantTax}
          cartGrandTotal={cartGrandTotal}
          isWaiter={isWaiter}
          handleMainActionButtonClick={handleMainActionButtonClick}
          handlePrintKitchenOnly={handlePrintKitchenOnly}
          handleSplitBillAction={() => setShowSplitModal(true)}
          handleMoveOrderAction={() => setShowMoveModal(true)}
          onExecuteVoidLedger={async (
            sku,
            qtyToVoid,
            voidType,
            managerPin,
            voidNote,
          ) => {
            if (!selectedTable) return;
            await voidTableOrder(
              selectedTable,
              sku,
              qtyToVoid,
              voidType as any,
              managerPin,
              voidNote,
            );
          }}
          onKdsToggle={async (sku, currentStatus) => {
            if (!selectedTable) return;

            // Tentukan status target
            const nextStatus =
              currentStatus === "PENDING" ? "COOKING" : "SERVED";
            setCart((prev) =>
              prev.map((item) => {
                const itemSku = (item as any).skuSnapshot || item.sku;
                if (itemSku === sku) {
                  return { ...item, status: nextStatus };
                }
                return item;
              }),
            );

            const currentTable = state?.tables?.find(
              (t: any) => t.label === selectedTable,
            );

            if (currentTable && currentTable.activeOrderId) {
              // Biarkan aksi database berjalan Asinkron di Latar Belakang
              await updateKdsItemStatus(
                selectedTable,
                currentTable.activeOrderId,
                sku,
                nextStatus,
              );
            }
          }}
        />
      </div>
      {showPaymentModal && (
        <ErrorBoundary fallback={<div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center backdrop-blur-sm p-4"><div className="bg-white p-6 rounded-3xl">State tidak siap, harap refresh.</div></div>}>
          <BillingModal
            selectedTable={selectedTable}
            cart={cart}
            cartSubtotal={cartSubtotal}
            discountAmount={discountAmount}
            serviceCharge={serviceCharge || 0}
            restaurantTax={restaurantTax || 0}
            cartGrandTotal={cartGrandTotal}
            paymentType={paymentType as any}
            setPaymentType={setPaymentType as any}
            cashReceived={cashReceived}
            setCashReceived={setCashReceived}
            calculatedChange={calculatedChange}
            cardNumber={cardNumber}
            setCardNumber={setCardNumber}
            priveNote={priveNote}
            setPriveNote={setPriveNote}
            setShowPaymentModal={setShowPaymentModal}
            handleFinalCheckoutSubmit={handleFinalCheckoutSubmit}
            activeOrderId={targetTableObj?.currentOrderId || targetTableObj?.lastOrderId || fallbackOrderId}
          />
        </ErrorBoundary>
      )}
      {showManagerPinModal && (
        <SupervisorModal
          managerPin={managerPin}
          setManagerPin={setManagerPin}
          handleVerifyManagerPin={handleVerifyManagerPin}
          setShowManagerPinModal={setShowManagerPinModal}
          setDiscountInput={setDiscountInput}
          setActiveDiscount={setActiveDiscount}
        />
      )}
      <PrintDetailModal
        isOpen={showPrintModal}
        onClose={() => setShowPrintModal(false)}
        tableLabel={selectedTable}
        cart={cart}
        operatorName={operatorObj.name}
        onExecuteReprint={handleExecuteReprintWithWatermark}
      />
      <SplitBillModal
        isOpen={showSplitModal}
        onClose={() => setShowSplitModal(false)}
        cart={cart}
        tableLabel={selectedTable}
        operatorName={operatorObj.name}
        activeOrderId={targetTableObj?.activeOrderId || null}
        dbTables={dbTables}
        onConfirmSplit={handleFinalSplitSubmit}
      />
      <MoveOrderModal
        isOpen={showMoveModal}
        onClose={() => setShowMoveModal(false)}
        cart={cart}
        dbTables={dbTables}
        tableLabel={selectedTable}
        operatorName={operatorObj.name}
        onConfirmMove={handleFinalMoveSubmit}
      />
    </div>
  );
};
