import { useState, useEffect, useMemo } from "react";
import { Menu, Clock, Briefcase, User, BadgeCheck } from "lucide-react";
import { usePos } from "../../core/PosProvider";

export const Header = ({ onMenuClick }: { onMenuClick: () => void }) => {
  const { currentOperator, state } = usePos();
  const [currentTime, setCurrentTime] = useState(new Date());

  // Timer Detik Jam Dinding Digital Ruko
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Menghitung Durasi Jam Kerja Berjalan Sejak SHIFT_OPENED Ditembakkan Ke Ledger
  const shiftDurationMetrics = useMemo(() => {
    if (!currentOperator) {
      return { durationText: "00:00:00", isOvertime: false };
    }

    const startTimeStamp =
      state?.activeShiftStartTime || state?.currentShiftOpenedAt;

    if (!startTimeStamp) {
      return { durationText: "00:00:00", isOvertime: false };
    }

    const start = new Date(startTimeStamp).getTime();
    const now = currentTime.getTime();
    const diffInSeconds = Math.floor(Math.max(0, now - start) / 1000);

    const hours = Math.floor(diffInSeconds / 3600);
    const minutes = Math.floor((diffInSeconds % 3600) / 60);
    const seconds = diffInSeconds % 60;

    const pad = (num: number) => String(num).padStart(2, "0");
    const durationText = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    const isOvertime = diffInSeconds >= 28800;

    return { durationText, isOvertime };
  }, [currentOperator, state, currentTime]);

  // Format role display - tanpa JSX di dalam fungsi
  const getRoleInfo = (role: string) => {
    const roleMap: Record<
      string,
      { label: string; iconName: string; color: string }
    > = {
      ADMIN: {
        label: "ADMINISTRATOR",
        iconName: "BadgeCheck",
        color: "bg-purple-100 text-purple-700 border-purple-200",
      },
      KASIR: {
        label: "KASIR",
        iconName: "User",
        color: "bg-blue-100 text-blue-700 border-blue-200",
      },
      MANAGER: {
        label: "MANAGER",
        iconName: "Briefcase",
        color: "bg-emerald-100 text-emerald-700 border-emerald-200",
      },
      STAFF: {
        label: "STAFF",
        iconName: "User",
        color: "bg-slate-100 text-slate-700 border-slate-200",
      },
      SUPERVISOR: {
        label: "SUPERVISOR",
        iconName: "BadgeCheck",
        color: "bg-amber-100 text-amber-700 border-amber-200",
      },
    };

    return (
      roleMap[role] || {
        label: role || "UNKNOWN",
        iconName: "User",
        color: "bg-slate-100 text-slate-700 border-slate-200",
      }
    );
  };

  // Helper untuk render icon berdasarkan nama
  const renderIcon = (iconName: string, className: string) => {
    const icons: Record<string, React.ReactElement> = {
      BadgeCheck: <BadgeCheck size={12} className={className} />,
      User: <User size={12} className={className} />,
      Briefcase: <Briefcase size={12} className={className} />,
    };
    return icons[iconName] || icons.User;
  };

  const employeeName = currentOperator?.name || "GUEST ACCOUNT";
  const employeeRole = currentOperator?.role || "UNKNOWN";
  const roleInfo = getRoleInfo(employeeRole);

  const formattedDate = currentTime.toLocaleDateString("id-ID", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const formattedTime = currentTime.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0 z-40 select-none">
      <div className="flex items-center gap-4">
        <div className="bg-orange-600 text-white w-12 h-12 flex items-center justify-center rounded-2xl font-black italic shadow-lg shadow-orange-200">
          AS
        </div>
        <div className="flex flex-col">
          <h2 className="font-black text-2xl tracking-tighter uppercase leading-none text-slate-900">
            Asstro <span className="text-orange-600">POS</span>
          </h2>
          <span className="text-[10px] font-bold text-slate-400 tracking-widest uppercase mt-1">
            Enterprise Solution
          </span>
        </div>
      </div>

      <div className="flex items-center gap-6">
        {/* NAMA */}
        <div className="hidden sm:flex flex-col items-end">
          <span className="text-[9px] font-black tracking-widest text-slate-400 uppercase">
            NAMA
          </span>
          <span className="text-sm font-black text-slate-900 uppercase tracking-tight">
            {employeeName}
          </span>
        </div>

        {/* JABATAN */}
        <div className="hidden sm:flex flex-col items-end border-l border-slate-100 pl-4">
          <span className="text-[9px] font-black tracking-widest text-slate-400 uppercase">
            JABATAN
          </span>
          <div
            className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md ${roleInfo.color} mt-0.5`}
          >
            {renderIcon(
              roleInfo.iconName,
              `text-${roleInfo.color.split(" ")[1]?.replace("text-", "") || "slate-500"}`,
            )}
            <span className="text-xs font-black uppercase tracking-tight">
              {roleInfo.label}
            </span>
          </div>
        </div>

        {/* TIMER KERJA */}
        {currentOperator && (
          <div className="hidden sm:flex flex-col items-end border-l border-slate-100 pl-4">
            <span className="text-[9px] font-black tracking-widest text-slate-400 uppercase">
              TIMER KERJA
            </span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Clock size={12} className="text-orange-600" />
              <span
                className={`text-xs font-black font-mono tracking-wider ${shiftDurationMetrics.isOvertime ? "text-red-600" : "text-slate-900"}`}
              >
                {shiftDurationMetrics.durationText}
              </span>
              {shiftDurationMetrics.isOvertime && (
                <span className="text-[9px] font-black text-red-600 bg-red-50 px-1.5 py-0.5 rounded-md animate-pulse">
                  LEMBUR
                </span>
              )}
            </div>
          </div>
        )}

        {/* JAM & TANGGAL */}
        <div className="flex flex-col items-end border-l border-slate-100 pl-4">
          <span className="text-[9px] font-black tracking-widest text-slate-400 uppercase">
            JAM & TANGGAL
          </span>
          <div className="flex flex-col items-end mt-0.5">
            <span className="text-sm font-black text-orange-600 font-mono tracking-wider">
              {formattedTime}
            </span>
            <span className="text-[9px] font-medium text-slate-500 uppercase tracking-tight">
              {formattedDate}
            </span>
          </div>
        </div>

        <button
          onClick={onMenuClick}
          className="p-3 bg-slate-900 text-white hover:bg-orange-600 rounded-2xl transition-all shadow-lg active:scale-95 cursor-pointer"
        >
          <Menu size={24} />
        </button>
      </div>
    </header>
  );
};
