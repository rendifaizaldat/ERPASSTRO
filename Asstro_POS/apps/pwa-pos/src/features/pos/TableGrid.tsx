import React, { useState, useMemo, useCallback, useRef } from "react";
import { usePos } from "../../core/PosProvider";
import { useToast } from "../../components/Toast";
import {
  Users,
  Utensils,
  Plus,
  X,
  Layers,
  Search,
  Clock,
  Eye,
  ShoppingBag,
} from "lucide-react";

interface TableGridProps {
  onSelectTable: (
    tableId: string,
    status: "KOSONG" | "TERISI" | "REQUEST_BAYAR" | "PAID" | "OPENED",
  ) => void;
}

export const TableGrid: React.FC<TableGridProps> = ({ onSelectTable }) => {
  const { state, dispatch } = usePos() as any;
  const { showToast } = useToast();
  const [activeSubTab, setActiveSubTab] = useState<"SEMUA" | "SPLIT_BILL">(
    "SEMUA",
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [nomorMeja, setNomorMeja] = useState("");
  const [namaTamu, setNamaTamu] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // STATE MANAJEMEN PREVIEW DRAWER
  const [previewTableData, setPreviewTableData] = useState<any | null>(null);
  const [isDrawerRendered, setIsDrawerRendered] = useState(false);
  const [isDrawerVisible, setIsDrawerVisible] = useState(false);

  const drawerTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const dbTables = state?.tables || [];

  const hasSplitTables = useMemo(() => {
    return dbTables.some((t: any) => {
      const isSplitLabel = t.label && t.label.includes("-");
      const isVirtualFlag = t.isVirtual === true;
      const hasContent = (t.items && t.items.length > 0) || t.currentBill > 0;
      return (isSplitLabel || isVirtualFlag) && hasContent;
    });
  }, [dbTables]);

  const getCustomerName = useCallback((table: any): string => {
    const storedName = sessionStorage.getItem(
      `asstro_tamu_meja_${table.label}`,
    );
    if (storedName) return storedName;

    // SINKRONISASI: Jika ada savedItems, gunakan properti tableLabel bawaan item tersebut
    if (
      table.savedItems &&
      table.savedItems[0] &&
      table.savedItems[0].tableLabel
    ) {
      return table.savedItems[0].tableLabel;
    }

    if (table.items && table.items[0] && table.items[0].customerName) {
      return table.items[0].customerName;
    }

    if (table.customerName) return table.customerName;

    return "Tamu";
  }, []);

  const getOrderTime = useCallback((table: any): string => {
    const storedTime = sessionStorage.getItem(
      `asstro_jam_order_${table.label}`,
    );
    return storedTime || "";
  }, []);

  const applySearchFilter = useCallback(
    (tables: any[]): any[] => {
      if (!searchQuery.trim()) return tables;

      const query = searchQuery.toLowerCase().trim();

      return tables.filter((table: any) => {
        const tableNumberMatch =
          table.label && table.label.toString().toLowerCase().includes(query);

        const customerName = getCustomerName(table);
        const customerNameMatch = customerName.toLowerCase().includes(query);

        return tableNumberMatch || customerNameMatch;
      });
    },
    [searchQuery, getCustomerName],
  );

  const filteredTables = useMemo(() => {
    const sorted = [...dbTables].sort((a: any, b: any) => {
      const numA = parseInt(a.label) || 0;
      const numB = parseInt(b.label) || 0;
      return numA - numB;
    });

    let baseFiltered = sorted.filter((t: any) => {
      const isSplitLabel = t.label && t.label.includes("-");
      const isVirtualFlag = t.isVirtual === true;
      const isVirtualSplit = isSplitLabel || isVirtualFlag;

      // SINKRONISASI KONDISI: Gunakan savedItems untuk mengevaluasi keaktifan meja di denah
      const hasActiveOrder =
        (t.savedItems && t.savedItems.length > 0) || t.currentBill > 0;

      if (activeSubTab === "SPLIT_BILL") {
        return isVirtualSplit && hasActiveOrder;
      }

      if (isVirtualSplit) return false;

      return hasActiveOrder;
    });

    return applySearchFilter(baseFiltered);
  }, [dbTables, activeSubTab, applySearchFilter]);

  const searchSuggestions = useMemo(() => {
    if (!searchQuery.trim()) return [];

    const query = searchQuery.toLowerCase().trim();
    const suggestionsSet = new Set<string>();

    dbTables.forEach((table: any) => {
      const hasActiveOrder =
        (table.savedItems && table.savedItems.length > 0) ||
        table.currentBill > 0;
      if (!hasActiveOrder) return;

      if (table.label && table.label.toString().toLowerCase().includes(query)) {
        suggestionsSet.add(`Meja ${table.label}`);
      }

      const customerName = getCustomerName(table);
      if (customerName.toLowerCase().includes(query)) {
        suggestionsSet.add(`📋 ${customerName} (Meja ${table.label})`);
      }
    });

    return Array.from(suggestionsSet).slice(0, 5);
  }, [dbTables, searchQuery, getCustomerName]);

  const handleSelectSuggestion = useCallback((suggestion: string) => {
    const match = suggestion.match(/Meja (\d+)/);
    if (match) {
      setSearchQuery(match[1]);
    } else {
      setSearchQuery(suggestion);
    }
  }, []);

  const handleOpenNewTable = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();

      if (!nomorMeja || !namaTamu.trim()) {
        showToast("Harap isi nomor meja dan nama tamu!", "ERROR");
        return;
      }

      const targetLabel = nomorMeja.trim();

      const isTableExist = dbTables.some((t: any) => {
        const isSameLabel =
          t.label && t.label.toLowerCase() === targetLabel.toLowerCase();
        const isNotSplit = !t.label || !t.label.includes("-");
        const hasActiveOrder =
          (t.savedItems && t.savedItems.length > 0) || t.currentBill > 0;
        return isSameLabel && isNotSplit && hasActiveOrder;
      });

      if (isTableExist) {
        showToast(
          `Meja ${targetLabel} saat ini sedang aktif digunakan!`,
          "ERROR",
        );
        return;
      }

      sessionStorage.setItem(
        `asstro_tamu_meja_${targetLabel}`,
        namaTamu.trim().toUpperCase(),
      );

      setNomorMeja("");
      setNamaTamu("");
      setIsModalOpen(false);

      onSelectTable(targetLabel, "OPENED");
    },
    [nomorMeja, namaTamu, dbTables, showToast, onSelectTable],
  );

  // LOGIKA UTAMAKAN KOKOH: Set state meja aktif ke central POS saat klik ikon mata preview
  const handleOpenQuickViewDrawer = useCallback(
    (e: React.MouseEvent, table: any) => {
      e.stopPropagation();

      if (dispatch) {
        dispatch({ type: "SET_SELECTED_TABLE", payload: table.label });
      }

      setPreviewTableData(table);
      setIsDrawerRendered(true);

      if (drawerTimeoutRef.current) {
        clearTimeout(drawerTimeoutRef.current);
      }

      drawerTimeoutRef.current = setTimeout(() => {
        setIsDrawerVisible(true);
      }, 20);
    },
    [dispatch],
  );

  // LOGIKA DIPERBAIKI SANGAT AMAN: Kembalikan selectedTable ke null untuk mencegah bug state luar
  const handleCloseDrawerWithAnimation = useCallback(() => {
    setIsDrawerVisible(false);

    if (drawerTimeoutRef.current) {
      clearTimeout(drawerTimeoutRef.current);
    }

    drawerTimeoutRef.current = setTimeout(() => {
      setIsDrawerRendered(false);
      setPreviewTableData(null);

      // Proteksi anti-bug: Kembalikan selectedTable menjadi null agar state luar tidak terkunci
      if (dispatch) {
        dispatch({ type: "SET_SELECTED_TABLE", payload: null });
      }
    }, 250);
  }, [dispatch]);

  const handleBackdropClick = useCallback(() => {
    if (isDrawerVisible) {
      handleCloseDrawerWithAnimation();
    }
  }, [isDrawerVisible, handleCloseDrawerWithAnimation]);

  const handleModalClose = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  const handleNavigateToFullTransaction = useCallback(() => {
    const label = previewTableData?.label;
    const status = previewTableData?.status;

    if (!label) return;

    setIsDrawerVisible(false);

    if (drawerTimeoutRef.current) {
      clearTimeout(drawerTimeoutRef.current);
    }

    drawerTimeoutRef.current = setTimeout(() => {
      setIsDrawerRendered(false);
      setPreviewTableData(null);

      // Saat berpindah ke transaksi penuh, biarkan status selectedTable tetap aktif untuk dibaca PosModule
      onSelectTable(label, status);
    }, 250);
  }, [previewTableData, onSelectTable]);

  return (
    <div
      onClick={handleBackdropClick}
      className="flex-1 flex flex-col p-4 md:p-6 overflow-y-auto w-full h-full text-slate-900 bg-[#F8FAFC] relative"
    >
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 mb-6 shrink-0">
        <div className="flex bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm gap-2">
          <button
            type="button"
            onClick={() => setActiveSubTab("SEMUA")}
            className={`px-4 md:px-6 py-2.5 rounded-lg font-black text-xs uppercase tracking-wider transition-all duration-150 cursor-pointer ${
              activeSubTab === "SEMUA"
                ? "bg-slate-900 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-900"
            }`}
          >
            Transaksi Aktif
          </button>

          {hasSplitTables && (
            <button
              type="button"
              onClick={() => setActiveSubTab("SPLIT_BILL")}
              className={`px-4 md:px-6 py-2.5 rounded-lg font-black text-xs uppercase tracking-wider transition-all duration-150 border-2 flex items-center gap-1.5 ${
                activeSubTab === "SPLIT_BILL"
                  ? "bg-orange-600 border-orange-600 text-white shadow-sm"
                  : "bg-orange-50 border-orange-200 text-orange-600 hover:bg-orange-100"
              }`}
            >
              <Layers size={12} />
              Split Bill Aktif
            </button>
          )}
        </div>

        <div className="relative w-full sm:w-80">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              size={18}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nomor meja atau nama pelanggan..."
              className="w-full pl-10 pr-4 py-2.5 border-2 border-slate-200 rounded-xl focus:border-slate-900 focus:outline-none font-medium text-sm transition-all duration-150 text-slate-900 placeholder:text-slate-400"
              autoComplete="off"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors duration-150"
                aria-label="Clear search"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {searchSuggestions.length > 0 && (
            <div className="absolute z-10 mt-2 w-full bg-white border-2 border-slate-200 rounded-xl shadow-lg overflow-hidden">
              {searchSuggestions.map((suggestion, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelectSuggestion(suggestion)}
                  className="w-full text-left px-4 py-2.5 hover:bg-slate-50 transition-colors duration-150 text-sm font-medium text-slate-700 border-b border-slate-100 last:border-b-0 flex items-center gap-2"
                >
                  <Search size={14} className="text-slate-400" />
                  <span>{suggestion}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {searchQuery && (
        <div className="mb-4 px-2">
          <p className="text-xs text-slate-500 font-medium">
            Menampilkan {filteredTables.length} hasil untuk "{searchQuery}"
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-4 md:gap-5">
        {activeSubTab === "SEMUA" && !searchQuery && (
          <div
            onClick={() => setIsModalOpen(true)}
            className="aspect-4/4.5 sm:aspect-square rounded-3xl border-2 border-dashed border-slate-300 bg-white hover:border-slate-500 hover:bg-slate-50 flex flex-col items-center justify-center p-4 transition-all duration-150 cursor-pointer active:scale-95 group select-none shadow-sm min-h-37.5"
          >
            <div className="p-3 bg-slate-100 group-hover:bg-slate-200 rounded-full text-slate-600 mb-3 transition-all duration-150">
              <Plus size={24} />
            </div>
            <span className="font-black text-xs uppercase tracking-wider text-slate-600 group-hover:text-slate-900 text-center px-1">
              Buka Meja Baru
            </span>
          </div>
        )}

        {filteredTables.length === 0 && searchQuery && (
          <div className="col-span-full flex flex-col items-center justify-center py-12">
            <div className="p-4 bg-white rounded-full mb-4 shadow-sm">
              <Search size={32} className="text-slate-400" />
            </div>
            <p className="text-slate-500 font-medium text-center px-4">
              Tidak ada meja atau pelanggan yang cocok dengan "{searchQuery}"
            </p>
            <button
              onClick={() => setSearchQuery("")}
              className="mt-4 text-sm text-slate-900 font-semibold underline hover:no-underline transition-colors duration-150"
            >
              Clear Search
            </button>
          </div>
        )}

        {filteredTables.map((table: any) => {
          const isRequestPay = table.status === "REQUEST_BAYAR";
          const orderTimeStr = getOrderTime(table);

          let styleCard =
            "bg-gradient-to-br from-emerald-600 to-emerald-700 border-emerald-500 text-white shadow-md hover:from-emerald-700 hover:to-emerald-800";
          if (isRequestPay) {
            styleCard =
              "bg-gradient-to-br from-red-600 to-red-700 border-red-500 text-white shadow-xl hover:from-red-700 hover:to-red-800";
          }

          const namaPelangganTerdaftar = getCustomerName(table);

          return (
            <div
              key={table.id || table.label}
              onClick={() => onSelectTable(table.label, table.status)}
              className={`aspect-4/4.5 sm:aspect-square rounded-3xl border-2 p-3 md:p-4 flex flex-col justify-between transition-all duration-150 relative cursor-pointer active:scale-95 group shadow-md select-none min-h-37.5 ${styleCard}`}
            >
              <div className="flex justify-between items-start w-full gap-2 shrink-0">
                <div className="text-[11px] md:text-xs font-black tracking-tight uppercase bg-black/20 px-2 py-1 rounded-lg truncate max-w-[65%]">
                  {table.currentBill > 0
                    ? `Rp ${table.currentBill.toLocaleString("id-ID")}`
                    : "Rp 0"}
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={(e) => handleOpenQuickViewDrawer(e, table)}
                    className="text-white bg-white/20 hover:bg-white/30 p-1.5 rounded-lg shrink-0 transition-all duration-150 cursor-pointer"
                    title="Intip Pesanan Samping"
                    aria-label="Preview order"
                  >
                    <Eye size={13} />
                  </button>
                  <div className="text-white/70 bg-white/20 p-1.5 rounded-lg shrink-0">
                    <Utensils size={13} />
                  </div>
                </div>
              </div>

              <div className="flex-1 flex flex-col items-center justify-center my-1 min-h-0">
                {orderTimeStr && (
                  <div className="flex items-center gap-1 bg-black/25 text-white/90 px-2 py-0.5 rounded-full text-[10px] font-black tracking-wide uppercase mb-1">
                    <Clock size={10} className="shrink-0" />
                    <span>{orderTimeStr}</span>
                  </div>
                )}

                <h3 className="font-black tracking-tighter leading-none block text-center uppercase text-3xl sm:text-4xl lg:text-5xl truncate w-full px-1">
                  {table.label}
                </h3>

                {searchQuery &&
                  namaPelangganTerdaftar
                    .toLowerCase()
                    .includes(searchQuery.toLowerCase()) && (
                    <span className="mt-1 text-[9px] font-bold bg-white/20 px-2 py-0.5 rounded-full uppercase tracking-wider">
                      Match Name
                    </span>
                  )}
              </div>

              <div className="border-t border-white/20 pt-2 flex flex-col gap-1 w-full shrink-0">
                <div className="flex items-start gap-1.5 text-xs font-black h-9 overflow-hidden">
                  <Users size={13} className="shrink-0 opacity-80 mt-0.5" />
                  <span className="line-clamp-2 leading-tight text-[11px] md:text-xs wrap-break-word w-full font-bold">
                    {namaPelangganTerdaftar}
                  </span>
                </div>

                <div className="flex justify-end items-center w-full">
                  <span className="text-[9px] font-black tracking-wider px-2 py-0.5 rounded-md uppercase bg-white/20 text-white">
                    {table.status === "TERISI" ? "OPENED" : table.status}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {isDrawerRendered && previewTableData && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            onClick={handleCloseDrawerWithAnimation}
            className={`absolute inset-0 bg-slate-950/60 transition-opacity duration-250 ${
              isDrawerVisible ? "opacity-100" : "opacity-0"
            }`}
          />

          <div
            onClick={(e) => e.stopPropagation()}
            className={`relative w-full max-w-xs md:max-w-sm h-full bg-slate-900 text-white shadow-2xl flex flex-col z-10 transition-transform duration-250 ease-out will-change-transform ${
              isDrawerVisible ? "translate-x-0" : "translate-x-full"
            }`}
          >
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-slate-950">
              <div className="flex items-center gap-2 min-w-0">
                <ShoppingBag size={16} className="text-orange-400 shrink-0" />
                <h4 className="font-black text-xs uppercase tracking-wider truncate">
                  Meja {previewTableData.label} -{" "}
                  {getCustomerName(previewTableData)}
                </h4>
              </div>
              <button
                type="button"
                onClick={handleCloseDrawerWithAnimation}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-all duration-150 cursor-pointer"
                aria-label="Close drawer"
              >
                <X size={16} />
              </button>
            </div>

            {/* ISI ITEM PREVIEW: Murni membaca dari properti savedItems milik objek meja target */}
            <div className="flex-1 p-4 overflow-y-auto space-y-2">
              <span className="text-[10px] text-slate-400 font-black tracking-widest uppercase block mb-2">
                Daftar Menu Terkirim Dapur:
              </span>

              {!previewTableData.savedItems ||
              previewTableData.savedItems.length === 0 ? (
                <div className="h-40 flex flex-col items-center justify-center text-slate-500 italic text-xs font-black uppercase tracking-widest text-center">
                  Belum Ada Menu Tersimpan
                </div>
              ) : (
                previewTableData.savedItems.map((item: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-3 bg-white/5 border border-white/10 rounded-xl flex justify-between items-center gap-3 animate-fade-in"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-black text-xs text-white uppercase tracking-tight truncate">
                        {item.name}
                      </p>
                      {item.note && (
                        <p className="text-[10px] font-medium text-slate-400 italic truncate mt-0.5">
                          NB: {item.note}
                        </p>
                      )}
                    </div>
                    <span className="font-black text-xs text-orange-400 shrink-0 bg-orange-500/10 px-2 py-1 rounded-lg border border-orange-500/20">
                      x{item.qty}
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 bg-slate-950 border-t border-white/10 space-y-2 text-xs font-bold uppercase tracking-wide text-slate-400">
              <div className="flex justify-between items-center">
                <span>Total Sementara:</span>
                <span className="text-white font-black text-sm">
                  Rp{" "}
                  {(previewTableData.currentBill || 0).toLocaleString("id-ID")}
                </span>
              </div>
              <button
                type="button"
                onClick={handleNavigateToFullTransaction}
                className="w-full bg-orange-600 hover:bg-orange-500 text-white font-black text-xs uppercase tracking-widest py-3 rounded-xl transition-all duration-150 shadow-md active:scale-[0.98] mt-2 cursor-pointer"
              >
                Buka Transaksi Penuh
              </button>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-4xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden p-6 relative">
            <button
              type="button"
              onClick={handleModalClose}
              className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-all duration-150"
              aria-label="Close modal"
            >
              <X size={16} />
            </button>

            <div className="mb-5">
              <h3 className="font-black text-base uppercase tracking-wider text-slate-900">
                Inisialisasi Meja Baru
              </h3>
              <p className="text-xs text-slate-400 font-medium">
                Sistem Otomatisasi On-Demand Tanpa Konfigurasi Awal ruko.
              </p>
            </div>

            <form onSubmit={handleOpenNewTable} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">
                  Nomor Meja (Angka Murni)
                </label>
                <input
                  type="number"
                  pattern="[0-6]*"
                  inputMode="numeric"
                  autoFocus
                  required
                  value={nomorMeja}
                  onChange={(e) => setNomorMeja(e.target.value)}
                  placeholder="Contoh: 2"
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-slate-900 focus:outline-none font-black text-sm transition-all duration-150 text-slate-900 placeholder:text-slate-300 placeholder:font-normal"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">
                  Nama Tamu / Pelanggan
                </label>
                <input
                  type="text"
                  required
                  value={namaTamu}
                  onChange={(e) => setNamaTamu(e.target.value)}
                  placeholder="Contoh: Ojak"
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-slate-900 focus:outline-none font-black text-sm transition-all duration-150 text-slate-900 placeholder:text-slate-300 placeholder:font-normal"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-widest py-3.5 rounded-xl transition-all duration-150 shadow-md shadow-slate-900/10 active:scale-[0.98]"
              >
                Inisialisasi & Buka Order
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
