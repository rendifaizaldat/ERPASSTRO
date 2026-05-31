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
import { Maximize, Minimize } from "lucide-react";

function AppContent() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

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
      const baseWidth = 1280;
      const currentWidth = window.innerWidth;

      if (currentWidth < baseWidth) {
        const scaleRatio = currentWidth / baseWidth;
        document.documentElement.style.fontSize = `${16 * scaleRatio}px`;
      } else {
        document.documentElement.style.fontSize = "16px";
      }
    };

    window.addEventListener("resize", handleResize);
    handleResize();
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
    <div className="flex flex-col h-screen bg-slate-100 text-slate-800 overflow-hidden font-sans select-none relative">
      <Header onMenuClick={() => setIsMenuOpen(true)} />
      <Sidebar isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />

      {/* Tombol Fullscreen Floating di pojok kiri atas */}
      <button
        onClick={toggleFullScreen}
        className="fixed left-4 top-4 z-50 p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-lg hover:bg-slate-100 transition-all cursor-pointer border border-slate-200"
        title={isFullscreen ? "Keluar Fullscreen" : "Fullscreen"}
      >
        {isFullscreen ? (
          <Minimize size={20} className="text-orange-600" />
        ) : (
          <Maximize size={20} className="text-slate-700" />
        )}
      </button>

      {/* Navigasi Dine In / Take Away - Hanya tampil jika BUKAN dalam mode MENU (katalog) */}
      {viewState.viewMode !== "MENU" && (
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
          {/* Tombol fullscreen sudah dipindah, jadi area kanan kosong */}
          <div></div>
        </nav>
      )}

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
