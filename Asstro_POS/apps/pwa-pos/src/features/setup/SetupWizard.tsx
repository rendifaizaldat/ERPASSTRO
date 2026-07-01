import React, { useState, useEffect, useRef } from "react";
import { useToast } from "../../components/Toast";
import { SmartInput } from "../../components/shared/keyboard/SmartInput";
import {
  MapPin,
  ArrowRight,
  ArrowLeft,
  Building2,
  ShieldCheck,
  TerminalSquare,
  Loader2,
  PlusCircle,
  RefreshCw,
  CheckCircle2,
  Lock,
  Users,
  Globe,
} from "lucide-react";
import { ledger } from "../../core/instances";

interface Region {
  id: string;
  name: string;
  branches: { id: string; name: string; code: string }[];
}

interface BranchDevice {
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

  // Form State Step 2: Region & Cabang
  const [regions, setRegions] = useState<Region[]>([]);
  const [selectedRegionId, setSelectedRegionId] = useState("");
  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [branchDevices, setBranchDevices] = useState<BranchDevice[]>([]);

  // Form State Step 3: Identitas & GPS
  const [provisionMode, setProvisionMode] = useState<"NEW" | "REPLACE">("NEW");
  const [deviceName, setDeviceName] = useState("");
  const [replaceDeviceId, setReplaceDeviceId] = useState("");
  const [latitude, setLatitude] = useState<number>(0);
  const [longitude, setLongitude] = useState<number>(0);
  const [isLocating, setIsLocating] = useState<boolean>(false);

  // State Step 4: Terminal Monitor & Orchestrator
  const [logs, setLogs] = useState<string[]>([]);
  const [isRecoveryDone, setIsRecoveryDone] = useState<boolean>(false);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const addLog = (msg: string) => {
    setLogs((prev) => [...prev, msg]);
  };

  // Auto-scroll terminal log ke paling bawah
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  // LOGIC: Step 1 (Login)
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

      setRegions(data.regions);
      setStep(2);
    } catch (err: any) {
      showToast(err.message, "ERROR");
    } finally {
      setIsLoading(false);
    }
  };

  const prepareStep3 = async () => {
    if (!selectedBranchId) {
      showToast("Silakan pilih cabang terlebih dahulu.", "WARNING");
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetch(
        `http://localhost:4000/api/provision/branch-devices/${selectedBranchId}`,
      );
      const data = await response.json();
      if (response.ok) setBranchDevices(data.devices || []);
      setStep(3);
    } catch (err) {
      showToast("Gagal memeriksa daftar mesin di cabang ini.", "ERROR");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      showToast(
        "Browser Anda tidak mendukung deteksi lokasi otomatis.",
        "ERROR",
      );
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude);
        setLongitude(position.coords.longitude);
        setIsLocating(false);
        showToast("Titik koordinat berhasil dikunci!", "SUCCESS");
      },
      (geoError) => {
        showToast(`Gagal mengakses GPS: ${geoError.message}`, "ERROR");
        setIsLocating(false);
      },
      { timeout: 20000, enableHighAccuracy: false },
    );
  };

  // --------------------------------------------------------------------------
  // THE ORCHESTRATOR: RECOVERY & SYNC MONITORING (STEP 4)
  // --------------------------------------------------------------------------
  const runRecoveryProcess = async (
    deviceToken: string,
    branchId: string,
    deviceId: string,
    replaceId: string | null,
  ) => {
    try {
      addLog(`[PROVISIONING] Device Takeover sukses. ID: ${deviceId}`);
      await ledger.init();
      addLog(`[SYSTEM] Storage Engine (RxDB) Initialized.`);
      // 1. HYDRATE: Ambil Staff & Master Data
      addLog(`[API/PULL] Menghubungi server pusat untuk Hydration...`);

      let retries = 0;
      let syncData: any = null;
      let syncResponse: Response | null = null;
      let chunkIndex = parseInt(localStorage.getItem("ASSTRO_HYDRATION_CHECKPOINT") || "1", 10);
      let backoffDelay = 2000;
      const MAX_RETRIES = 5;

      while (retries < MAX_RETRIES) {
        try {
          syncResponse = await fetch(
            `http://localhost:4000/api/sync/hydrate${replaceId ? `?replaceDeviceId=${replaceId}` : ""}&chunk=${chunkIndex}`,
            {
              method: "GET",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${deviceToken}`,
              },
            },
          );
          syncData = await syncResponse.json();
          if (!syncResponse.ok) throw new Error(syncData.error || "Hydration gagal.");
          if (syncData.schemaVersion && syncData.schemaVersion !== 1) {
            throw new Error("Incompatible schema. Re-provisioning required.");
          }

          localStorage.setItem("ASSTRO_HYDRATION_CHECKPOINT", (chunkIndex + 1).toString());
          break; // successfully fetched
        } catch (err: any) {
          retries++;
          if (retries >= MAX_RETRIES) {
            addLog(`[FATAL] Hydration gagal setelah ${MAX_RETRIES} percobaan. Klik Reset Provisioning untuk mengulang.`);
            // Show fallback UI logic could be triggered here via state.
            throw err;
          }
          addLog(`[RETRY] Percobaan ke-${retries} gagal. Retrying in ${backoffDelay}ms...`);
          await new Promise(res => setTimeout(res, backoffDelay));
          backoffDelay *= 2; // Exponential backoff
        }
      }

      // Staff disimpan statis di memori lokal
      localStorage.setItem(
        "ASSTRO_OFFLINE_STAFF",
        JSON.stringify(syncData.data.staff || []),
      );
      addLog(`[RECOVERY] Profil staf offline tersimpan.`);

      // [+] FINANCIAL CONFIG: Simpan konfigurasi pajak dari HO
      if (syncData.data.financialConfig) {
        localStorage.setItem(
          "ASSTRO_FINANCIAL_CONFIG",
          JSON.stringify({
            taxRate: syncData.data.financialConfig.taxRate || 0,
            serviceRate: syncData.data.financialConfig.serviceRate || 0,
          }),
        );
        addLog(
          `[FINANCIAL] Konfigurasi PPN ${syncData.data.financialConfig.taxRate}% & Service ${syncData.data.financialConfig.serviceRate}% tersimpan.`,
        );
      }

      // Master Data (Kategori & Produk) dengan _isRemote: true
      const masterCategories = syncData.data.categories || [];
      const masterProducts = syncData.data.products || [];

      if (masterCategories.length > 0) {
        addLog(
          `[RECOVERY] Menulis ${masterCategories.length} Kategori ke RxDB...`,
        );
        for (const cat of masterCategories) {
          // WAJIB _isRemote: true AGAR BACKGROUND SYNC TIDAK PUSH BALIK
          await ledger.appendEvent(
            "CATEGORY_ADDED",
            { id: cat.id, name: cat.name },
            { _isRemote: true },
          );
        }
        addLog(`📦 [CATALOG SERVICE] Kategori selesai dipetakan.`);
      }

      if (masterProducts.length > 0) {
        addLog(`[RECOVERY] Menulis ${masterProducts.length} Produk ke RxDB...`);
        // Kita batch UI log agar terminal tidak macet jika produk ada 1000
        for (let i = 0; i < masterProducts.length; i++) {
          const prod = masterProducts[i];
          await ledger.appendEvent(
            "PRODUCT_ADDED",
            {
              sku: prod.sku,
              name: prod.name,
              price: prod.price,
              categoryId: prod.categoryId,
            },
            { _isRemote: true },
          );
          if (i % 20 === 0 && i !== 0) {
            addLog(
              `⏩ [PROJECTOR WORKER] Memproses Produk... (${i}/${masterProducts.length})`,
            );
            await new Promise((r) => setTimeout(r, 20)); // Nafas animasi log
          }
        }
        addLog(`📦 [CATALOG SERVICE] Produk selesai dipetakan.`);
      }

      // 2. PULL: Tarik Riwayat Jurnal Transaksi
      addLog(
        `[RECOVERY] Memeriksa histori jurnal EOD / operasional masa lalu...`,
      );
      const pullResponse = await fetch(
        "http://localhost:4000/api/sync/pull?since=0",
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${deviceToken}`,
          },
        },
      );

      if (pullResponse.ok) {
        const pulledEvents = await pullResponse.json();
        const txEvents = pulledEvents.filter(
          (ev: any) =>
            ev.type !== "CATEGORY_ADDED" && ev.type !== "PRODUCT_ADDED",
        );

        if (txEvents.length === 0) {
          addLog(`[RECOVERY] Belum ada histori. Menggunakan fallback 24 jam.`);
        } else {
          addLog(
            `[API/PULL] Menerima ${txEvents.length} event jurnal dari server.`,
          );
          for (let i = 0; i < txEvents.length; i++) {
            const ev = txEvents[i];
            await ledger.appendEvent(ev.type, ev.payload, { _isRemote: true });
            addLog(`⏩ [PROJECTOR WORKER] Memutar ulang event: ${ev.type}`);

            // Jeda 50ms per event agar visual terminal terlihat bekerja dan tidak freeze
            await new Promise((resolve) => setTimeout(resolve, 50));
          }

          // KUNCI SEQUENCE ID!
          const highestSequence =
            pulledEvents[pulledEvents.length - 1].sequence_id;
          if (highestSequence) {
            localStorage.setItem("ASSTRO_LAST_PULL_SEQUENCE", highestSequence);
            addLog(
              `🔒 [SYNC STATE] Cursor state dikunci pada Sequence: ${highestSequence}`,
            );
          }
        }
      }

      // 3. Kunci Index Push agar BackgroundSync lokal bersih
      let localCount = 0;
      await ledger.replay(() => {
        localCount++;
      });
      localStorage.setItem("ASSTRO_SYNC_INDEX", localCount.toString());
      addLog(
        `🔒 [SYNC STATE] Local Outbox disinkronisasi pada Index: ${localCount}`,
      );

      // PENYELESAIAN
      addLog(`[SYSTEM] Semua proses stabil. status: idle.`);

      const selectedBranchCode =
        regions.flatMap((r) => r.branches).find((b) => b.id === branchId)
          ?.name || branchId;

      addLog(
        `✅ [READY] Siap digunakan branch_${branchId} [Outlet: ${selectedBranchCode}]`,
      );

      // Amankan Token baru sekarang, agar App.tsx belum trigger saat proses berjalan
      localStorage.setItem("ASSTRO_DEVICE_TOKEN", deviceToken);
      localStorage.setItem("ASSTRO_DEVICE_ID", deviceId);
      localStorage.setItem("ASSTRO_BRANCH_ID", branchId);

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
    if (provisionMode === "REPLACE" && !replaceDeviceId) {
      showToast("Silakan pilih perangkat yang ingin diganti.", "ERROR");
      return;
    }
    if (!latitude || !longitude) {
      showToast("Lokasi GPS wajib dikunci.", "ERROR");
      return;
    }

    setIsLoading(true);
    try {
      const payload = {
        branchId: selectedBranchId,
        name: provisionMode === "NEW" ? deviceName.trim().toUpperCase() : "",
        replaceDeviceId: provisionMode === "REPLACE" ? replaceDeviceId : null,
        lat: latitude,
        lng: longitude,
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

      if (!provisionResponse.ok)
        throw new Error(provisionData.error || "Gagal meregistrasi device");

      // Berpindah ke Step 4 (Terminal Monitor)
      setStep(4);

      // Jalankan Mandor Recovery
      runRecoveryProcess(
        provisionData.deviceToken,
        provisionData.branchId,
        provisionData.deviceId || provisionData.deviceToken.substring(0, 8),
        provisionMode === "REPLACE" ? replaceDeviceId : null,
      );
    } catch (err: any) {
      showToast(err.message, "ERROR");
      setIsLoading(false);
    }
  };

  // Step indicator labels
  const stepLabels = ["Otorisasi", "Cabang", "Registrasi", "Sinkronisasi"];

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-6 font-sans antialiased">
      <div className="w-full max-w-4xl mx-auto">
        {/* Main Card */}
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200/60 backdrop-blur-sm transition-all duration-300">
          {/* Header */}
          <div className="px-8 pt-8 pb-6 border-b border-slate-100 bg-gradient-to-r from-white to-orange-50/30">
            <div className="flex items-center gap-4">
              <div className="bg-orange-600 text-white w-14 h-14 flex items-center justify-center rounded-2xl font-black italic text-2xl shadow-lg shadow-orange-700/30 shrink-0">
                AS
              </div>
              <div>
                <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
                  Activation <span className="text-orange-600">Wizard</span>
                </h1>
                <p className="text-xs font-medium text-slate-400 tracking-widest uppercase mt-0.5">
                  Asstro ERP Engine Setup
                </p>
              </div>
            </div>
          </div>

          {/* Step Progress */}
          <div className="px-8 pt-6 pb-2">
            <div className="flex items-center justify-between gap-2">
              {[1, 2, 3, 4].map((s) => (
                <div key={s} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div className="flex items-center justify-center w-full gap-2">
                      <div
                        className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold transition-all duration-300 ${
                          step === s
                            ? "bg-orange-600 text-white shadow-lg shadow-orange-600/30 ring-4 ring-orange-600/20"
                            : step > s
                              ? "bg-green-500 text-white"
                              : "bg-slate-100 text-slate-400"
                        }`}
                      >
                        {step > s ? <CheckCircle2 className="w-4 h-4" /> : s}
                      </div>
                      {s < 4 && (
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
                          ? "text-orange-600"
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
                    <ShieldCheck size={18} className="text-orange-600" />
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
                      <SmartInput
                        type="text"
                        value={email}
                        onChange={(val) => setEmail(val)}
                        placeholder="email@asstro.com"
                        allowKeyboardToggle={true}
                        className="w-full pl-10 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium placeholder:text-slate-400 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all"
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
                      <SmartInput
                        type="text"
                        value={password}
                        onChange={(val) => setPassword(val)}
                        placeholder="••••••••"
                        masked={true}
                        allowKeyboardToggle={true}
                        className="w-full pl-10 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium placeholder:text-slate-400 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="bg-slate-900 text-white px-8 py-3.5 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-orange-600 transition-all shadow-lg hover:shadow-orange-600/30 active:scale-95 disabled:opacity-50 flex items-center gap-2"
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

            {/* STEP 2: REGION & BRANCH */}
            {step === 2 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="flex items-center gap-2 text-slate-500">
                  <Building2 size={18} className="text-orange-600" />
                  <span className="text-xs font-bold uppercase tracking-wider">
                    Langkah 2: Penempatan Cabang
                  </span>
                </div>
                <div className="space-y-5">
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
                        className="w-full pl-10 pr-10 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium appearance-none focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all"
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
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400 block mb-1.5">
                      Pilih Cabang (Outlet)
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                        <MapPin size={16} />
                      </div>
                      <select
                        value={selectedBranchId}
                        onChange={(e) => setSelectedBranchId(e.target.value)}
                        disabled={!selectedRegionId}
                        className="w-full pl-10 pr-10 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium appearance-none focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all disabled:opacity-50"
                      >
                        <option value="" disabled>
                          -- PILIH CABANG --
                        </option>
                        {selectedRegionId &&
                          regions
                            .find((r) => r.id === selectedRegionId)
                            ?.branches.map((b) => (
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
                    className="bg-slate-900 text-white px-8 py-3.5 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-orange-600 transition-all shadow-lg hover:shadow-orange-600/30 flex items-center gap-2 disabled:opacity-50"
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

            {/* STEP 3: DEVICE TAKEOVER & GPS */}
            {step === 3 && (
              <form
                onSubmit={handleFinalSubmit}
                className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300"
              >
                <div className="flex items-center gap-2 text-slate-500">
                  <MapPin size={18} className="text-orange-600" />
                  <span className="text-xs font-bold uppercase tracking-wider">
                    Langkah 3: Registrasi Mesin POS
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div
                    onClick={() => setProvisionMode("NEW")}
                    className={`p-4 border-2 rounded-xl cursor-pointer transition-all flex flex-col items-center justify-center gap-2 text-center ${
                      provisionMode === "NEW"
                        ? "border-orange-500 bg-orange-50 text-orange-700 shadow-md"
                        : "border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100"
                    }`}
                  >
                    <PlusCircle
                      size={24}
                      className={
                        provisionMode === "NEW"
                          ? "text-orange-500"
                          : "text-slate-400"
                      }
                    />
                    <span className="font-bold text-[11px] uppercase tracking-wider leading-tight">
                      A. Konfigurasi
                      <br />
                      Mesin Baru
                    </span>
                  </div>
                  <div
                    onClick={() => setProvisionMode("REPLACE")}
                    className={`p-4 border-2 rounded-xl cursor-pointer transition-all flex flex-col items-center justify-center gap-2 text-center ${
                      provisionMode === "REPLACE"
                        ? "border-blue-500 bg-blue-50 text-blue-700 shadow-md"
                        : "border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100"
                    }`}
                  >
                    <RefreshCw
                      size={24}
                      className={
                        provisionMode === "REPLACE"
                          ? "text-blue-500"
                          : "text-slate-400"
                      }
                    />
                    <span className="font-bold text-[11px] uppercase tracking-wider leading-tight">
                      B. Ganti Mesin
                      <br />
                      Rusak / Hilang
                    </span>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
                  {provisionMode === "NEW" ? (
                    <div className="animate-in fade-in duration-200">
                      <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400 block mb-1.5">
                        Nama Perangkat Baru
                      </label>
                      <SmartInput
                        type="text"
                        value={deviceName}
                        onChange={(val) => setDeviceName(val)}
                        placeholder="Contoh: TABLET-KASIR-01"
                        className="w-full px-4 py-3.5 bg-white border border-slate-200 rounded-xl text-sm font-medium placeholder:text-slate-400 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all"
                      />
                    </div>
                  ) : (
                    <div className="animate-in fade-in duration-200">
                      <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400 block mb-1.5">
                        Pilih Mesin Yang Akan Diganti
                      </label>
                      <div className="relative">
                        <select
                          required
                          value={replaceDeviceId}
                          onChange={(e) => setReplaceDeviceId(e.target.value)}
                          className="w-full px-4 py-3.5 bg-white border border-slate-200 rounded-xl text-sm font-medium appearance-none focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                        >
                          <option value="" disabled>
                            -- DAFTAR MESIN TERDAFTAR --
                          </option>
                          {branchDevices.length === 0 ? (
                            <option disabled>
                              Tidak ada mesin di cabang ini.
                            </option>
                          ) : (
                            branchDevices.map((d) => (
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
                    </div>
                  )}
                </div>

                <div>
                  <button
                    type="button"
                    onClick={handleDetectLocation}
                    disabled={isLocating}
                    className="w-full mb-2 bg-slate-900 text-white py-3.5 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-orange-600 transition-all shadow-lg hover:shadow-orange-600/30 active:scale-95 disabled:bg-slate-300 flex items-center justify-center gap-3"
                  >
                    <MapPin size={16} />
                    {isLocating
                      ? "Mencari Sinyal Satelit..."
                      : "Kunci Koordinat Mesin (Wajib)"}
                  </button>
                  <div className="grid grid-cols-2 gap-4 text-[11px] font-bold uppercase tracking-widest text-slate-400 px-1">
                    <div>
                      LAT:{" "}
                      <span className="text-slate-900 font-mono ml-1">
                        {latitude || "-"}
                      </span>
                    </div>
                    <div>
                      LNG:{" "}
                      <span className="text-slate-900 font-mono ml-1">
                        {longitude || "-"}
                      </span>
                    </div>
                  </div>
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
                    disabled={isLoading || !latitude}
                    className={`flex-1 text-white py-3.5 px-6 rounded-xl font-bold text-xs uppercase tracking-widest transition-all shadow-lg active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 max-w-xs ${
                      provisionMode === "NEW"
                        ? "bg-orange-600 hover:bg-slate-900 shadow-orange-600/30"
                        : "bg-blue-600 hover:bg-slate-900 shadow-blue-600/30"
                    }`}
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : provisionMode === "NEW" ? (
                      "Aktifkan Mesin"
                    ) : (
                      "Timpa & Pulihkan"
                    )}
                    <ArrowRight size={16} />
                  </button>
                </div>
              </form>
            )}

            {/* STEP 4: TERMINAL MONITORING (ORCHESTRATOR) */}
            {step === 4 && (
              <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
                <div className="flex items-center gap-2 text-slate-500">
                  <TerminalSquare
                    size={18}
                    className={
                      isRecoveryDone ? "text-green-500" : "text-orange-600"
                    }
                  />
                  <span className="text-xs font-bold uppercase tracking-wider">
                    {isRecoveryDone
                      ? "Setup Selesai"
                      : "Sinkronisasi Sub-Sistem"}
                  </span>
                </div>

                {/* Terminal */}
                <div className="bg-slate-950 rounded-xl overflow-hidden border border-slate-800 shadow-inner">
                  {/* Terminal Header */}
                  <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-500/80"></span>
                        <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80"></span>
                        <span className="w-2.5 h-2.5 rounded-full bg-green-500/80"></span>
                      </div>
                      <span className="text-[11px] font-mono text-slate-400 ml-2">
                        recovery@asstro:~$
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-500">
                      PID {Math.floor(Math.random() * 10000)}
                    </span>
                  </div>

                  {/* Terminal Log */}
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

                {/* Action Bawah */}
                <div className="flex justify-end pt-2">
                  {isRecoveryDone ? (
                    <button
                      type="button"
                      onClick={() => window.location.reload()}
                      className="bg-green-600 text-white px-8 py-3.5 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-900 transition-all shadow-lg hover:shadow-green-600/30 active:scale-95 flex items-center gap-2 w-full justify-center"
                    >
                      Buka Mesin Kasir <ArrowRight size={16} />
                    </button>
                  ) : (
                    <div className="w-full flex items-center justify-center gap-2 text-slate-400 font-bold text-xs uppercase tracking-widest py-2">
                      <Loader2 className="w-4 h-4 animate-spin text-orange-600" />
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
