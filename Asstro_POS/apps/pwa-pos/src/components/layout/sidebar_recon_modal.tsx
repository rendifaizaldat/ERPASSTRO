import React from "react";
import { ShieldAlert } from "lucide-react";
import { useToast } from "../../components/Toast";

interface SidebarReconModalProps {
  showReconModal: boolean;
  setShowReconModal: (show: boolean) => void;
  actualCash: string;
  setActualCash: (cash: string) => void;
  handleLogoutSubmit: (e: React.FormEvent) => Promise<void>;
}

export const SidebarReconModal = ({
  showReconModal,
  setShowReconModal,
  actualCash,
  setActualCash,
  handleLogoutSubmit,
}: SidebarReconModalProps) => {
  if (!showReconModal) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/80 z-90 flex items-center justify-center p-4">
      <form
        onSubmit={handleLogoutSubmit}
        className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl border space-y-4"
      >
        <div className="flex items-center gap-2 text-red-600">
          <ShieldAlert size={22} />
          <h4 className="font-black text-sm uppercase tracking-wider">
            Gerbang Tutup Shift (Blind Audit)
          </h4>
        </div>

        <p className="text-xs text-slate-500 leading-relaxed font-bold">
          PERINGATAN AUDIT: Hitung total seluruh fisik uang tunai di dalam laci
          laci kasir saat ini. Angka ekspektasi sistem sengaja disembunyikan
          (*Blind Reconciliation*) untuk mendeteksi manipulasi finansial.
        </p>

        <div>
          <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">
            Total Fisik Uang Tunai Di Laci (Rp)
          </label>
          <input
            type="text"
            required
            value={actualCash}
            onChange={(e) => setActualCash(e.target.value.replace(/\D/g, ""))}
            placeholder="Masukkan total uang laci asli"
            className="w-full px-4 py-3 bg-slate-50 border rounded-xl text-sm font-black focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            type="button"
            onClick={() => setShowReconModal(false)}
            className="w-full bg-slate-100 text-slate-500 py-3 rounded-xl font-black text-xs uppercase cursor-pointer"
          >
            Batal
          </button>
          <button
            type="submit"
            className="w-full bg-red-600 text-white py-3 rounded-xl font-black text-xs uppercase shadow-md shadow-red-200 cursor-pointer"
          >
            Kunci & Tutup Shift
          </button>
        </div>
      </form>
    </div>
  );
};
