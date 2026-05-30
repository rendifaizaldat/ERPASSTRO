import { Wifi, WifiOff, Clock } from "lucide-react";
import { useEffect, useState } from "react";

export const Footer = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener("online", handleStatus);
    window.addEventListener("offline", handleStatus);
    return () => {
      window.removeEventListener("online", handleStatus);
      window.removeEventListener("offline", handleStatus);
    };
  }, []);

  return (
    <footer className="h-12 bg-slate-900 text-[10px] font-black text-slate-500 px-8 flex items-center justify-between uppercase tracking-widest shrink-0">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          {isOnline ? (
            <Wifi size={14} className="text-green-500" />
          ) : (
            <WifiOff size={14} className="text-red-500" />
          )}
          <span className={isOnline ? "text-slate-300" : "text-red-400"}>
            Network: {isOnline ? "Stable" : "Offline Mode"}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-orange-500">ASSTRO v1.0.0</span>
      </div>
    </footer>
  );
};
