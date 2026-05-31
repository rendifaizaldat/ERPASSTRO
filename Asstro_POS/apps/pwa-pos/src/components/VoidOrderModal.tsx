import React, { useState } from "react";
import {
  X,
  Trash2,
  ShieldCheck,
  Plus,
  Minus,
  AlertTriangle,
  Lock,
  ListX, // IMPORT BARU UNTUK ICON VOID ALL
} from "lucide-react";
import { useToast } from "../components/Toast";

interface VoidOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeTableData: any;
  onConfirmVoid: (
    sku: string,
    qtyToVoid: number,
    voidType: "SALAH_INPUT" | "BARANG_KOSONG" | "CANCEL",
    managerPin?: string,
    voidNote?: string,
  ) => Promise<void>;
}

export const VoidOrderModal: React.FC<VoidOrderModalProps> = ({
  isOpen,
  onClose,
  activeTableData,
  onConfirmVoid,
}) => {
  const { showToast } = useToast();
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [isVoidAll, setIsVoidAll] = useState(false); // STATE BARU: Penanda Bulk Void

  const [voidStep, setVoidStep] = useState<
    "LIST" | "CONFIRM_TYPE" | "PIN_VERIFY" | "CANCEL_NOTE"
  >("LIST");
  const [chosenType, setChosenType] = useState<
    "SALAH_INPUT" | "BARANG_KOSONG" | "CANCEL" | null
  >(null);
  const [managerPin, setManagerPin] = useState("");
  const [voidNote, setVoidNote] = useState("");
  const [qtyToVoid, setQtyToVoid] = useState<number>(1);

  if (!isOpen || !activeTableData) return null;

  const savedKitchenItems = activeTableData.savedItems || [];

  const handleSelectItemToVoid = (item: any) => {
    setIsVoidAll(false); // Matikan flag Bulk Void
    setSelectedItem(item);
    setQtyToVoid(1);
    setVoidStep("CONFIRM_TYPE");
  };

  // FUNGSI BARU: Saat klik Void Semua
  const handleSelectVoidAll = () => {
    setIsVoidAll(true);
    setSelectedItem(null);
    setVoidStep("CONFIRM_TYPE");
  };

  const handleIncrementVoidQty = () => {
    if (!selectedItem) return;
    if (qtyToVoid >= selectedItem.qty) {
      showToast(`Maksimal void adalah ${selectedItem.qty} porsi!`, "WARNING");
      return;
    }
    setQtyToVoid((prev) => prev + 1);
  };

  const handleDecrementVoidQty = () => {
    if (qtyToVoid <= 1) return;
    setQtyToVoid((prev) => prev - 1);
  };

  // FUNGSI BARU: Eksekutor pusat (menangani Single dan Bulk Void)
  const executeVoidTransaction = async (
    type: "SALAH_INPUT" | "BARANG_KOSONG" | "CANCEL",
    pin?: string,
    note?: string,
  ) => {
    if (isVoidAll) {
      showToast("Sedang memproses pembatalan seluruh meja...", "INFO");
      for (const item of savedKitchenItems) {
        await onConfirmVoid(item.sku, item.qty, type, pin, note);
      }
    } else {
      if (!selectedItem) return;
      await onConfirmVoid(selectedItem.sku, qtyToVoid, type, pin, note);
    }
  };

  const handleSalahInput = async () => {
    try {
      await executeVoidTransaction("SALAH_INPUT");
      handleResetModalState();
    } catch (e) {
      console.error(e);
    }
  };

  const handleBarangKosong = async () => {
    try {
      await executeVoidTransaction("BARANG_KOSONG");
      showToast(
        isVoidAll
          ? "VOID SEMUA & SOLD OUT BERHASIL!"
          : `VOID & SOLD OUT: Produk dinonaktifkan!`,
        "WARNING",
      );
      handleResetModalState();
    } catch (e) {
      console.error(e);
    }
  };

  const handleCancelRequest = () => {
    setChosenType("CANCEL");
    setVoidStep("PIN_VERIFY");
  };

  const handleNumpadPress = (val: string) => {
    if (val === "CLEAR") {
      setManagerPin("");
    } else if (val === "BACKSPACE") {
      setManagerPin((prev) => prev.slice(0, -1));
    } else {
      if (managerPin.length < 6) {
        setManagerPin((prev) => prev + val);
      }
    }
  };

  const handleSubmitPin = () => {
    if (managerPin.length < 4) {
      showToast("PIN terlalu pendek!", "WARNING");
      return;
    }
    setVoidStep("CANCEL_NOTE");
  };

  const handleSubmitCancelWithNote = async () => {
    if (!isVoidAll && !selectedItem) return;
    if (!voidNote.trim()) {
      showToast("Catatan pembatalan wajib diisi!", "WARNING");
      return;
    }

    try {
      await executeVoidTransaction("CANCEL", managerPin, voidNote);
      showToast(
        isVoidAll
          ? `VOID SEMUA CANCEL berhasil dibatalkan.`
          : `VOID CANCEL: ${qtyToVoid}x ${selectedItem?.name} dibatalkan.`,
        "SUCCESS",
      );
      handleResetModalState();
    } catch (e: any) {
      showToast(
        e.message || "Otorisasi Gagal. Silakan ulangi PIN Anda.",
        "ERROR",
      );
      setManagerPin("");
      setVoidStep("PIN_VERIFY");
    }
  };

  const handleResetModalState = () => {
    setSelectedItem(null);
    setIsVoidAll(false);
    setChosenType(null);
    setManagerPin("");
    setVoidNote("");
    setQtyToVoid(1);
    setVoidStep("LIST");
    onClose();
  };

  const handleQwertyPress = (key: string) => {
    if (key === "BACKSPACE") {
      setVoidNote((prev) => prev.slice(0, -1));
    } else if (key === "SPACE") {
      setVoidNote((prev) => prev + " ");
    } else if (key === "CLEAR") {
      setVoidNote("");
    } else {
      setVoidNote((prev) => prev + key);
    }
  };

  const qwertyRows = [
    ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"],
    ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
    ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
    ["Z", "X", "C", "V", "B", "N", "M", ".", "-", "⌫"],
  ];

  return (
    <div className="fixed inset-0 bg-slate-950/80 z-350 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white text-slate-900 rounded-4xl shadow-2xl p-5 border border-slate-200 flex flex-col max-h-[90vh] text-xs overflow-hidden animate-fade-in">
        <div className="flex justify-between items-center border-b border-slate-100 pb-2.5 mb-3 shrink-0">
          <div className="flex items-center gap-1.5">
            <Trash2 size={15} className="text-red-600" />
            <h3 className="font-black text-xs md:text-sm uppercase tracking-tight text-slate-800">
              Sistem Void Order
            </h3>
          </div>
          <button
            onClick={handleResetModalState}
            className="text-slate-400 hover:text-slate-900 cursor-pointer p-0.5 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {voidStep === "LIST" && (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                Meja {activeTableData.label}
              </span>
              <span className="text-[9px] font-bold text-slate-400">
                Total: {savedKitchenItems.length} item
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 mb-3">
              {savedKitchenItems.length === 0 ? (
                <div className="h-40 flex flex-col items-center justify-center text-slate-400 italic font-medium">
                  <AlertTriangle size={24} className="mb-2 opacity-30" /> Belum
                  ada pesanan
                </div>
              ) : (
                savedKitchenItems.map((item: any, idx: number) => (
                  <div
                    key={idx}
                    className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl flex items-center justify-between gap-3 font-bold text-[11px] hover:border-orange-200 transition-all"
                  >
                    <div className="min-w-0 flex-1">
                      <span className="text-slate-900 font-black block uppercase truncate">
                        {item.name}
                      </span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-slate-400 text-[9px] font-medium">
                          Qty:{" "}
                          <span className="text-slate-700 font-black">
                            x{item.qty}
                          </span>
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleSelectItemToVoid(item)}
                      className="p-2 bg-red-50 hover:bg-red-600 text-red-600 hover:text-white rounded-lg transition-all cursor-pointer"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* UI BARU: TOMBOL VOID SELURUH MEJA */}
            {savedKitchenItems.length > 0 && (
              <button
                onClick={handleSelectVoidAll}
                className="w-full p-3.5 bg-red-50 border-2 border-red-200 hover:bg-red-600 hover:border-red-600 hover:text-white text-red-600 font-black uppercase rounded-xl flex justify-center items-center gap-2 transition-all cursor-pointer shadow-sm shrink-0"
              >
                <ListX size={16} />
                Batalkan Seluruh Pesanan Meja
              </button>
            )}
          </div>
        )}

        {voidStep === "CONFIRM_TYPE" && (isVoidAll || selectedItem) && (
          <div className="flex-1 flex flex-col justify-between min-h-0 animate-fade-in">
            <div className="space-y-3 overflow-y-auto pr-0.5">
              {/* UI BARU: KONDISI HEADER JIKA VOID ALL ATAU SINGLE */}
              <div
                className={`p-3 text-white rounded-xl shadow-lg ${isVoidAll ? "bg-red-600" : "bg-slate-900"}`}
              >
                <div className="flex justify-between items-center">
                  <span className="font-black uppercase text-xs truncate">
                    {isVoidAll
                      ? `VOID SELURUH MEJA (${savedKitchenItems.length} ITEM)`
                      : selectedItem?.name}
                  </span>
                  {!isVoidAll && (
                    <span className="text-orange-400 font-black">
                      x{selectedItem?.qty}
                    </span>
                  )}
                </div>
              </div>

              {!isVoidAll && selectedItem?.qty > 1 && (
                <div className="bg-slate-100 border border-slate-200 rounded-xl p-3 flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase text-slate-500">
                    Jumlah Void:
                  </span>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleDecrementVoidQty}
                      className="w-8 h-8 bg-white border rounded hover:bg-slate-50 cursor-pointer"
                    >
                      <Minus size={12} className="mx-auto" />
                    </button>
                    <span className="font-black text-sm w-6 text-center">
                      {qtyToVoid}
                    </span>
                    <button
                      onClick={handleIncrementVoidQty}
                      className="w-8 h-8 bg-white border rounded hover:bg-slate-50 cursor-pointer"
                    >
                      <Plus size={12} className="mx-auto" />
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-2 pt-2">
                <button
                  onClick={handleSalahInput}
                  className="w-full p-3 bg-white border-2 border-amber-200 rounded-xl text-left hover:bg-amber-50 cursor-pointer flex gap-3 items-center group"
                >
                  <div className="p-2 bg-amber-100 rounded-lg">
                    <AlertTriangle size={14} className="text-amber-600" />
                  </div>
                  <div>
                    <p className="text-slate-900 text-[11px] font-black">
                      1. Salah Input / Cancel Kasir
                    </p>
                    <p className="text-slate-400 text-[8px]">
                      Tanpa PIN Supervisor
                    </p>
                  </div>
                </button>

                <button
                  onClick={handleBarangKosong}
                  className="w-full p-3 bg-white border-2 border-red-200 rounded-xl text-left hover:bg-red-50 cursor-pointer flex gap-3 items-center"
                >
                  <div className="p-2 bg-red-100 rounded-lg">
                    <Lock size={14} className="text-red-600" />
                  </div>
                  <div>
                    <p className="text-slate-900 text-[11px] font-black">
                      2. Barang Habis / Sold Out
                    </p>
                    <p className="text-slate-400 text-[8px]">
                      Otomatis nonaktifkan produk (LOCKED)
                    </p>
                  </div>
                </button>

                <button
                  onClick={handleCancelRequest}
                  className="w-full p-3 bg-white border-2 border-purple-200 rounded-xl text-left hover:bg-purple-50 cursor-pointer flex gap-3 items-center"
                >
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <ShieldCheck size={14} className="text-purple-600" />
                  </div>
                  <div>
                    <p className="text-slate-900 text-[11px] font-black">
                      3. Makanan Sudah Keluar
                    </p>
                    <p className="text-slate-400 text-[8px]">
                      Wajib PIN Admin & Catatan Audit
                    </p>
                  </div>
                </button>
              </div>
            </div>
            <button
              onClick={() => setVoidStep("LIST")}
              className="w-full py-2.5 mt-3 bg-slate-100 text-slate-600 font-black uppercase rounded-xl cursor-pointer"
            >
              ← Kembali
            </button>
          </div>
        )}

        {voidStep === "PIN_VERIFY" && (
          <div className="flex-1 flex flex-col justify-between min-h-0 animate-fade-in">
            <div>
              <div className="text-center mb-4">
                <ShieldCheck
                  size={32}
                  className="text-purple-600 mx-auto mb-2"
                />
                <h4 className="font-black text-sm uppercase text-slate-800">
                  Otorisasi Admin
                </h4>
              </div>
              <input
                type="password"
                readOnly
                inputMode="none"
                value={"•".repeat(managerPin.length)}
                placeholder="PIN ADMIN"
                className="w-full bg-slate-100 rounded-xl p-3 font-black text-center text-lg tracking-[0.5em] mb-4 outline-none"
              />
              <div className="grid grid-cols-3 gap-2 max-w-50 mx-auto">
                {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
                  <button
                    key={num}
                    onClick={() => handleNumpadPress(num)}
                    className="py-2.5 border rounded-lg hover:bg-slate-50 cursor-pointer font-black"
                  >
                    {num}
                  </button>
                ))}
                <button
                  onClick={() => handleNumpadPress("CLEAR")}
                  className="py-2.5 border border-red-200 text-red-500 rounded-lg hover:bg-red-50 cursor-pointer font-black text-xs uppercase"
                >
                  CLR
                </button>
                <button
                  onClick={() => handleNumpadPress("0")}
                  className="py-2.5 border rounded-lg hover:bg-slate-50 cursor-pointer font-black"
                >
                  0
                </button>
                <button
                  onClick={() => handleNumpadPress("BACKSPACE")}
                  className="py-2.5 border border-amber-200 text-amber-500 rounded-lg hover:bg-amber-50 cursor-pointer font-black"
                >
                  ⌫
                </button>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => {
                  setVoidStep("CONFIRM_TYPE");
                  setManagerPin("");
                }}
                className="flex-1 py-2.5 bg-slate-100 text-slate-600 font-black uppercase rounded-xl cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleSubmitPin}
                className="flex-1 py-2.5 bg-purple-600 text-white font-black uppercase rounded-xl cursor-pointer"
              >
                Lanjut →
              </button>
            </div>
          </div>
        )}

        {voidStep === "CANCEL_NOTE" && (
          <div className="flex-1 flex flex-col animate-fade-in h-full">
            <div className="mb-2 shrink-0">
              <label className="text-[10px] font-black uppercase text-slate-500 mb-1.5 block">
                Alasan Pembatalan (Audit)
              </label>
              <textarea
                value={voidNote}
                readOnly
                inputMode="none"
                rows={2}
                className="w-full bg-slate-50 border-2 rounded-xl p-3 text-sm font-black focus:outline-none focus:border-purple-400 resize-none text-slate-800"
                placeholder="Tulis alasan dengan keyboard di bawah..."
              />
            </div>

            <div className="flex-1 flex flex-col justify-end gap-1.5 mb-3 bg-slate-100 p-2 rounded-xl border border-slate-200">
              {qwertyRows.map((row, rowIdx) => (
                <div key={rowIdx} className="flex justify-center gap-1.5">
                  {row.map((key) => {
                    const isBackspace = key === "⌫";
                    return (
                      <button
                        key={key}
                        onClick={() =>
                          handleQwertyPress(isBackspace ? "BACKSPACE" : key)
                        }
                        className={`py-2 px-3 sm:px-4 bg-white border border-slate-300 rounded-lg shadow-sm hover:bg-slate-200 active:bg-slate-300 font-black text-xs transition-colors cursor-pointer ${isBackspace ? "bg-amber-100 text-amber-700 border-amber-300" : "text-slate-800"}`}
                      >
                        {key}
                      </button>
                    );
                  })}
                </div>
              ))}
              <div className="flex justify-center gap-1.5 mt-0.5">
                <button
                  onClick={() => handleQwertyPress("CLEAR")}
                  className="py-2 px-4 bg-red-100 border border-red-300 text-red-600 rounded-lg shadow-sm hover:bg-red-200 font-black text-[10px] uppercase cursor-pointer"
                >
                  CLEAR
                </button>
                <button
                  onClick={() => handleQwertyPress("SPACE")}
                  className="py-2 px-16 sm:px-24 bg-white border border-slate-300 rounded-lg shadow-sm hover:bg-slate-200 active:bg-slate-300 font-black text-[10px] uppercase cursor-pointer text-slate-800"
                >
                  SPACE
                </button>
              </div>
            </div>

            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => setVoidStep("PIN_VERIFY")}
                className="flex-1 py-3 bg-slate-100 border border-slate-200 text-slate-600 font-black uppercase rounded-xl cursor-pointer hover:bg-slate-200"
              >
                Kembali
              </button>
              <button
                onClick={handleSubmitCancelWithNote}
                className="flex-1 py-3 bg-purple-600 text-white font-black uppercase rounded-xl cursor-pointer hover:bg-purple-700 shadow-md"
              >
                Submit Void
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
