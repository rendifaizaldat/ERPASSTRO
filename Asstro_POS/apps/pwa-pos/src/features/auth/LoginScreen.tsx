import React, { useState } from "react";
import { usePos } from "../../core/PosProvider";
import { useToast } from "../../components/Toast";
import {
  Delete,
  Lock,
  Coins,
  FileText,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import { SmartInput } from "../../components/shared/keyboard/SmartInput";

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

  const [showFloatModal, setShowFloatModal] = useState(false);
  const [showHandoverModal, setShowHandoverModal] = useState(false);
  const [handoverData, setHandoverData] = useState<any>(null);

  const [validatedPin, setValidatedPin] = useState("");
  const [targetStaffName, setTargetStaffName] = useState("");
  const [initialCash, setInitialCash] = useState("");

  const handleNumberClick = (num: string) => {
    if (showFloatModal || showHandoverModal) return;
    if (pin.length < 6) {
      const updatedPin = pin + num;
      setPin(updatedPin);

      if (updatedPin.length === 6) {
        processAuthentication(updatedPin);
      }
    }
  };

  const handleBackspace = () => {
    if (showFloatModal || showHandoverModal) return;
    setPin((prev) => prev.slice(0, -1));
  };

  const processAuthentication = async (inputPin: string) => {
    const result = await validatePinOnly(inputPin);

    if (!result.valid) {
      showToast(result.message || "Otorisasi Akses Ditolak.", "ERROR");
      setPin("");
      return;
    }

    // [FIX] Menggunakan Type Guard untuk menghindari error TypeScript 2339
    if ("screenUnlocked" in result && result.screenUnlocked) {
      showToast("Layar berhasil dibuka!", "SUCCESS");
      setPin("");
      return;
    }

    setValidatedPin(inputPin);
    setTargetStaffName(result.staff?.name || "OPERATOR");

    // CEK APAKAH ADA TITIPAN DATA OPERAN DARI SHIFT SEBELUMNYA
    const savedHandover = localStorage.getItem("ASSTRO_HANDOVER_DATA");
    if (savedHandover) {
      setHandoverData(JSON.parse(savedHandover));
      setShowHandoverModal(true);
    } else {
      setInitialCash("");
      setShowFloatModal(true);
    }
  };

  const handleConfirmOpeningShift = async (e: React.FormEvent) => {
    e.preventDefault();
    const cashValue = Number(initialCash) || 0;
    await openShiftWithModal(validatedPin, cashValue);
    setShowFloatModal(false);
    setPin("");
    setValidatedPin("");
  };

  const handleAcceptHandover = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!handoverData) return;

    // Buka shift dengan nominal uang fisik operan dari kasir sebelumnya
    await openShiftWithModal(validatedPin, handoverData.actualCash);

    // Hapus data memori operan setelah diterima resmi
    localStorage.removeItem("ASSTRO_HANDOVER_DATA");
    setShowHandoverModal(false);
    setHandoverData(null);
    setPin("");
    setValidatedPin("");
    showToast("Operan Shift Berhasil Diterima. Selamat Bekerja!", "SUCCESS");
  };

  return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-950 text-slate-100 p-6 font-sans select-none relative">
      <div className="w-full max-w-sm flex flex-col items-center animate-fade">
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

        <div className="h-16 w-full mb-4" />

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

      {/* MODAL 1: BUKA SHIFT BARU (NORMAL) */}
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
                <SmartInput
                  type="number"
                  value={initialCash}
                  onChange={(val) => setInitialCash(val.replace(/\D/g, ""))}
                  placeholder="Contoh: 500000"
                  className="w-full pl-12 pr-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-black focus:outline-none focus:border-orange-500 transition-colors"
                />
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

      {/* MODAL 2: TERIMA OPERAN (HANDOVER) */}
      {showHandoverModal && handoverData && (
        <div className="fixed inset-0 bg-slate-950/80 z-100 backdrop-blur-sm flex items-center justify-center p-6 animate-fade">
          <div className="w-full max-w-md bg-white text-slate-900 rounded-[2.5rem] shadow-2xl p-6 border border-slate-200 flex flex-col animate-fade-in">
            <div className="flex items-center gap-2 mb-2 text-slate-900">
              <FileText size={22} className="text-blue-600" />
              <h3 className="font-black text-sm uppercase tracking-tight">
                Laporan Operan Shift Sebelumnya
              </h3>
            </div>

            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide leading-relaxed mb-4">
              Halo{" "}
              <span className="text-blue-600 font-black">
                {targetStaffName}
              </span>
              , Anda menerima operan laci kasir dari{" "}
              <span className="text-slate-900 font-black">
                {handoverData.previousStaffName}
              </span>
              . Harap tinjau ringkasan berikut sebelum menerima operan:
            </p>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-4 space-y-3">
              <div className="flex justify-between items-center pb-3 border-b border-slate-200">
                <span className="text-[10px] font-black uppercase text-slate-500">
                  Uang Fisik Ditinggalkan:
                </span>
                <span className="font-black text-lg text-slate-900">
                  Rp {handoverData.actualCash.toLocaleString("id-ID")}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black uppercase text-slate-500">
                  Status Validasi Kasir 1:
                </span>
                <div className="flex items-center gap-1">
                  {handoverData.difference === 0 ? (
                    <>
                      <CheckCircle size={14} className="text-emerald-600" />
                      <span className="text-[10px] font-black text-emerald-700 uppercase">
                        UANG SESUAI
                      </span>
                    </>
                  ) : handoverData.difference > 0 ? (
                    <>
                      <AlertTriangle size={14} className="text-amber-600" />
                      <span className="text-[10px] font-black text-amber-700 uppercase">
                        LEBIH (OVERAGE)
                      </span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle size={14} className="text-red-600" />
                      <span className="text-[10px] font-black text-red-700 uppercase">
                        KURANG (SHORTAGE)
                      </span>
                    </>
                  )}
                </div>
              </div>

              {handoverData.difference !== 0 && (
                <div className="flex justify-between items-center text-[10px] font-black">
                  <span className="text-slate-400 uppercase">
                    Catatan Kebijakan:
                  </span>
                  <span
                    className="text-slate-700 uppercase max-w-[150px] truncate"
                    title={handoverData.differenceReason}
                  >
                    {handoverData.differenceReason}
                  </span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="bg-orange-50 border border-orange-200 p-3 rounded-xl flex flex-col items-center justify-center text-center">
                <span className="text-[10px] font-black uppercase text-orange-600 mb-1">
                  Tanggungan Meja
                </span>
                <span className="text-2xl font-black text-slate-900">
                  {handoverData.activeTablesCount}
                </span>
              </div>
              <div className="bg-red-50 border border-red-200 p-3 rounded-xl flex flex-col items-center justify-center text-center">
                <span className="text-[10px] font-black uppercase text-red-600 mb-1">
                  Laporan Void/Batal
                </span>
                <span className="text-2xl font-black text-slate-900">
                  {handoverData.voidRefundCount}
                </span>
              </div>
            </div>

            <form
              onSubmit={handleAcceptHandover}
              className="grid grid-cols-2 gap-3 mt-auto"
            >
              <button
                type="button"
                onClick={() => {
                  setShowHandoverModal(false);
                  setPin("");
                  setValidatedPin("");
                }}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 py-4 rounded-xl font-black text-xs uppercase transition-colors cursor-pointer"
              >
                Batal Login
              </button>
              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-black text-xs uppercase shadow-md shadow-blue-600/30 transition-colors cursor-pointer"
              >
                Terima Operan
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
