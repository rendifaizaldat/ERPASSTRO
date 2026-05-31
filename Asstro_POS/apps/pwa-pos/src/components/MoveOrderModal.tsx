import React, { useState, useMemo, useEffect } from "react";
import { X, Move, HelpCircle, Save } from "lucide-react";
import { useToast } from "../components/Toast";

interface MoveOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  cart: any[];
  tableLabel: string | null;
  dbTables: any[];
  operatorName: string;
  onConfirmMove: (targetTableLabel: string, itemsToMove: any[]) => void;
}

export const MoveOrderModal: React.FC<MoveOrderModalProps> = ({
  isOpen,
  onClose,
  cart,
  tableLabel,
  dbTables,
  onConfirmMove,
}) => {
  const { showToast } = useToast();

  // State Logika On-Demand Input Mandiri Kasir
  const [targetTable, setTargetTable] = useState("");
  const [targetCustomerName, setTargetCustomerName] = useState("");

  // Melacak fokus field input: "TABLE" atau "NAME"
  const [activeFieldFocus, setActiveFieldFocus] = useState<"TABLE" | "NAME">(
    "TABLE",
  );
  const [isQwertyShift, setIsQwertyShift] = useState(false);

  // LOGIKA UTAMA 1: Pengendali Input Karakter Papan Angka Numpad Virtual
  const handleNumpadPress = (val: string) => {
    if (activeFieldFocus !== "TABLE") return;

    if (val === "CLEAR") {
      setTargetTable("");
    } else if (val === "BACKSPACE") {
      setTargetTable((prev) => prev.slice(0, -1));
    } else {
      setTargetTable((prev) => {
        const next = prev + val;
        return next.replace(/^0+/, ""); // Cegah double zero di depan nomor meja
      });
    }
  };

  // LOGIKA UTAMA 2: Pengendali Input Karakter Papan Huruf QWERTY Virtual
  const handleInternalQwertyPress = (char: string) => {
    if (activeFieldFocus !== "NAME") return;

    if (char === "BACKSPACE") {
      setTargetCustomerName((prev) => prev.slice(0, -1));
    } else if (char === "SPACE") {
      setTargetCustomerName((prev) => prev + " ");
    } else if (char === "CLEAR") {
      setTargetCustomerName("");
    } else if (char === "SHIFT") {
      setIsQwertyShift(!isQwertyShift);
    } else {
      const targetChar = isQwertyShift
        ? char.toUpperCase()
        : char.toLowerCase();
      setTargetCustomerName((prev) => prev + targetChar);
    }
  };

  // SINKRONISASI KEYBOARD HARDWARE FISIK KASIR
  useEffect(() => {
    if (!isOpen) return;

    const handleHardwareKeyDown = (e: KeyboardEvent) => {
      const key = e.key;

      if (activeFieldFocus === "TABLE") {
        if (/^[0-9]$/.test(key)) {
          e.preventDefault();
          handleNumpadPress(key);
        } else if (key === "Backspace") {
          e.preventDefault();
          handleNumpadPress("BACKSPACE");
        } else if (key === "Escape" || key === "Delete") {
          e.preventDefault();
          handleNumpadPress("CLEAR");
        }
      } else if (activeFieldFocus === "NAME") {
        if (key === "Backspace") {
          e.preventDefault();
          handleInternalQwertyPress("BACKSPACE");
        } else if (key === " ") {
          e.preventDefault();
          handleInternalQwertyPress("SPACE");
        } else if (key.length === 1) {
          e.preventDefault();
          setTargetCustomerName((prev) => prev + key);
        }
      }
    };

    window.addEventListener("keydown", handleHardwareKeyDown);
    return () => window.removeEventListener("keydown", handleHardwareKeyDown);
  }, [
    isOpen,
    activeFieldFocus,
    targetTable,
    targetCustomerName,
    isQwertyShift,
  ]);

  if (!isOpen) return null;

  // Handler Utama Eksekusi Pemindahan Komprehensif On-Demand
  const handleExecuteMoveWholeTable = (e: React.FormEvent) => {
    e.preventDefault();

    const targetLabelClean = targetTable.trim();
    const targetNameClean = targetCustomerName.trim().toUpperCase();

    if (!targetLabelClean) {
      showToast(
        "Harap isi nomor meja tujuan transfer terlebih dahulu!",
        "ERROR",
      );
      return;
    }
    if (!targetNameClean) {
      showToast(
        "Harap isi nama tamu pelanggan untuk meja tujuan baru!",
        "ERROR",
      );
      return;
    }
    if (cart.length === 0) {
      showToast(
        "Meja asal tidak memiliki item aktif untuk dipindahkan!",
        "ERROR",
      );
      return;
    }
    if (targetLabelClean === tableLabel) {
      showToast(
        "Nomor meja tujuan tidak boleh sama dengan nomor meja asal!",
        "ERROR",
      );
      return;
    }

    // Validasi Keaktifan Meja Tujuan di DB State (Proteksi Tabrakan Data)
    const isTargetOccupied = dbTables.some((t) => {
      const isSameLabel =
        t.label &&
        t.label.toString().toLowerCase() === targetLabelClean.toLowerCase();
      const hasActiveOrder =
        (t.savedItems && t.savedItems.length > 0) || t.currentBill > 0;
      return isSameLabel && hasActiveOrder;
    });

    if (isTargetOccupied) {
      showToast(
        `Meja ${targetLabelClean} saat ini sedang terisi aktif! Gunakan nomor meja lain.`,
        "ERROR",
      );
      return;
    }

    // Inisialisasi data nama baru ke sessionStorage agar diserap otomatis saat denah dimonitor
    sessionStorage.setItem(
      `asstro_tamu_meja_${targetLabelClean}`,
      targetNameClean,
    );

    // Kirim perintah eksekusi ke PosModule
    onConfirmMove(targetLabelClean, cart);
    showToast(
      `Seluruh pesanan Meja ${tableLabel} berhasil dipindahkan ke Meja ${targetLabelClean}!`,
      "SUCCESS",
    );

    // Reset internal state
    setTargetTable("");
    setTargetCustomerName("");
    onClose();
  };

  const qwertyRows = [
    ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
    ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
    ["SHIFT", "Z", "X", "C", "V", "B", "N", "M", "BACKSPACE"],
    ["CLEAR", "SPACE"],
  ];

  return (
    <div className="fixed inset-0 bg-slate-950/80 z-350 backdrop-blur-sm flex items-center justify-center p-4">
      {/* SINKRONISASI CANONICAL: Mengubah z-index, max-height linter, dan membongkar bentuk ke Single Grid */}
      <form
        onSubmit={handleExecuteMoveWholeTable}
        className="w-full max-w-md bg-white text-slate-900 rounded-[2.5rem] shadow-2xl p-5 border border-slate-200 flex flex-col h-[90vh] max-h-125 text-xs overflow-hidden animate-fade-in"
      >
        {/* Header Title */}
        <div className="flex justify-between items-center border-b border-slate-100 pb-2 mb-2.5 shrink-0">
          <div className="flex items-center gap-1.5">
            <Move size={15} className="text-orange-600" />
            <h3 className="font-black text-xs md:text-sm uppercase tracking-tight text-slate-800">
              Pindah Lokasi Meja Kasir
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-900 cursor-pointer p-0.5"
          >
            <X size={16} />
          </button>
        </div>

        {/* Area Atas: Informasi & Form Kontrol Input Entry */}
        <div className="space-y-2.5 shrink-0">
          {/* Banner Warning Petunjuk Audit */}
          <div className="p-2.5 bg-orange-50 border border-orange-200 rounded-xl flex items-start gap-2 text-slate-700 font-bold text-[10px] uppercase tracking-tight">
            <HelpCircle size={14} className="text-orange-600 shrink-0 mt-0.5" />
            <p className="leading-tight">
              Seluruh pesanan aktif dari Meja{" "}
              <span className="text-orange-700 font-black">{tableLabel}</span> (
              {cart.length} menu) akan ditransfer secara utuh menuju lokasi
              baru.
            </p>
          </div>

          {/* Form Kontrol Input Entry */}
          <div className="grid grid-cols-2 gap-2">
            {/* Kolom 1: Nomor Meja */}
            <div
              onClick={() => setActiveFieldFocus("TABLE")}
              className="cursor-pointer"
            >
              <label className="text-[9px] font-black uppercase text-slate-400 block mb-1 tracking-wider">
                Meja Tujuan:
              </label>
              <input
                type="text"
                inputMode="none"
                readOnly
                placeholder="Isi via numpad..."
                value={targetTable}
                className={`w-full bg-slate-50 border-2 rounded-xl px-3 py-2 font-black text-sm text-center transition-all focus:outline-none ${
                  activeFieldFocus === "TABLE"
                    ? "border-slate-900 bg-orange-50/10 text-orange-600 shadow-xs"
                    : "border-slate-200 text-slate-900"
                }`}
              />
            </div>

            {/* Kolom 2: Nama Pelanggan Baru */}
            <div
              onClick={() => setActiveFieldFocus("NAME")}
              className="cursor-pointer"
            >
              <label className="text-[9px] font-black uppercase text-slate-400 block mb-1 tracking-wider">
                Nama Pelanggan Meja Baru:
              </label>
              <input
                type="text"
                inputMode="none"
                readOnly
                placeholder="Isi via qwerty..."
                value={targetCustomerName}
                className={`w-full bg-slate-50 border-2 rounded-xl px-3 py-2 font-black text-xs transition-all uppercase focus:outline-none ${
                  activeFieldFocus === "NAME"
                    ? "border-slate-900 bg-orange-50/10 text-orange-600 shadow-xs"
                    : "border-slate-200 text-slate-900"
                }`}
              />
            </div>
          </div>
        </div>

        {/* Area Tengah: Morphing Keyboard Container yang Menghabiskan Sisa Ruang Efektif */}
        <div className="flex-1 flex flex-col justify-center bg-slate-50 p-2.5 rounded-2xl border border-slate-200/60 my-2.5 overflow-hidden">
          {/* TAMPILKAN KEYBOARD NUMPAD: Jika fokus aktif berada di kolom Nomor Meja */}
          {activeFieldFocus === "TABLE" ? (
            <div className="w-full space-y-1 animate-fade-in">
              <span className="text-[8px] font-black uppercase tracking-wider text-slate-400 block text-center mb-1">
                Papan Angka Numpad Internal
              </span>
              <div className="grid grid-cols-3 gap-1.5 max-w-60 mx-auto w-full">
                {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => handleNumpadPress(num)}
                    className="py-2.5 bg-white hover:bg-slate-100 text-slate-900 font-black text-base rounded-xl border border-slate-200/80 shadow-xs cursor-pointer active:scale-95 flex items-center justify-center select-none"
                  >
                    {num}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => handleNumpadPress("CLEAR")}
                  className="py-2.5 bg-red-50 hover:bg-red-100 text-red-600 font-black text-xs uppercase tracking-wider rounded-xl border border-red-100 cursor-pointer active:scale-95 flex items-center justify-center select-none"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={() => handleNumpadPress("0")}
                  className="py-2.5 bg-white hover:bg-slate-100 text-slate-900 font-black text-base rounded-xl border border-slate-200/80 cursor-pointer active:scale-95 flex items-center justify-center select-none"
                >
                  0
                </button>
                <button
                  type="button"
                  onClick={() => handleNumpadPress("BACKSPACE")}
                  className="py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-700 font-black text-xs uppercase tracking-wider rounded-xl border border-amber-200 cursor-pointer active:scale-95 flex items-center justify-center select-none"
                >
                  ←
                </button>
              </div>
            </div>
          ) : (
            /* TAMPILKAN KEYBOARD QWERTY: Jika fokus aktif berada di kolom Nama Pelanggan */
            <div className="w-full space-y-0.5 animate-fade-in">
              <span className="text-[8px] font-black uppercase tracking-wider text-slate-400 block text-center mb-1">
                Papan Huruf QWERTY Internal
              </span>
              {qwertyRows.map((row, rIdx) => (
                <div key={rIdx} className="flex justify-center gap-0.5 w-full">
                  {row.map((key) => {
                    const isSpecial = [
                      "SHIFT",
                      "BACKSPACE",
                      "CLEAR",
                      "SPACE",
                    ].includes(key);

                    let btnStyle =
                      "bg-white hover:bg-slate-50 text-slate-900 text-[10px] font-black border border-slate-200 shadow-sm active:scale-95";
                    if (key === "SHIFT" && isQwertyShift)
                      btnStyle =
                        "bg-orange-600 text-white border-orange-600 shadow-md";
                    else if (key === "BACKSPACE" || key === "SHIFT")
                      btnStyle =
                        "bg-slate-200 hover:bg-slate-300 text-slate-700 text-[8px] font-black border border-slate-300";
                    else if (key === "CLEAR")
                      btnStyle =
                        "bg-red-50 hover:bg-red-100 text-red-600 text-[8px] font-black border border-red-200";
                    else if (key === "SPACE")
                      btnStyle =
                        "bg-white hover:bg-slate-50 text-slate-900 font-black border border-slate-200 px-6 flex-1 h-7";

                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => handleInternalQwertyPress(key)}
                        className={`h-7 px-1 rounded-md transition-all flex items-center justify-center select-none cursor-pointer ${
                          isSpecial ? btnStyle : `flex-1 ${btnStyle}`
                        }`}
                      >
                        {key === "BACKSPACE"
                          ? "←"
                          : key === "SPACE"
                            ? "Spasi"
                            : key === "SHIFT"
                              ? "⇧"
                              : key}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action Buttons Sisi Terbawah Form */}
        <div className="pt-2 border-t border-slate-100 flex justify-between gap-2.5 shrink-0 items-center">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-[10px] uppercase rounded-lg cursor-pointer transition-colors"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={!targetTable.trim() || !targetCustomerName.trim()}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] uppercase rounded-lg shadow-sm flex items-center gap-1 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Save size={12} />
            <span>Konfirmasi Pindah</span>
          </button>
        </div>
      </form>
    </div>
  );
};
