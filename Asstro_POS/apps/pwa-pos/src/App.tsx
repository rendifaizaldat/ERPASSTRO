import { useState, useEffect } from "react";
import { Header } from "./components/layout/Header";
import { Sidebar } from "./components/layout/Sidebar";
import { Footer } from "./components/layout/Footer";
import { PosProvider, usePos } from "./core/PosProvider";
import { PosModule } from "./features/pos/PosModule";
import { SetupWizard } from "./features/setup/SetupWizard";
import { LoginScreen } from "./features/auth/LoginScreen";

import { errorBus } from "./core/instances";
import { useToast } from "./components/Toast";
import { Maximize, Minimize } from "lucide-react"; // Ditambahkan untuk Ikon Fullscreen

function AppContent() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false); // State pelacak Fullscreen

  const { showToast } = useToast();

  const {
    isReady,
    isInitialized,
    currentOperator,
    isScreenLocked,
    viewState,
    setViewStateDirect,
  } = usePos();

  // =========================================================================
  // 1. ENGINE SKALA DINAMIS (ROOT REM SCALING) - SOLUSI UNTUK TABLET & HP
  // =========================================================================
  useEffect(() => {
    const handleResize = () => {
      // 1280px adalah standar minimum layar laptop/desktop desain kita.
      const baseWidth = 1280;
      const currentWidth = window.innerWidth;

      if (currentWidth < baseWidth) {
        // Kalkulasi rasio layar saat ini dibandingkan dengan laptop ideal
        const scaleRatio = currentWidth / baseWidth;

        // Memanipulasi root font-size.
        // Efek Domino: Seluruh class Tailwind (p-4, w-80, text-sm, dll) yang menggunakan satuan 'rem'
        // akan langsung menyusut secara proporsional tanpa merusak layout flex/grid.
        document.documentElement.style.fontSize = `${16 * scaleRatio}px`;
      } else {
        // Kembali ke normal (16px) untuk Laptop 16" ke atas
        document.documentElement.style.fontSize = "16px";
      }
    };

    // Pasang sensor saat browser di-resize (atau perangkat diputar / rotasi)
    window.addEventListener("resize", handleResize);
    handleResize(); // Eksekusi tembakan pertama saat aplikasi dimuat

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // =========================================================================
  // 2. ENGINE FULLSCREEN
  // =========================================================================
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        showToast(`Sistem Gagal Masuk Fullscreen: ${err.message}`, "ERROR");
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  // =========================================================================
  // 3. ENGINE ALARM & ERROR BUS
  // =========================================================================
  useEffect(() => {
    const errorSubscription = errorBus.subscribe((errorMessage: string) => {
      showToast(errorMessage, "ERROR", 5000);
    });
    return () => errorSubscription.unsubscribe();
  }, [showToast]);

  console.log(
    "[ASSTRO MONITOR UI] Merender Komponen Berdasarkan Status Backend:",
    {
      isScreenLocked,
      activeTab: viewState.activeTab,
      viewMode: viewState.viewMode,
      selectedTable: viewState.selectedTable,
    },
  );

  if (!isReady) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-900 text-white font-black italic uppercase tracking-widest animate-pulse">
        Initializing Asstro Engine...
      </div>
    );
  }

  if (!isInitialized) {
    return <SetupWizard />;
  }

  if (!currentOperator || isScreenLocked) {
    return <LoginScreen />;
  }

  const handleSelectTable = (tableId: string, currentStatus?: string) => {
    console.log(
      `[ASSTRO MONITOR UI] Sensor Kartu Meja Diklik -> Nomor Meja: ${tableId} | Status: ${currentStatus}`,
    );
    setViewStateDirect({
      selectedTable: tableId,
      activeTab: "MENU",
      viewMode: "MENU",
    });
  };

  const handleBackToTables = () => {
    console.log(
      "[ASSTRO MONITOR UI] Sensor Tombol Kembali Diklik -> Mengosongkan Fokus Meja.",
    );
    setViewStateDirect({
      selectedTable: null,
      activeTab: "DINE_IN",
      viewMode: "TABLES",
    });
  };

  return (
    <div className="flex flex-col h-screen bg-slate-100 text-slate-800 overflow-hidden font-sans select-none">
      <Header onMenuClick={() => setIsMenuOpen(true)} />
      <Sidebar isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />

      {/* Navigasi Diperbarui: Tab Dine In/Take Away di Kiri, Fullscreen di Kanan */}
      <nav className="bg-white flex justify-between items-center px-8 border-b border-slate-200 shrink-0">
        <div className="flex">
          <button
            onClick={() => {
              console.log(
                "[ASSTRO MONITOR UI] Sensor Klik Manual Tab Dine In Terdeteksi.",
              );
              setViewStateDirect({
                selectedTable: null,
                activeTab: "DINE_IN",
                viewMode: "TABLES",
              });
            }}
            className={`px-10 py-5 font-black text-xs uppercase tracking-widest transition-all border-b-4 cursor-pointer ${
              viewState.activeTab === "DINE_IN" ||
              (viewState.activeTab === "MENU" &&
                viewState.selectedTable &&
                !viewState.selectedTable.startsWith("TA-"))
                ? "border-orange-600 text-orange-600"
                : "border-transparent text-slate-400"
            }`}
          >
            Dine In{" "}
            {viewState.selectedTable &&
              !viewState.selectedTable.startsWith("TA-") &&
              `(${viewState.selectedTable})`}
          </button>
          <button
            onClick={() => {
              const taId = `TA-${Date.now()}`;
              console.log(
                `[ASSTRO MONITOR UI] Sensor Klik Manual Tab Take Away Terdeteksi. Minta ID: ${taId}`,
              );
              setViewStateDirect({
                selectedTable: taId,
                activeTab: "MENU",
                viewMode: "MENU",
              });
            }}
            className={`px-10 py-5 font-black text-xs uppercase tracking-widest transition-all border-b-4 cursor-pointer ${
              viewState.activeTab === "TAKE_AWAY" ||
              (viewState.selectedTable &&
                viewState.selectedTable.startsWith("TA-"))
                ? "border-orange-600 text-orange-600"
                : "border-transparent text-slate-400"
            }`}
          >
            Take Away
          </button>
        </div>

        {/* Tombol Fullscreen Khusus Presentasi Vercel */}
        <div>
          <button
            onClick={toggleFullScreen}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-black text-[10px] uppercase transition-all border border-slate-200 cursor-pointer shadow-sm active:scale-95"
            title="Aktifkan Mode Layar Penuh"
          >
            {isFullscreen ? (
              <Minimize size={14} className="text-orange-600" />
            ) : (
              <Maximize size={14} className="text-slate-600" />
            )}
            <span className="hidden sm:inline-block">
              {isFullscreen ? "Exit Fullscreen" : "Fullscreen POS"}
            </span>
          </button>
        </div>
      </nav>

      <main className="flex-1 flex overflow-hidden bg-[#F8FAFC]">
        {viewState.viewMode === "TABLES" ? (
          <PosModule
            viewMode="TABLES"
            onSelectTable={handleSelectTable}
            selectedTable={viewState.selectedTable}
            onBack={handleBackToTables}
          />
        ) : (
          <PosModule
            viewMode="MENU"
            onSelectTable={handleSelectTable}
            selectedTable={
              viewState.viewMode === "MENU" ? viewState.selectedTable : null
            }
            onBack={handleBackToTables}
          />
        )}
      </main>

      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <PosProvider>
      <AppContent />
    </PosProvider>
  );
}
