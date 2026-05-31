import React, { useMemo, useState } from "react";
import {
  ShoppingCart,
  Trash2,
  Minus,
  Plus,
  Tag,
  Printer,
  Sliders,
  Move,
  Lock,
  XCircle,
  Pencil,
  ChefHat,
} from "lucide-react";

import { VoidOrderModal } from "./VoidOrderModal";

interface KeranjangBelanjaProps {
  cart: any[];
  setCart: React.Dispatch<React.SetStateAction<any[]>>;
  selectedTable: string | null;
  activeTableStatus: string;
  discountInput: string;
  handleApplyDiscountInput: (val: string) => void;
  handleUpdateRowQty: (rowId: string, delta: number) => void;
  handleUpdateRowNote: (rowId: string, text: string) => void;
  cartSubtotal: number;
  discountAmount: number;
  serviceCharge: number;
  restaurantTax: number;
  cartGrandTotal: number;
  isWaiter: boolean;
  handleMainActionButtonClick: () => void;
  handlePrintKitchenOnly: () => void;
  handleSplitBillAction: () => void;
  handleMoveOrderAction: () => void;

  onExecuteVoidLedger?: (
    sku: string,
    qty: number,
    type: "SALAH_INPUT" | "BARANG_KOSONG" | "CANCEL",
    pin?: string,
    voidNote?: string,
  ) => Promise<void>;
}

export const KeranjangBelanja: React.FC<KeranjangBelanjaProps> = ({
  cart,
  setCart,
  selectedTable,
  discountInput,
  handleApplyDiscountInput,
  handleUpdateRowQty,
  handleUpdateRowNote,
  cartSubtotal,
  discountAmount,
  serviceCharge,
  restaurantTax,
  cartGrandTotal,
  isWaiter,
  handleMainActionButtonClick,
  handlePrintKitchenOnly,
  handleSplitBillAction,
  handleMoveOrderAction,
  onExecuteVoidLedger,
}) => {
  const [showVoidModal, setShowVoidModal] = useState(false);
  const [openNotes, setOpenNotes] = useState<Record<string, boolean>>({});

  const toggleNote = (id: string) => {
    setOpenNotes((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const hasSavedItems = cart.some(
    (item) => item.status === "READ_ONLY" || item.isSaved === true
  );

  const hasNewItems = cart.some(
    (item) => item.status !== "READ_ONLY" && item.isSaved !== true
  );

  const currentCustomerName = useMemo(() => {
    if (!selectedTable) return "";
    return sessionStorage.getItem(`asstro_tamu_meja_${selectedTable}`) || "";
  }, [selectedTable, cart]);

  const injectStaticOrderTime = () => {
    if (!selectedTable) return;

    const existingTime = sessionStorage.getItem(
      `asstro_jam_order_${selectedTable}`
    );
    if (!existingTime) {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, "0");
      const minutes = String(now.getMinutes()).padStart(2, "0");
      const formattedTime = `${hours}:${minutes} WIB`;
      sessionStorage.setItem(
        `asstro_jam_order_${selectedTable}`,
        formattedTime
      );
    }
  };

  const handleOrderActionWrapper = () => {
    injectStaticOrderTime();
    handlePrintKitchenOnly();
  };

  return (
    <div className="w-full h-full bg-white border-l border-slate-200 flex flex-col overflow-hidden shrink-0 select-none shadow-sm text-sm">
      {/* HEADER KERANJANG */}
      <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between text-slate-900 shrink-0">
        <div className="flex items-center gap-2 overflow-hidden mr-2">
          <ShoppingCart size={16} className="text-slate-900 shrink-0" />
          <h3 className="font-black text-xs uppercase tracking-wider truncate">
            {selectedTable
              ? `MEJA ${selectedTable} - ${currentCustomerName || "TAMU"}`
              : "TAKE AWAY"}
          </h3>
        </div>
        <span className="bg-slate-900 text-white text-[10px] font-black px-2.5 py-1 rounded-md shrink-0 uppercase tracking-wider">
          {cart.length} Item
        </span>
      </div>

      {/* DAFTAR ITEM PESANAN */}
      <div className="flex-1 p-3 overflow-y-auto space-y-2 bg-[#F8FAFC]">
        {cart.length === 0 ? (
          <div className="h-full w-full flex flex-col items-center justify-center text-slate-300 italic font-black text-xs uppercase tracking-widest text-center">
            Belum Ada Menu Baru
          </div>
        ) : (
          cart.map((item) => {
            const isReadOnly =
              item.status === "READ_ONLY" || item.isSaved === true;
            const showNoteInput = openNotes[item.id] || false;

            return (
              <div
                key={item.id}
                className={`relative p-2.5 border rounded-xl flex flex-col gap-1 transition-all shadow-sm ${
                  isReadOnly
                    ? "bg-slate-100/80 border-slate-200/60"
                    : "bg-white border-slate-200"
                }`}
              >
                {/* BADGE CHEF HAT untuk item readonly (melayang di pojok kiri atas) */}
                {isReadOnly && (
                  <div className="absolute -top-2 -left-2 z-10 bg-white rounded-full p-1 shadow-md border border-slate-200">
                    <ChefHat size={14} className="text-emerald-600" />
                  </div>
                )}

                {/* BARIS UTAMA: berbeda antara readonly dan non-readonly */}
                {isReadOnly ? (
                  /* READONLY: nama | ×qty | harga (tanpa pemisah |) */
                  <div className="flex justify-between items-center w-full gap-2">
    <div className="flex items-center gap-1.5 min-w-0">
      <span className="font-black text-xs text-slate-900 uppercase tracking-tight truncate">
        {item.name}
      </span>
      <span className="font-black text-[11px] text-slate-500 shrink-0">
        ×{item.qty}
      </span>
    </div>
    <span className="text-xs font-black text-slate-900 shrink-0 text-right">
      Rp {(item.price * item.qty).toLocaleString("id-ID")}
    </span>
  </div>
                    {/* Tidak ada tombol delete/pensil */}
                  </div>
                ) : (
                  /* NON-READONLY: nama | harga, lalu kontrol qty, delete, pensil */
                  <div className="flex justify-between items-center gap-2">
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      <span className="font-black text-xs text-slate-900 uppercase tracking-tight truncate">
                        {item.name}
                      </span>
                      <span className="text-xs font-black text-slate-400 shrink-0">|</span>
                      <span className="text-xs font-black text-slate-900 shrink-0">
                        Rp {(item.price * item.qty).toLocaleString("id-ID")}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {/* Kontrol Qty */}
                      <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg overflow-hidden">
                        <button
                          type="button"
                          onClick={() => handleUpdateRowQty(item.id, -1)}
                          className="p-1 hover:bg-slate-200 text-slate-600 cursor-pointer"
                        >
                          <Minus size={9} />
                        </button>
                        <span className="px-1.5 font-black text-[11px] min-w-4 text-center text-slate-900">
                          {item.qty}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleUpdateRowQty(item.id, 1)}
                          className="p-1 hover:bg-slate-200 text-slate-600 cursor-pointer"
                        >
                          <Plus size={9} />
                        </button>
                      </div>

                      {/* Tombol Delete */}
                      <button
                        type="button"
                        onClick={() =>
                          setCart((prev) => prev.filter((i) => i.id !== item.id))
                        }
                        className="text-slate-400 hover:text-red-500 transition-colors p-0.5 cursor-pointer"
                      >
                        <Trash2 size={13} />
                      </button>

                      {/* Tombol Pensil untuk toggle catatan */}
                      <button
                        type="button"
                        onClick={() => toggleNote(item.id)}
                        className={`p-1 rounded-md transition-all ${
                          showNoteInput
                            ? "bg-slate-200 text-slate-900"
                            : "text-slate-400 hover:text-slate-600"
                        }`}
                      >
                        <Pencil size={12} />
                      </button>
                    </div>
                  </div>
                )}

                {/* AREA CATATAN DI BAWAH ITEM (dinamis) */}
                {isReadOnly && item.note && (
                  <div className="mt-1 pt-1 border-t border-slate-100">
                    <p className="text-[11px] font-medium text-slate-500 italic break-words leading-tight">
                      NB: {item.note}
                    </p>
                  </div>
                )}

                {!isReadOnly && (
                  <>
                    {/* Cuplikan note jika catatan belum terbuka dan ada note */}
                    {!showNoteInput && item.note && (
                      <div className="mt-1">
                        <span className="text-[10px] text-slate-400 italic truncate block">
                          {item.note.length > 40 ? item.note.slice(0, 40) + "…" : item.note}
                        </span>
                      </div>
                    )}

                    {/* Textarea catatan yang muncul saat pensil diklik */}
                    {showNoteInput && (
                      <div className="mt-2 pt-1">
                        <textarea
                          value={item.note || ""}
                          onChange={(e) => handleUpdateRowNote(item.id, e.target.value)}
                          placeholder="Isi catatan untuk dapur..."
                          rows={2}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-medium text-slate-700 focus:outline-none focus:border-slate-900"
                        />
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* RINGKASAN BIAYA DAN TOMBOL (tetap seperti sebelumnya) */}
      <div className="p-4 border-t border-slate-200 bg-slate-50 space-y-3 shrink-0 text-xs font-bold uppercase tracking-tight text-slate-600">
        <div className="space-y-1.5">
          <div className="flex justify-between">
            <div>Subtotal:</div>
            <div className="text-slate-900 font-black">
              Rp {cartSubtotal.toLocaleString("id-ID")}
            </div>
          </div>

          <div className="flex justify-between items-center">
            <div className="flex items-center gap-1">
              <Tag size={12} className="text-slate-900" /> Diskon:
            </div>
            {isWaiter ? (
              <div className="flex items-center gap-1 text-slate-400 font-black text-xs bg-slate-100 border px-2 py-1 rounded-lg">
                <Lock size={10} /> 0%
              </div>
            ) : (
              <input
                type="text"
                value={discountInput}
                onChange={(e) => handleApplyDiscountInput(e.target.value)}
                placeholder="0%"
                className="w-14 text-right bg-white border border-slate-200 rounded-lg px-2 py-1 font-black text-xs text-slate-900 focus:outline-none focus:border-slate-900"
              />
            )}
          </div>

          <div className="flex justify-between">
            <div>Service (5%):</div>
            <div className="text-slate-900 font-black">
              Rp {serviceCharge.toLocaleString("id-ID")}
            </div>
          </div>
          <div className="flex justify-between">
            <div>Tax PB1 (15%):</div>
            <div className="text-slate-900 font-black">
              Rp {restaurantTax.toLocaleString("id-ID")}
            </div>
          </div>
          <div className="flex justify-between border-t border-slate-300 pt-2 text-sm">
            <div className="text-slate-900 font-black">Grand Total:</div>
            <div className="text-orange-600 font-black text-base">
              Rp {cartGrandTotal.toLocaleString("id-ID")}
            </div>
          </div>
        </div>

        {/* TOMBOL - 2 BARIS */}
        <div className="space-y-2 pt-1 border-t border-slate-200">
          {hasNewItems && (
            <button
              type="button"
              onClick={handleOrderActionWrapper}
              disabled={cart.length === 0}
              className="w-full bg-orange-600 hover:bg-slate-900 text-white py-3.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-md active:scale-[0.98] disabled:bg-slate-200 disabled:text-slate-400 cursor-pointer animate-fade-in"
            >
              ORDER / PESAN
            </button>
          )}

          {/* BARIS 1: Bayar (hijau) & Print (biru) */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={!hasSavedItems || isWaiter}
              onClick={handleMainActionButtonClick}
              className="px-3 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-100 disabled:text-slate-400 text-white rounded-xl font-black text-[11px] uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer"
            >
              Bayar
            </button>
            <button
              type="button"
              disabled={!hasSavedItems || isWaiter}
              onClick={handlePrintKitchenOnly}
              className="px-3 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-100 disabled:text-slate-400 text-white rounded-xl font-black text-[11px] uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer"
            >
              <Printer size={13} /> Print
            </button>
          </div>

          {/* BARIS 2: Split, Move, Void */}
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              disabled={!hasSavedItems || isWaiter}
              onClick={handleSplitBillAction}
              className="px-3 py-2.5 bg-white hover:bg-slate-100 disabled:bg-slate-50 disabled:text-slate-300 text-slate-800 border border-slate-300 rounded-xl font-black text-[11px] uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <Sliders size={13} /> Split
            </button>
            <button
              type="button"
              disabled={!hasSavedItems}
              onClick={handleMoveOrderAction}
              className="px-3 py-2.5 bg-white hover:bg-slate-100 disabled:bg-slate-50 disabled:text-slate-300 text-slate-800 border border-slate-300 rounded-xl font-black text-[11px] uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <Move size={13} /> Pindah Meja
            </button>
            <button
              type="button"
              disabled={!hasSavedItems || isWaiter}
              onClick={() => setShowVoidModal(true)}
              className="px-3 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-slate-100 disabled:text-slate-400 text-white rounded-xl font-black text-[11px] uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer"
            >
              <XCircle size={13} /> Void
            </button>
          </div>
        </div>
      </div>

      {/* VOID MODAL */}
      <VoidOrderModal
        isOpen={showVoidModal}
        onClose={() => setShowVoidModal(false)}
        activeTableData={{
          label: selectedTable,
          savedItems: cart.filter(
            (i) => i.status === "READ_ONLY" || i.isSaved === true
          ),
        }}
        onConfirmVoid={async (
          sku,
          qtyToVoid,
          voidType,
          managerPin,
          voidNote
        ) => {
          if (onExecuteVoidLedger) {
            await onExecuteVoidLedger(
              sku,
              qtyToVoid,
              voidType,
              managerPin,
              voidNote
            );
          }
        }}
      />
    </div>
  );
};
