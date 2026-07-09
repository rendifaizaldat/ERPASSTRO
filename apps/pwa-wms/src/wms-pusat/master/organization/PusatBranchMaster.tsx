import React, { useState, useMemo } from "react";
import { useWms } from "../../../core/WmsProvider";
import { useToast } from "../../../shared/components/Toast";
import { publishEvent } from "../../../core/event-publisher";
import { Store, Search, Pencil, Trash2, Save, MapPin } from "lucide-react";
import { ulid } from "ulidx";

export const PusatBranchMaster: React.FC = () => {
  const { branches = [], companies = [], regions = [] } = useWms() as any;
  const { showToast } = useToast();

  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("ACTIVE");

  const [isEditing, setIsEditing] = useState(false);
  const [originalId, setOriginalId] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [regionId, setRegionId] = useState("");
  const [address, setAddress] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const activeCompanies = useMemo(() => companies.filter((c: any) => c.isActive), [companies]);
  const activeRegions = useMemo(() => regions.filter((r: any) => r.isActive), [regions]);

  const activeBranches = useMemo(() => {
    return (branches || []).filter((b: any) => b.isActive === (activeTab === "ACTIVE"));
  }, [branches, activeTab]);

  const filteredBranches = useMemo(() => {
    return activeBranches
      .filter((b: any) =>
        b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.code.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a: any, b: any) => a.name.localeCompare(b.name));
  }, [activeBranches, searchTerm]);

  const resetForm = () => {
    setIsEditing(false);
    setOriginalId("");
    setName("");
    setCode("");
    setCompanyId("");
    setRegionId("");
    setAddress("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !code || !companyId || !regionId) {
      showToast("Nama, Kode, Perusahaan, dan Region wajib diisi", "ERROR");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        id: isEditing ? originalId : ulid(),
        name,
        code,
        companyId,
        regionId,
        address,
        isActive: true,
      };

      if (isEditing) {
        await publishEvent("BRANCH_UPDATED", payload.id, payload);
        showToast("Outlet berhasil diperbarui", "SUCCESS");
      } else {
        await publishEvent("BRANCH_CREATED", payload.id, payload);
        showToast("Outlet berhasil ditambahkan", "SUCCESS");
      }
      resetForm();
    } catch (err) {
      showToast("Gagal menyimpan data", "ERROR");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (branch: any) => {
    setIsEditing(true);
    setOriginalId(branch.id);
    setName(branch.name);
    setCode(branch.code);
    setCompanyId(branch.companyId);
    setRegionId(branch.regionId);
    setAddress(branch.address || "");
  };

  const handleDelete = async (id: string) => {
    if (confirm("Yakin ingin mengarsipkan outlet ini?")) {
      try {
        await publishEvent("BRANCH_DELETED", id, { id });
        showToast("Outlet berhasil diarsipkan", "SUCCESS");
      } catch (err) {
        showToast("Gagal mengarsipkan outlet", "ERROR");
      }
    }
  };

  const handleRestore = async (branch: any) => {
    if (confirm("Yakin ingin mengaktifkan kembali outlet ini?")) {
      try {
        const payload = { ...branch, isActive: true };
        await publishEvent("BRANCH_UPDATED", branch.id, payload);
        showToast("Outlet berhasil diaktifkan", "SUCCESS");
      } catch (err) {
        showToast("Gagal mengaktifkan outlet", "ERROR");
      }
    }
  };

  return (
    <div className="h-full flex flex-col md:flex-row bg-slate-50">
      {/* Form Sidebar */}
      <div className="w-full md:w-96 shrink-0 bg-white border-r border-slate-200 flex flex-col h-[50vh] md:h-full z-20 shadow-md">
        <div className="p-4 md:p-6 border-b border-slate-200 flex justify-between items-center bg-slate-800 text-white">
          <h2 className="text-lg font-black tracking-tighter uppercase flex items-center gap-2">
            <Store className="text-amber-400" />
            {isEditing ? "Edit Outlet" : "Tambah Outlet"}
          </h2>
          {isEditing && (
            <button onClick={resetForm} className="text-xs font-bold text-slate-300 hover:text-white uppercase tracking-widest cursor-pointer">Batal</button>
          )}
        </div>
        <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Perusahaan *</label>
              <select required value={companyId} onChange={e => setCompanyId(e.target.value)} className="w-full mt-1 px-4 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-bold uppercase focus:outline-none focus:border-amber-500 cursor-pointer">
                <option value="" disabled>Pilih Perusahaan...</option>
                {activeCompanies.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Region *</label>
              <select required value={regionId} onChange={e => setRegionId(e.target.value)} className="w-full mt-1 px-4 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-bold uppercase focus:outline-none focus:border-amber-500 cursor-pointer">
                <option value="" disabled>Pilih Region...</option>
                {activeRegions.map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nama Outlet *</label>
              <input required value={name} onChange={e => setName(e.target.value)} className="w-full mt-1 px-4 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-amber-500 transition-colors" placeholder="Asstro Lembang" />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Kode Outlet *</label>
              <input required value={code} onChange={e => setCode(e.target.value)} className="w-full mt-1 px-4 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-bold uppercase focus:outline-none focus:border-amber-500 transition-colors" placeholder="LBG" />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1"><MapPin size={12}/> Alamat (Opsional)</label>
              <textarea rows={2} value={address} onChange={e => setAddress(e.target.value)} className="w-full mt-1 px-4 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-amber-500 transition-colors resize-none" placeholder="Jl. Raya Lembang..." />
            </div>
            <button type="submit" disabled={isSubmitting} className="w-full py-3 mt-4 rounded-xl font-black text-xs uppercase tracking-widest text-white shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 bg-amber-600 hover:bg-amber-700">
              <Save size={16} /> {isEditing ? "Simpan Perubahan" : "Simpan Outlet"}
            </button>
          </form>
        </div>
      </div>

      {/* List Area */}
      <div className="flex-1 flex flex-col min-h-0 bg-white">
        <div className="flex items-center gap-4 border-b border-slate-200 bg-white px-4 xl:px-6 pt-4 sticky top-0 z-10">
          <button onClick={() => setActiveTab("ACTIVE")} className={`pb-3 text-xs font-black uppercase tracking-widest transition-colors ${activeTab === "ACTIVE" ? "border-b-2 border-amber-600 text-amber-600" : "text-slate-400 hover:text-slate-600"}`}>Outlet Aktif</button>
          <button onClick={() => setActiveTab("ARCHIVED")} className={`pb-3 text-xs font-black uppercase tracking-widest transition-colors ${activeTab === "ARCHIVED" ? "border-b-2 border-rose-600 text-rose-600" : "text-slate-400 hover:text-slate-600"}`}>Diarsipkan</button>
        </div>
        <div className="p-4 border-b border-slate-200 bg-white sticky top-[45px] z-10">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input type="text" placeholder="Cari outlet..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold uppercase focus:outline-none focus:border-amber-500" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-2">
          {filteredBranches.length === 0 ? (
            <p className="text-center text-xs font-bold text-slate-400 py-10 uppercase">Belum ada outlet.</p>
          ) : (
            filteredBranches.map((b: any) => {
              const comp = companies.find((c:any) => c.id === b.companyId);
              const reg = regions.find((r:any) => r.id === b.regionId);
              return (
                <div key={b.id} className="flex items-center justify-between p-3 border border-slate-100 rounded-xl bg-white shadow-sm hover:border-amber-200 transition-colors group">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
                      <Store size={20} />
                    </div>
                    <div>
                      <p className="font-black text-sm text-slate-800 uppercase">{b.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-100 px-1.5 rounded">{b.code}</span>
                        {comp && <span className="text-[9px] font-bold text-sky-600 uppercase tracking-widest">{comp.name}</span>}
                        {reg && <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest">{reg.name}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {activeTab === "ACTIVE" ? (
                      <>
                        <button onClick={() => handleEdit(b)} className="p-2 text-slate-400 hover:text-amber-500 bg-amber-50 rounded-lg cursor-pointer"><Pencil size={14}/></button>
                        <button onClick={() => handleDelete(b.id)} className="p-2 text-slate-400 hover:text-rose-500 bg-rose-50 rounded-lg cursor-pointer"><Trash2 size={14}/></button>
                      </>
                    ) : (
                      <button onClick={() => handleRestore(b)} className="p-2 text-slate-400 hover:text-emerald-500 bg-emerald-50 rounded-lg cursor-pointer" title="Restore"><Save size={14}/></button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
