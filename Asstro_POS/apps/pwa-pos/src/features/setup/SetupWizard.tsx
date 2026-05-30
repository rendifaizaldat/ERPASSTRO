import React, { useState } from "react";
import { usePos } from "../../core/PosProvider";
import { useToast } from "../../components/Toast";
import {
  MapPin,
  ShieldAlert,
  ArrowRight,
  ArrowLeft,
  Building2,
  UserCheck,
} from "lucide-react";

export const SetupWizard: React.FC = () => {
  const { initializeSystem } = usePos();
  const { showToast } = useToast();
  const [step, setStep] = useState<number>(1);
  const [isLocating, setIsLocating] = useState<boolean>(false);

  // Form State
  const [companyName, setCompanyName] = useState("");
  const [branchId, setBranchId] = useState("");
  const [regionName, setRegionName] = useState("");
  const [latitude, setLatitude] = useState<number>(0);
  const [longitude, setLongitude] = useState<number>(0);
  const [adminName, setAdminName] = useState("");
  const [adminPin, setAdminPin] = useState("");

  const handleNextStep = () => {
    if (step === 1 && (!companyName.trim() || !branchId.trim())) {
      showToast("Semua kolom data perusahaan wajib diisi.", "ERROR");
      return;
    }
    if (step === 2 && !regionName.trim()) {
      showToast(
        "Informasi wilayah operasional wajib ditentukan. Silakan klik deteksi otomatis atau isi alamat manual.",
        "WARNING",
      );
      return;
    }
    setStep((prev) => prev + 1);
  };

  const handlePrevStep = () => {
    setStep((prev) => prev - 1);
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
        setRegionName(`KEC. LEMBANG, KAB. BANDUNG BARAT, JAWA BARAT`);
        setIsLocating(false);
        showToast("Lokasi berhasil dideteksi!", "SUCCESS");
      },
      (geoError) => {
        showToast(
          `Gagal mengakses GPS: ${geoError.message}. Silakan isi alamat manual secara langsung.`,
          "ERROR",
        );
        setIsLocating(false);
      },
      { timeout: 10000, enableHighAccuracy: true },
    );
  };

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      company_name: companyName.trim().toUpperCase(),
      branch_id: branchId.trim().toUpperCase(),
      region_name: regionName.trim().toUpperCase(),
      latitude: Number(latitude) || 0,
      longitude: Number(longitude) || 0,
      admin_name: adminName.trim().toUpperCase(),
      admin_pin: adminPin,
    };

    if (!payload.admin_name) {
      showToast("Nama lengkap Administrator utama wajib diisi.", "ERROR");
      return;
    }

    if (payload.admin_pin.length < 4) {
      showToast(
        "PIN keamanan login minimal harus berisi 4 digit angka.",
        "ERROR",
      );
      return;
    }

    try {
      await initializeSystem(payload);
    } catch (err: any) {
      showToast(
        `Gagal Mengaktifkan Engine: ${err?.message || JSON.stringify(err)}`,
        "ERROR",
      );
    }
  };

  return (
    <div className="h-screen w-full flex items-center justify-center bg-slate-900 text-slate-100 p-6 select-none font-sans">
      <div className="w-full max-w-xl bg-white text-slate-900 rounded-[2.5rem] shadow-2xl border border-slate-200 overflow-hidden flex flex-col p-8 md:p-12 animate-slide-up">
        {/* Header Setup */}
        <div className="flex items-center gap-4 mb-8">
          <div className="bg-orange-600 text-white w-14 h-14 flex items-center justify-center rounded-2xl font-black italic text-xl shadow-lg shadow-orange-700/20">
            AS
          </div>
          <div>
            <h2 className="font-black text-2xl tracking-tighter uppercase leading-none text-slate-900">
              Activation <span className="text-orange-600">Wizard</span>
            </h2>
            <span className="text-[10px] font-bold text-slate-400 tracking-widest uppercase mt-1 block">
              Asstro POS Engine Setup v1.0.0
            </span>
          </div>
        </div>

        {/* Progress Bar Indicators */}
        <div className="flex gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-2 flex-1 rounded-full transition-all duration-300 ${step >= s ? "bg-orange-600" : "bg-slate-100"}`}
            />
          ))}
        </div>

        {/* Dynamic Multi-Step Body */}
        <div className="flex-1 flex flex-col justify-center">
          {step === 1 && (
            <div className="animate-fade">
              <div className="flex items-center gap-3 mb-4 text-slate-400">
                <Building2 size={20} className="text-orange-600" />
                <h3 className="font-black text-sm uppercase tracking-wider text-slate-800">
                  Langkah 1: Identitas Cabang
                </h3>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">
                    Nama Holding / Perusahaan
                  </label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Contoh: ASSTRO GROUP"
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold tracking-tight uppercase focus:outline-none focus:border-orange-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">
                    Kode Cabang Operasional (1-19)
                  </label>
                  <input
                    type="text"
                    value={branchId}
                    onChange={(e) => setBranchId(e.target.value)}
                    placeholder="Contoh: BRANCH-01"
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold tracking-tight uppercase focus:outline-none focus:border-orange-500 transition-colors"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="animate-fade">
              <div className="flex items-center gap-3 mb-4 text-slate-400">
                <MapPin size={20} className="text-orange-600" />
                <h3 className="font-black text-sm uppercase tracking-wider text-slate-800">
                  Langkah 2: Region & Lokasi GPS
                </h3>
              </div>
              <div className="space-y-4">
                <button
                  type="button"
                  onClick={handleDetectLocation}
                  disabled={isLocating}
                  className="w-full bg-slate-900 text-white p-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-orange-600 transition-all shadow-lg active:scale-95 disabled:bg-slate-300 flex items-center justify-center gap-3"
                >
                  <MapPin size={16} />
                  {isLocating
                    ? "Mencari Isyarat Satelit..."
                    : "Deteksi Lokasi Otomatis"}
                </button>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">
                    Alamat Lengkap / Wilayah
                  </label>
                  <textarea
                    value={regionName}
                    onChange={(e) => setRegionName(e.target.value)}
                    placeholder="Isi alamat operasional lengkap ruko di sini..."
                    className="w-full h-24 px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold tracking-tight focus:outline-none focus:border-orange-500 transition-colors resize-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4 text-slate-400 text-[10px] font-bold uppercase tracking-widest bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <div>
                    LAT:{" "}
                    <span className="text-slate-900 font-black font-mono block text-xs mt-1">
                      {latitude || "-"}
                    </span>
                  </div>
                  <div>
                    LNG:{" "}
                    <span className="text-slate-900 font-black font-mono block text-xs mt-1">
                      {longitude || "-"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="animate-fade">
              <div className="flex items-center gap-3 mb-4 text-slate-400">
                <UserCheck size={20} className="text-orange-600" />
                <h3 className="font-black text-sm uppercase tracking-wider text-slate-800">
                  Langkah 3: Seed Kunci Superadmin
                </h3>
              </div>
              <form onSubmit={handleFinalSubmit} className="space-y-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">
                    Nama Lengkap Administrator
                  </label>
                  <input
                    type="text"
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
                    placeholder="Contoh: RENDI (MANAGER ON DUTY)"
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold tracking-tight uppercase focus:outline-none focus:border-orange-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">
                    PIN Keamanan Login Utama
                  </label>
                  <input
                    type="password"
                    maxLength={6}
                    value={adminPin}
                    onChange={(e) =>
                      setAdminPin(e.target.value.replace(/\D/g, ""))
                    }
                    placeholder="Masukkan angka PIN rahasia"
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-black tracking-widest text-center focus:outline-none focus:border-orange-500 transition-colors"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full mt-4 bg-orange-600 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-900 transition-all shadow-xl active:scale-95 flex items-center justify-center gap-2"
                >
                  Aktifkan Asstro POS Engine <ArrowRight size={16} />
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Footer Navigation Buttons */}
        {step < 3 && (
          <div className="flex justify-between items-center mt-12 pt-6 border-t border-slate-100">
            {step > 1 ? (
              <button
                type="button"
                onClick={handlePrevStep}
                className="flex items-center gap-2 text-slate-400 hover:text-slate-900 font-black text-xs uppercase tracking-widest transition-colors"
              >
                <ArrowLeft size={16} /> Kembali
              </button>
            ) : (
              <div />
            )}
            <button
              type="button"
              onClick={handleNextStep}
              className="bg-slate-900 text-white px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-orange-600 transition-all shadow-lg flex items-center gap-2"
            >
              Lanjut <ArrowRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
