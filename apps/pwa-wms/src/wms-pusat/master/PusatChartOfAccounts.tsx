import React, { useState, useMemo, useEffect, useRef } from "react";
import { useWms } from "../../core/WmsProvider";
import { useToast } from "../../shared/components/Toast";
import { publishEvent } from "../../core/event-publisher";
import {
  Landmark,
  ListTree,
  Search,
  Pencil,
  Trash2,
  Save,
  Wallet,
  FolderOpen,
  Info,
  CheckSquare,
  Square,
} from "lucide-react";

const ACCOUNT_TYPES = [
  {
    id: "ASSET",
    label: "Aset / Harta",
    defaultPrefix: "1",
    defaultBalance: "DEBIT",
    report: "NERACA (Balance Sheet)",
  },
  {
    id: "LIABILITY",
    label: "Liabilitas / Utang",
    defaultPrefix: "2",
    defaultBalance: "KREDIT",
    report: "NERACA (Balance Sheet)",
  },
  {
    id: "EQUITY",
    label: "Ekuitas / Modal",
    defaultPrefix: "3",
    defaultBalance: "KREDIT",
    report: "NERACA (Balance Sheet)",
  },
  {
    id: "REVENUE",
    label: "Pendapatan / Omzet",
    defaultPrefix: "4",
    defaultBalance: "KREDIT",
    report: "LABA RUGI (Profit & Loss)",
  },
  {
    id: "COGS",
    label: "Harga Pokok Penjualan (HPP)",
    defaultPrefix: "5",
    defaultBalance: "DEBIT",
    report: "LABA RUGI (Profit & Loss)",
  },
  {
    id: "EXPENSE",
    label: "Beban / Biaya Operasional",
    defaultPrefix: "6",
    defaultBalance: "DEBIT",
    report: "LABA RUGI (Profit & Loss)",
  },
];

const InfoTip: React.FC<{ description: string }> = ({ description }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="text-sky-500 hover:text-sky-700 cursor-pointer p-0.5 align-middle"
      >
        <Info size={12} />
      </button>
      {open && (
        <div className="absolute z-9999 left-0 mt-1 w-72 p-3 bg-slate-800 text-white text-[10px] leading-relaxed rounded-lg shadow-2xl pointer-events-auto">
          {description}
        </div>
      )}
    </div>
  );
};

export const ChartOfAccounts: React.FC = () => {
  const { coas = [], fetchCoaData } = useWms();
  const { showToast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");

  const [isEditing, setIsEditing] = useState(false);
  const [accType, setAccType] = useState("ASSET");
  const [accParent, setAccParent] = useState("");
  const [accCodeSuffix, setAccCodeSuffix] = useState("");
  const [accName, setAccName] = useState("");
  const [accNormalBalance, setAccNormalBalance] = useState("DEBIT");
  const [isHeader, setIsHeader] = useState(false);
  const [accDesc, setAccDesc] = useState("");
  const [originalCode, setOriginalCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isEditing) {
      const selectedType = ACCOUNT_TYPES.find((t) => t.id === accType);
      if (selectedType) {
        setAccNormalBalance(selectedType.defaultBalance);
      }
      setAccParent("");
      setAccCodeSuffix("");
    }
  }, [accType, isEditing]);

  const getPrefix = () => {
    if (accParent) {
      return accParent.substring(0, 4);
    }
    const selectedType = ACCOUNT_TYPES.find((t) => t.id === accType);
    return selectedType ? selectedType.defaultPrefix + "-" : "";
  };

  const currentPrefix = getPrefix();

  const resetForm = () => {
    console.log("🔁 [resetForm] Form di-reset ke awal");
    setAccType("ASSET");
    setAccParent("");
    setAccCodeSuffix("");
    setAccName("");
    setAccNormalBalance("DEBIT");
    setIsHeader(false);
    setAccDesc("");
    setIsEditing(false);
    setOriginalCode("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    console.log("📝 [handleSubmit] Mulai proses submit");
    console.log("   accCodeSuffix:", accCodeSuffix);
    console.log("   accName:", accName);
    console.log("   accType:", accType);
    console.log("   accParent:", accParent);
    console.log("   accNormalBalance:", accNormalBalance);
    console.log("   isHeader:", isHeader);
    console.log("   accDesc:", accDesc);
    console.log("   isEditing:", isEditing);
    console.log("   originalCode:", originalCode);

    if (!accCodeSuffix || !accName) {
      console.warn("⚠️ [handleSubmit] Validasi gagal: kode atau nama kosong");
      showToast("Kode dan Nama Akun wajib diisi!", "ERROR");
      return;
    }

    const fullCode = `${currentPrefix}${accCodeSuffix}`;
    console.log("📌 [handleSubmit] fullCode yang akan diproses:", fullCode);

    const exists = coas.some(
      (a: any) => a.code === fullCode && a.status !== "ARCHIVED",
    );
    if (exists && (!isEditing || (isEditing && fullCode !== originalCode))) {
      console.warn("⚠️ [handleSubmit] Kode duplikat terdeteksi:", fullCode);
      showToast(`Kode Akun ${fullCode} sudah terdaftar!`, "ERROR");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        id: fullCode,
        code: fullCode,
        name: accName,
        type: accType,
        normalBalance: accNormalBalance,
        isHeader: isHeader,
        parent: accParent || null,
        desc: accDesc,
        status: "ACTIVE",
      };

      console.log("📦 [handleSubmit] Payload yang akan dikirim:", payload);

      if (isEditing) {
        console.log(
          `✏️ [handleSubmit] Mengirim event COA_UPDATED untuk ${originalCode}`,
        );
        await publishEvent("COA_UPDATED", originalCode, payload);
        console.log("✅ [handleSubmit] Event COA_UPDATED berhasil dipublish");
        showToast(`Update akun ${fullCode} masuk antrean!`, "SUCCESS");
      } else {
        console.log(
          `➕ [handleSubmit] Mengirim event COA_CREATED untuk ${fullCode}`,
        );
        await publishEvent("COA_CREATED", fullCode, payload);
        console.log("✅ [handleSubmit] Event COA_CREATED berhasil dipublish");
        showToast(`Pembuatan akun ${fullCode} masuk antrean!`, "SUCCESS");
      }

      resetForm();

      // 2. TRIGGER REFETCH AGAR UI MUNCUL DATANYA
      if (fetchCoaData) {
        console.log(
          "🔄 [handleSubmit] Memanggil fetchCoaData setelah 300ms untuk memperbarui UI",
        );
        setTimeout(() => {
          console.log("⏳ [handleSubmit] Eksekusi fetchCoaData sekarang...");
          fetchCoaData();
          console.log(
            "✅ [handleSubmit] fetchCoaData selesai dipanggil (perhatikan response di komponen)",
          );
        }, 300);
      } else {
        console.warn(
          "⚠️ [handleSubmit] fetchCoaData tidak tersedia, UI tidak akan otomatis refresh",
        );
      }
    } catch (error) {
      console.error("❌ [handleSubmit] Gagal menyimpan COA:", error);
      showToast("Gagal menyimpan COA ke database lokal.", "ERROR");
    } finally {
      setIsSubmitting(false);
      console.log("🏁 [handleSubmit] Proses submit selesai (finally)");
    }
  };

  const handleEditClick = (acc: any) => {
    console.log("✏️ [handleEditClick] Memulai edit untuk akun:", acc.code);
    console.log("   Data akun:", acc);

    setAccType(acc.type);
    setAccParent(acc.parent || "");
    setAccName(acc.name);
    setAccNormalBalance(acc.normalBalance);
    setIsHeader(acc.isHeader);
    setAccDesc(acc.desc || "");

    const typeDef = ACCOUNT_TYPES.find((t) => t.id === acc.type);
    let prefix = "";
    let suffix = "";

    if (acc.parent) {
      prefix = acc.parent.substring(0, 4);
      suffix = acc.code.substring(prefix.length);
    } else {
      prefix = typeDef ? typeDef.defaultPrefix + "-" : "";
      suffix = acc.code.substring(prefix.length);
    }

    setAccCodeSuffix(suffix);
    setOriginalCode(acc.code);
    setIsEditing(true);

    console.log("   suffix di-set:", suffix);
    console.log("   originalCode di-set:", acc.code);
    showToast("Mode Edit Diaktifkan", "INFO");
  };

  const handleDelete = async (code: string) => {
    console.log(
      `🗑️ [handleDelete] Mencoba menghapus akun dengan kode: ${code}`,
    );

    const isParent = coas.some(
      (a: any) => a.parent === code && a.status !== "ARCHIVED",
    );
    if (isParent) {
      console.warn("⚠️ [handleDelete] Gagal: akun ini memiliki sub-akun aktif");
      showToast("Gagal! Akun induk ini memiliki sub-akun aktif.", "ERROR");
      return;
    }

    if (confirm(`Yakin ingin menghapus (arsip) kode akun ${code}?`)) {
      try {
        console.log(
          `📤 [handleDelete] Mengirim event COA_DELETED untuk ${code}`,
        );
        await publishEvent("COA_DELETED", code, { id: code });
        console.log("✅ [handleDelete] Event COA_DELETED berhasil dipublish");
        showToast(`Hapus akun ${code} masuk antrean`, "WARNING");

        // Memuat ulang data setelah dihapus
        if (fetchCoaData) {
          console.log("🔄 [handleDelete] Memanggil fetchCoaData setelah 300ms");
          setTimeout(() => {
            console.log("⏳ [handleDelete] Eksekusi fetchCoaData...");
            fetchCoaData();
            console.log("✅ [handleDelete] fetchCoaData selesai dipanggil");
          }, 300);
        }
      } catch (error) {
        console.error("❌ [handleDelete] Gagal menghapus COA:", error);
        showToast("Gagal menghapus COA dari database lokal.", "ERROR");
      }
    } else {
      console.log("🚫 [handleDelete] Penghapusan dibatalkan oleh pengguna");
    }
  };

  const activeCoas = useMemo(() => {
    return coas.filter((a: any) => a.status !== "ARCHIVED");
  }, [coas]);

  const filteredAccounts = useMemo(() => {
    return activeCoas
      .filter(
        (a: any) =>
          a.code.includes(searchTerm) ||
          a.name.toLowerCase().includes(searchTerm.toLowerCase()),
      )
      .sort((a: any, b: any) => a.code.localeCompare(b.code));
  }, [activeCoas, searchTerm]);

  const potentialParents = activeCoas.filter(
    (a: any) => a.isHeader && a.type === accType,
  );

  return (
    <div className="h-full flex flex-col bg-slate-50">
      <div className="shrink-0 bg-white p-4 md:p-6 border-b border-slate-200 shadow-sm z-10">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter flex items-center gap-2">
              <Landmark className="text-sky-600" />
              Chart of Accounts (Bagan Akun)
            </h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
              Manajemen terpusat struktur kode keuangan untuk neraca & laba
              rugi.
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col xl:flex-row flex-1 min-h-0">
        <div className="w-full xl:w-130 shrink-0 p-4 xl:p-6 border-r border-slate-200 bg-white overflow-y-auto overflow-x-visible">
          <div
            className={`border-2 p-5 rounded-2xl shadow-sm transition-all ${isEditing ? "border-amber-400" : "border-slate-200"}`}
          >
            <div className="flex items-center justify-between border-b-2 border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Pencil
                  className={isEditing ? "text-amber-500" : "text-sky-600"}
                  size={16}
                />
                <span
                  className={`font-black text-xs uppercase tracking-widest ${isEditing ? "text-amber-600" : "text-sky-600"}`}
                >
                  {isEditing ? "Edit Akun" : "Registrasi Akun Baru"}
                </span>
              </div>
              {isEditing && (
                <button
                  onClick={resetForm}
                  className="text-[9px] font-black text-slate-400 hover:text-red-500 uppercase transition-colors cursor-pointer"
                >
                  Batal Edit
                </button>
              )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                  1. Kategori Utama (Tipe Akun) *
                  <InfoTip description="Fungsi: Menentukan kategori besar akun (Aset, Liabilitas, Ekuitas, Pendapatan, HPP, Beban). Tujuan: Menentukan posisi akun di Laporan Keuangan; kelompok 1-3 → Neraca, kelompok 4-6 → Laba Rugi." />
                </label>
                <select
                  required
                  value={accType}
                  onChange={(e) => setAccType(e.target.value)}
                  className="w-full mt-1 px-3 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-black uppercase focus:outline-none focus:border-sky-500 cursor-pointer"
                >
                  {ACCOUNT_TYPES.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label} — Lari ke: {t.report}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                  2. Sub-Kategori / Akun Induk
                  <InfoTip description="Fungsi: Pengelompokan lebih spesifik di bawah Tipe Akun (misal: Aset Lancar, Aset Tetap). Tujuan: Membantu sistem menyusun struktur laporan agar lebih rapi dan menentukan digit kedua pada kode akun secara otomatis." />
                </label>
                <select
                  value={accParent}
                  onChange={(e) => setAccParent(e.target.value)}
                  className="w-full mt-1 px-3 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-black uppercase focus:outline-none focus:border-sky-500 cursor-pointer"
                >
                  <option value="">
                    -- JADIKAN AKUN LEVEL PERTAMA (ROOT) --
                  </option>
                  {potentialParents.map((p: any) => (
                    <option key={p.code} value={p.code}>
                      [{p.code}] {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                  3. Kode & Nama Akun *
                  <InfoTip description="Kode: Identitas unik angka, prefiks otomatis. Nama: Label spesifik akun (contoh: Kas Kecil, Persediaan Bahan Baku). Pastikan kode unik untuk mencegah duplikasi." />
                </label>
                <div className="flex items-center gap-2 mt-1">
                  <div className="px-3 py-2.5 bg-slate-200 text-slate-600 border-2 border-slate-200 rounded-xl text-xs font-black select-none whitespace-nowrap">
                    {currentPrefix}
                  </div>
                  <input
                    required
                    value={accCodeSuffix}
                    onChange={(e) =>
                      setAccCodeSuffix(
                        e.target.value.replace(/\D/g, "").slice(0, 4),
                      )
                    }
                    placeholder="101"
                    className="w-20 px-3 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-black uppercase focus:outline-none focus:border-sky-500 transition-colors"
                  />
                  <input
                    required
                    value={accName}
                    onChange={(e) => setAccName(e.target.value)}
                    placeholder="Misal: Persediaan Bahan Baku - Makanan"
                    className="flex-1 px-4 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-black focus:outline-none focus:border-sky-500 transition-colors"
                  />
                </div>
                <p className="text-[9px] font-bold text-sky-600 uppercase tracking-widest mt-1">
                  Kode Final: {currentPrefix}
                  {accCodeSuffix || "..."}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                    4. Saldo Normal *
                    <InfoTip description="Fungsi: Menetapkan sifat dasar akun saat penambahan nilai (Aset/HPP/Beban → Debit, Utang/Modal/Pendapatan → Kredit). Tujuan: Memastikan perhitungan laporan keuangan tidak terbalik." />
                  </label>
                  <select
                    required
                    value={accNormalBalance}
                    onChange={(e) => setAccNormalBalance(e.target.value)}
                    className="w-full mt-1 px-3 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-black uppercase focus:outline-none focus:border-sky-500 cursor-pointer"
                  >
                    <option value="DEBIT">DEBIT</option>
                    <option value="KREDIT">KREDIT</option>
                  </select>
                </div>
                <div className="flex flex-col justify-end">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1 mb-1">
                    5. Akun Induk (Header)
                    <InfoTip description="Fungsi: Menandai apakah akun ini hanya 'payung/judul kelompok' (tidak bisa dipakai jurnal langsung). Tujuan: Menggabungkan total anak akun agar laporan keuangan tampil ringkas." />
                  </label>
                  <div
                    onClick={() => setIsHeader(!isHeader)}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border-2 cursor-pointer transition-colors select-none ${isHeader ? "bg-indigo-50 border-indigo-400 text-indigo-700" : "bg-slate-50 border-slate-200 text-slate-500"}`}
                  >
                    {isHeader ? (
                      <CheckSquare size={16} />
                    ) : (
                      <Square size={16} />
                    )}
                    <span className="text-[10px] font-black uppercase tracking-widest">
                      Akun Induk
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  6. Keterangan / Deskripsi (Opsional)
                </label>
                <textarea
                  rows={2}
                  value={accDesc}
                  onChange={(e) => setAccDesc(e.target.value)}
                  placeholder="Catatan mengenai fungsi akun..."
                  className="w-full mt-1 px-4 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-sky-500 transition-colors resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full py-3 mt-4 rounded-xl font-black text-xs uppercase tracking-widest text-white shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 ${isEditing ? "bg-amber-500 hover:bg-amber-600 shadow-amber-500/30" : "bg-sky-600 hover:bg-sky-700 shadow-sky-600/30"}`}
              >
                {isSubmitting ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                ) : (
                  <Save size={16} />
                )}
                {isEditing ? "Simpan Perubahan" : "Tambahkan Akun"}
              </button>
            </form>
          </div>
        </div>

        <div className="flex-1 flex flex-col min-h-0 bg-white xl:bg-slate-50">
          <div className="p-4 xl:p-6 border-b border-slate-200 bg-white space-y-4 sticky top-0 z-10">
            <div className="flex items-center gap-2">
              <ListTree className="text-sky-600" size={20} />
              <span className="font-black text-sm text-slate-800 uppercase tracking-tight">
                Struktur Bagan Akun
              </span>
            </div>
            <div className="relative">
              <Search
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                size={14}
              />
              <input
                type="text"
                placeholder="Cari berdasarkan Kode atau Nama Akun..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold uppercase focus:outline-none focus:border-sky-500 transition-all placeholder:text-slate-400 shadow-sm"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 xl:p-6 custom-scrollbar">
            <div className="space-y-1">
              {filteredAccounts.length === 0 ? (
                <div className="py-20 text-center">
                  <Wallet size={40} className="mx-auto text-slate-200 mb-3" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Tidak ada akun ditemukan.
                  </p>
                </div>
              ) : (
                filteredAccounts.map((acc: any) => {
                  const typeDef = ACCOUNT_TYPES.find((t) => t.id === acc.type);
                  return (
                    <div
                      key={acc.code}
                      className={`flex items-center justify-between p-3 border rounded-xl transition-all hover:border-sky-200 group ${acc.isHeader ? "bg-slate-100 border-slate-200 mt-4 mb-2 shadow-sm" : "bg-white border-slate-100 ml-8"}`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${acc.isHeader ? "bg-slate-800 text-white" : "bg-sky-50 text-sky-600"}`}
                        >
                          {acc.isHeader ? (
                            <FolderOpen size={14} />
                          ) : (
                            <Wallet size={14} />
                          )}
                        </div>
                        <div>
                          <p
                            className={`font-black text-xs tracking-tight uppercase ${acc.isHeader ? "text-slate-900" : "text-slate-700"}`}
                          >
                            <span
                              className={`${acc.isHeader ? "text-slate-500" : "text-sky-600"} mr-2`}
                            >
                              {acc.code}
                            </span>
                            {acc.name}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span
                              className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${acc.normalBalance === "DEBIT" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}
                            >
                              {acc.normalBalance}
                            </span>
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                              {typeDef?.label}{" "}
                              {acc.parent && ` | Induk: ${acc.parent}`}
                            </span>
                          </div>
                          {acc.desc && (
                            <p className="text-[9px] font-medium text-slate-500 mt-1 flex items-center gap-1">
                              <Info size={10} /> {acc.desc}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleEditClick(acc)}
                          className="p-2 text-slate-400 hover:text-amber-500 hover:bg-amber-50 rounded-lg transition-all cursor-pointer"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(acc.code)}
                          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
