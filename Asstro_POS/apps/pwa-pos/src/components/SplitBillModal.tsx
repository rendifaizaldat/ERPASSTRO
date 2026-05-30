import React, { useState, useMemo, useEffect } from "react";
import { X, ShoppingBag, ArrowRight, Save } from "lucide-react";
import { useToast } from "../components/Toast";

interface SplitBillModalProps {
  isOpen: boolean;
  onClose: () => void;
  cart: any[];
  tableLabel: string | null;
  operatorName: string;
  onConfirmSplit: (
    virtualTables: Array<{
      label: string;
      items: any[];
      currentBill: number;
      isVirtual: boolean;
      parentTableId: string;
    }>,
  ) => void;
}

export const SplitBillModal: React.FC<SplitBillModalProps> = ({
  isOpen,
  onClose,
  cart,
  tableLabel,
  onConfirmSplit,
}) => {
  const { showToast } = useToast();
  const [numSplits, setNumSplits] = useState("2");
  const [step, setStep] = useState<1 | 2>(1);
  const [virtualBins, setVirtualBins] = useState<
    Array<{ name: string; items: any[] }>
  >([]);
  const [sourceCart, setSourceCart] = useState<any[]>([]);

  const [activeBinFocus, setActiveBinFocus] = useState<number | null>(null);
  const [isQwertyShift, setIsQwertyShift] = useState(false);

  const handleNumpadPress = (val: string) => {
    if (val === "CLEAR") {
      setNumSplits("");
    } else if (val === "BACKSPACE") {
      setNumSplits((prev) => prev.slice(0, -1));
    } else {
      setNumSplits((prev) => {
        const next = prev + val;
        const num = parseInt(next) || 0;
        if (num > 12) {
          showToast(
            "Maksimal split invoice ruko dibatasi hingga 12 meja pecahan!",
            "WARNING",
          );
          return "12";
        }
        return next.replace(/^0+/, "") || "2";
      });
    }
  };

  const handleInternalQwertyPress = (char: string) => {
    if (activeBinFocus === null) {
      showToast(
        "Harap ketuk kolom nama pelanggan ruko terlebih dahulu untuk mulai mengetik!",
        "INFO",
      );
      return;
    }

    setVirtualBins((prevBins) =>
      prevBins.map((bin, idx) => {
        if (idx !== activeBinFocus) return bin;

        let currentName = bin.name;
        if (char === "BACKSPACE") {
          currentName = currentName.slice(0, -1);
        } else if (char === "SPACE") {
          currentName = currentName + " ";
        } else if (char === "CLEAR") {
          currentName = "";
        } else if (char === "SHIFT") {
          setIsQwertyShift(!isQwertyShift);
          return bin;
        } else {
          const targetChar = isQwertyShift
            ? char.toUpperCase()
            : char.toLowerCase();
          currentName = currentName + targetChar;
        }

        return { ...bin, name: currentName };
      }),
    );
  };

  useEffect(() => {
    if (!isOpen) return;

    const handleHardwareKeyDown = (e: KeyboardEvent) => {
      const key = e.key;

      if (step === 1) {
        if (/^[0-9]$/.test(key)) {
          e.preventDefault();
          handleNumpadPress(key);
        } else if (key === "Backspace") {
          e.preventDefault();
          handleNumpadPress("BACKSPACE");
        } else if (key === "Escape" || key === "Delete") {
          e.preventDefault();
          handleNumpadPress("CLEAR");
        } else if (key === "Enter") {
          e.preventDefault();
          handleGenerateBins();
        }
        return;
      }

      if (step === 2 && activeBinFocus !== null) {
        if (key === "Backspace") {
          e.preventDefault();
          handleInternalQwertyPress("BACKSPACE");
        } else if (key === " ") {
          e.preventDefault();
          handleInternalQwertyPress("SPACE");
        } else if (key === "Escape") {
          e.preventDefault();
          setActiveBinFocus(null);
        } else if (key.length === 1 && /^[a-zA-Z]$/.test(key)) {
          e.preventDefault();
          handleInternalQwertyPress(key);
        }
      }
    };

    window.addEventListener("keydown", handleHardwareKeyDown);
    return () => window.removeEventListener("keydown", handleHardwareKeyDown);
  }, [isOpen, step, activeBinFocus, isQwertyShift]);

  if (!isOpen) return null;

  const handleGenerateBins = () => {
    const parsedSplits = parseInt(numSplits) || 2;
    if (parsedSplits < 2) {
      showToast("Minimal pembagian split invoice adalah 2 pecahan!", "ERROR");
      return;
    }
    const totalBins = parsedSplits - 1;
    const bins = Array.from({ length: totalBins }, (_, i) => ({
      name: `Nama Tamu ${i + 1}`,
      items: [],
    }));
    setVirtualBins(bins);
    setSourceCart(JSON.parse(JSON.stringify(cart)));
    setActiveBinFocus(0);
    setStep(2);
  };

  const handleTransferItem = (
    sourceIdx: number,
    binIdx: number,
    type: "PARSIAL" | "ALL",
  ) => {
    const targetItem = sourceCart[sourceIdx];
    if (!targetItem || targetItem.qty <= 0) return;

    const moveQty = type === "ALL" ? targetItem.qty : 1;

    setVirtualBins((prev) =>
      prev.map((bin, idx) => {
        if (idx !== binIdx) return bin;

        const existIdx = bin.items.findIndex((i) => i.id === targetItem.id);

        if (existIdx >= 0) {
          const nextItems = [...bin.items];
          nextItems[existIdx].qty += moveQty;
          return { ...bin, items: nextItems };
        } else {
          return {
            ...bin,
            items: [...bin.items, { ...targetItem, qty: moveQty }],
          };
        }
      }),
    );

    setSourceCart(
      (prev) =>
        prev
          .map((item, idx) => {
            if (idx !== sourceIdx) return item;
            const nextQty = item.qty - moveQty;
            return nextQty > 0 ? { ...item, qty: nextQty } : null;
          })
          .filter(Boolean) as any[],
    );
  };

  const calculateCartTotals = (items: any[]) => {
    const subtotal = items.reduce((acc, c) => acc + c.price * c.qty, 0);
    const service = subtotal * 0.05;
    const tax = subtotal * 0.15;
    const grandTotal = subtotal + service + tax;
    return { subtotal, service, tax, grandTotal };
  };

  const handleSaveFinalSplit = () => {
    const formattedTables = virtualBins
      .filter((bin) => bin.items.length > 0)
      .map((bin) => {
        const totals = calculateCartTotals(bin.items);
        const subLabel = (bin.name.trim() || "TAMU").toUpperCase();
        return {
          label: `${tableLabel}-${subLabel}`,
          items: bin.items,
          currentBill: totals.grandTotal,
          isVirtual: true,
          parentTableId: tableLabel || "",
        };
      });

    if (formattedTables.length > 0) {
      onConfirmSplit(formattedTables as any);
      showToast("Nota virtual resmi sukses didaftarkan!", "SUCCESS");
      onClose();
    } else {
      showToast(
        "Harap pindahkan minimal satu menu makanan ke kompartemen target!",
        "ERROR",
      );
    }
  };

  const mainTotals = calculateCartTotals(sourceCart);

  const qwertyRows = [
    ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
    ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
    ["SHIFT", "Z", "X", "C", "V", "B", "N", "M", "BACKSPACE"],
    ["CLEAR", "SPACE"],
  ];

  return (
    <div className="fixed inset-0 bg-slate-950/80 z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-white text-slate-900 rounded-[2.5rem] shadow-2xl p-5 border border-slate-200 flex flex-col h-[92vh] max-h-175 text-xs overflow-hidden">
        <div className="flex justify-between items-center border-b border-slate-100 pb-2.5 mb-3 shrink-0">
          <div className="flex items-center gap-2">
            <ShoppingBag size={16} className="text-orange-600" />
            <h3 className="font-black text-xs md:text-sm uppercase tracking-tight text-slate-800">
              Split Bill Workspace & Meja Virtual Generator (Meja {tableLabel})
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

        {step === 1 ? (
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 items-center min-h-0">
            <div className="flex flex-col items-center justify-center bg-slate-50 p-6 rounded-3xl border border-slate-200/60 h-full">
              <label className="font-black text-xs uppercase tracking-widest text-slate-400 mb-2">
                Split Menjadi Berapa Invoice?
              </label>
              <input
                type="text"
                inputMode="none"
                readOnly
                value={numSplits || "0"}
                className="w-32 text-center text-3xl font-black bg-white border-2 border-slate-200 rounded-2xl py-3 text-slate-900 tracking-tight shadow-sm mb-4"
              />
              <button
                type="button"
                onClick={handleGenerateBins}
                disabled={!numSplits || parseInt(numSplits) < 2}
                className="w-full max-w-xs bg-orange-600 hover:bg-slate-900 text-white font-black text-xs uppercase py-3.5 rounded-xl shadow-md transition-all active:scale-[0.99] flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <span>Buka Kompartemen Split</span>
                <ArrowRight size={14} />
              </button>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-3xl p-4 h-full flex flex-col justify-center">
              <div className="grid grid-cols-3 gap-2 max-w-sm mx-auto w-full self-center">
                {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => handleNumpadPress(num)}
                    className="py-3 bg-white hover:bg-slate-100 text-slate-900 font-black text-lg rounded-xl border border-slate-200 transition-all cursor-pointer active:scale-95 flex items-center justify-center"
                  >
                    {num}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => handleNumpadPress("CLEAR")}
                  className="py-3 bg-red-50 hover:bg-red-100 text-red-600 font-black text-xs uppercase tracking-wider rounded-xl border border-red-100 cursor-pointer active:scale-95"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={() => handleNumpadPress("0")}
                  className="py-3 bg-white hover:bg-slate-100 text-slate-900 font-black text-lg rounded-xl border border-slate-200 cursor-pointer active:scale-95"
                >
                  0
                </button>
                <button
                  type="button"
                  onClick={() => handleNumpadPress("BACKSPACE")}
                  className="py-3 bg-amber-50 hover:bg-amber-100 text-amber-700 font-black text-xs uppercase tracking-wider rounded-xl border border-amber-200 cursor-pointer active:scale-95"
                >
                  ← Del
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 min-h-0 overflow-hidden">
              {/* GRID 1: KERANJANG MEJA FISIK ASAL */}
              <div className="bg-slate-50 border border-slate-200 rounded-3xl p-3 flex flex-col min-h-0 overflow-hidden">
                <div className="shrink-0 mb-1.5">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                    Meja Induk Fisik: {tableLabel}
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto space-y-1 pr-1 mb-2">
                  {sourceCart.length === 0 ? (
                    <div className="flex items-center justify-center h-32 text-slate-400 text-xs font-medium italic">
                      Semua menu sudah dipindahkan ke meja virtual
                    </div>
                  ) : (
                    sourceCart.map((item, idx) => (
                      <div
                        key={item.id}
                        className="bg-white border border-slate-200 px-3 py-2 rounded-xl flex items-center justify-between gap-3 shadow-xs font-bold text-[11px]"
                      >
                        <div className="min-w-0 flex-1">
                          <span className="text-slate-900 font-black truncate block uppercase tracking-tight">
                            {item.name}
                          </span>
                          {item.note && (
                            <span className="text-[9px] text-orange-600 italic bg-orange-50/60 px-1 rounded inline-block font-bold">
                              NB: {item.note}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-slate-700 font-black text-right min-w-22.5">
                            Rp {item.price.toLocaleString("id-ID")}{" "}
                            <span className="text-slate-400 font-medium">
                              x{item.qty}
                            </span>
                          </span>

                          <div className="flex gap-1">
                            {virtualBins.map((_, bIdx) => (
                              <div
                                key={bIdx}
                                className="flex gap-0.5 border border-slate-200 bg-slate-50 rounded-md overflow-hidden"
                              >
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleTransferItem(idx, bIdx, "PARSIAL")
                                  }
                                  className="bg-white hover:bg-orange-600 hover:text-white px-3 py-1 text-[11px] uppercase font-black cursor-pointer transition-colors min-w-10"
                                  title={`Pindahkan 1 porsi ke T${bIdx + 1}`}
                                >
                                  T{bIdx + 1}
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleTransferItem(idx, bIdx, "ALL")
                                  }
                                  className="bg-slate-100 hover:bg-slate-900 hover:text-white px-3 py-1 text-[11px] uppercase font-black cursor-pointer transition-colors min-w-10"
                                  title={`Pindahkan semua porsi ke T${bIdx + 1}`}
                                >
                                  All
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="bg-white border border-dashed border-slate-300 rounded-xl p-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-tight shrink-0">
                  <div className="flex justify-between">
                    <span>Sisa Subtotal</span>
                    <span className="text-slate-900">
                      Rp {mainTotals.subtotal.toLocaleString("id-ID")}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs font-black text-orange-600 pt-1 border-t border-slate-200 mt-1">
                    <span>Grand Total Induk</span>
                    <span>
                      Rp {mainTotals.grandTotal.toLocaleString("id-ID")}
                    </span>
                  </div>
                </div>
              </div>

              {/* GRID 2: DAFTAR KOMPARTEMEN VIRTUAL TARGET & PAPAN KEYBOARD */}
              <div className="flex flex-col min-h-0 overflow-hidden gap-3">
                <div className="border border-slate-200 rounded-3xl p-3 bg-white flex flex-col flex-1 min-h-0 overflow-hidden">
                  <div className="shrink-0 mb-1.5">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                      Target Kompartemen Pecahan Meja Virtual:
                    </span>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                    {virtualBins.map((bin, bIdx) => {
                      const binTotals = calculateCartTotals(bin.items);
                      const isCurrentFocus = activeBinFocus === bIdx;

                      return (
                        <div
                          key={bIdx}
                          className={`bg-slate-50/80 border-2 rounded-2xl p-2.5 flex flex-col transition-all duration-150 ${
                            isCurrentFocus
                              ? "border-slate-900 bg-orange-50/20 shadow-xs"
                              : "border-dashed border-slate-200"
                          }`}
                        >
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <span className="text-[10px] font-black text-slate-400 uppercase shrink-0">
                              ID: {tableLabel}-
                            </span>
                            <input
                              type="text"
                              inputMode="none"
                              readOnly
                              value={bin.name}
                              onClick={() => setActiveBinFocus(bIdx)}
                              className={`bg-white border rounded-lg px-2 py-1 font-black text-[11px] uppercase w-full focus:outline-none transition-colors cursor-pointer ${
                                isCurrentFocus
                                  ? "border-slate-900 text-orange-600"
                                  : "border-slate-200 text-slate-900"
                              }`}
                              placeholder="Ketuk di sini untuk mengisi nama..."
                            />
                          </div>

                          <div className="space-y-1 min-h-9">
                            {bin.items.length === 0 ? (
                              <p className="text-[10px] text-slate-300 italic text-center py-1">
                                Belum ada menu (Ketuk T{bIdx + 1} di kiri)
                              </p>
                            ) : (
                              bin.items.map((i, idx) => (
                                <div
                                  key={idx}
                                  className="bg-white border border-slate-200 rounded-lg p-1.5 text-[10px] flex justify-between items-center font-bold uppercase text-slate-800"
                                >
                                  <span className="truncate pr-1">
                                    {i.name}
                                  </span>
                                  <span className="bg-slate-100 font-black px-1.5 py-0.5 rounded text-orange-600 shrink-0">
                                    x{i.qty}
                                  </span>
                                </div>
                              ))
                            )}
                          </div>

                          <div className="bg-white border border-dashed border-slate-200 rounded-lg p-2 mt-1.5 text-[9px] font-bold text-slate-400 uppercase tracking-tight">
                            <div className="flex justify-between font-black text-slate-900 text-[10px]">
                              <span>Total Pecahan (T{bIdx + 1})</span>
                              <span className="text-orange-600">
                                Rp{" "}
                                {binTotals.grandTotal.toLocaleString("id-ID")}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* KEYBOARD QWERTY INTERNAL KOMPAK */}
                <div className="bg-slate-100 p-2 rounded-2xl border border-slate-200 shrink-0">
                  <div className="flex justify-between items-center mb-1 px-1">
                    <span className="text-[8px] font-black uppercase tracking-wider text-slate-400">
                      Papan Ketik QWERTY Internal
                    </span>
                    {activeBinFocus !== null && (
                      <span className="text-[8px] bg-slate-900 text-white px-1.5 py-0.5 rounded font-black">
                        Target: T{activeBinFocus + 1}
                      </span>
                    )}
                  </div>

                  <div className="space-y-0.5">
                    {qwertyRows.map((row, rIdx) => (
                      <div
                        key={rIdx}
                        className="flex justify-center gap-0.5 w-full"
                      >
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
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-between gap-3 shrink-0 items-center mt-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 font-black text-[10px] uppercase rounded-lg cursor-pointer flex items-center gap-1"
              >
                <X size={12} />
                <span>Kembali Ke Step 1</span>
              </button>

              <button
                type="button"
                onClick={handleSaveFinalSplit}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] uppercase rounded-lg shadow-sm cursor-pointer flex items-center gap-1 transition-colors"
              >
                <Save size={12} />
                <span>Simpan Nota Virtual Resmi</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
