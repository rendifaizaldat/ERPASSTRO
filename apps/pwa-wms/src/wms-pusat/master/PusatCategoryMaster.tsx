import React, { useState, useMemo, useEffect } from "react";
import { useWms } from "../../core/WmsProvider";
import { useToast } from "../../shared/components/Toast";
import { publishEvent } from "../../core/event-publisher";
import {
  Tags,
  Search,
  Pencil,
  Trash2,
  Save,
  CheckCircle2,
  AlertCircle,
  FolderTree,
  Hash,
} from "lucide-react";

export const PusatCategoryMaster: React.FC = () => {
  const { categories = [], coas = [], masterProducts = [] } = useWms();
  const { showToast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("ACTIVE");

  // Filter COA yang relevan untuk dijadikan Parent Kategori (Aset Persediaan atau Beban)
  const eligibleCoas = useMemo(() => {
    return coas
      .filter(
        (c) =>
          c.status !== "ARCHIVED" &&
          !c.isHeader &&
          (c.type === "ASSET" || c.type === "COGS" || c.type === "EXPENSE"),
      )
      .sort((a, b) => a.code.localeCompare(b.code));
  }, [coas]);

  // Form State
  const [isEditing, setIsEditing] = useState(false);
  const [selectedCoaId, setSelectedCoaId] = useState("");
  const [categoryName, setCategoryName] = useState("");
  const [customPrefix, setCustomPrefix] = useState("");
  const [originalId, setOriginalId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // LOGIKA AUTO-SUFFIX: [3 Angka Terakhir COA] + [2 Huruf Awal Kategori]
  const numericCoaPart = useMemo(() => {
    if (!selectedCoaId) return "000";
    const coa = eligibleCoas.find((c) => c.id === selectedCoaId);
    if (!coa) return "000";
    // Ambil angka saja dari kode COA (misal "1-1201" -> "11201"), lalu ambil 3 digit terakhir
    const digitsOnly = coa.code.replace(/\D/g, "");
    return digitsOnly.slice(-3).padStart(3, "0");
  }, [selectedCoaId, eligibleCoas]);

  // Set Prefix huruf secara otomatis saat user mengetik nama Kategori
  useEffect(() => {
    if (!isEditing && categoryName.trim().length >= 2) {
      setCustomPrefix(categoryName.trim().substring(0, 2).toUpperCase());
    } else if (!isEditing && categoryName.trim().length < 2) {
      setCustomPrefix("");
    }
  }, [categoryName, isEditing]);

  const generatedId = `${numericCoaPart}${customPrefix}`;

  const resetForm = () => {
    setSelectedCoaId("");
    setCategoryName("");
    setCustomPrefix("");
    setIsEditing(false);
    setOriginalId("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCoaId) {
      showToast("Pilih COA Parent terlebih dahulu!", "ERROR");
      return;
    }
    if (!categoryName || customPrefix.length !== 2) {
      showToast("Nama Kategori wajib diisi dan Prefix harus 2 huruf!", "ERROR");
      return;
    }

    // Validasi Duplikasi ID (Mencegah Collision)
    const exists = categories.some(
      (c) => c.id === generatedId && c.status !== "ARCHIVED",
    );
    if (exists && (!isEditing || (isEditing && generatedId !== originalId))) {
      showToast(
        `Kode Kategori ${generatedId} sudah dipakai. Silakan ubah 2 huruf prefix manual!`,
        "WARNING",
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        id: generatedId,
        coaId: selectedCoaId,
        name: categoryName.toUpperCase(),
        status: "ACTIVE",
      };

      if (isEditing) {
        await publishEvent("CATEGORY_UPDATED", originalId, payload);
        showToast(`Kategori ${generatedId} berhasil di-update!`, "SUCCESS");
      } else {
        await publishEvent("CATEGORY_CREATED", generatedId, payload);
        showToast(`Kategori ${generatedId} berhasil dibuat!`, "SUCCESS");
      }
      resetForm();
    } catch (error) {
      showToast("Gagal menyimpan Kategori ke database lokal.", "ERROR");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditClick = (cat: any) => {
    setSelectedCoaId(cat.coaId || "");
    setCategoryName(cat.name);
    setOriginalId(cat.id);

    // Ekstrak 2 huruf terakhir dari ID yang sudah ada sebagai customPrefix
    if (cat.id && cat.id.length >= 2) {
      setCustomPrefix(cat.id.slice(-2));
    }

    setIsEditing(true);
    showToast("Mode Edit Diaktifkan", "INFO");
  };

  const handleDelete = async (cat: any) => {
    const hasProducts = masterProducts.some((p: any) => p.categoryId === cat.id && p.status !== "ARCHIVED");
    if (hasProducts) {
      showToast("Gagal! Kategori ini memiliki produk aktif.", "ERROR");
      return;
    }

    if (confirm(`Yakin ingin mengarsipkan kategori ${cat.name}?`)) {
      try {
        await publishEvent("GLOBAL_CATEGORY_DELETED", cat.id, { id: cat.id });
        showToast("Kategori berhasil diarsipkan", "WARNING");
      } catch (error) {
        showToast("Gagal menghapus kategori.", "ERROR");
      }
    }
  };

  // Filter Data Kategori

  const handleRestore = async (id: string) => {
    const catToRestore = categories.find((c: any) => c.id === id);
    if (!catToRestore) return;
    if (confirm(`Yakin ingin mengembalikan (restore) kategori ${catToRestore.name}?`)) {
      try {
        const payload = { ...catToRestore, status: "ACTIVE" };
        await publishEvent("GLOBAL_CATEGORY_UPDATED", id, payload);
        showToast(`Kategori berhasil dikembalikan`, "SUCCESS");
      } catch (error) {
        showToast("Gagal mengembalikan Kategori.", "ERROR");
      }
    }
  };

  const activeCategories = useMemo(() => {
    return categories.filter((c: any) => c.status === activeTab || (activeTab === "ACTIVE" && !c.status));
  }, [categories, activeTab]);

  const filteredCategories = useMemo(() => {
    return activeCategories
      .filter(
        (c) =>
          c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          c.id.toLowerCase().includes(searchTerm.toLowerCase()),
      )
      .sort((a, b) => a.id.localeCompare(b.id));
  }, [activeCategories, searchTerm]);

  return (
    <div className="space-y-6 pb-10 animate-fade">
      {/* HEADER */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter flex items-center gap-2">
            <Tags className="text-emerald-600" />
            Master Kategori Produk
          </h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
            Pengelompokan barang yang terikat langsung ke Chart of Accounts
            (COA).
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        {/* PANEL KIRI: FORM INPUT */}
        <div className="xl:col-span-1 space-y-6">
          <div
            className={`bg-white border-2 p-5 rounded-2xl shadow-sm transition-all ${isEditing ? "border-amber-400" : "border-slate-200"}`}
          >
            <div className="flex items-center justify-between border-b-2 border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Pencil
                  className={isEditing ? "text-amber-500" : "text-emerald-600"}
                  size={16}
                />
                <span
                  className={`font-black text-xs uppercase tracking-widest ${isEditing ? "text-amber-600" : "text-emerald-600"}`}
                >
                  {isEditing ? "Edit Kategori" : "Kategori Baru"}
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

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* 1. Pilih COA Parent */}
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                  1. Parent Kategori (COA) *
                </label>
                <select
                  required
                  value={selectedCoaId}
                  onChange={(e) => setSelectedCoaId(e.target.value)}
                  className="w-full px-3 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-black uppercase focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  <option value="" disabled>
                    -- PILIH COA --
                  </option>
                  {eligibleCoas.map((coa) => (
                    <option key={coa.id} value={coa.id}>
                      [{coa.code}] {coa.name}
                    </option>
                  ))}
                </select>
                {selectedCoaId && (
                  <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest mt-1.5 flex items-center gap-1">
                    <CheckCircle2 size={10} /> Digit COA: {numericCoaPart}
                  </p>
                )}
              </div>

              {/* 2. Nama Sub Kategori */}
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                  2. Nama Sub-Kategori *
                </label>
                <input
                  required
                  value={categoryName}
                  onChange={(e) =>
                    setCategoryName(e.target.value.toUpperCase())
                  }
                  placeholder="Misal: SAYURAN, BUAH, DAGING..."
                  className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-black uppercase focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              {/* 3. Prefix & Preview Code */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex mb-2 items-center gap-1">
                  <Hash size={12} /> Auto-Suffix (2 Huruf)
                </label>
                <div className="flex gap-2">
                  <input
                    required
                    maxLength={2}
                    value={customPrefix}
                    onChange={(e) =>
                      setCustomPrefix(
                        e.target.value.replace(/[^A-Za-z]/g, "").toUpperCase(),
                      )
                    }
                    className="w-20 px-3 py-2 bg-white border border-slate-300 rounded-lg text-center text-sm font-black uppercase focus:outline-none focus:border-emerald-500"
                  />
                  <div className="flex-1 flex flex-col justify-center">
                    <p className="text-[9px] font-bold text-slate-400 leading-tight">
                      Bisa diubah jika terjadi bentrok nama (collision).
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200 flex justify-between items-center">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    Preview ID:
                  </span>
                  <span className="text-lg font-black text-emerald-600 tracking-tighter">
                    {generatedId || "-"}
                  </span>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full py-3.5 rounded-xl font-black text-xs uppercase tracking-widest text-white shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 ${isEditing ? "bg-amber-500 hover:bg-amber-600 shadow-amber-500/30" : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30"}`}
              >
                {isSubmitting ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                ) : (
                  <Save size={16} />
                )}
                {isEditing ? "Update Kategori" : "Buat Kategori"}
              </button>
            </form>
          </div>
        </div>

        {/* PANEL KANAN: LIST KATEGORI */}
        <div className="xl:col-span-2 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col min-h-150">
          <div className="p-5 border-b border-slate-100 bg-slate-50 space-y-4 rounded-t-2xl">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <FolderTree className="text-emerald-600" size={20} />
                <span className="font-black text-sm text-slate-800 uppercase tracking-tight">
                  Daftar Kategori Induk
                </span>
              </div>
              <span className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-[10px] font-black text-slate-600 uppercase tracking-widest shadow-sm">
                Total: {filteredCategories.length}
              </span>
            </div>
            <div className="relative">
              <Search
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                size={14}
              />
              <input
                type="text"
                placeholder="Cari berdasarkan ID Kategori atau Nama..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold uppercase focus:outline-none focus:border-emerald-500 transition-all placeholder:text-slate-400 shadow-sm"
              />
            </div>
          </div>

          <div className="flex-1 overflow-x-auto p-5">
            {filteredCategories.length === 0 ? (
              <div className="py-20 text-center flex flex-col items-center">
                <AlertCircle size={40} className="text-slate-200 mb-3" />
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Belum ada Kategori terdaftar.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredCategories.map((cat) => {
                  const parentCoa = coas.find((c) => c.id === cat.coaId);
                  return (
                    <div
                      key={cat.id}
                      className="bg-white border border-slate-200 p-4 rounded-xl hover:border-emerald-300 hover:shadow-md transition-all group flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex justify-between items-start mb-2">
                          <span className="px-2 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-black rounded uppercase tracking-widest border border-emerald-100">
                            ID: {cat.id}
                          </span>

                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {activeTab === "ACTIVE" ? (
                          <>
                            <button
                              onClick={() => handleEditClick(cat)}
                              className="p-2 text-slate-400 hover:text-amber-500 hover:bg-amber-50 rounded-lg transition-all cursor-pointer"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              onClick={() => handleDelete(cat)}
                              className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                            >
                              <Trash2 size={14} />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleRestore(cat.id)}
                            className="p-2 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg transition-all cursor-pointer"
                            title="Kembalikan (Restore)"
                          >
                            <Save size={14} />
                          </button>
                        )}
                      </div>

                        </div>
                        <h4 className="font-black text-sm text-slate-800 uppercase tracking-tight mb-3">
                          {cat.name}
                        </h4>
                      </div>
                      <div className="pt-3 border-t border-slate-100 mt-auto">
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                          Terikat Pada COA:
                        </p>
                        <p className="text-[10px] font-black text-slate-600 truncate">
                          {parentCoa
                            ? `[${parentCoa.code}] ${parentCoa.name}`
                            : "COA TIDAK DITEMUKAN"}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
