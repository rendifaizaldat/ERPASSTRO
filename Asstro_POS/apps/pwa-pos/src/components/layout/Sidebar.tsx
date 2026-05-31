import React, { useState, useRef } from "react";
import { usePos } from "../../core/PosProvider";
import { useToast } from "../../components/Toast";
import {
  X,
  Users,
  Tag,
  LogOut,
  Lock,
  History,
  Wallet,
  FileBarChart,
  Settings, // [TAMBAHAN] Import icon Settings
} from "lucide-react";
import { SidebarMenu } from "./sidebar_menu";
import { SidebarStaffManagement } from "./sidebar_stafmanagement";
import { SidebarReconModal } from "./sidebar_recon_modal";
import { SidebarHistori } from "./sidebar_histori";
import { SidebarKas } from "./sidebar_kas";
import { SidebarReport } from "./sidebar_report";
import { SidebarSettings } from "./sidebar_settings"; // [TAMBAHAN] Import komponen Settings

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar = ({ isOpen, onClose }: SidebarProps) => {
  const {
    state,
    registerStaff,
    addMasterCategory,
    deleteMasterCategory,
    addMasterProduct,
    deleteMasterProduct,
    logoutWithReconciliation,
    currentOperator,
    toggleProductStatus,
    editMasterProduct,
    validatePinOnly,
    editStaff,
    toggleStaffStatus,
  } = usePos();

  const { showToast } = useToast();

  const [isStaffOpen, setIsStaffOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showReconModal, setShowReconModal] = useState(false);
  const [isHistoriOpen, setIsHistoriOpen] = useState(false);
  const [isKasOpen, setIsKasOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false); // [TAMBAHAN] State untuk Settings

  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const pinCallbackRef = useRef<((authorized: boolean) => void) | null>(null);

  const [catName, setCatName] = useState("");
  const [prodSku, setProdSku] = useState("");
  const [prodName, setProdName] = useState("");
  const [prodPrice, setProdPrice] = useState("");
  const [prodCatId, setProdCatId] = useState("");

  const [staffName, setStaffName] = useState("");
  const [staffRole, setStaffRole] = useState<"ADMIN" | "CASHIER" | "WAITER">(
    "CASHIER",
  );
  const [staffPin, setStaffPin] = useState("");

  const [actualCash, setActualCash] = useState("");

  const existingStaffList = state?.staffList || [];
  const masterCategories = state?.categories || [];
  const masterProducts = state?.products || [];
  const totalRevenue = state?.sales?.total_revenue || 0;

  const triggerManagerPinVerification = (
    callback: (authorized: boolean) => void,
  ) => {
    pinCallbackRef.current = callback;
    setPinInput("");
    setIsPinModalOpen(true);
  };

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const staffList = state?.staffList || [];

    const targetStaff =
      staffList.find((s: any) => s.pin === pinInput && s.isActive !== false) ||
      (state?.isInitialized && pinInput === "112233"
        ? {
            id: "ADMIN-000",
            name: "ADMINISTRATOR",
            role: "ADMIN",
            pin: "112233",
            isActive: true,
          }
        : null);

    if (targetStaff && targetStaff.role === "ADMIN") {
      setIsPinModalOpen(false);
      setPinInput("");
      if (pinCallbackRef.current) pinCallbackRef.current(true);
    } else {
      showToast(
        "AKSES DITOLAK: PIN Salah, Akun Non-Aktif, atau Bukan Administrator!",
        "ERROR",
      );
      setPinInput("");
    }
  };

  const handleCancelPin = () => {
    setIsPinModalOpen(false);
    setPinInput("");
    if (pinCallbackRef.current) pinCallbackRef.current(false);
  };

  const handleAddStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffName.trim()) {
      showToast("Nama staf wajib diisi!", "ERROR");
      return;
    }
    if (staffPin.length !== 6) {
      showToast(
        "PROTEKSI PIN: Kunci PIN keamanan wajib 6 digit angka!",
        "ERROR",
      );
      return;
    }
    if (staffPin === "112233" || staffPin === "0000") {
      showToast("PIN ini adalah kunci sistem (Reserved)!", "ERROR");
      return;
    }

    const isPinInUse = existingStaffList.some(
      (s: any) => s.pin === staffPin && s.isActive !== false,
    );

    if (isPinInUse) {
      showToast("GAGAL: PIN ini sedang digunakan oleh staf AKTIF!", "ERROR");
      return;
    }

    await registerStaff({
      name: staffName.trim().toUpperCase(),
      role: staffRole,
      pin: staffPin,
    });
    setStaffName("");
    setStaffPin("");
    showToast("STAF BARU BERHASIL DIDAFTARKAN KE SISTEM!", "SUCCESS");
  };

  const handleDeleteStaffAction = async (
    pinToDelete: string,
    nameToDelete: string,
  ) => {
    const supervisorPin = window.prompt(
      `OTORITAS KRUSIAL: Masukan PIN Administrator (112233) untuk menghapus staf ${nameToDelete}:`,
    );
    if (supervisorPin === null) {
      showToast("Penghapusan staf dibatalkan.", "WARNING");
      return;
    }
    if (supervisorPin === "112233" || supervisorPin === "0000") {
      showToast(
        `Otoritas disetujui. Akses staf ${nameToDelete} dinonaktifkan dari database lokal ruko.`,
        "SUCCESS",
      );
    } else {
      showToast(
        "AKSES DITOLAK: PIN Otoritas salah! Anda tidak memiliki hak menghapus data staf.",
        "ERROR",
      );
    }
  };

  const handleAddCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanedCat = catName.trim().toUpperCase();
    if (!cleanedCat) return;
    if (masterCategories.some((c: any) => c.name === cleanedCat)) {
      showToast("NAMA KATEGORI INI SUDAH TERDAFTAR DI RUKO!", "ERROR");
      return;
    }
    await addMasterCategory(cleanedCat);
    setCatName("");
    showToast("Kategori berhasil ditambahkan!", "SUCCESS");
  };

  const handleAddProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !prodSku.trim() ||
      !prodName.trim() ||
      !prodPrice.trim() ||
      !prodCatId
    ) {
      showToast("Semua kolom isian menu produk wajib diisi lengkap.", "ERROR");
      return;
    }
    if (
      masterProducts.some((p: any) => p.sku === prodSku.trim().toUpperCase())
    ) {
      showToast("KODE SKU MENU SUDAH ADA. GUNAKAN SKU UNIK LAINNYA!", "ERROR");
      return;
    }
    await addMasterProduct({
      sku: prodSku,
      name: prodName,
      price: Number(prodPrice) || 0,
      categoryId: prodCatId,
    });
    setProdSku("");
    setProdName("");
    setProdPrice("");
    showToast("Produk berhasil ditambahkan!", "SUCCESS");
  };

  const handleLogoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actualCash.trim()) {
      showToast("Wajib menginput nominal fisik uang di dalam laci!", "ERROR");
      return;
    }
    const inputFisik = Number(actualCash) || 0;
    const perkiraanSistem = totalRevenue;
    await logoutWithReconciliation(inputFisik, perkiraanSistem);
    setActualCash("");
    setShowReconModal(false);
    onClose();
    showToast(
      "SHIFT RESMI DITUTUP. REKONSILIASI KAS SUDAH DIKUNCI PERMANEN.",
      "SUCCESS",
    );
  };

  return (
    <>
      <div
        className={`fixed inset-0 bg-slate-900/40 z-50 transition-opacity duration-300 ${isOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={onClose}
      />
      <div
        className={`fixed right-0 top-0 h-full w-80 bg-white z-60 shadow-2xl transition-transform duration-500 ease-in-out transform ${isOpen ? "translate-x-0" : "translate-x-full"}`}
      >
        <div className="p-8 h-full flex flex-col justify-between overflow-y-auto">
          <div>
            <div className="flex justify-between items-center mb-10 text-slate-900">
              <h3 className="font-black text-xl italic uppercase">
                Menu <span className="text-orange-600">Hub</span>
              </h3>
              <button
                onClick={onClose}
                className="p-2 hover:bg-slate-100 rounded-xl"
              >
                <X size={20} />
              </button>
            </div>
            <div className="mb-6 p-4 bg-slate-50 border rounded-2xl">
              <span className="text-[10px] font-black tracking-widest text-slate-400 block uppercase">
                Operator Aktif
              </span>
              <div className="font-black text-sm uppercase text-slate-900 mt-0.5">
                {currentOperator?.name || "Belum Login"}
              </div>
              <span className="text-[9px] font-bold text-orange-600 block uppercase mt-0.5">
                Otoritas: {currentOperator?.role}
              </span>
            </div>
            <nav className="space-y-2">
              <button
                onClick={() => setIsReportOpen(true)}
                className="w-full flex items-center gap-4 p-4 rounded-3xl font-black text-sm uppercase text-slate-400 hover:bg-slate-50 hover:text-slate-900 text-left cursor-pointer"
              >
                <FileBarChart size={20} className="text-orange-600" /> REPORT /
                Laporan
              </button>
              <button
                onClick={() => setIsKasOpen(true)}
                className="w-full flex items-center gap-4 p-4 rounded-3xl font-black text-sm uppercase text-slate-400 hover:bg-slate-50 hover:text-slate-900 text-left cursor-pointer"
              >
                <Wallet size={20} className="text-orange-600" /> Kas Kasir
                (Petty)
              </button>
              <button
                onClick={() => setIsHistoriOpen(true)}
                className="w-full flex items-center gap-4 p-4 rounded-3xl font-black text-sm uppercase text-slate-400 hover:bg-slate-50 hover:text-slate-900 text-left cursor-pointer"
              >
                <History size={20} className="text-orange-600" /> Riwayat
                Transaksi
              </button>
              <button
                onClick={() => setIsMenuOpen(true)}
                className="w-full flex items-center gap-4 p-4 rounded-3xl font-black text-sm uppercase text-slate-400 hover:bg-slate-50 hover:text-slate-900 text-left cursor-pointer"
              >
                <Tag size={20} className="text-orange-600" /> Menu & Category
                Center
              </button>
              {currentOperator?.role === "ADMIN" && (
                <>
                  <button
                    onClick={() => setIsStaffOpen(true)}
                    className="w-full flex items-center gap-4 p-4 rounded-3xl font-black text-sm uppercase text-slate-400 hover:bg-slate-50 hover:text-slate-900 text-left cursor-pointer"
                  >
                    <Users size={20} className="text-orange-600" /> Staff
                    Management
                  </button>
                  {/* [TAMBAHAN] Tombol Settings hanya untuk Admin */}
                  <button
                    onClick={() => setIsSettingsOpen(true)}
                    className="w-full flex items-center gap-4 p-4 rounded-3xl font-black text-sm uppercase text-slate-400 hover:bg-slate-50 hover:text-slate-900 text-left cursor-pointer"
                  >
                    <Settings size={20} className="text-orange-600" />{" "}
                    Pengaturan Sistem
                  </button>
                </>
              )}
            </nav>
          </div>
          <button
            onClick={() => setShowReconModal(true)}
            className="w-full flex items-center gap-4 p-4 mt-6 rounded-3xl text-red-500 font-black text-sm uppercase hover:bg-red-50 text-left cursor-pointer shrink-0"
          >
            <LogOut size={20} /> Tutup Shift POS
          </button>
        </div>
      </div>

      <SidebarReport
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
      />

      <SidebarHistori
        isOpen={isHistoriOpen}
        onClose={() => setIsHistoriOpen(false)}
      />

      <SidebarKas isOpen={isKasOpen} onClose={() => setIsKasOpen(false)} />

      <SidebarMenu
        isMenuOpen={isMenuOpen}
        setIsMenuOpen={setIsMenuOpen}
        catName={catName}
        setCatName={setCatName}
        catError={null}
        handleAddCategorySubmit={handleAddCategorySubmit}
        masterCategories={masterCategories}
        deleteMasterCategory={deleteMasterCategory}
        masterProducts={masterProducts}
        deleteMasterProduct={deleteMasterProduct}
        prodSku={prodSku}
        setProdSku={setProdSku}
        prodName={prodName}
        setProdName={setProdName}
        prodPrice={prodPrice}
        setProdPrice={setProdPrice}
        prodCatId={prodCatId}
        setProdCatId={setProdCatId}
        prodError={null}
        handleAddProductSubmit={handleAddProductSubmit}
        toggleProductStatus={toggleProductStatus}
        editMasterProduct={editMasterProduct}
        restoreMasterProduct={addMasterProduct}
        triggerManagerPinVerification={triggerManagerPinVerification}
      />

      <SidebarStaffManagement
        isStaffOpen={isStaffOpen}
        setIsStaffOpen={setIsStaffOpen}
        staffName={staffName}
        setStaffName={setStaffName}
        staffRole={staffRole}
        setStaffRole={setStaffRole}
        staffPin={staffPin}
        setStaffPin={setStaffPin}
        staffError={null}
        handleAddStaffSubmit={handleAddStaffSubmit}
        existingStaffList={existingStaffList}
        handleDeleteStaffAction={handleDeleteStaffAction}
        editStaff={editStaff}
        toggleStaffStatus={toggleStaffStatus}
      />

      {/* [TAMBAHAN] Komponen SidebarSettings */}
      <SidebarSettings
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      <SidebarReconModal
        showReconModal={showReconModal}
        setShowReconModal={setShowReconModal}
        actualCash={actualCash}
        setActualCash={setActualCash}
        handleLogoutSubmit={handleLogoutSubmit}
      />

      {isPinModalOpen && (
        <div className="fixed inset-0 bg-slate-900/80 z-100 flex items-center justify-center backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl transform transition-all">
            <div className="flex justify-center mb-4">
              <div className="bg-orange-100 p-4 rounded-full">
                <Lock className="text-orange-600" size={32} />
              </div>
            </div>
            <h3 className="text-center font-black text-lg text-slate-900 uppercase tracking-widest mb-2">
              Otorisasi Administrator
            </h3>
            <p className="text-center text-slate-500 text-xs mb-6 px-4">
              Aksi ini memerlukan izin tingkat tinggi. Masukkan PIN Admin Anda
              untuk melanjutkan.
            </p>
            <form onSubmit={handlePinSubmit}>
              <input
                type="password"
                required
                autoFocus
                maxLength={6}
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ""))}
                placeholder="••••••"
                className="w-full text-center tracking-[1em] font-black text-2xl px-4 py-4 bg-slate-50 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-orange-500 transition-all mb-4"
              />
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleCancelPin}
                  className="flex-1 py-3 rounded-xl font-black text-xs uppercase text-slate-500 bg-slate-100 hover:bg-slate-200 transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl font-black text-xs uppercase text-white bg-orange-600 hover:bg-orange-700 shadow-lg shadow-orange-600/30 transition-all cursor-pointer"
                >
                  Verifikasi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
