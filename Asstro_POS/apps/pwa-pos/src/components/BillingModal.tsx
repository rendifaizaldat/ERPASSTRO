import React, { useState, useMemo, useEffect } from "react";
import {
  X,
  Receipt,
  CreditCard,
  Banknote,
  Landmark,
  Printer,
  Share2,
} from "lucide-react";
import { usePos } from "../core/PosProvider";
import { useToast } from "../components/Toast";

interface BillingModalProps {
  selectedTable: string | null;
  cart: any[];
  cartSubtotal: number;
  discountAmount: number;
  serviceCharge: number;
  restaurantTax: number;
  cartGrandTotal: number;
  paymentType: "CASH" | "DEBIT" | "QRIS" | "PRIVE";
  setPaymentType: (type: "CASH" | "DEBIT" | "QRIS" | "PRIVE") => void;
  cashReceived: string;
  setCashReceived: (val: string) => void;
  calculatedChange: number;
  cardNumber: string;
  setCardNumber: (val: string) => void;
  priveNote: string;
  setPriveNote: (val: string) => void;
  setShowPaymentModal: (show: boolean) => void;
  handleFinalCheckoutSubmit: (e: React.FormEvent) => void;
}

export const BillingModal: React.FC<BillingModalProps> = ({
  selectedTable,
  cart,
  cartSubtotal,
  discountAmount,
  serviceCharge,
  restaurantTax,
  cartGrandTotal,
  paymentType,
  setPaymentType,
  cashReceived,
  setCashReceived,
  calculatedChange,
  cardNumber,
  setCardNumber,
  priveNote,
  setPriveNote,
  setShowPaymentModal,
  handleFinalCheckoutSubmit,
}) => {
  const { state } = usePos();
  const { showToast } = useToast();

  // Membaca Konfigurasi Master Data Dinamis Dari Pengaturan Sidebar / Core State
  const companyName = state?.companyName || "ASSTRO HOLDING ECOSYSTEM";
  const branchId = state?.branchId || "LOCAL NODE";
  const taxRateSetting = state?.settings?.restaurantTax ?? 15;
  const serviceRateSetting = state?.settings?.serviceCharge ?? 5;
  const activeBankList = state?.settings?.bankList || [
    "BCA",
    "MANDIRI",
    "BRI",
    "BNI",
  ];
  const dynamicAccountNo = state?.settings?.accountNumber || "0123-456-7890";
  const dynamicQrCodeUrl = state?.settings?.qrCodeUrl || "";

  // State Lokal Pengendali Alur Otorisasi Internal
  const [selectedBank, setSelectedBank] = useState(activeBankList[0] || "");
  const [managerPinForPrive, setManagerPinForPrive] = useState("");
  const [isPriveAuthorized, setIsPriveAuthorized] = useState(false);

  // Mengatur status tombol Shift (Kapital) pada Keyboard QWERTY Internal
  const [isQwertyShift, setIsQwertyShift] = useState(false);

  // LOGIKA UTAMA 1: Pengendali Karakter Papan Angka Numpad
  const handleUniversalNumpadPress = (val: string) => {
    if (paymentType === "CASH") {
      if (val === "CLEAR") {
        setCashReceived("");
      } else if (val === "BACKSPACE") {
        setCashReceived(cashReceived.slice(0, -1));
      } else {
        const next = cashReceived + val;
        setCashReceived(next.replace(/^0+/, "") || "0");
      }
    } else if (paymentType === "DEBIT") {
      if (val === "CLEAR") {
        setCardNumber("");
      } else if (val === "BACKSPACE") {
        setCardNumber(cardNumber.slice(0, -1));
      } else {
        setCardNumber(cardNumber + val);
      }
    } else if (paymentType === "PRIVE" && !isPriveAuthorized) {
      if (val === "CLEAR") {
        setManagerPinForPrive("");
      } else if (val === "BACKSPACE") {
        setManagerPinForPrive(managerPinForPrive.slice(0, -1));
      } else {
        if (managerPinForPrive.length < 4) {
          setManagerPinForPrive(managerPinForPrive + val);
        }
      }
    }
  };

  // LOGIKA UTAMA 2: Pengendali Karakter Papan Ketik QWERTY Internal (Untuk Catatan Prive)
  const handleInternalQwertyPress = (char: string) => {
    if (char === "BACKSPACE") {
      setPriveNote(priveNote.slice(0, -1));
    } else if (char === "SPACE") {
      setPriveNote(priveNote + " ");
    } else if (char === "CLEAR") {
      setPriveNote("");
    } else if (char === "SHIFT") {
      setIsQwertyShift(!isQwertyShift);
    } else {
      const targetChar = isQwertyShift
        ? char.toUpperCase()
        : char.toLowerCase();
      setPriveNote(priveNote + targetChar);
    }
  };

  // SINKRONISASI HARDWARE PENANGKAP KEYBOARD KEYDOWN FISIK
  useEffect(() => {
    const handleHardwareKeyDown = (e: KeyboardEvent) => {
      const key = e.key;

      // Skenario 1: Jika sedang mengisi catatan Compliment yang sudah lolos PIN Supervisor
      if (paymentType === "PRIVE" && isPriveAuthorized) {
        if (key === "Backspace") {
          e.preventDefault();
          handleInternalQwertyPress("BACKSPACE");
        } else if (key === " ") {
          e.preventDefault();
          handleInternalQwertyPress("SPACE");
        } else if (key.length === 1) {
          e.preventDefault();
          // DIPERBAIKI: Mengisi string langsung menggunakan variabel penampung riil priveNote
          setPriveNote(priveNote + key);
        }
        return;
      }

      // Skenario 2: Mengisi Standar Universal Numpad (Cash, Debit, atau PIN Input)
      if (/^[0-9]$/.test(key)) {
        e.preventDefault();
        handleUniversalNumpadPress(key);
      } else if (key === "Backspace") {
        e.preventDefault();
        handleUniversalNumpadPress("BACKSPACE");
      } else if (key === "Escape" || key === "Delete") {
        e.preventDefault();
        handleUniversalNumpadPress("CLEAR");
      }
    };

    window.addEventListener("keydown", handleHardwareKeyDown);
    return () => window.removeEventListener("keydown", handleHardwareKeyDown);
  }, [
    paymentType,
    cashReceived,
    cardNumber,
    managerPinForPrive,
    isPriveAuthorized,
    priveNote,
  ]);

  // Cetak Struk Sementara Proforma Bill
  const handlePrintProformaThermal = () => {
    const timestamp = new Date().toLocaleString("id-ID");
    const itemLines = cart
      .map(
        (i) =>
          `${i.name} (x${i.qty}) - Rp ${(i.price * i.qty).toLocaleString()}`,
      )
      .join("\n");

    showToast(
      `====== ${companyName} ======\n` +
        `CABANG: ${branchId}\n` +
        `WAKTU: ${timestamp}\n` +
        `MEJA / SESI: ${selectedTable}\n` +
        `----------------------------------------\n` +
        `[*** INVOICE SEMENTARA / PRE-BILL ***]\n` +
        `----------------------------------------\n` +
        `${itemLines}\n` +
        `----------------------------------------\n` +
        `SUBTOTAL: Rp ${cartSubtotal.toLocaleString()}\n` +
        `DISKON MANAJER: -Rp ${discountAmount.toLocaleString()}\n` +
        `SERVICE CHARGE (${serviceRateSetting}%): Rp ${serviceCharge.toLocaleString()}\n` +
        `PPN RESTAURANT (${taxRateSetting}%): Rp ${restaurantTax.toLocaleString()}\n` +
        `========================================\n` +
        `TOTAL BILL: Rp ${cartGrandTotal.toLocaleString()}\n` +
        `========================================\n` +
        `Harap Periksa Kembali Pesanan Anda.\n` +
        `Belum Berupa Bukti Pembayaran Lunas.\n` +
        `TERIMA KASIH ATAS KUNJUNGAN ANDA`,
      "INFO",
    );
  };

  // Berbagi Nota via Web Share API
  const handleShareProformaPDF = async () => {
    const docData = {
      title: `Invoice_Sementara_${selectedTable}.pdf`,
      text: `Halo, berikut rincian nota tagihan sementara untuk Meja ${selectedTable} di ${companyName}. Total Tagihan: Rp ${cartGrandTotal.toLocaleString()}.`,
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(docData);
      } catch (err) {
        // Handle share di-cancel
      }
    } else {
      showToast(
        `Fitur Web Share tidak didukung browser ini.\nTautan PDF Nota Sementara Meja ${selectedTable} disalin ke clipboard kasir!`,
        "WARNING",
      );
    }
  };

  // Verifikasi Kunci PIN Manajer untuk Compliment
  const handleVerifyPriveManagerPin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (managerPinForPrive === "0000") {
      setIsPriveAuthorized(true);
      showToast("Otorisasi Prive Disetujui Manajer.", "SUCCESS");
    } else {
      setIsPriveAuthorized(false);
      showToast("PIN SUPERVISOR SALAH! AKSES PRIVE DITOLAK.", "ERROR");
      setManagerPinForPrive("");
    }
  };

  // Evaluasi Keaktifan Tombol Kirim Checkout Struk Akhir
  const isCheckoutDisabled = useMemo(() => {
    if (
      paymentType === "CASH" &&
      (Number(cashReceived) || 0) < cartGrandTotal
    ) {
      return true;
    }
    if (paymentType === "DEBIT" && !cardNumber.trim()) {
      return true;
    }
    if (paymentType === "PRIVE" && (!isPriveAuthorized || !priveNote.trim())) {
      return true;
    }
    return false;
  }, [
    paymentType,
    cashReceived,
    cartGrandTotal,
    cardNumber,
    isPriveAuthorized,
    priveNote,
  ]);

  // Layout baris karakter papan ketik QWERTY Internal ruko
  const qwertyRows = [
    ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
    ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
    ["SHIFT", "Z", "X", "C", "V", "B", "N", "M", "BACKSPACE"],
    ["CLEAR", "SPACE"],
  ];

  return (
    <div className="fixed inset-0 bg-slate-950/80 z-300 backdrop-blur-sm flex items-center justify-center p-4">
      <form
        onSubmit={(e) => {
          if (paymentType === "PRIVE" && !isPriveAuthorized) {
            e.preventDefault();
            showToast(
              "Harap lakukan verifikasi PIN Manajer terlebih dahulu!",
              "ERROR",
            );
            return;
          }
          handleFinalCheckoutSubmit(e);
        }}
        className="w-full max-w-5xl bg-white text-slate-900 rounded-[2.5rem] shadow-2xl p-6 border border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-6 h-[90vh] max-h-170 overflow-hidden animate-fade-in"
      >
        {/* ========================================================================= */}
        {/* GRID 1: STATIS PANEL (INVOICE, RINGKASAN BIAYA, DAN KENDALIAN METODE)       */}
        {/* ========================================================================= */}
        <div className="flex flex-col h-full justify-between overflow-hidden pr-2">
          <div className="flex justify-between items-center pb-2.5 border-b border-slate-100 shrink-0">
            <h3 className="font-black text-xs md:text-sm uppercase tracking-tight flex items-center gap-2 text-slate-800">
              <Receipt size={16} className="text-orange-600" /> Detail Invoice:{" "}
              {selectedTable || "TA"}
            </h3>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={handlePrintProformaThermal}
                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-black uppercase tracking-wider cursor-pointer"
              >
                Print Bill
              </button>
              <button
                type="button"
                onClick={handleShareProformaPDF}
                className="px-2.5 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-600 rounded-lg text-[10px] font-black uppercase tracking-wider cursor-pointer"
              >
                Share PDF
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-1.5 my-2 p-2.5 bg-slate-50 border border-slate-200/60 rounded-xl scrollbar-thin">
            {cart.map((item) => (
              <div
                key={item.id}
                className="flex justify-between items-center py-1 border-b border-slate-200/40 last:border-b-0 text-[11px] font-bold uppercase tracking-tight"
              >
                <div className="min-w-0 flex-1 pr-2">
                  <span className="text-slate-900 font-black truncate block">
                    {item.name}
                  </span>
                  {item.note && (
                    <span className="text-[9px] text-orange-600 italic bg-orange-50/70 px-1 rounded inline-block font-bold">
                      Ket: {item.note}
                    </span>
                  )}
                </div>
                <div className="shrink-0 font-black text-slate-700 text-right">
                  Rp {item.price.toLocaleString("id-ID")}{" "}
                  <span className="text-slate-400 font-medium">
                    x {item.qty}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/60 space-y-1 text-[11px] font-bold text-slate-500 uppercase tracking-tight shrink-0 mb-3">
            <div className="flex justify-between">
              <span>Subtotal Menu</span>
              <span className="text-slate-900">
                Rp {cartSubtotal.toLocaleString("id-ID")}
              </span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-red-600">
                <span>Diskon Manager</span>
                <span>- Rp {discountAmount.toLocaleString("id-ID")}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Service Charge ({serviceRateSetting}%)</span>
              <span className="text-slate-900">
                Rp {serviceCharge.toLocaleString("id-ID")}
              </span>
            </div>
            <div className="flex justify-between pb-1.5 border-b border-dashed border-slate-300">
              <span>PPN Restaurant ({taxRateSetting}%)</span>
              <span className="text-slate-900">
                Rp {restaurantTax.toLocaleString("id-ID")}
              </span>
            </div>
            <div className="flex justify-between pt-1 text-xs font-black text-slate-900">
              <span>TOTAL BILL</span>
              <span className="text-orange-600 font-black text-base">
                Rp {cartGrandTotal.toLocaleString("id-ID")}
              </span>
            </div>
          </div>

          <div className="space-y-1.5 shrink-0 border-t border-slate-100 pt-3">
            <span className="font-black text-[10px] uppercase tracking-widest text-slate-400 block">
              Pilih Tipe Pembayaran Kasir
            </span>
            <div className="grid grid-cols-2 gap-2">
              {(["CASH", "DEBIT", "QRIS", "PRIVE"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setPaymentType(t)}
                  className={`py-3 px-4 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 border-2 transition-all cursor-pointer ${
                    paymentType === t
                      ? "bg-slate-900 border-slate-900 text-white shadow-md scale-[1.01]"
                      : "bg-white border-slate-200 text-slate-600 hover:border-slate-400"
                  }`}
                >
                  {t === "CASH" && <Banknote size={14} />}
                  {t === "DEBIT" && <CreditCard size={14} />}
                  {t === "QRIS" && <Receipt size={14} />}
                  {t === "PRIVE" && <Landmark size={14} />}
                  {t === "PRIVE" ? "COMPLIMENT" : t}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* GRID 2: DINAMIS PANEL (METODE INTERACTIVE FORM & INTERNAL KEYBOARD HUB)    */}
        {/* ========================================================================= */}
        <div className="flex flex-col justify-between h-full bg-slate-50 p-4 rounded-4xl border border-slate-200/60 overflow-hidden">
          <div className="flex justify-between items-center pb-2 border-b border-slate-200 mb-3 shrink-0">
            <span className="font-black text-[10px] uppercase tracking-widest text-slate-400">
              {paymentType === "CASH" && "Metode Tunai / Cash Operasional"}
              {paymentType === "DEBIT" && "Metode Gesek Kartu / EDC Merchant"}
              {paymentType === "QRIS" && "Metode Scan QRIS E-Wallet / Transfer"}
              {paymentType === "PRIVE" &&
                "Metode Otorisasi Internal Compliment"}
            </span>
            <button
              type="button"
              onClick={() => setShowPaymentModal(false)}
              className="text-slate-400 hover:text-slate-900 cursor-pointer p-0.5"
            >
              <X size={16} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto min-h-0 space-y-3 pr-0.5 scrollbar-thin">
            {/* 1. TUNAI CASH */}
            {paymentType === "CASH" && (
              <div className="space-y-2.5 animate-fade-in">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">
                    Uang Tunai Diterima (Rp)
                  </label>
                  <input
                    type="text"
                    inputMode="none"
                    value={Number(cashReceived).toLocaleString("id-ID")}
                    readOnly
                    className="w-full bg-white border-2 border-slate-200 rounded-xl p-3 shadow-inner font-black text-xl text-slate-900 text-right tracking-tight"
                  />
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      setCashReceived(Math.ceil(cartGrandTotal).toString())
                    }
                    className="py-2 bg-orange-600 text-white hover:bg-orange-700 font-black text-[9px] rounded-lg uppercase border border-orange-600 cursor-pointer text-center"
                  >
                    Uang Pas
                  </button>
                  {[50000, 100000, 150000, 200000, 300000, 500000, 1000000].map(
                    (denom) => (
                      <button
                        key={denom}
                        type="button"
                        onClick={() => setCashReceived(denom.toString())}
                        className="py-2 bg-white hover:bg-slate-100 text-slate-800 font-black text-[9px] rounded-lg border border-slate-200 cursor-pointer text-center"
                      >
                        {denom >= 1000000
                          ? `${denom / 1000000}M`
                          : `${denom / 1000}k`}
                      </button>
                    ),
                  )}
                </div>
                <div className="p-3 bg-orange-50 border border-orange-200 rounded-xl flex justify-between items-center mt-1">
                  <span className="text-[10px] font-black text-slate-500 uppercase">
                    Uang Kembali
                  </span>
                  <span className="text-base font-black text-slate-900">
                    Rp {calculatedChange.toLocaleString("id-ID")}
                  </span>
                </div>
              </div>
            )}

            {/* 2. GESEK KARTU DEBIT */}
            {paymentType === "DEBIT" && (
              <div className="space-y-2 animate-fade-in">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">
                    Pilih Nama Bank Merchant Kartu
                  </label>
                  <select
                    value={selectedBank}
                    onChange={(e) => setSelectedBank(e.target.value)}
                    className="w-full bg-white border-2 border-slate-200 rounded-xl p-2.5 font-black text-xs text-slate-900 uppercase tracking-wider cursor-pointer"
                  >
                    {activeBankList.map((bank: string) => (
                      <option key={bank} value={bank}>
                        BANK {bank}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">
                    Nomor Reff Transaksi EDC (Ketik via Numpad)
                  </label>
                  <input
                    type="text"
                    inputMode="none"
                    value={cardNumber}
                    placeholder="Gunakan numpad internal bawah..."
                    readOnly
                    className="w-full bg-white border-2 border-slate-200 rounded-xl p-3 shadow-inner font-black text-sm text-slate-900 tracking-wider"
                  />
                </div>
              </div>
            )}

            {/* 3. DIGITAL QRIS */}
            {paymentType === "QRIS" && (
              <div className="p-4 border-2 border-dashed border-slate-200 rounded-2xl text-center space-y-3 bg-white animate-fade-in flex flex-col items-center justify-center h-full min-h-70">
                <div className="w-32 h-32 bg-slate-100 rounded-xl flex items-center justify-center font-black text-[9px] uppercase text-slate-400 p-2 border border-slate-200 relative">
                  {dynamicQrCodeUrl ? (
                    <img
                      src={dynamicQrCodeUrl}
                      alt="QRIS Holding"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    "QRIS BARCODE"
                  )}
                </div>
                <div className="text-center">
                  <span className="text-[9px] font-black tracking-widest text-slate-400 uppercase block">
                    JALUR ALTERNATIF REKENING UTAMA:
                  </span>
                  <span className="text-xs font-black text-slate-900 uppercase block tracking-tight mt-0.5">
                    REK ASSTRO: {dynamicAccountNo}
                  </span>
                </div>
              </div>
            )}

            {/* 4. COMPLIMENT / PRIVE (DENGAN DYNAMIC INTERFACES SHIFTING) */}
            {paymentType === "PRIVE" && (
              <div className="space-y-2 animate-fade-in">
                {!isPriveAuthorized ? (
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">
                      Proteksi Keuangan: Input PIN Manajer via Numpad
                    </label>
                    <input
                      type="text"
                      inputMode="none"
                      value={"• ".repeat(managerPinForPrive.length)}
                      placeholder="Ketik 4 digit PIN Manajer..."
                      readOnly
                      className="w-full bg-white border-2 border-slate-200 rounded-xl p-3 text-center font-black text-lg text-slate-900 tracking-widest"
                    />
                    {managerPinForPrive.length === 4 && (
                      <button
                        type="button"
                        onClick={() => handleVerifyPriveManagerPin()}
                        className="w-full mt-2 py-2 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-wider rounded-xl cursor-pointer transition-all animate-pulse"
                      >
                        Verifikasi Kode Otorisasi PIN
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2 animate-fade-in">
                    <div className="p-2 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-[10px] font-black uppercase tracking-wider text-center">
                      ✓ Otorisasi Compliment Disetujui Manajer
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">
                        Alasan / Nama Jajaran Jabatan Owner (Internal QWERTY)
                      </label>
                      <input
                        type="text"
                        inputMode="none"
                        value={priveNote}
                        placeholder="Gunakan keyboard internal di bawah untuk mengisi alasan..."
                        readOnly
                        className="w-full bg-white border-2 border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-900 uppercase focus:outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ========================================================================= */}
          {/* HUB KONTROL INTERAKTIF: PAPAN KETIK DINAMIS (MORPHING NUMPAD / QWERTY)      */}
          {/* ========================================================================= */}
          <div className="w-full pt-2 border-t border-slate-200 shrink-0 mt-3">
            {/* KONDISI A: TAMPILKAN INTERNAL KEYBOARD QWERTY (Jika Compliment Lolos Verifikasi PIN) */}
            {paymentType === "PRIVE" && isPriveAuthorized ? (
              <div className="space-y-1.5 animate-fade-in">
                {qwertyRows.map((row, rIdx) => (
                  <div key={rIdx} className="flex justify-center gap-1 w-full">
                    {row.map((key) => {
                      const isSpecial = [
                        "SHIFT",
                        "BACKSPACE",
                        "CLEAR",
                        "SPACE",
                      ].includes(key);

                      let btnStyle =
                        "bg-white hover:bg-slate-100 text-slate-900 text-xs font-black border border-slate-200 shadow-xs active:scale-95";
                      if (key === "SHIFT" && isQwertyShift)
                        btnStyle =
                          "bg-orange-600 text-white border-orange-600 shadow-md";
                      else if (key === "BACKSPACE" || key === "SHIFT")
                        btnStyle =
                          "bg-slate-200 hover:bg-slate-300 text-slate-700 text-[10px] font-black border border-slate-300";
                      else if (key === "CLEAR")
                        btnStyle =
                          "bg-red-50 hover:bg-red-100 text-red-600 text-[10px] font-black border border-red-200";
                      else if (key === "SPACE")
                        btnStyle =
                          "bg-white hover:bg-slate-100 text-slate-900 font-black border border-slate-200 px-12 flex-1";

                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => handleInternalQwertyPress(key)}
                          className={`h-11 px-2 rounded-lg transition-all flex items-center justify-center select-none cursor-pointer ${
                            isSpecial ? btnStyle : `flex-1 ${btnStyle}`
                          }`}
                        >
                          {key === "BACKSPACE"
                            ? "← Del"
                            : key === "SPACE"
                              ? "Spasi"
                              : key}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            ) : paymentType !== "QRIS" ? (
              /* KONDISI B: TAMPILKAN STANDARD INTERNAL NUMPAD (Untuk Tunai, Debit, & Ketik PIN Manajer) */
              <div className="grid grid-cols-3 gap-1.5 animate-fade-in">
                {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => handleUniversalNumpadPress(num)}
                    className="py-3 bg-white hover:bg-slate-100 text-slate-900 font-black text-base rounded-xl transition-all border border-slate-200/80 shadow-xs cursor-pointer active:scale-95 flex items-center justify-center select-none"
                  >
                    {num}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => handleUniversalNumpadPress("CLEAR")}
                  className="py-3 bg-red-50 hover:bg-red-100 text-red-600 font-black text-xs uppercase tracking-wider rounded-xl border border-red-200 cursor-pointer active:scale-95 flex items-center justify-center select-none"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={() => handleUniversalNumpadPress("0")}
                  className="py-3 bg-white hover:bg-slate-100 text-slate-900 font-black text-base rounded-xl border border-slate-200/80 cursor-pointer active:scale-95 flex items-center justify-center select-none"
                >
                  0
                </button>
                <button
                  type="button"
                  onClick={() => handleUniversalNumpadPress("BACKSPACE")}
                  className="py-3 bg-amber-50 hover:bg-amber-100 text-amber-700 font-black text-xs uppercase tracking-wider rounded-xl border border-amber-200 cursor-pointer active:scale-95 flex items-center justify-center select-none"
                >
                  ← Del
                </button>
              </div>
            ) : null}
          </div>

          {/* Tombol Eksekusi Submit Transaksi Akhir */}
          <button
            type="submit"
            disabled={isCheckoutDisabled}
            className="w-full bg-slate-900 hover:bg-orange-600 text-white font-black text-xs uppercase tracking-widest py-3.5 rounded-xl transition-all shadow-md mt-3 shrink-0 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer active:scale-[0.99] select-none text-center"
          >
            Selesaikan & Cetak Struk Lunas
          </button>
        </div>
      </form>
    </div>
  );
};
