import React, { useState, useMemo, useEffect, useRef } from "react";
import { useToast } from "../components/Toast";
import {
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  MonitorSmartphone,
  Loader2,
  PlusCircle,
  RefreshCw,
  Warehouse,
  Network,
  Store,
  Building2,
  MapPin,
  Globe,
  Lock,
  Users,
  TerminalSquare,
  CheckCircle2,
} from "lucide-react";

interface Branch {
  id: string;
  name: string;
  code: string;
}

interface Region {
  id: string;
  name: string;
  branches: Branch[];
}

interface Device {
  id: string;
  name: string;
  status: string;
}

export const SetupWizard: React.FC = () => {
  const { showToast } = useToast();
  const [step, setStep] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Form State Step 1: Otorisasi
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Form State Step 2: Tipe WMS & Wilayah
  const [wmsType, setWmsType] = useState<"PUSAT" | "OUTLET">("PUSAT");
  const [regions, setRegions] = useState<Region[]>([]);
  const [selectedRegionId, setSelectedRegionId] = useState("");
  const [selectedBranchId, setSelectedBranchId] = useState("");

  // Form State Step 3: Identitas Mesin
  const [devices, setDevices] = useState<Device[]>([]);
  const [provisionMode, setProvisionMode] = useState<"NEW" | "RECOVERY">("NEW");
  const [deviceName, setDeviceName] = useState("");
  const [replaceDeviceId, setReplaceDeviceId] = useState("");

  // State Step 4: Terminal Monitor & Orchestrator
  const [logs, setLogs] = useState<string[]>([]);
  const [isRecoveryDone, setIsRecoveryDone] = useState<boolean>(false);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const addLog = (msg: string) => {
    setLogs((prev) => [...prev, msg]);
  };

  // Auto-scroll terminal log
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  // ==========================================
  // LOGIC: Derivasi Target Branch ID
  // ==========================================
  const targetBranchId = useMemo(() => {
    if (!selectedRegionId) return "";

    if (wmsType === "OUTLET") {
      return selectedBranchId;
    }

    const region = regions.find((r) => r.id === selectedRegionId);
    if (!region) return "";

    const expectedPusatName = `pusat-${region.name.toLowerCase()}`;
    const pusatBranch = region.branches.find(
      (b) =>
        b.name.toLowerCase() === expectedPusatName ||
        b.name.toLowerCase().includes("pusat"),
    );

    return pusatBranch ? pusatBranch.id : "";
  }, [wmsType, selectedRegionId, selectedBranchId, regions]);

  // ==========================================
  // LOGIC: Step 1 (Login)
  // ==========================================
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setIsLoading(true);
    try {
      const response = await fetch(
        "http://localhost:4000/api/provision/login",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        },
      );

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Otorisasi ditolak.");

      setRegions(data.regions || []);
      setStep(2);
    } catch (err: any) {
      showToast(err.message, "ERROR");
    } finally {
      setIsLoading(false);
    }
  };

  // ==========================================
  // LOGIC: Prepare Step 3
  // ==========================================
  const prepareStep3 = async () => {
    if (wmsType === "PUSAT" && !selectedRegionId) {
      showToast("Silakan pilih region untuk WMS Pusat.", "WARNING");
      return;
    }
    if (wmsType === "OUTLET" && (!selectedRegionId || !selectedBranchId)) {
      showToast("Silakan pilih region dan outlet untuk WMS Outlet.", "WARNING");
      return;
    }

    if (!targetBranchId) {
      showToast(
        wmsType === "PUSAT"
          ? "Gagal menemukan data Gudang Pusat di Region ini. Pastikan outlet pusat sudah didaftarkan."
          : "ID Outlet tidak valid.",
        "ERROR",
      );
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(
        `http://localhost:4000/api/provision/branch-devices/${targetBranchId}`,
      );
      const data = await response.json();

      if (response.ok) {
        setDevices(data.devices || []);
      }
      setStep(3);
    } catch (err) {
      showToast("Gagal memeriksa daftar mesin di wilayah ini.", "ERROR");
    } finally {
      setIsLoading(false);
    }
  };

  // ==========================================
  // LOGIC: Final Submit & Hydration (dengan Terminal)
  // ==========================================
  const runSyncProcess = async (
    deviceToken: string,
    branchId: string,
    deviceId: string,
    replaceId: string | null,
    wmsType: string,
  ) => {
    try {
      addLog(`[PROVISIONING] Registrasi WMS berhasil. ID: ${deviceId}`);
      addLog(`[SYSTEM] Menginisialisasi penyimpanan lokal...`);

      // 1. Hydrate Master Data
      addLog(`[API/PULL] Menghubungi server pusat untuk sinkronisasi...`);
      const syncResponse = await fetch(
        `http://localhost:4000/api/sync/hydrate${
          replaceId ? `?replaceDeviceId=${replaceId}` : ""
        }`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${deviceToken}`,
          },
        },
      );

      const syncData = await syncResponse.json();
      if (!syncResponse.ok)
        throw new Error(syncData.error || "Gagal mengunduh data master.");

      // Simpan data ke localStorage
      localStorage.setItem(
        "WMS_MASTER_STAFF",
        JSON.stringify(syncData.data.staff || []),
      );
      addLog(`[RECOVERY] ${syncData.data.staff?.length || 0} staf tersimpan.`);

      localStorage.setItem(
        "WMS_MASTER_CATEGORIES",
        JSON.stringify(syncData.data.categories || []),
      );
      addLog(
        `[RECOVERY] ${syncData.data.categories?.length || 0} kategori tersimpan.`,
      );

      localStorage.setItem(
        "WMS_MASTER_PRODUCTS",
        JSON.stringify(syncData.data.products || []),
      );
      addLog(
        `[RECOVERY] ${syncData.data.products?.length || 0} produk tersimpan.`,
      );

      // Simpan token dan branch
      localStorage.setItem("ASSTRO_DEVICE_TOKEN", deviceToken);
      localStorage.setItem("ASSTRO_DEVICE_ID", deviceId);
      localStorage.setItem("ASSTRO_WMS_TYPE", wmsType);
      localStorage.setItem("ASSTRO_REGION_ID", selectedRegionId);
      localStorage.setItem("ASSTRO_BRANCH_ID", branchId);

      addLog(`[SYSTEM] Semua data master berhasil disinkronisasi.`);
      addLog(
        `✅ [READY] WMS Engine siap digunakan untuk ${
          wmsType === "PUSAT" ? "Gudang Pusat" : "Outlet"
        }.`,
      );

      setIsRecoveryDone(true);
    } catch (err: any) {
      addLog(`❌ [FATAL ERROR] ${err.message}`);
      setIsLoading(false);
    }
  };

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (provisionMode === "NEW" && !deviceName.trim()) {
      showToast("Nama perangkat baru wajib diisi.", "ERROR");
      return;
    }
    if (provisionMode === "RECOVERY" && !replaceDeviceId) {
      showToast("Silakan pilih perangkat yang ingin dipulihkan.", "ERROR");
      return;
    }
    if (!targetBranchId) {
      showToast(
        "Integritas data cabang hilang. Silakan ulangi langkah sebelumnya.",
        "ERROR",
      );
      return;
    }

    setIsLoading(true);
    try {
      const payload = {
        branchId: targetBranchId,
        name: provisionMode === "NEW" ? deviceName.trim().toUpperCase() : "",
        replaceDeviceId: provisionMode === "RECOVERY" ? replaceDeviceId : null,
        lat: 0,
        lng: 0,
      };

      const provisionResponse = await fetch(
        "http://localhost:4000/api/provision/device",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      const provisionData = await provisionResponse.json();

      if (!provisionResponse.ok) {
        throw new Error(provisionData.error || "Gagal meregistrasi WMS Engine");
      }

      // Pindah ke Step 4 (Terminal)
      setStep(4);

      // Jalankan proses sync dengan terminal log
      await runSyncProcess(
        provisionData.deviceToken,
        provisionData.branchId,
        provisionData.deviceId || provisionData.deviceToken.substring(0, 8),
        provisionMode === "RECOVERY" ? replaceDeviceId : null,
        wmsType,
      );
    } catch (err: any) {
      showToast(err.message, "ERROR");
      setIsLoading(false);
    }
  };

  // Step indicator labels
  const stepLabels = ["Otorisasi", "Penempatan", "Registrasi"];

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-6 font-sans antialiased">
      <div className="w-full max-w-4xl mx-auto">
        {/* Main Card */}
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200/60 backdrop-blur-sm transition-all duration-300">
          {/* Header */}
          <div className="px-8 pt-8 pb-6 border-b border-slate-100 bg-gradient-to-r from-white to-blue-50/30">
            <div className="flex items-center gap-4">
              <div className="bg-blue-600 text-white w-14 h-14 flex items-center justify-center rounded-2xl font-black italic text-2xl shadow-lg shadow-blue-700/30 shrink-0">
                AS
              </div>
              <div>
                <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
                  WMS <span className="text-blue-600">Engine</span>
                </h1>
                <p className="text-xs font-medium text-slate-400 tracking-widest uppercase mt-0.5">
                  Warehouse Activation Wizard
                </p>
              </div>
            </div>
          </div>

          {/* Step Progress (hanya untuk step 1-3) */}
          {step < 4 && (
            <div className="px-8 pt-6 pb-2">
              <div className="flex items-center justify-between gap-2">
                {[1, 2, 3].map((s) => (
                  <div key={s} className="flex items-center flex-1">
                    <div className="flex flex-col items-center flex-1">
                      <div className="flex items-center justify-center w-full gap-2">
                        <div
                          className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold transition-all duration-300 ${
                            step === s
                              ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30 ring-4 ring-blue-600/20"
                              : step > s
                                ? "bg-green-500 text-white"
                                : "bg-slate-100 text-slate-400"
                          }`}
                        >
                          {step > s ? <CheckCircle2 className="w-4 h-4" /> : s}
                        </div>
                        {s < 3 && (
                          <div
                            className={`flex-1 h-1 rounded-full transition-all duration-500 ${
                              step > s ? "bg-green-500" : "bg-slate-200"
                            }`}
                          />
                        )}
                      </div>
                      <span
                        className={`mt-2 text-[10px] font-bold uppercase tracking-wider transition-colors ${
                          step === s
                            ? "text-blue-600"
                            : step > s
                              ? "text-green-500"
                              : "text-slate-400"
                        }`}
                      >
                        {stepLabels[s - 1]}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Content */}
          <div className="px-8 py-6">
            {/* STEP 1: LOGIN */}
            {step === 1 && (
              <form
                onSubmit={handleLogin}
                className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300"
              >
                <div className="space-y-5">
                  <div className="flex items-center gap-2 text-slate-500">
                    <ShieldCheck size={18} className="text-blue-600" />
                    <span className="text-xs font-bold uppercase tracking-wider">
                      Langkah 1: Otorisasi Pusat
                    </span>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400 block mb-1.5">
                      Email Administrator
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                        <Users size={16} />
                      </div>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="admin.wms@asstro.com"
                        required
                        className="w-full pl-10 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400 block mb-1.5">
                      Password
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                        <Lock size={16} />
                      </div>
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        className="w-full pl-10 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="bg-slate-900 text-white px-8 py-3.5 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-blue-600 transition-all shadow-lg hover:shadow-blue-600/30 active:scale-95 disabled:opacity-50 flex items-center gap-2"
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      "Verifikasi Identitas"
                    )}
                    <ArrowRight size={16} />
                  </button>
                </div>
              </form>
            )}

            {/* STEP 2: TIPE WMS & LOKASI */}
            {step === 2 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="flex items-center gap-2 text-slate-500">
                  <Warehouse size={18} className="text-blue-600" />
                  <span className="text-xs font-bold uppercase tracking-wider">
                    Langkah 2: Penempatan WMS
                  </span>
                </div>
                <div className="space-y-5">
                  {/* Tipe WMS Selection */}
                  <div className="grid grid-cols-2 gap-3">
                    <div
                      onClick={() => {
                        setWmsType("PUSAT");
                        setSelectedBranchId("");
                      }}
                      className={`p-4 border-2 rounded-xl cursor-pointer transition-all flex flex-col items-center justify-center gap-2 text-center ${
                        wmsType === "PUSAT"
                          ? "border-blue-500 bg-blue-50 text-blue-700 shadow-md"
                          : "border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100"
                      }`}
                    >
                      <Network
                        size={24}
                        className={
                          wmsType === "PUSAT"
                            ? "text-blue-500"
                            : "text-slate-400"
                        }
                      />
                      <span className="font-bold text-[11px] uppercase tracking-wider leading-tight">
                        A. Gudang
                        <br />
                        Pusat
                      </span>
                    </div>
                    <div
                      onClick={() => setWmsType("OUTLET")}
                      className={`p-4 border-2 rounded-xl cursor-pointer transition-all flex flex-col items-center justify-center gap-2 text-center ${
                        wmsType === "OUTLET"
                          ? "border-emerald-500 bg-emerald-50 text-emerald-700 shadow-md"
                          : "border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100"
                      }`}
                    >
                      <Store
                        size={24}
                        className={
                          wmsType === "OUTLET"
                            ? "text-emerald-500"
                            : "text-slate-400"
                        }
                      />
                      <span className="font-bold text-[11px] uppercase tracking-wider leading-tight">
                        B. Gudang
                        <br />
                        Outlet
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400 block mb-1.5">
                      Pilih Wilayah Operasional
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                        <Globe size={16} />
                      </div>
                      <select
                        value={selectedRegionId}
                        onChange={(e) => {
                          setSelectedRegionId(e.target.value);
                          setSelectedBranchId("");
                        }}
                        className="w-full pl-10 pr-10 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium appearance-none focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                      >
                        <option value="" disabled>
                          -- PILIH WILAYAH --
                        </option>
                        {regions.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name}
                          </option>
                        ))}
                      </select>
                      <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-400">
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Indikator Gudang Pusat Terdeteksi */}
                  {wmsType === "PUSAT" && selectedRegionId && (
                    <div className="animate-in fade-in slide-in-from-top-2 p-3 bg-blue-50 border border-blue-100 rounded-xl flex items-center gap-3">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          targetBranchId
                            ? "bg-blue-500 animate-pulse"
                            : "bg-red-500"
                        }`}
                      ></div>
                      <span className="text-xs font-bold tracking-tight text-blue-800">
                        {targetBranchId
                          ? "Gudang Pusat terdeteksi di database."
                          : "Gudang Pusat belum terdaftar."}
                      </span>
                    </div>
                  )}

                  {/* Branch Selection (OUTLET only) */}
                  {wmsType === "OUTLET" && (
                    <div className="animate-in fade-in slide-in-from-top-2">
                      <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400 block mb-1.5">
                        Pilih Outlet (Cabang)
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                          <MapPin size={16} />
                        </div>
                        <select
                          value={selectedBranchId}
                          onChange={(e) => setSelectedBranchId(e.target.value)}
                          disabled={!selectedRegionId}
                          className="w-full pl-10 pr-10 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium appearance-none focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all disabled:opacity-50"
                        >
                          <option value="" disabled>
                            -- PILIH OUTLET --
                          </option>
                          {selectedRegionId &&
                            regions
                              .find((r) => r.id === selectedRegionId)
                              ?.branches.filter(
                                (b) => !b.name.toLowerCase().includes("pusat"),
                              )
                              .map((b) => (
                                <option key={b.id} value={b.id}>
                                  [{b.code}] {b.name}
                                </option>
                              ))}
                        </select>
                        <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-400">
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M19 9l-7 7-7-7"
                            />
                          </svg>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-between items-center pt-2">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="flex items-center gap-2 text-slate-400 hover:text-slate-700 font-bold text-xs uppercase tracking-widest transition-colors py-2"
                  >
                    <ArrowLeft size={16} /> Kembali
                  </button>
                  <button
                    type="button"
                    onClick={prepareStep3}
                    disabled={isLoading}
                    className="bg-slate-900 text-white px-8 py-3.5 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-blue-600 transition-all shadow-lg hover:shadow-blue-600/30 flex items-center gap-2 disabled:opacity-50"
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      "Lanjut"
                    )}
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: DEVICE REGISTRATION */}
            {step === 3 && (
              <form
                onSubmit={handleFinalSubmit}
                className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300"
              >
                <div className="flex items-center gap-2 text-slate-500">
                  <MonitorSmartphone size={18} className="text-blue-600" />
                  <span className="text-xs font-bold uppercase tracking-wider">
                    Langkah 3: Registrasi Mesin WMS
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div
                    onClick={() => setProvisionMode("NEW")}
                    className={`p-4 border-2 rounded-xl cursor-pointer transition-all flex flex-col items-center justify-center gap-2 text-center ${
                      provisionMode === "NEW"
                        ? "border-blue-500 bg-blue-50 text-blue-700 shadow-md"
                        : "border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100"
                    }`}
                  >
                    <PlusCircle
                      size={24}
                      className={
                        provisionMode === "NEW"
                          ? "text-blue-500"
                          : "text-slate-400"
                      }
                    />
                    <span className="font-bold text-[11px] uppercase tracking-wider leading-tight">
                      A. Setup
                      <br />
                      Mesin Baru
                    </span>
                  </div>
                  <div
                    onClick={() => setProvisionMode("RECOVERY")}
                    className={`p-4 border-2 rounded-xl cursor-pointer transition-all flex flex-col items-center justify-center gap-2 text-center ${
                      provisionMode === "RECOVERY"
                        ? "border-amber-500 bg-amber-50 text-amber-700 shadow-md"
                        : "border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100"
                    }`}
                  >
                    <RefreshCw
                      size={24}
                      className={
                        provisionMode === "RECOVERY"
                          ? "text-amber-500"
                          : "text-slate-400"
                      }
                    />
                    <span className="font-bold text-[11px] uppercase tracking-wider leading-tight">
                      B. Recovery
                      <br />
                      Mesin Lama
                    </span>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
                  {provisionMode === "NEW" ? (
                    <div className="animate-in fade-in duration-200">
                      <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400 block mb-1.5">
                        Nama PC / Terminal Baru
                      </label>
                      <input
                        type="text"
                        value={deviceName}
                        onChange={(e) => setDeviceName(e.target.value)}
                        placeholder="Contoh: PC-GUDANG-01"
                        required
                        className="w-full px-4 py-3.5 bg-white border border-slate-200 rounded-xl text-sm font-medium placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                      />
                    </div>
                  ) : (
                    <div className="animate-in fade-in duration-200">
                      <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400 block mb-1.5">
                        Pilih Mesin Yang Akan Dipulihkan
                      </label>
                      <div className="relative">
                        <select
                          required
                          value={replaceDeviceId}
                          onChange={(e) => setReplaceDeviceId(e.target.value)}
                          className="w-full px-4 py-3.5 bg-white border border-slate-200 rounded-xl text-sm font-medium appearance-none focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all"
                        >
                          <option value="" disabled>
                            -- DAFTAR MESIN WMS --
                          </option>
                          {devices.length === 0 ? (
                            <option disabled>Tidak ada mesin terdaftar.</option>
                          ) : (
                            devices.map((d) => (
                              <option key={d.id} value={d.id}>
                                {d.name} ({d.status})
                              </option>
                            ))
                          )}
                        </select>
                        <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-400">
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M19 9l-7 7-7-7"
                            />
                          </svg>
                        </div>
                      </div>
                      <p className="text-[10px] font-bold text-amber-600 mt-2 uppercase tracking-widest">
                        ⚠️ Sesi mesin lama akan diambil alih oleh perangkat ini.
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex justify-between items-center pt-2">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="flex items-center gap-2 text-slate-400 hover:text-slate-700 font-bold text-xs uppercase tracking-widest transition-colors py-2"
                  >
                    <ArrowLeft size={16} /> Kembali
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className={`flex-1 text-white py-3.5 px-6 rounded-xl font-bold text-xs uppercase tracking-widest transition-all shadow-lg active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 max-w-xs ${
                      provisionMode === "NEW"
                        ? "bg-blue-600 hover:bg-slate-900 shadow-blue-600/30"
                        : "bg-amber-600 hover:bg-slate-900 shadow-amber-600/30"
                    }`}
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : provisionMode === "NEW" ? (
                      "Daftarkan Mesin WMS"
                    ) : (
                      "Pulihkan Akses Mesin"
                    )}
                    <ArrowRight size={16} />
                  </button>
                </div>
              </form>
            )}

            {/* STEP 4: TERMINAL MONITORING */}
            {step === 4 && (
              <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
                <div className="flex items-center gap-2 text-slate-500">
                  <TerminalSquare
                    size={18}
                    className={
                      isRecoveryDone ? "text-green-500" : "text-blue-600"
                    }
                  />
                  <span className="text-xs font-bold uppercase tracking-wider">
                    {isRecoveryDone
                      ? "Sinkronisasi Selesai"
                      : "Sinkronisasi Sub-Sistem"}
                  </span>
                </div>

                {/* Terminal */}
                <div className="bg-slate-950 rounded-xl overflow-hidden border border-slate-800 shadow-inner">
                  <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-500/80"></span>
                        <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80"></span>
                        <span className="w-2.5 h-2.5 rounded-full bg-green-500/80"></span>
                      </div>
                      <span className="text-[11px] font-mono text-slate-400 ml-2">
                        wms-sync@asstro:~$
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-500">
                      PID {Math.floor(Math.random() * 10000)}
                    </span>
                  </div>

                  <div className="p-4 h-64 overflow-y-auto font-mono text-[12px] leading-relaxed bg-slate-950 text-green-400 scrollbar-thin scrollbar-track-slate-900 scrollbar-thumb-slate-700">
                    {logs.length === 0 && (
                      <div className="flex items-center gap-2 text-slate-500">
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                        Menunggu proses...
                      </div>
                    )}
                    {logs.map((log, idx) => (
                      <div key={idx} className="mb-0.5 break-words">
                        <span className="text-slate-500 select-none">
                          {"> "}
                        </span>
                        {log}
                      </div>
                    ))}
                    {logs.length > 0 && !isRecoveryDone && (
                      <div className="flex items-center gap-2 mt-1 text-slate-500">
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                        Menjalankan...
                      </div>
                    )}
                    <div ref={logsEndRef} />
                  </div>
                </div>

                {/* Tombol Akhir */}
                <div className="flex justify-end pt-2">
                  {isRecoveryDone ? (
                    <button
                      type="button"
                      onClick={() => window.location.reload()}
                      className="bg-green-600 text-white px-8 py-3.5 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-900 transition-all shadow-lg hover:shadow-green-600/30 active:scale-95 flex items-center gap-2 w-full justify-center"
                    >
                      Buka Aplikasi WMS <ArrowRight size={16} />
                    </button>
                  ) : (
                    <div className="w-full flex items-center justify-center gap-2 text-slate-400 font-bold text-xs uppercase tracking-widest py-2">
                      <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                      Memproses Data...
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
