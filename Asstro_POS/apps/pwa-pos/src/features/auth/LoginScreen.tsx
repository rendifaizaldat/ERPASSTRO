import React, { useState } from "react";
import { usePos } from "../../core/PosProvider";
import { useToast } from "../../components/Toast";
import { ShieldAlert, Delete, Lock, Coins } from "lucide-react";

export const LoginScreen: React.FC = () => {
  const {
    validatePinOnly,
    openShiftWithModal,
    isScreenLocked,
    currentOperator,
    state,
  } = usePos();
  const { showToast } = useToast();
  const [pin, setPin] = useState<string>("");

  // Modal Input Modal Awal State (Murni Pengendali Tampilan Mekanis Lokal)
  const [showFloatModal, setShowFloatModal] = useState(false);
  const [validatedPin, setValidatedPin] = useState("");
  const [targetStaffName, setTargetStaffName] = useState("");
  const [initialCash, setInitialCash] = useState("");

  const handleNumberClick = (num: string) => {
    if (showFloatModal) return; // Kunci numpad jika modal sedang muncul
    if (pin.length < 6) {
      const updatedPin = pin + num;
      setPin(updatedPin);

      if (updatedPin.length === 6) {
        processAuthentication(updatedPin);
      }
    }
  };

  const handleBackspace = () => {
    if (showFloatModal) return;
    setPin((prev) => prev.slice(0, -1));
  };

  // LOGIKA BARU: UI Pasif Murni Melempar Angka Mentah dan Patuh Menunggu Perintah Otak Backend
  const processAuthentication = async (inputPin: string) => {
    const result = await validatePinOnly(inputPin);

    if (!result.valid) {
      showToast(result.message || "Otorisasi Akses Ditolak.", "ERROR");
      setPin("");
      return;
    }

    // MEMBACA INSTRUKSI EVALUASI BACKEND
    // Jika backend mendeteksi ini hanya unlock biasa (currentOperator masih aktif), backend otomatis merubah isScreenLocked menjadi false di core
    if (isScreenLocked && currentOperator && currentOperator.pin === inputPin) {
      showToast("Layar berhasil dibuka!", "SUCCESS");
      setPin("");
      return;
    }

    // Jika ini adalah pendeteksian Operator baru pembuka shift, pasang form modal uang laci
    setValidatedPin(inputPin);
    setTargetStaffName(result.staff?.name || "OPERATOR");
    setInitialCash("");
    setShowFloatModal(true);
  };

  const handleConfirmOpeningShift = async (e: React.FormEvent) => {
    e.preventDefault();
    const cashValue = Number(initialCash) || 0;

    await openShiftWithModal(validatedPin, cashValue);

    // Reset internal status mekanik lokal
    setShowFloatModal(false);
    setPin("");
    setValidatedPin("");
  };

  return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-950 text-slate-100 p-6 font-sans select-none relative">
      <div className="w-full max-w-sm flex flex-col items-center animate-fade">
        {/* Branding & Lock Icons Layout */}
        <div className="bg-orange-600 text-white w-16 h-16 flex items-center justify-center rounded-3xl font-black italic text-2xl shadow-xl shadow-orange-900/30 mb-4 relative">
          AS
          {isScreenLocked && currentOperator && (
            <div className="absolute -top-1 -right-1 bg-red-600 border-2 border-slate-950 p-1 rounded-full text-white animate-bounce">
              <Lock size={12} />
            </div>
          )}
        </div>

        <h1 className="font-black text-2xl uppercase tracking-widest text-center">
          {isScreenLocked ? (
            <>
              Layar <span className="text-red-500">Terkunci</span>
            </>
          ) : (
            <>
              Asstro <span className="text-orange-500">POS</span>
            </>
          )}
        </h1>

        <p className="text-[10px] font-bold text-slate-500 tracking-widest uppercase mt-2 text-center mb-10">
          {isScreenLocked && currentOperator
            ? `STANDBY MODE OLEH: ${currentOperator?.name}`
            : `${state?.companyName || "Holding Ecosystem"} • CABANG ${state?.branchId || "LOCAL NODE"}`}
        </p>

        {/* Input PIN Circle Indicators */}
        <div className="flex gap-4 justify-center mb-4">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className={`w-4 h-4 rounded-full border-2 transition-all duration-150 ${
                i < pin.length
                  ? "bg-orange-500 border-orange-500 scale-110 shadow-lg shadow-orange-500/50"
                  : "bg-transparent border-slate-700"
              }`}
            />
          ))}
        </div>

        {/* Empty spacer for error (error removed, using toast instead) */}
        <div className="h-16 w-full mb-4" />

        {/* Numpad Mechanical Grid */}
        <div className="grid grid-cols-3 gap-4 w-full">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => handleNumberClick(num)}
              className="h-20 bg-slate-900 hover:bg-slate-800 text-white font-black text-2xl rounded-2xl border border-slate-900 hover:border-slate-700 transition-all active:scale-95 flex items-center justify-center shadow-md cursor-pointer"
            >
              {num}
            </button>
          ))}
          <div className="h-20" />
          <button
            type="button"
            onClick={() => handleNumberClick("0")}
            className="h-20 bg-slate-900 hover:bg-slate-800 text-white font-black text-2xl rounded-2xl border border-slate-900 hover:border-slate-700 transition-all active:scale-95 flex items-center justify-center shadow-md cursor-pointer"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleBackspace}
            className="h-20 bg-slate-900 hover:bg-red-950 hover:text-red-400 text-slate-400 font-black rounded-2xl border border-slate-900 hover:border-red-900 transition-all active:scale-95 flex items-center justify-center shadow-md cursor-pointer"
          >
            <Delete size={24} />
          </button>
        </div>
      </div>

      {/* ======================================================
          BACKDROP OVERLAY MODAL FOR INITIAL OPENING CASH FLOAT
          ====================================================== */}
      {showFloatModal && (
        <div className="fixed inset-0 bg-slate-950/80 z-100 backdrop-blur-sm flex items-center justify-center p-6 animate-fade">
          <div className="w-full max-w-sm bg-white text-slate-900 rounded-[2.5rem] shadow-2xl p-8 border border-slate-200 flex flex-col animate-fade-in">
            <div className="flex items-center gap-3 mb-4 text-orange-600">
              <Coins size={24} />
              <h3 className="font-black text-lg uppercase tracking-tight">
                Uang Modal Awal Shift
              </h3>
            </div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide leading-relaxed mb-6">
              Halo{" "}
              <span className="text-slate-900 font-black">
                {targetStaffName}
              </span>
              , masukkan nominal ketersediaan uang di laci kasir saat ini
              sebagai modal penunjang uang kembalian transaksi ruko.
            </p>
            <form onSubmit={handleConfirmOpeningShift} className="space-y-6">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">
                  Input Nominal Modal (Rupiah)
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-5 font-black text-sm text-slate-400">
                    Rp
                  </span>
                  <input
                    type="text"
                    required
                    autoFocus
                    value={initialCash}
                    onChange={(e) =>
                      setInitialCash(e.target.value.replace(/\D/g, ""))
                    }
                    placeholder="Contoh: 500000"
                    className="w-full pl-12 pr-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-black focus:outline-none focus:border-orange-500 transition-colors"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full bg-orange-600 hover:bg-slate-900 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl active:scale-95 cursor-pointer"
              >
                Buka Shift Sekarang
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
