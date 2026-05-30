import React, { useState, useMemo } from "react";
import {
  X,
  FileBarChart,
  Printer,
  PieChart,
  Tag,
  ShieldAlert,
} from "lucide-react";
import { usePos } from "../../core/PosProvider";

export const SidebarReport = ({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) => {
  const { state } = usePos();
  const [activeTab, setActiveTab] = useState<"MOD" | "PLU" | "VOID">("MOD");

  // DATA EXTRACTION
  const transactions = state?.transactions || [];
  const pettyCash = state?.pettyCashTransactions || [];
  const audits = state?.auditLogs || [];

  // 1. MOD CALCULATIONS
  const modData = useMemo(() => {
    let totalGross = 0;
    let totalNet = 0;
    let totalTax = 0;
    let totalService = 0;
    const catSales: Record<string, { qty: number; total: number }> = {};
    const paymentSales: Record<string, number> = {};
    const staffSet = new Set<string>();

    transactions.forEach((tx: any) => {
      totalNet += tx.subtotal;
      totalTax += tx.tax_amount;
      totalService += tx.service_amount;
      totalGross += tx.grand_total; // Gross = Net + Tax + Service

      if (tx.cashierName) staffSet.add(tx.cashierName);
      if (tx.waiterName) staffSet.add(tx.waiterName);

      paymentSales[tx.payment_method] =
        (paymentSales[tx.payment_method] || 0) + tx.grand_total;

      tx.items.forEach((item: any) => {
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
      pettyCashOut += pc.amount_requested;
      if (pc.status === "COMPLETED") pettyCashOut -= pc.amount_returned;
      staffSet.add(pc.cashier_issued_name);
    });

    let totalVoid = 0;
    let totalRefund = 0;
    audits.forEach((a: any) => {
      if (a.type === "VOID") totalVoid += a.totalAmount;
      if (a.type === "REFUND") totalRefund += a.totalAmount;
    });

    return {
      totalTrx: transactions.length,
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
    };
  }, [transactions, pettyCash, audits]);

  // 2. PLU CALCULATIONS
  const pluData = useMemo(() => {
    const pluMap: Record<string, { qty: number; total: number }> = {};
    transactions.forEach((tx: any) => {
      tx.items.forEach((item: any) => {
        const activeQty = item.qty - (item.refundedQty || 0);
        if (activeQty > 0) {
          if (!pluMap[item.name]) pluMap[item.name] = { qty: 0, total: 0 };
          pluMap[item.name].qty += activeQty;
          pluMap[item.name].total += item.price * activeQty;
        }
      });
    });
    // Sort descending by qty sold
    return Object.entries(pluMap).sort((a, b) => b[1].qty - a[1].qty);
  }, [transactions]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-200 bg-slate-950/80 backdrop-blur-sm flex justify-end animate-fade-in print:bg-white print:static print:block">
      <div className="w-full md:max-w-4xl bg-white h-full shadow-2xl flex flex-col border-l border-slate-200 transform transition-transform print:max-w-none print:border-none print:shadow-none print:h-auto">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50 shrink-0 print:hidden">
          <div className="flex items-center gap-2">
            <FileBarChart size={18} className="text-slate-800" />
            <h2 className="font-black text-sm uppercase tracking-wider text-slate-800">
              Report & Rekapitulasi Kasir
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-1.5 bg-slate-900 text-white font-black uppercase text-[10px] rounded-lg flex items-center gap-2 hover:bg-slate-800 cursor-pointer"
            >
              <Printer size={12} /> Print PDF
            </button>
            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-slate-900 cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="flex border-b border-slate-200 shrink-0 bg-white print:hidden">
          <button
            onClick={() => setActiveTab("MOD")}
            className={`flex-1 py-3 text-center text-xs uppercase font-black tracking-tight border-b-2 cursor-pointer transition-all flex items-center justify-center gap-2 ${activeTab === "MOD" ? "border-orange-600 text-slate-900 bg-orange-50/30" : "border-transparent text-slate-400 hover:text-slate-800"}`}
          >
            <PieChart size={14} /> MOD (Closing)
          </button>
          <button
            onClick={() => setActiveTab("PLU")}
            className={`flex-1 py-3 text-center text-xs uppercase font-black tracking-tight border-b-2 cursor-pointer transition-all flex items-center justify-center gap-2 ${activeTab === "PLU" ? "border-orange-600 text-slate-900 bg-orange-50/30" : "border-transparent text-slate-400 hover:text-slate-800"}`}
          >
            <Tag size={14} /> PLU (Item Sales)
          </button>
          <button
            onClick={() => setActiveTab("VOID")}
            className={`flex-1 py-3 text-center text-xs uppercase font-black tracking-tight border-b-2 cursor-pointer transition-all flex items-center justify-center gap-2 ${activeTab === "VOID" ? "border-orange-600 text-slate-900 bg-orange-50/30" : "border-transparent text-slate-400 hover:text-slate-800"}`}
          >
            <ShieldAlert size={14} /> VOID / REFUND
          </button>
        </div>

        <div className="flex-1 overflow-auto p-5 bg-slate-100 scrollbar-thin print:bg-white print:p-0">
          {/* TAB MOD */}
          {activeTab === "MOD" && (
            <div className="space-y-4 max-w-2xl mx-auto animate-fade-in print:max-w-none text-slate-800">
              <div className="text-center mb-6 hidden print:block">
                <h1 className="font-black text-2xl uppercase">
                  Laporan Closing MOD
                </h1>
                <p className="text-xs text-slate-500">
                  Dicetak: {new Date().toLocaleString("id-ID")}
                </p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm print:border-none print:shadow-none print:p-0">
                <h3 className="font-black text-xs uppercase border-b pb-2 mb-3 text-slate-900">
                  Summary Transaksi
                </h3>
                <div className="space-y-2 text-sm font-bold">
                  <div className="flex justify-between">
                    <span className="text-slate-500">
                      Total Transaksi Lunas
                    </span>
                    <span>{modData.totalTrx} Trx</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Gross Sales</span>
                    <span>Rp {modData.totalGross.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Tax PPN</span>
                    <span className="text-red-500">
                      - Rp {modData.totalTax.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Service Charge</span>
                    <span className="text-red-500">
                      - Rp {modData.totalService.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 border-t font-black text-green-600">
                    <span className="uppercase">Net Sales Bersih</span>
                    <span>Rp {modData.totalNet.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm print:border-none print:shadow-none print:p-0">
                <h3 className="font-black text-xs uppercase border-b pb-2 mb-3 text-slate-900">
                  Uang Masuk Berdasarkan Metode
                </h3>
                <div className="space-y-2 text-sm font-bold">
                  {Object.entries(modData.paymentSales).length === 0 ? (
                    <p className="text-xs text-slate-400">
                      Tidak ada uang masuk.
                    </p>
                  ) : (
                    Object.entries(modData.paymentSales).map(
                      ([method, amount]) => (
                        <div
                          key={method}
                          className="flex justify-between items-center"
                        >
                          <span className="uppercase text-slate-500">
                            - {method}
                          </span>
                          <span className="text-green-600">
                            Rp {amount.toLocaleString()}
                          </span>
                        </div>
                      ),
                    )
                  )}
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm print:border-none print:shadow-none print:p-0">
                <h3 className="font-black text-xs uppercase border-b pb-2 mb-3 text-slate-900">
                  Deduction (Pengurangan Kas & Audit)
                </h3>
                <div className="space-y-2 text-sm font-bold">
                  <div className="flex justify-between">
                    <span className="text-slate-500">
                      Total VOID (Batal Sebelum Cetak)
                    </span>
                    <span className="text-red-500">
                      Rp {modData.totalVoid.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">
                      Total REFUND (Uang Kembali)
                    </span>
                    <span className="text-red-500">
                      Rp {modData.totalRefund.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 border-t">
                    <span className="text-slate-500">
                      Pengeluaran Kasir / Petty Cash
                    </span>
                    <span className="text-orange-500">
                      Rp {modData.pettyCashOut.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm print:border-none print:shadow-none print:p-0">
                <h3 className="font-black text-xs uppercase border-b pb-2 mb-3 text-slate-900">
                  Kategori Produk Terjual
                </h3>
                <div className="space-y-2 text-sm font-bold">
                  {Object.entries(modData.catSales).length === 0 ? (
                    <p className="text-xs text-slate-400">
                      Belum ada item terjual.
                    </p>
                  ) : (
                    Object.entries(modData.catSales).map(([cat, data]) => (
                      <div
                        key={cat}
                        className="flex justify-between items-center border-b border-slate-50 pb-2"
                      >
                        <span className="uppercase text-slate-500">
                          {cat}{" "}
                          <span className="text-xs font-black text-slate-800 ml-2">
                            (x{data.qty})
                          </span>
                        </span>
                        <span>Rp {data.total.toLocaleString()}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm print:border-none print:shadow-none print:p-0">
                <h3 className="font-black text-xs uppercase border-b pb-2 mb-3 text-slate-900">
                  Staf Terlibat Hari Ini
                </h3>
                <div className="flex flex-wrap gap-2">
                  {modData.staffList.map((name, i) => (
                    <span
                      key={i}
                      className="px-3 py-1 bg-slate-100 border rounded-lg text-xs font-black uppercase text-slate-600"
                    >
                      {name}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB PLU */}
          {activeTab === "PLU" && (
            <div className="animate-fade-in text-slate-800">
              <div className="text-center mb-6 hidden print:block">
                <h1 className="font-black text-2xl uppercase">
                  Laporan PLU Item Terjual
                </h1>
                <p className="text-xs text-slate-500">
                  Dicetak: {new Date().toLocaleString("id-ID")}
                </p>
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm print:border-none print:shadow-none">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-900 text-white text-[10px] uppercase font-black tracking-wider print:bg-slate-200 print:text-black">
                    <tr>
                      <th className="p-3 w-12 text-center">No</th>
                      <th className="p-3">Nama Produk (Menu)</th>
                      <th className="p-3 text-center">Qty Terjual</th>
                      <th className="p-3 text-right">Total Rupiah</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs font-bold text-slate-700">
                    {pluData.length === 0 ? (
                      <tr>
                        <td
                          colSpan={4}
                          className="p-6 text-center text-slate-400"
                        >
                          Data penjualan masih kosong.
                        </td>
                      </tr>
                    ) : (
                      pluData.map(([name, data], idx) => (
                        <tr key={idx} className="border-b border-slate-100">
                          <td className="p-3 text-center text-slate-400">
                            {idx + 1}
                          </td>
                          <td className="p-3 uppercase">{name}</td>
                          <td className="p-3 text-center font-black text-slate-900">
                            {data.qty}
                          </td>
                          <td className="p-3 text-right text-green-600">
                            Rp {data.total.toLocaleString()}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB VOID/REFUND */}
          {activeTab === "VOID" && (
            <div className="animate-fade-in text-slate-800">
              <div className="text-center mb-6 hidden print:block">
                <h1 className="font-black text-2xl uppercase">
                  Laporan Audit Void & Refund
                </h1>
                <p className="text-xs text-slate-500">
                  Dicetak: {new Date().toLocaleString("id-ID")}
                </p>
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm print:border-none print:shadow-none">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-900 text-white text-[10px] uppercase font-black tracking-wider print:bg-slate-200 print:text-black">
                    <tr>
                      <th className="p-3">Tgl & Jam</th>
                      <th className="p-3">Meja / Cust</th>
                      <th className="p-3">Item Di-Audit</th>
                      <th className="p-3">Nilai (Rp)</th>
                      <th className="p-3">Kasir & Manager</th>
                      <th className="p-3">Catatan</th>
                      <th className="p-3 text-center">Jenis</th>
                    </tr>
                  </thead>
                  <tbody className="text-[11px] font-bold text-slate-700">
                    {audits.length === 0 ? (
                      <tr>
                        <td
                          colSpan={7}
                          className="p-6 text-center text-slate-400"
                        >
                          Tidak ada riwayat pembatalan/pengembalian hari ini.
                        </td>
                      </tr>
                    ) : (
                      audits.map((a: any, idx: number) => {
                        const dt = new Date(a.timestamp);
                        return (
                          <tr key={idx} className="border-b border-slate-100">
                            <td className="p-3">
                              {dt.toLocaleDateString("id-ID")}
                              <br />
                              <span className="text-[9px] text-slate-400">
                                {dt.toLocaleTimeString("id-ID")}
                              </span>
                            </td>
                            <td className="p-3">
                              <span className="block font-black uppercase text-slate-900">
                                {a.tableOrInvoice}
                              </span>
                              <span className="text-[9px] text-slate-500">
                                {a.customerName}
                              </span>
                            </td>
                            <td className="p-3 text-red-600 uppercase max-w-37.5">
                              {a.itemsInfo}
                            </td>
                            <td className="p-3 font-black">
                              Rp {a.totalAmount.toLocaleString()}
                            </td>
                            <td className="p-3 uppercase">
                              <span className="block text-slate-800">
                                K: {a.cashierName}
                              </span>
                              <span className="block text-orange-600 text-[9px]">
                                M: {a.managerName}
                              </span>
                            </td>
                            <td className="p-3 italic text-slate-500">
                              {a.note}
                            </td>
                            <td className="p-3 text-center">
                              <span
                                className={`px-2 py-1 rounded text-[9px] font-black uppercase ${a.type === "VOID" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}
                              >
                                {a.type}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
