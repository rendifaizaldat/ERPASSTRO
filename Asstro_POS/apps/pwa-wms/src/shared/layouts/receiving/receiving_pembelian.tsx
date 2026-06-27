import React from "react";
import { Search, Plus, Minus, Trash2, Save, LayoutGrid } from "lucide-react";
import { useWms } from "../../../core/WmsProvider";

interface ReceivingPembelianProps {
  isPusat: boolean;
  targetEntity: string;
  setTargetEntity: (val: string) => void;
  tanggalPenerimaan: string;
  setTanggalPenerimaan: (val: string) => void;
  paymentMethod: "CASH" | "TEMPO" | "MUTASI";
  setPaymentMethod: (val: "CASH" | "TEMPO" | "MUTASI") => void;
  fundingSource: "PETTY_CASH" | "KASIR" | "PRIBADI" | "";
  setFundingSource: (val: any) => void;
  reimburseName: string;
  setReimburseName: (val: string) => void;
  tanggalJatuhTempo: string;
  setTanggalJatuhTempo: (val: string) => void;
  rekeningNumber: string;
  setRekeningNumber: (val: string) => void;
  rekeningName: string;
  setRekeningName: (val: string) => void;
  sourceEntity: string;
  setSourceEntity: (val: string) => void;
  invoiceNumber: string;
  setInvoiceNumber: (val: string) => void;
  proofFile: File | null;
  setProofFile: (val: File | null) => void;
  cart: any[];
  loading: boolean;
  inlineSearch: string;
  setInlineSearch: (val: string) => void;
  showDropdown: boolean;
  setShowDropdown: (val: boolean) => void;
  dropdownRef: React.RefObject<HTMLDivElement>;
  fileInputRef: React.RefObject<HTMLInputElement>;
  tempQtyMap: Record<string, string>;
  regionProducts: any[];
  branches: any[];
  regions: any[];
  vendors: any[];
  regionalVendors: any[];
  pusatLokalName: string;
  cleanNum: (num: number) => number;
  handleUpdateQty: (productId: string, newQty: number | string) => void;
  handleRemoveItem: (productId: string) => void;
  handleQtyChange: (productId: string, rawValue: string) => void;
  handleQtyCommit: (productId: string) => void;
  handleQtyReset: (productId: string) => void;
  handleSubmit: () => void;
  filteredInlineSearch: any[];
  handleInlineSearchKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  totalEstimasi: number;
  isHideUpload: boolean;
}

export const ReceivingPembelian: React.FC<ReceivingPembelianProps> = ({
  isPusat,
  targetEntity,
  setTargetEntity,
  tanggalPenerimaan,
  setTanggalPenerimaan,
  paymentMethod,
  setPaymentMethod,
  fundingSource,
  setFundingSource,
  reimburseName,
  setReimburseName,
  tanggalJatuhTempo,
  setTanggalJatuhTempo,
  rekeningNumber,
  setRekeningNumber,
  rekeningName,
  setRekeningName,
  sourceEntity,
  setSourceEntity,
  invoiceNumber,
  setInvoiceNumber,
  proofFile,
  setProofFile,
  cart,
  loading,
  inlineSearch,
  setInlineSearch,
  showDropdown,
  setShowDropdown,
  dropdownRef,
  fileInputRef,
  tempQtyMap,
  regionProducts,
  branches,
  regionalVendors,
  pusatLokalName,
  cleanNum,
  handleUpdateQty,
  handleRemoveItem,
  handleQtyChange,
  handleQtyCommit,
  handleQtyReset,
  handleSubmit,
  filteredInlineSearch,
  handleInlineSearchKeyDown,
  totalEstimasi,
  isHideUpload,
}) => {
  const { wmsState } = useWms();

  // =============================================
  // VARIAN PUSAT
  // =============================================
  if (isPusat) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Panel Kiri */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 space-y-4">
            <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
              <span className="w-1 h-4 bg-sky-500 rounded-full" />
              Informasi Transaksi
            </h3>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                Pilih Outlet Tujuan
              </label>
              <select
                value={targetEntity}
                onChange={(e) => setTargetEntity(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
              >
                <option value="" disabled>
                  -- PILIH CABANG --
                </option>
                {branches
                  .filter((b) => {
                    const isPusatEntity =
                      b.name.toLowerCase().includes("pusat") ||
                      b.code.toLowerCase().includes("pst");
                    return !isPusatEntity && b.regionId === wmsState?.regionId;
                  })
                  .map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                Tanggal Transaksi
              </label>
              <input
                type="date"
                value={tanggalPenerimaan}
                onChange={(e) => setTanggalPenerimaan(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
              />
            </div>
          </div>
        </div>

        {/* Panel Kanan: Tabel */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm flex flex-col min-h-[500px]">
            {/* Search bar */}
            <div className="p-5 border-b border-slate-100">
              <div className="relative">
                <Search
                  size={18}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  placeholder={
                    targetEntity ? "Cari barang..." : "Pilih outlet dulu..."
                  }
                  value={inlineSearch}
                  disabled={!targetEntity}
                  onFocus={() => setShowDropdown(true)}
                  onChange={(e) => {
                    setInlineSearch(e.target.value);
                    setShowDropdown(true);
                  }}
                  onKeyDown={handleInlineSearchKeyDown}
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all disabled:opacity-50"
                />
                {/* Dropdown hasil pencarian */}
                {showDropdown && inlineSearch && (
                  <div
                    ref={dropdownRef}
                    className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden z-50 max-h-60 overflow-y-auto"
                  >
                    {filteredInlineSearch.length > 0 ? (
                      filteredInlineSearch.map((p) => (
                        <div
                          key={p.id}
                          onClick={() => {
                            handleUpdateQty(p.id, 1);
                            setInlineSearch("");
                            setShowDropdown(false);
                          }}
                          className="px-4 py-3 hover:bg-sky-50 cursor-pointer border-b border-slate-50 transition-colors"
                        >
                          <p className="font-semibold text-sm text-slate-800">
                            {p.localName}
                          </p>
                          <p className="text-xs font-medium text-sky-600">
                            HPP: Rp{" "}
                            {(p.purchasePrice || 0).toLocaleString("id-ID")}
                          </p>
                        </div>
                      ))
                    ) : (
                      <div className="px-4 py-6 text-center text-sm font-medium text-slate-400">
                        Produk tidak ditemukan
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Tabel */}
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-sm">
                <thead className="bg-slate-50/80 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-3 text-left">Produk</th>
                    <th className="px-6 py-3 text-center w-40">Qty Masuk</th>
                    <th className="px-6 py-3 text-right">Subtotal</th>
                    <th className="px-6 py-3 text-center w-16"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {cart.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="text-center py-20 text-slate-400"
                      >
                        <LayoutGrid
                          size={40}
                          className="mx-auto mb-3 opacity-20"
                        />
                        <p className="font-bold text-xs uppercase tracking-wider">
                          Belum Ada Barang
                        </p>
                      </td>
                    </tr>
                  ) : (
                    cart.map((item) => {
                      const displayValue =
                        tempQtyMap[item.product_id] ?? item.qty.toString();
                      return (
                        <tr
                          key={item.product_id}
                          className="hover:bg-slate-50/50 transition-colors"
                        >
                          <td className="px-6 py-4">
                            <p className="font-bold text-sm text-slate-800">
                              {item.nama}
                            </p>
                            <p className="text-[11px] font-medium text-slate-500 mt-0.5">
                              @ Rp {item.harga.toLocaleString("id-ID")} /{" "}
                              {item.uom}
                            </p>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => {
                                  handleUpdateQty(
                                    item.product_id,
                                    cleanNum(item.qty - 1),
                                  );
                                  handleQtyReset(item.product_id);
                                }}
                                className="w-7 h-7 rounded-lg border border-slate-200 bg-white flex items-center justify-center text-slate-400 hover:text-red-500 hover:border-red-200 transition-all"
                              >
                                <Minus size={12} />
                              </button>
                              <input
                                type="text"
                                value={displayValue}
                                onChange={(e) =>
                                  handleQtyChange(
                                    item.product_id,
                                    e.target.value,
                                  )
                                }
                                onBlur={() => handleQtyCommit(item.product_id)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    handleQtyCommit(item.product_id);
                                  } else if (e.key === "Escape")
                                    handleQtyReset(item.product_id);
                                }}
                                className="w-14 text-center font-bold text-sm text-slate-700 bg-slate-100 rounded-lg py-1.5 outline-none focus:ring-2 focus:ring-sky-500/20"
                              />
                              <button
                                onClick={() => {
                                  handleUpdateQty(
                                    item.product_id,
                                    cleanNum(item.qty + 1),
                                  );
                                  handleQtyReset(item.product_id);
                                }}
                                className="w-7 h-7 rounded-lg border border-slate-200 bg-white flex items-center justify-center text-slate-400 hover:text-green-500 hover:border-green-200 transition-all"
                              >
                                <Plus size={12} />
                              </button>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right font-bold text-slate-700">
                            Rp {item.subtotal.toLocaleString("id-ID")}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <button
                              onClick={() => handleRemoveItem(item.product_id)}
                              className="text-slate-300 hover:text-red-500 p-1 transition-colors"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer tabel: Total + Simpan */}
            <div className="p-5 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
              <span className="font-bold text-lg text-slate-800">
                Total: Rp {totalEstimasi.toLocaleString("id-ID")}
              </span>
              <button
                onClick={() => handleSubmit()}
                disabled={loading || cart.length === 0}
                className="bg-sky-600 text-white px-8 py-3 rounded-xl font-bold text-xs uppercase tracking-wider shadow-sm shadow-sky-200 hover:bg-sky-700 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2"
              >
                <Save size={16} /> Simpan Transaksi
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =============================================
  // VARIAN OUTLET
  // =============================================
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Panel Kiri: Sumber & Pembayaran */}
      <div className="space-y-6">
        {/* Sumber / Pihak Lawan */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 space-y-4">
          <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
            <span className="w-1 h-4 bg-sky-500 rounded-full" />
            Sumber / Pihak Lawan
          </h3>
          <div className="space-y-3">
            <select
              value={sourceEntity}
              onChange={(e) => setSourceEntity(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
            >
              <option value="" disabled>
                -- SUMBER / VENDOR --
              </option>
              <option value={pusatLokalName}>{pusatLokalName}</option>
              {regionalVendors.map((v) => (
                <option key={v.id} value={v.name}>
                  {v.name} (Vendor)
                </option>
              ))}
            </select>
            {sourceEntity !== pusatLokalName && sourceEntity !== "" && (
              <input
                type="text"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="No Invoice Eksternal"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
              />
            )}
          </div>
        </div>

        {/* Detail Pembayaran & Bukti */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 space-y-4">
          <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
            <span className="w-1 h-4 bg-sky-500 rounded-full" />
            Detail Pembayaran & Bukti
          </h3>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[150px]">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Tanggal Transaksi
              </label>
              <input
                type="date"
                value={tanggalPenerimaan}
                onChange={(e) => setTanggalPenerimaan(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
              />
            </div>
            <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => {
                  setPaymentMethod("CASH");
                  setTanggalJatuhTempo("");
                }}
                className={`px-4 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all ${
                  paymentMethod === "CASH"
                    ? "bg-white shadow-sm text-emerald-600"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                Cash
              </button>
              <button
                onClick={() => {
                  setPaymentMethod("TEMPO");
                  setFundingSource("");
                }}
                className={`px-4 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all ${
                  paymentMethod === "TEMPO"
                    ? "bg-white shadow-sm text-orange-600"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                Tempo
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            {paymentMethod === "CASH" ? (
              <div className="flex-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Sumber Dana
                </label>
                <select
                  value={fundingSource}
                  onChange={(e) => setFundingSource(e.target.value as any)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
                >
                  <option value="" disabled>
                    -- SUMBER UANG --
                  </option>
                  <option value="KASIR">Laci Kasir</option>
                  <option value="PETTY_CASH">Petty Cash</option>
                  <option value="PRIBADI">Uang Pribadi (Reimburse)</option>
                </select>
                {fundingSource === "PRIBADI" && (
                  <input
                    type="text"
                    value={reimburseName}
                    onChange={(e) => setReimburseName(e.target.value)}
                    placeholder="Nama Karyawan"
                    className="w-full mt-2 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
                  />
                )}
              </div>
            ) : (
              <div className="flex-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Tanggal Jatuh Tempo
                </label>
                <input
                  type="date"
                  value={tanggalJatuhTempo}
                  onChange={(e) => setTanggalJatuhTempo(e.target.value)}
                  className="w-full px-4 py-2.5 bg-orange-50 border border-orange-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                />
              </div>
            )}
            {!isHideUpload && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2.5 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={
                      proofFile ? "text-emerald-500" : "text-slate-400"
                    }
                  >
                    <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
                    <path d="M12 12v9" />
                    <path d="m16 16-4-4-4 4" />
                  </svg>
                </button>
                {proofFile && (
                  <span className="text-xs font-bold text-emerald-600">✓</span>
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  ref={fileInputRef}
                  onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Panel Kanan: Tabel (sama untuk outlet) */}
      <div className="lg:col-span-2">
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm flex flex-col min-h-[500px]">
          {/* Search bar */}
          <div className="p-5 border-b border-slate-100">
            <div className="relative">
              <Search
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                placeholder={
                  targetEntity ? "Cari barang..." : "Pilih outlet dulu..."
                }
                value={inlineSearch}
                disabled={!targetEntity}
                onFocus={() => setShowDropdown(true)}
                onChange={(e) => {
                  setInlineSearch(e.target.value);
                  setShowDropdown(true);
                }}
                onKeyDown={handleInlineSearchKeyDown}
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all disabled:opacity-50"
              />
              {showDropdown && inlineSearch && (
                <div
                  ref={dropdownRef}
                  className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden z-50 max-h-60 overflow-y-auto"
                >
                  {filteredInlineSearch.length > 0 ? (
                    filteredInlineSearch.map((p) => (
                      <div
                        key={p.id}
                        onClick={() => {
                          handleUpdateQty(p.id, 1);
                          setInlineSearch("");
                          setShowDropdown(false);
                        }}
                        className="px-4 py-3 hover:bg-sky-50 cursor-pointer border-b border-slate-50 transition-colors"
                      >
                        <p className="font-semibold text-sm text-slate-800">
                          {p.localName}
                        </p>
                        <p className="text-xs font-medium text-sky-600">
                          Rp {(p.purchasePrice || 0).toLocaleString("id-ID")}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="px-4 py-6 text-center text-sm font-medium text-slate-400">
                      Produk tidak ditemukan
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Tabel */}
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-sm">
              <thead className="bg-slate-50/80 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="px-6 py-3 text-left">Produk</th>
                  <th className="px-6 py-3 text-center w-40">Qty Masuk</th>
                  <th className="px-6 py-3 text-right">Subtotal</th>
                  <th className="px-6 py-3 text-center w-16"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cart.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="text-center py-20 text-slate-400"
                    >
                      <LayoutGrid
                        size={40}
                        className="mx-auto mb-3 opacity-20"
                      />
                      <p className="font-bold text-xs uppercase tracking-wider">
                        Belum Ada Barang
                      </p>
                    </td>
                  </tr>
                ) : (
                  cart.map((item) => {
                    const displayValue =
                      tempQtyMap[item.product_id] ?? item.qty.toString();
                    return (
                      <tr
                        key={item.product_id}
                        className="hover:bg-slate-50/50 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <p className="font-bold text-sm text-slate-800">
                            {item.nama}
                          </p>
                          <p className="text-[11px] font-medium text-slate-500 mt-0.5">
                            @ Rp {item.harga.toLocaleString("id-ID")} /{" "}
                            {item.uom}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => {
                                handleUpdateQty(
                                  item.product_id,
                                  cleanNum(item.qty - 1),
                                );
                                handleQtyReset(item.product_id);
                              }}
                              className="w-7 h-7 rounded-lg border border-slate-200 bg-white flex items-center justify-center text-slate-400 hover:text-red-500 hover:border-red-200 transition-all"
                            >
                              <Minus size={12} />
                            </button>
                            <input
                              type="text"
                              value={displayValue}
                              onChange={(e) =>
                                handleQtyChange(item.product_id, e.target.value)
                              }
                              onBlur={() => handleQtyCommit(item.product_id)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  handleQtyCommit(item.product_id);
                                } else if (e.key === "Escape")
                                  handleQtyReset(item.product_id);
                              }}
                              className="w-14 text-center font-bold text-sm text-slate-700 bg-slate-100 rounded-lg py-1.5 outline-none focus:ring-2 focus:ring-sky-500/20"
                            />
                            <button
                              onClick={() => {
                                handleUpdateQty(
                                  item.product_id,
                                  cleanNum(item.qty + 1),
                                );
                                handleQtyReset(item.product_id);
                              }}
                              className="w-7 h-7 rounded-lg border border-slate-200 bg-white flex items-center justify-center text-slate-400 hover:text-green-500 hover:border-green-200 transition-all"
                            >
                              <Plus size={12} />
                            </button>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right font-bold text-slate-700">
                          Rp {item.subtotal.toLocaleString("id-ID")}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => handleRemoveItem(item.product_id)}
                            className="text-slate-300 hover:text-red-500 p-1 transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Footer tabel: Total + Simpan */}
          <div className="p-5 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
            <span className="font-bold text-lg text-slate-800">
              Total: Rp {totalEstimasi.toLocaleString("id-ID")}
            </span>
            <button
              onClick={() => handleSubmit()}
              disabled={loading || cart.length === 0}
              className="bg-sky-600 text-white px-8 py-3 rounded-xl font-bold text-xs uppercase tracking-wider shadow-sm shadow-sky-200 hover:bg-sky-700 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2"
            >
              <Save size={16} /> Simpan Transaksi
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
