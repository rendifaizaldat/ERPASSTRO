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
  status: "CRUD" | "READ_ONLY";
  isSaved?: boolean;
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
    placeTableOrder,
    processTablePayment,
    clearTableStatus,
    voidTableOrder,
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
  const operatorObj = state?.activeOperator || {
    id: "OP-000",
    name: "KASIR RUKO",
    role: "CASHIER",
    pin: "000000",
  };
  const isWaiter = operatorObj.role === "WAITER";

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
          status: "READ_ONLY" as const,
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

    setCart((prev) => [
      ...prev,
      {
        id: `ORDER-LINE-${p.sku}-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
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
  const serviceCharge = afterDiscount * 0.05;
  const restaurantTax = afterDiscount * 0.15;
  const cartGrandTotal = afterDiscount + serviceCharge + restaurantTax;

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
    if (managerPin === "0000") {
      setActiveDiscount(Number(discountInput) || 0);
      setShowManagerPinModal(false);
    } else {
      showToast("PIN MANAJER SALAH! DISKON DITOLAK.", "ERROR");
      setManagerPin("");
    }
  };

  // ============================================================
  // PERBAIKAN UTAMA: Fungsi tombol Bayar hanya membuka billing
  // ============================================================
  const handleMainActionButtonClick = () => {
    // Tombol Bayar akan aktif hanya jika ada savedItems (dari KeranjangBelanja)
    // Maka langsung buka modal pembayaran untuk semua mode: Dine‑In, Take Away, Split Bill
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

  // Tombol ORDER / PESAN: mengirim pesanan baru ke dapur dan mengunci item
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
      const updatedItems = cart.map((item) => ({
        ...item,
        status: "READ_ONLY" as const,
        isSaved: true,
      }));
      await placeTableOrder(selectedTable, cartGrandTotal, updatedItems);
    }
    setCart([]);
    showToast("Pesanan tambahan sukses dikunci ke dapur!", "SUCCESS");
    onBack();
  };

  const handleFinalSplitSubmit = async (
    virtualTables: Array<{
      label: string;
      items: any[];
      currentBill: number;
      isVirtual: boolean;
      parentTableId: string;
    }>,
  ) => {
    for (const vt of virtualTables) {
      const preparedVtItems = vt.items.map((i) => ({
        ...i,
        status: "READ_ONLY" as const,
        isSaved: true,
      }));
      await placeTableOrder(
        vt.label,
        vt.currentBill,
        preparedVtItems,
        vt.isVirtual,
        vt.parentTableId,
      );
    }

    if (selectedTable) {
      const movedItemIds = new Set(
        virtualTables.flatMap((vt) => vt.items.map((item) => item.id)),
      );
      const remainingItems = cart.filter((item) => !movedItemIds.has(item.id));
      const remainingSubtotal = remainingItems.reduce(
        (acc, c) => acc + c.price * c.qty,
        0,
      );

      if (remainingSubtotal === 0) {
        await clearTableStatus(selectedTable);
      } else {
        const service = remainingSubtotal * 0.05;
        const tax = remainingSubtotal * 0.15;
        const remainingGrandTotal = remainingSubtotal + service + tax;

        await placeTableOrder(
          selectedTable,
          remainingGrandTotal,
          remainingItems,
          false,
        );
      }
    }
    setCart([]);
    onBack();
  };

  const handleFinalMoveSubmit = async (
    targetTableLabel: string,
    itemsToMove: any[],
  ) => {
    const moveValue = itemsToMove.reduce((acc, c) => acc + c.price * c.qty, 0);
    await placeTableOrder(targetTableLabel, moveValue, itemsToMove);
    if (selectedTable) {
      await clearTableStatus(selectedTable);
    }
    setCart([]);
    onBack();
  };

  const handleFinalCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const now = Date.now();
      const invoiceNumber = `INV-${now}`;
      const businessDate = new Date(now).toISOString().split("T")[0];
      const isTakeAway = selectedTable?.startsWith("TA-");
      const transactionType = isTakeAway ? "TAKEAWAY" : "DINE_IN";
      const customerNameLocal =
        sessionStorage.getItem(`asstro_tamu_meja_${selectedTable}`) ||
        (isTakeAway ? "Takeaway Guest" : "Walk-in Guest");

      const enterprisePayload = {
        identity: {
          transaction_id: crypto.randomUUID
            ? crypto.randomUUID()
            : `UUID-${now}`,
          invoice_number: invoiceNumber,
          order_number: `ORD-${Math.floor(Math.random() * 10000)}`,
          transaction_type: transactionType,
          transaction_status: "PAID",
          business_date: businessDate,
          created_at: now,
          paid_at: now,
          closed_at: now,
        },
        organization: {
          company_id: "CMP-001",
          company_name: state?.companyName || "ASSTRO HOLDING",
          branch_id: state?.branchId || "BR-001",
          branch_name: "Cabang Utama",
          outlet_type: "Restoran",
          region: "West Java",
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
          const itemTax = lineSubtotal * 0.15;
          const itemService = lineSubtotal * 0.05;

          return {
            product_id: prod?.id || `PRD-${item.sku}`,
            sku: item.sku,
            product_name: item.name,
            category_id: cat?.id || "CAT-UNKNOWN",
            category_name: cat?.name || "UNCATEGORIZED",
            qty: item.qty,
            selling_price: item.price,
            discount_amount: 0,
            tax_amount: itemTax,
            service_amount: itemService,
            line_total: lineSubtotal + itemTax + itemService,
          };
        }),
        payment: {
          payment_id: `PAY-${now}`,
          payment_method: paymentType,
          payment_provider: paymentType === "QRIS" ? "Midtrans" : "Local",
          payment_reference: cardNumber || "CASH-TRX",
          amount_paid: Number(cashReceived) || cartGrandTotal,
          change_amount: calculatedChange,
          payment_time: now,
        },
        staff: {
          waiter_id: "WTR-01",
          waiter_name: "Self-Order / Cashier",
          cashier_id: operatorObj.id,
          cashier_name: operatorObj.name,
          supervisor_id: managerPin ? "SPV-AUTH" : undefined,
          shift_id: `SHIFT-${businessDate}`,
        },
        device: {
          device_id: "DEV-MAIN-POS",
          device_name: "Kasir Utama 1",
          app_version: "v3.0.0",
          sync_version: "1.0",
          local_event_id: `EVT-${now}`,
        },
        summary: {
          subtotal: cartSubtotal,
          total_discount: discountAmount,
          total_tax: restaurantTax,
          total_service: serviceCharge,
          grand_total: cartGrandTotal,
        },
      };

      await executeSale(enterprisePayload);

      if (selectedTable && !isTakeAway) {
        await processTablePayment(selectedTable);
        await clearTableStatus(selectedTable);
        sessionStorage.removeItem(`asstro_tamu_meja_${selectedTable}`);
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
        />
      </div>

      {showPaymentModal && (
        <BillingModal
          selectedTable={selectedTable}
          cart={cart}
          cartSubtotal={cartSubtotal}
          discountAmount={discountAmount}
          serviceCharge={serviceCharge}
          restaurantTax={restaurantTax}
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
        />
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
        selectedTable={selectedTable}
        onSubmit={handleFinalSplitSubmit}
      />

      <MoveOrderModal
        isOpen={showMoveModal}
        onClose={() => setShowMoveModal(false)}
        cart={cart}
        tables={dbTables}
        selectedTable={selectedTable}
        onSubmit={handleFinalMoveSubmit}
      />
    </div>
  );
};
