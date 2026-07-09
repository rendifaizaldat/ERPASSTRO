import React, { useState, useMemo } from "react";
import { useWms } from "../../../core/WmsProvider";
import { useToast } from "../../../shared/components/Toast";
import { publishEvent } from "../../../core/event-publisher";
import { Map, Search, Pencil, Trash2, Save } from "lucide-react";
import { ulid } from "ulidx";

export const PusatRegionMaster: React.FC = () => {
  const { regions = [] } = useWms() as any;
  const { showToast } = useToast();

  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("ACTIVE");

  const [isEditing, setIsEditing] = useState(false);
  const [originalId, setOriginalId] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const activeRegions = useMemo(() => {
    return (regions || []).filter((r: any) => r.isActive === (activeTab === "ACTIVE"));
  }, [regions, activeTab]);

  const filteredRegions = useMemo(() => {
    return activeRegions
      .filter((r: any) =>
        r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.code.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a: any, b: any) => a.name.localeCompare(b.name));
  }, [activeRegions, searchTerm]);

  const resetForm = () => {
    setIsEditing(false);
    setOriginalId("");
    setName("");
    setCode("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !code) {
      showToast("Nama dan Kode Region wajib diisi", "ERROR");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        id: isEditing ? originalId : ulid(),
        name,
        code,
        isActive: true,
      };

      if (isEditing) {
        await publishEvent("REGION_UPDATED", payload.id, payload);
        showToast("Region berhasil diperbarui", "SUCCESS");
      } else {
        await publishEvent("REGION_CREATED", payload.id, payload);
        showToast("Region berhasil ditambahkan", "SUCCESS");
      }
      resetForm();
    } catch (err) {
      showToast("Gagal menyimpan data", "ERROR");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (reg: any) => {
    setIsEditing(true);
    setOriginalId(reg.id);
    setName(reg.name);
    setCode(reg.code);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Yakin ingin mengarsipkan region ini?")) {
      try {
        await publishEvent("REGION_DELETED", id, { id });
        showToast("Region berhasil diarsipkan", "SUCCESS");
      } catch (err) {
        showToast("Gagal mengarsipkan region", "ERROR");
      }
    }
  };

  const handleRestore = async (reg: any) => {
    if (confirm("Yakin ingin mengaktifkan kembali region ini?")) {
      try {
        const payload = { ...reg, isActive: true };
        await publishEvent("REGION_UPDATED", reg.id, payload);
        showToast("Region berhasil diaktifkan", "SUCCESS");
      } catch (err) {
        showToast("Gagal mengaktifkan region", "ERROR");
      }
    }
  };

  return (
    <div className="h-full flex flex-col md:flex-row bg-slate-50">
      {/* Form Sidebar */}
      <div className="w-full md:w-96 shrink-0 bg-white border-r border-slate-200 flex flex-col h-[50vh] md:h-full z-20 shadow-md">
        <div className="p-4 md:p-6 border-b border-slate-200 flex justify-between items-center bg-slate-800 text-white">
          <h2 className="text-lg font-black tracking-tighter uppercase flex items-center gap-2">
            <Map className="text-emerald-400" />
            {isEditing ? "Edit Region" : "Tambah Region"}
          </h2>
          {isEditing && (
            <button onClick={resetForm} className="text-xs font-bold text-slate-300 hover:text-white uppercase tracking-widest cursor-pointer">Batal</button>
          )}
        </div>
        <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nama Region *</label>
              <input required value={name} onChange={e => setName(e.target.value)} className="w-full mt-1 px-4 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-emerald-500 transition-colors" placeholder="Jawa Barat" />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Kode Region *</label>
              <input required value={code} onChange={e => setCode(e.target.value)} className="w-full mt-1 px-4 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-bold uppercase focus:outline-none focus:border-emerald-500 transition-colors" placeholder="JBR" />
            </div>
            <button type="submit" disabled={isSubmitting} className="w-full py-3 mt-4 rounded-xl font-black text-xs uppercase tracking-widest text-white shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 bg-emerald-600 hover:bg-emerald-700">
              <Save size={16} /> {isEditing ? "Simpan Perubahan" : "Simpan Region"}
            </button>
          </form>
        </div>
      </div>

      {/* List Area */}
      <div className="flex-1 flex flex-col min-h-0 bg-white">
        <div className="flex items-center gap-4 border-b border-slate-200 bg-white px-4 xl:px-6 pt-4 sticky top-0 z-10">
          <button onClick={() => setActiveTab("ACTIVE")} className={`pb-3 text-xs font-black uppercase tracking-widest transition-colors ${activeTab === "ACTIVE" ? "border-b-2 border-emerald-600 text-emerald-600" : "text-slate-400 hover:text-slate-600"}`}>Region Aktif</button>
          <button onClick={() => setActiveTab("ARCHIVED")} className={`pb-3 text-xs font-black uppercase tracking-widest transition-colors ${activeTab === "ARCHIVED" ? "border-b-2 border-rose-600 text-rose-600" : "text-slate-400 hover:text-slate-600"}`}>Diarsipkan</button>
        </div>
        <div className="p-4 border-b border-slate-200 bg-white sticky top-[45px] z-10">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input type="text" placeholder="Cari region..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold uppercase focus:outline-none focus:border-emerald-500" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-2">
          {filteredRegions.length === 0 ? (
            <p className="text-center text-xs font-bold text-slate-400 py-10 uppercase">Belum ada region.</p>
          ) : (
            filteredRegions.map((r: any) => (
              <div key={r.id} className="flex items-center justify-between p-3 border border-slate-100 rounded-xl bg-white shadow-sm hover:border-emerald-200 transition-colors group">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                    <Map size={20} />
                  </div>
                  <div>
                    <p className="font-black text-sm text-slate-800 uppercase">{r.name}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">KODE: {r.code}</p>
                  </div>
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  {activeTab === "ACTIVE" ? (
                    <>
                      <button onClick={() => handleEdit(r)} className="p-2 text-slate-400 hover:text-amber-500 bg-amber-50 rounded-lg cursor-pointer"><Pencil size={14}/></button>
                      <button onClick={() => handleDelete(r.id)} className="p-2 text-slate-400 hover:text-rose-500 bg-rose-50 rounded-lg cursor-pointer"><Trash2 size={14}/></button>
                    </>
                  ) : (
                    <button onClick={() => handleRestore(r)} className="p-2 text-slate-400 hover:text-emerald-500 bg-emerald-50 rounded-lg cursor-pointer" title="Restore"><Save size={14}/></button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
