import React, { useState } from "react";
import { X, History, FileText, Undo2, Printer } from "lucide-react";
import { usePos } from "../../core/PosProvider";
import { RefundModal } from "../RefundModal";

export const SidebarHistori = ({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) => {
  const { state, refundTransaction } = usePos();
  const [selectedTransaction, setSelectedTransaction] = useState<any | null>(
    null,
  );

  if (!isOpen) return null;

  const transactions = state?.transactions || [];

  const handleOpenRefund = (tx: any) => {
    setSelectedTransaction(tx);
  };

  const handleCloseRefund = () => {
    setSelectedTransaction(null);
  };

  const getStatusLabel = (tx: any) => {
    const totalItems = tx.items.reduce(
      (sum: number, it: any) => sum + it.qty,
      0,
    );
    const refundedItems = tx.items.reduce(
      (sum: number, it: any) => sum + (it.refundedQty || 0),
      0,
    );

    if (refundedItems === 0) {
      return (
        <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-[9px] font-black">
          PAID
        </span>
      );
    }
    if (refundedItems >= totalItems) {
      return (
        <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-[9px] font-black">
          FULL REFUND
        </span>
      );
    }
    return (
      <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-[9px] font-black">
        PAID (Refund {refundedItems})
      </span>
    );
  };

  // ========== FUNGSI PRINT (bawaan browser) ==========
  const handlePrint = () => {
    if (transactions.length === 0) {
      alert("Tidak ada transaksi untuk dicetak.");
      return;
    }

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Popup terblokir! Izinkan popup untuk mencetak.");
      return;
    }

    // Format data untuk tabel
    const rows = transactions.map((tx: any) => {
      const dateObj = new Date(tx.timestamp);
      const waktu = `${dateObj.toLocaleDateString("id-ID")} ${dateObj.toLocaleTimeString("id-ID")}`;
      const meja = `${tx.tableLabel}${tx.customerName ? `<br><span style="font-size:9px; color:#666;">${tx.customerName}</span>` : ""}`;
      const metode = tx.payment_method || "CASH";
      const total = `Rp ${tx.grand_total.toLocaleString("id-ID")}`;
      const waiter = tx.waiterName || "-";
      const kasir = tx.cashierName || "-";

      // Status
      const totalItems = tx.items.reduce(
        (sum: number, it: any) => sum + it.qty,
        0,
      );
      const refundedItems = tx.items.reduce(
        (sum: number, it: any) => sum + (it.refundedQty || 0),
        0,
      );
      let statusText = "PAID";
      let statusStyle = "background:#d1fae5; color:#065f46;";
      if (refundedItems === 0) {
        statusText = "PAID";
        statusStyle = "background:#d1fae5; color:#065f46;";
      } else if (refundedItems >= totalItems) {
        statusText = "FULL REFUND";
        statusStyle = "background:#fee2e2; color:#991b1b;";
      } else {
        statusText = `PAID (Refund ${refundedItems})`;
        statusStyle = "background:#ffedd5; color:#9a3412;";
      }
      const statusHtml = `<span style="${statusStyle} padding:2px 6px; border-radius:999px; font-size:9px; font-weight:bold;">${statusText}</span>`;

      return `
        <tr>
          <td style="padding:8px; border-bottom:1px solid #e2e8f0;">${waktu}</td>
          <td style="padding:8px; border-bottom:1px solid #e2e8f0;">${meja}</td>
          <td style="padding:8px; border-bottom:1px solid #e2e8f0;">${metode}</td>
          <td style="padding:8px; border-bottom:1px solid #e2e8f0; text-align:right;">${total}</td>
          <td style="padding:8px; border-bottom:1px solid #e2e8f0;">${waiter}</td>
          <td style="padding:8px; border-bottom:1px solid #e2e8f0;">${kasir}</td>
          <td style="padding:8px; border-bottom:1px solid #e2e8f0; text-align:center;">${statusHtml}</td>
        </tr>
      `;
    });

    const grandTotalAll = transactions.reduce(
      (sum: number, tx: any) => sum + tx.grand_total,
      0,
    );

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Laporan Riwayat Transaksi - Asstro POS</title>
        <meta charset="UTF-8" />
        <style>
          * { margin:0; padding:0; box-sizing:border-box; }
          body {
            font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
            background: white;
            padding: 2rem;
            color: #1e293b;
          }
          .container {
            max-width: 1200px;
            margin: 0 auto;
          }
          .header {
            text-align: center;
            margin-bottom: 1.5rem;
            border-bottom: 2px solid #f97316;
            padding-bottom: 1rem;
          }
          .header h1 {
            font-size: 1.8rem;
            letter-spacing: -0.5px;
            color: #0f172a;
          }
          .header p {
            color: #475569;
            margin-top: 6px;
            font-size: 0.85rem;
          }
          .summary {
            background: #f8fafc;
            padding: 12px 16px;
            border-radius: 12px;
            margin-bottom: 24px;
            display: flex;
            justify-content: space-between;
            font-weight: bold;
            border: 1px solid #e2e8f0;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.05);
          }
          th {
            background: #1e293b;
            color: white;
            padding: 10px 8px;
            text-align: left;
            font-weight: bold;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          td {
            vertical-align: top;
          }
          .footer {
            margin-top: 30px;
            text-align: center;
            font-size: 9px;
            color: #94a3b8;
            border-top: 1px solid #e2e8f0;
            padding-top: 16px;
          }
          @media print {
            body { padding: 0.5rem; }
            .no-print { display: none; }
            th { background: #334155; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>LAPORAN RIWAYAT TRANSAKSI KASIR</h1>
            <p>Tanggal cetak: ${new Date().toLocaleString("id-ID")}</p>
          </div>
          <div class="summary">
            <span>📊 Total Transaksi: ${transactions.length} invoice</span>
            <span style="font-size:1.1rem; color:#ea580c;">Total Omset: Rp ${grandTotalAll.toLocaleString("id-ID")}</span>
          </div>
          <table>
            <thead>
              <tr>
                <th>Waktu</th>
                <th>Meja / Customer</th>
                <th>Metode</th>
                <th>Total Akhir</th>
                <th>Waiter</th>
                <th>Kasir</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${rows.join("")}
            </tbody>
          </table>
          <div class="footer">
            Dicetak dari sistem Asstro POS • ${new Date().toLocaleString("id-ID")}
          </div>
        </div>
        <script>
          window.onload = () => {
            window.print();
            setTimeout(() => window.close(), 500);
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };
  // ================================================

  return (
    <div className="fixed inset-0 z-200 bg-slate-950/80 backdrop-blur-sm flex justify-end animate-fade-in">
      <div className="w-full md:w-full md:max-w-4xl bg-white h-full shadow-2xl flex flex-col border-l border-slate-200 transform transition-transform animate-slide-in-right">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50 shrink-0">
          <div className="flex items-center gap-2">
            <History size={18} className="text-slate-800" />
            <h2 className="font-black text-sm uppercase tracking-wider text-slate-800">
              Riwayat Transaksi Kasir
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {/* Tombol Print */}
            <button
              onClick={handlePrint}
              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              title="Cetak Laporan"
            >
              <Printer size={18} />
            </button>
            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-slate-900 cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4 bg-slate-100 scrollbar-thin">
          {transactions.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400">
              <FileText size={48} className="mb-3 opacity-20" />
              <p className="font-black uppercase tracking-wider text-xs">
                Belum ada transaksi
              </p>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-900 text-white text-[10px] uppercase font-black tracking-wider">
                  <tr>
                    <th className="p-3 w-32">Waktu</th>
                    <th className="p-3">Meja / Cust</th>
                    <th className="p-3">Metode</th>
                    <th className="p-3">Total Akhir</th>
                    <th className="p-3">Waiter</th>
                    <th className="p-3">Kasir</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3 text-center w-24">Aksi</th>
                  </tr>
                </thead>
                <tbody className="text-[11px] font-bold text-slate-700">
                  {transactions.map((tx: any, idx: number) => {
                    const dateObj = new Date(tx.timestamp);
                    const isFullRefund = tx.items.every(
                      (i: any) => i.refundedQty >= i.qty,
                    );

                    return (
                      <tr
                        key={idx}
                        className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                      >
                        <td className="p-3">
                          {dateObj.toLocaleDateString("id-ID")}
                          <br />
                          <span className="text-slate-400">
                            {dateObj.toLocaleTimeString("id-ID")}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className="font-black text-slate-900 block">
                            {tx.tableLabel}
                          </span>
                          <span className="text-[9px] text-slate-500">
                            {tx.customerName || "-"}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded border border-slate-200 block w-fit text-[9px] font-black uppercase tracking-wider">
                            {tx.payment_method || "CASH"}
                          </span>
                        </td>
                        <td className="p-3 font-black text-orange-600">
                          Rp {tx.grand_total.toLocaleString("id-ID")}
                        </td>
                        <td className="p-3 uppercase">
                          {tx.waiterName || "-"}
                        </td>
                        <td className="p-3 uppercase">
                          {tx.cashierName || "-"}
                        </td>
                        <td className="p-3 text-center">
                          {getStatusLabel(tx)}
                        </td>
                        <td className="p-3 text-center">
                          <button
                            disabled={isFullRefund}
                            onClick={() => handleOpenRefund(tx)}
                            className={`p-1.5 rounded-lg border flex items-center justify-center w-full gap-1 transition-colors
                              ${isFullRefund ? "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed" : "bg-white hover:bg-orange-50 border-orange-200 text-orange-600 cursor-pointer"}
                            `}
                            title={
                              isFullRefund
                                ? "Sudah direfund sepenuhnya"
                                : "Refund Transaksi"
                            }
                          >
                            <Undo2 size={13} />{" "}
                            <span className="text-[9px] uppercase font-black">
                              Refund
                            </span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {selectedTransaction && (
        <RefundModal
          isOpen={true}
          onClose={handleCloseRefund}
          transaction={selectedTransaction}
          onConfirmRefund={refundTransaction}
        />
      )}
    </div>
  );
};
