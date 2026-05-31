import React, { useState, useCallback } from "react";
import {
  X,
  Wallet,
  ArrowUpRight,
  CheckSquare,
  Clock,
  FileCheck,
  Delete,
  Printer,
} from "lucide-react";
import { usePos } from "../../core/PosProvider";
import { useToast } from "../../components/Toast";

// ================= KEYBOARD COMPONENTS (tetap sama) =================
const QwertyKeyboard = React.memo(
  ({ onKeyPress }: { onKeyPress: (key: string) => void }) => {
    const rows = [
      ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"],
      ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
      ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
      ["Z", "X", "C", "V", "B", "N", "M", ".", "-", "⌫"],
    ];

    const handlePress = useCallback(
      (key: string) => {
        if (key === "⌫") onKeyPress("BACKSPACE");
        else onKeyPress(key);
      },
      [onKeyPress],
    );

    return (
      <div className="bg-slate-100 p-3 rounded-xl border border-slate-200 mt-4">
        <div className="space-y-2">
          {rows.map((row, idx) => (
            <div key={idx} className="flex justify-center gap-1.5">
              {row.map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => handlePress(key)}
                  className={`py-2 px-3 sm:px-4 bg-white border border-slate-300 rounded-lg shadow-sm hover:bg-slate-200 active:bg-slate-300 font-black text-xs transition-colors cursor-pointer ${
                    key === "⌫"
                      ? "bg-amber-100 text-amber-700 border-amber-300"
                      : "text-slate-800"
                  }`}
                >
                  {key}
                </button>
              ))}
            </div>
          ))}
          <div className="flex justify-center gap-1.5 mt-2">
            <button
              onClick={() => onKeyPress("CLEAR")}
              className="py-2 px-4 bg-red-100 border border-red-300 text-red-600 rounded-lg shadow-sm hover:bg-red-200 font-black text-[10px] uppercase cursor-pointer"
            >
              CLEAR
            </button>
            <button
              onClick={() => onKeyPress("SPACE")}
              className="py-2 px-16 sm:px-24 bg-white border border-slate-300 rounded-lg shadow-sm hover:bg-slate-200 active:bg-slate-300 font-black text-[10px] uppercase cursor-pointer text-slate-800"
            >
              SPACE
            </button>
          </div>
        </div>
      </div>
    );
  },
);

const NumpadKeyboard = React.memo(
  ({ onKeyPress }: { onKeyPress: (key: string) => void }) => {
    const buttons = [
      ["7", "8", "9"],
      ["4", "5", "6"],
      ["1", "2", "3"],
      ["CLEAR", "0", "⌫"],
    ];

    const handlePress = useCallback(
      (btn: string) => {
        if (btn === "⌫") onKeyPress("BACKSPACE");
        else if (btn === "CLEAR") onKeyPress("CLEAR");
        else onKeyPress(btn);
      },
      [onKeyPress],
    );

    return (
      <div className="bg-slate-100 p-3 rounded-xl border border-slate-200 mt-4">
        <div className="space-y-2">
          {buttons.map((row, idx) => (
            <div key={idx} className="grid grid-cols-3 gap-2">
              {row.map((btn) => (
                <button
                  key={btn}
                  type="button"
                  onClick={() => handlePress(btn)}
                  className={`p-4 text-xl font-black rounded-xl transition-all ${
                    btn === "⌫"
                      ? "bg-red-500 text-white hover:bg-red-600"
                      : btn === "CLEAR"
                        ? "bg-red-100 text-red-600 hover:bg-red-200"
                        : "bg-white hover:bg-slate-200 text-slate-800 border border-slate-300"
                  }`}
                >
                  {btn === "⌫" ? (
                    <Delete size={24} className="mx-auto" />
                  ) : btn === "CLEAR" ? (
                    "CLR"
                  ) : (
                    btn
                  )}
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  },
);

// ================= MAIN COMPONENT =================
export const SidebarKas = ({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) => {
  const { state, issuePettyCash, resolvePettyCash } = usePos();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<"INPUT" | "LAPORAN">("INPUT");

  const [reqName, setReqName] = useState("");
  const [reqDivision, setReqDivision] = useState("");
  const [reqNotes, setReqNotes] = useState("");
  const [reqAmount, setReqAmount] = useState("");

  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [returnedAmount, setReturnedAmount] = useState("");
  const [hasReceipt, setHasReceipt] = useState(false);

  const [activeInput, setActiveInput] = useState<
    "name" | "division" | "notes" | "amount" | "returnedAmount" | null
  >(null);
  const [keyboardMode, setKeyboardMode] = useState<"qwerty" | "numpad">(
    "qwerty",
  );

  // Handler form & keyboard (tidak berubah)
  const handleReqNameChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setReqName(e.target.value);
  const handleReqDivisionChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setReqDivision(e.target.value);
  const handleReqNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) =>
    setReqNotes(e.target.value);
  const handleReqAmountChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setReqAmount(e.target.value);
  const handleReturnedAmountChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setReturnedAmount(e.target.value);

  const handleInputFocus = useCallback(
    (
      inputType: "name" | "division" | "notes" | "amount" | "returnedAmount",
    ) => {
      setActiveInput(inputType);
      setKeyboardMode(
        inputType === "amount" || inputType === "returnedAmount"
          ? "numpad"
          : "qwerty",
      );
    },
    [],
  );

  const handleQwertyKey = useCallback(
    (key: string) => {
      const update = (prev: string) => {
        if (key === "BACKSPACE") return prev.slice(0, -1);
        if (key === "CLEAR") return "";
        if (key === "SPACE") return prev + " ";
        return prev + key;
      };
      if (activeInput === "name") setReqName(update);
      else if (activeInput === "division") setReqDivision(update);
      else if (activeInput === "notes") setReqNotes(update);
    },
    [activeInput],
  );

  const handleNumpadKey = useCallback(
    (key: string) => {
      const update = (prev: string) => {
        if (key === "BACKSPACE") return prev.slice(0, -1);
        if (key === "CLEAR") return "";
        return prev + key;
      };
      if (activeInput === "amount") setReqAmount(update);
      else if (activeInput === "returnedAmount") setReturnedAmount(update);
    },
    [activeInput],
  );

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !reqName.trim() ||
      !reqDivision.trim() ||
      !reqNotes.trim() ||
      !reqAmount.trim()
    ) {
      showToast("Semua baris isian formulir wajib diisi lengkap!", "ERROR");
      return;
    }
    const nominalKeluar = Number(reqAmount) || 0;
    if (nominalKeluar <= 0) {
      showToast("Nominal dana yang diminta tidak valid!", "ERROR");
      return;
    }
    try {
      await issuePettyCash({
        name: reqName,
        division: reqDivision,
        notes: reqNotes,
        amount: nominalKeluar,
      });
      showToast(
        `KAS KELUAR TERCATAT: Rp ${nominalKeluar.toLocaleString()} berhasil dipotong dari laci.`,
        "SUCCESS",
      );
      setReqName("");
      setReqDivision("");
      setReqNotes("");
      setReqAmount("");
      setActiveTab("LAPORAN");
      setActiveInput(null);
    } catch (err: any) {
      showToast(err.message || "Gagal mencatat kas keluar", "ERROR");
    }
  };

  const handleResolveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvingId) return;
    try {
      const returned = Number(returnedAmount) || 0;
      await resolvePettyCash(resolvingId, returned, hasReceipt);
      showToast(
        "Penyelesaian kasbon kasir berhasil dikunci permanen!",
        "SUCCESS",
      );
      setResolvingId(null);
      setReturnedAmount("");
      setHasReceipt(false);
      setActiveInput(null);
    } catch (err: any) {
      showToast(err.message || "Gagal memproses penyelesaian", "ERROR");
    }
  };

  // ================= FUNGSI PRINT (window.open) =================
  const handlePrintPDF = () => {
    const listKas = state?.pettyCashTransactions || [];
    if (listKas.length === 0) {
      showToast("Tidak ada data riwayat kas untuk dicetak.", "ERROR");
      return;
    }

    const drawerCash = state?.sales?.current_cash_in_drawer || 0;
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      showToast("Popup blokir! Izinkan popup untuk mencetak.", "ERROR");
      return;
    }

    // Buat konten HTML untuk dicetak
    const rows = listKas.map((kas: any) => {
      const waktu = new Date(kas.timestamp_issued).toLocaleString("id-ID", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
      const peminta = `${kas.requester_name}<br><span style="font-size:9px; color:#666;">${kas.requester_division}</span>`;
      const kasirPemberi = kas.cashier_issued_name;
      const danaAwal = `Rp ${kas.amount_requested.toLocaleString("id-ID")}`;
      const kembalian = kas.amount_returned
        ? `Rp ${kas.amount_returned.toLocaleString("id-ID")}`
        : "-";
      const nota = kas.has_receipt ? "✓ Ada" : "✗ Tanpa";
      const keperluan = kas.notes || "-";
      const status =
        kas.status === "ON_PROCESS"
          ? '<span style="background:#fef3c7; color:#b45309; padding:2px 6px; border-radius:999px;">ON PROCESS</span>'
          : '<span style="background:#d1fae5; color:#065f46; padding:2px 6px; border-radius:999px;">COMPLETED</span>';
      return `
        <tr>
          <td style="padding:8px; border-bottom:1px solid #e2e8f0;">${waktu}</td>
          <td style="padding:8px; border-bottom:1px solid #e2e8f0;">${peminta}</td>
          <td style="padding:8px; border-bottom:1px solid #e2e8f0;">${kasirPemberi}</td>
          <td style="padding:8px; border-bottom:1px solid #e2e8f0; text-align:right;">${danaAwal}</td>
          <td style="padding:8px; border-bottom:1px solid #e2e8f0; text-align:right;">${kembalian}</td>
          <td style="padding:8px; border-bottom:1px solid #e2e8f0; text-align:center;">${nota}</td>
          <td style="padding:8px; border-bottom:1px solid #e2e8f0;">${keperluan}</td>
          <td style="padding:8px; border-bottom:1px solid #e2e8f0; text-align:center;">${status}</td>
        </tr>
      `;
    });

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Laporan Riwayat Kas - Asstro POS</title>
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
            .summary { background: #f1f5f9; }
            th { background: #334155; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>LAPORAN RIWAYAT KAS KASIR</h1>
            <p>Tanggal cetak: ${new Date().toLocaleString("id-ID")}</p>
          </div>
          <div class="summary">
            <span>💰 Estimasi Kas Fisik Di Laci (MOD)</span>
            <span style="font-size:1.2rem; color:#059669;">Rp ${drawerCash.toLocaleString("id-ID")}</span>
          </div>
          <table>
            <thead>
              <tr>
                <th>Waktu Pinjam</th>
                <th>Peminta / Divisi</th>
                <th>Kasir Pemberi</th>
                <th>Dana Awal</th>
                <th>Kembalian</th>
                <th>Nota</th>
                <th>Keperluan</th>
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

  // ================= RENDER =================
  if (!isOpen) return null;

  const listKas = state?.pettyCashTransactions || [];
  const drawerCashCalculated = state?.sales?.current_cash_in_drawer || 0;

  return (
    <div className="fixed inset-0 z-200 bg-slate-950/80 backdrop-blur-sm flex justify-end">
      <div className="w-full md:w-full md:max-w-4xl bg-white h-full shadow-2xl flex flex-col border-l border-slate-200">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50 shrink-0">
          <div className="flex items-center gap-2">
            <Wallet size={18} className="text-slate-800" />
            <h2 className="font-black text-sm uppercase tracking-wider text-slate-800">
              Sistem Operasional Kas Kasir
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-900 cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Status Laci */}
        <div className="bg-slate-900 p-3.5 text-white flex justify-between items-center px-6 shrink-0">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
            Estimasi Kas Fisik Di Laci (MOD)
          </span>
          <span className="text-sm font-black text-green-400">
            Rp {Math.round(drawerCashCalculated).toLocaleString("id-ID")}
          </span>
        </div>

        {/* Tab */}
        <div className="flex border-b border-slate-200 shrink-0 bg-white">
          <button
            onClick={() => {
              setActiveTab("INPUT");
              setResolvingId(null);
              setActiveInput(null);
            }}
            className={`flex-1 py-3 text-center text-xs uppercase font-black tracking-tight border-b-2 cursor-pointer transition-all
              ${activeTab === "INPUT" ? "border-orange-600 text-slate-900 bg-orange-50/30" : "border-transparent text-slate-400 hover:text-slate-800"}`}
          >
            Form Input Permintaan Dana
          </button>
          <button
            onClick={() => setActiveTab("LAPORAN")}
            className={`flex-1 py-3 text-center text-xs uppercase font-black tracking-tight border-b-2 cursor-pointer transition-all
              ${activeTab === "LAPORAN" ? "border-orange-600 text-slate-900 bg-orange-50/30" : "border-transparent text-slate-400 hover:text-slate-800"}`}
          >
            Laporan & Riwayat Kas ({listKas.length})
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-auto p-5 bg-slate-100 scrollbar-thin">
          {activeTab === "INPUT" && !resolvingId && (
            <div className="max-w-xl mx-auto space-y-4">
              <form
                onSubmit={handleAddSubmit}
                className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 text-xs font-bold text-slate-700"
              >
                <h3 className="font-black text-slate-900 text-center uppercase tracking-wide border-b pb-2 text-[11px]">
                  Form Kas Keluar
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase text-slate-400 mb-1">
                      Nama Peminta
                    </label>
                    <input
                      type="text"
                      value={reqName}
                      onChange={handleReqNameChange}
                      onFocus={() => handleInputFocus("name")}
                      inputMode="none"
                      placeholder="Contoh: Chef Jaka"
                      className="w-full bg-slate-50 border rounded-xl p-3 outline-none focus:border-orange-500 font-black uppercase"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase text-slate-400 mb-1">
                      Divisi / Departemen
                    </label>
                    <input
                      type="text"
                      value={reqDivision}
                      onChange={handleReqDivisionChange}
                      onFocus={() => handleInputFocus("division")}
                      inputMode="none"
                      placeholder="Contoh: DAPUR / SERVICE"
                      className="w-full bg-slate-50 border rounded-xl p-3 outline-none focus:border-orange-500 font-black uppercase"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] uppercase text-slate-400 mb-1">
                    Keperluan Anggaran (Catatan)
                  </label>
                  <textarea
                    rows={3}
                    value={reqNotes}
                    onChange={handleReqNotesChange}
                    onFocus={() => handleInputFocus("notes")}
                    inputMode="none"
                    placeholder="Detail keperluan pengeluaran dana laci..."
                    className="w-full bg-slate-50 border rounded-xl p-3 outline-none focus:border-orange-500 font-black resize-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase text-slate-400 mb-1">
                    Jumlah Uang Yang Diambil (Rp)
                  </label>
                  <input
                    type="text"
                    value={reqAmount}
                    onChange={handleReqAmountChange}
                    onFocus={() => handleInputFocus("amount")}
                    inputMode="none"
                    placeholder="0"
                    className="w-full bg-slate-50 border rounded-xl p-3 outline-none focus:border-orange-500 font-black text-sm text-red-600"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full p-3.5 bg-orange-600 hover:bg-orange-700 text-white font-black uppercase rounded-xl flex items-center justify-center gap-2 shadow-md cursor-pointer transition-all"
                >
                  <ArrowUpRight size={16} /> Konfirmasi Kas Keluar (Potong Laci)
                </button>
              </form>
              {keyboardMode === "qwerty" ? (
                <QwertyKeyboard onKeyPress={handleQwertyKey} />
              ) : (
                <NumpadKeyboard onKeyPress={handleNumpadKey} />
              )}
            </div>
          )}

          {resolvingId && (
            <div className="max-w-xl mx-auto space-y-4">
              <form
                onSubmit={handleResolveSubmit}
                className="bg-white p-6 rounded-2xl border-2 border-green-200 shadow-sm space-y-4 text-xs font-bold text-slate-700"
              >
                <h3 className="font-black text-green-700 text-center uppercase tracking-wide border-b pb-2 text-[11px]">
                  Form Penyelesaian Nota & Kembalian
                </h3>
                <div>
                  <label className="block text-[10px] uppercase text-slate-400 mb-1">
                    Jumlah Uang Kembalian (Rp)
                  </label>
                  <input
                    type="text"
                    required
                    value={returnedAmount}
                    onChange={handleReturnedAmountChange}
                    onFocus={() => handleInputFocus("returnedAmount")}
                    inputMode="none"
                    placeholder="Input 0 jika habis tanpa sisa"
                    className="w-full bg-slate-50 border rounded-xl p-3 outline-none focus:border-green-600 font-black text-sm text-green-600"
                  />
                  <span className="text-[9px] text-slate-400 mt-1 block">
                    Uang kembalian ini otomatis menambah kembali isi kas laci
                    fisik toko.
                  </span>
                </div>
                <div className="flex items-center gap-2.5 p-3 bg-slate-50 border rounded-xl">
                  <input
                    type="checkbox"
                    id="receipt_check"
                    checked={hasReceipt}
                    onChange={(e) => setHasReceipt(e.target.checked)}
                    className="w-4 h-4 cursor-pointer accent-green-600"
                  />
                  <label
                    htmlFor="receipt_check"
                    className="cursor-pointer font-black text-[10px] uppercase text-slate-700"
                  >
                    Saya Mengonfirmasi Nota / Struk Pembelian Fisik Telah
                    Diserahkan
                  </label>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setResolvingId(null)}
                    className="flex-1 py-3 bg-slate-100 text-slate-600 font-black uppercase rounded-xl cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white font-black uppercase rounded-xl cursor-pointer flex justify-center items-center gap-1 shadow-sm"
                  >
                    <CheckSquare size={14} /> Kunci Transaksi
                  </button>
                </div>
              </form>
              <NumpadKeyboard onKeyPress={handleNumpadKey} />
            </div>
          )}

          {activeTab === "LAPORAN" && (
            <div>
              {/* Tombol Cetak PDF */}
              <div className="flex justify-end mb-3">
                <button
                  onClick={handlePrintPDF}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-black uppercase rounded-xl shadow-md transition-all cursor-pointer"
                >
                  <Printer size={14} /> Cetak PDF
                </button>
              </div>

              {listKas.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center text-slate-400">
                  <Wallet size={40} className="mb-2 opacity-20" />
                  <p className="font-black uppercase tracking-wider text-[10px]">
                    Belum ada data pengeluaran kas kecil shift ini.
                  </p>
                </div>
              ) : (
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-900 text-white text-[9px] uppercase font-black tracking-wider">
                      <tr>
                        <th className="p-3">Waktu Pinjam</th>
                        <th className="p-3">Peminta / Divisi</th>
                        <th className="p-3">Kasir Pemberi</th>
                        <th className="p-3">Dana Awal</th>
                        <th className="p-3">Kembalian / Nota</th>
                        <th className="p-3">Keperluan (Notes)</th>
                        <th className="p-3 text-center">Status</th>
                        <th className="p-3 text-center w-24">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="text-[11px] font-bold text-slate-700">
                      {listKas.map((kas: any, idx: number) => {
                        const dateStr = new Date(
                          kas.timestamp_issued,
                        ).toLocaleTimeString("id-ID", {
                          hour: "2-digit",
                          minute: "2-digit",
                        });
                        const isOnProcess = kas.status === "ON_PROCESS";
                        return (
                          <tr
                            key={idx}
                            className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                          >
                            <td className="p-3 text-slate-400">{dateStr}</td>
                            <td className="p-3">
                              <span className="font-black text-slate-900 block uppercase">
                                {kas.requester_name}
                              </span>
                              <span className="text-[9px] text-slate-400 block tracking-tight">
                                {kas.requester_division}
                              </span>
                            </td>
                            <td className="p-3">
                              <span className="uppercase text-slate-800">
                                {kas.cashier_issued_name}
                              </span>
                              {kas.cashier_resolved_name && (
                                <span className="text-[8px] text-slate-400 block">
                                  Selesai: {kas.cashier_resolved_name}
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-red-600 font-black">
                              Rp {kas.amount_requested.toLocaleString()}
                            </td>
                            <td className="p-3">
                              {isOnProcess ? (
                                <span className="text-slate-400 italic font-medium">
                                  Menunggu nota...
                                </span>
                              ) : (
                                <div>
                                  <span className="text-green-600 font-black">
                                    Rp {kas.amount_returned.toLocaleString()}
                                  </span>
                                  <span className="text-[8px] text-slate-400 block uppercase">
                                    {kas.has_receipt
                                      ? "✓ Nota Ada"
                                      : "✗ Tanpa Nota"}
                                  </span>
                                </div>
                              )}
                            </td>
                            <td
                              className="p-3 max-w-xs truncate text-slate-500"
                              title={kas.notes}
                            >
                              {kas.notes}
                            </td>
                            <td className="p-3 text-center">
                              {isOnProcess ? (
                                <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-[8px] font-black tracking-tight inline-flex items-center gap-0.5">
                                  <Clock size={10} /> ON PROCESS
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-[8px] font-black tracking-tight inline-flex items-center gap-0.5">
                                  <FileCheck size={10} /> COMPLETED
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-center">
                              {isOnProcess ? (
                                <button
                                  onClick={() => setResolvingId(kas.id)}
                                  className="w-full py-1 bg-white hover:bg-green-50 border border-green-200 text-green-600 rounded-lg text-[9px] font-black uppercase cursor-pointer tracking-tighter"
                                >
                                  Update Nota
                                </button>
                              ) : (
                                <span className="text-[9px] text-slate-400 uppercase font-black">
                                  Locked
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
