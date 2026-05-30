import React from "react";
import { Printer, X, FileText, Clock, User } from "lucide-react";

interface PrintDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  tableLabel: string | null;
  cart: any[];
  operatorName: string;
  onExecuteReprint: (isWatermarked: boolean) => void;
}

export const PrintDetailModal: React.FC<PrintDetailModalProps> = ({
  isOpen,
  onClose,
  tableLabel,
  cart,
  operatorName,
  onExecuteReprint,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/80 z-300 backdrop-blur-sm flex items-center justify-center p-4 animate-fade">
      <div className="w-full max-w-md bg-white text-slate-900 rounded-[2.5rem] shadow-2xl p-6 border border-slate-200 flex flex-col max-h-[85vh] text-sm overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center border-b pb-3 mb-3 shrink-0">
          <h3 className="font-black text-sm uppercase tracking-tight flex items-center gap-2 text-slate-800">
            <FileText size={18} className="text-orange-600" /> KDS Archive: Meja{" "}
            {tableLabel}
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-900"
          >
            <X size={16} />
          </button>
        </div>

        {/* Audit Log */}
        <div className="bg-slate-50 border p-3 rounded-2xl space-y-1 text-xs font-bold uppercase text-slate-500 mb-3 tracking-tight shrink-0">
          <div>
            Operator:{" "}
            <span className="text-slate-900 font-black">{operatorName}</span>
          </div>
          <div>
            Status Tiket:{" "}
            <span className="text-emerald-600 font-black">
              Terkunci Aman di Dapur
            </span>
          </div>
        </div>

        {/* Rincian Item Fisik */}
        <span className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-1.5 block">
          Detail Item Dapur:
        </span>
        <div className="flex-1 overflow-y-auto space-y-2 border rounded-2xl p-2.5 bg-slate-50/50 mb-4">
          {cart.map((item) => (
            <div
              key={item.id}
              className="bg-white border rounded-xl p-2.5 text-xs font-black uppercase text-slate-800 flex justify-between items-center shadow-sm"
            >
              <div className="flex flex-col">
                <span>{item.name}</span>
                {item.note && (
                  <span className="text-[10px] text-orange-600 italic font-bold">
                    Ket: {item.note}
                  </span>
                )}
              </div>
              <span className="bg-slate-100 px-2 py-0.5 rounded text-[11px] text-slate-900 font-black">
                x{item.qty}
              </span>
            </div>
          ))}
        </div>

        {/* Tombol Aksi */}
        <div className="grid grid-cols-2 gap-3 shrink-0">
          <button
            type="button"
            onClick={() => onExecuteReprint(false)}
            className="bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase py-3 rounded-xl transition-all"
          >
            Print Slip Asli
          </button>
          <button
            type="button"
            onClick={() => onExecuteReprint(true)}
            className="bg-orange-600 hover:bg-orange-700 text-white font-black text-xs uppercase py-3 rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-md shadow-orange-500/20"
          >
            <Printer size={14} /> Reprint (Copy)
          </button>
        </div>
      </div>
    </div>
  );
};
