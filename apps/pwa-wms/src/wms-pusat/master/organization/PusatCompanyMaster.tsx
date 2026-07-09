import React, { useState, useMemo } from "react";
import { useWms } from "../../../core/WmsProvider";
import { useToast } from "../../../shared/components/Toast";
import { publishEvent } from "../../../core/event-publisher";
import { Building2, Search, Pencil, Trash2, Save, Image as ImageIcon, FileText } from "lucide-react";
import { ulid } from "ulidx";

export const PusatCompanyMaster: React.FC = () => {
  const { companies = [] } = useWms() as any; // Cast for now
  const { showToast } = useToast();

  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("ACTIVE");

  const [isEditing, setIsEditing] = useState(false);
  const [originalId, setOriginalId] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [certificateUrl, setCertificateUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const activeCompanies = useMemo(() => {
    return (companies || []).filter((c: any) => c.isActive === (activeTab === "ACTIVE"));
  }, [companies, activeTab]);

  const filteredCompanies = useMemo(() => {
    return activeCompanies
      .filter((c: any) =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.code.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a: any, b: any) => a.name.localeCompare(b.name));
  }, [activeCompanies, searchTerm]);

  const resetForm = () => {
    setIsEditing(false);
    setOriginalId("");
    setName("");
    setCode("");
    setLogoUrl("");
    setCertificateUrl("");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, setter: React.Dispatch<React.SetStateAction<string>>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setter(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !code) {
      showToast("Nama dan Kode Perusahaan wajib diisi", "ERROR");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        id: isEditing ? originalId : ulid(),
        name,
        code,
        logoUrl,
        certificateUrl,
        isActive: true,
      };

      if (isEditing) {
        await publishEvent("COMPANY_UPDATED", payload.id, payload);
        showToast("Perusahaan berhasil diperbarui", "SUCCESS");
      } else {
        await publishEvent("COMPANY_CREATED", payload.id, payload);
        showToast("Perusahaan berhasil ditambahkan", "SUCCESS");
      }
      resetForm();
    } catch (err) {
      showToast("Gagal menyimpan data", "ERROR");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (comp: any) => {
    setIsEditing(true);
    setOriginalId(comp.id);
    setName(comp.name);
    setCode(comp.code);
    setLogoUrl(comp.logoUrl || "");
    setCertificateUrl(comp.certificateUrl || "");
  };

  const handleDelete = async (id: string) => {
    if (confirm("Yakin ingin mengarsipkan perusahaan ini?")) {
      try {
        await publishEvent("COMPANY_DELETED", id, { id });
        showToast("Perusahaan berhasil diarsipkan", "SUCCESS");
      } catch (err) {
        showToast("Gagal mengarsipkan perusahaan", "ERROR");
      }
    }
  };

  const handleRestore = async (comp: any) => {
    if (confirm("Yakin ingin mengaktifkan kembali perusahaan ini?")) {
      try {
        const payload = { ...comp, isActive: true };
        await publishEvent("COMPANY_UPDATED", comp.id, payload);
        showToast("Perusahaan berhasil diaktifkan", "SUCCESS");
      } catch (err) {
        showToast("Gagal mengaktifkan perusahaan", "ERROR");
      }
    }
  };

  return (
    <div className="h-full flex flex-col md:flex-row bg-slate-50">
      {/* Sidebar Form */}
      <div className="w-full md:w-96 shrink-0 bg-white border-r border-slate-200 flex flex-col h-[50vh] md:h-full z-20 shadow-md">
        <div className="p-4 md:p-6 border-b border-slate-200 flex justify-between items-center bg-slate-800 text-white">
          <h2 className="text-lg font-black tracking-tighter uppercase flex items-center gap-2">
            <Building2 className="text-sky-400" />
            {isEditing ? "Edit Perusahaan" : "Tambah Perusahaan"}
          </h2>
          {isEditing && (
            <button onClick={resetForm} className="text-xs font-bold text-slate-300 hover:text-white uppercase tracking-widest cursor-pointer">Batal</button>
          )}
        </div>
        <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nama Perusahaan *</label>
              <input required value={name} onChange={e => setName(e.target.value)} className="w-full mt-1 px-4 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-sky-500 transition-colors" placeholder="PT Asstro Lestari" />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Kode Perusahaan *</label>
              <input required value={code} onChange={e => setCode(e.target.value)} className="w-full mt-1 px-4 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-bold uppercase focus:outline-none focus:border-sky-500 transition-colors" placeholder="AST" />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><ImageIcon size={12}/> Logo (Opsional)</label>
              <input type="file" accept="image/*" onChange={e => handleFileUpload(e, setLogoUrl)} className="w-full mt-1 text-xs" />
              {logoUrl && <img src={logoUrl} alt="Logo Preview" className="mt-2 h-16 rounded-md border border-slate-200 object-contain p-1" />}
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><FileText size={12}/> Sertifikat Legalitas (Opsional)</label>
              <input type="file" accept="application/pdf,image/*" onChange={e => handleFileUpload(e, setCertificateUrl)} className="w-full mt-1 text-xs" />
              {certificateUrl && <p className="mt-1 text-[10px] text-emerald-600 font-bold">File tersimpan</p>}
            </div>
            <button type="submit" disabled={isSubmitting} className="w-full py-3 mt-4 rounded-xl font-black text-xs uppercase tracking-widest text-white shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 bg-sky-600 hover:bg-sky-700">
              <Save size={16} /> {isEditing ? "Simpan Perubahan" : "Simpan Perusahaan"}
            </button>
          </form>
        </div>
      </div>

      {/* List Area */}
      <div className="flex-1 flex flex-col min-h-0 bg-white">
        <div className="flex items-center gap-4 border-b border-slate-200 bg-white px-4 xl:px-6 pt-4 sticky top-0 z-10">
          <button onClick={() => setActiveTab("ACTIVE")} className={`pb-3 text-xs font-black uppercase tracking-widest transition-colors ${activeTab === "ACTIVE" ? "border-b-2 border-sky-600 text-sky-600" : "text-slate-400 hover:text-slate-600"}`}>Perusahaan Aktif</button>
          <button onClick={() => setActiveTab("ARCHIVED")} className={`pb-3 text-xs font-black uppercase tracking-widest transition-colors ${activeTab === "ARCHIVED" ? "border-b-2 border-rose-600 text-rose-600" : "text-slate-400 hover:text-slate-600"}`}>Diarsipkan</button>
        </div>
        <div className="p-4 border-b border-slate-200 bg-white sticky top-[45px] z-10">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input type="text" placeholder="Cari perusahaan..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold uppercase focus:outline-none focus:border-sky-500" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-2">
          {filteredCompanies.length === 0 ? (
            <p className="text-center text-xs font-bold text-slate-400 py-10 uppercase">Belum ada perusahaan.</p>
          ) : (
            filteredCompanies.map((c: any) => (
              <div key={c.id} className="flex items-center justify-between p-3 border border-slate-100 rounded-xl bg-white shadow-sm hover:border-sky-200 transition-colors group">
                <div className="flex items-center gap-3">
                  {c.logoUrl ? (
                    <img src={c.logoUrl} alt={c.name} className="w-10 h-10 rounded-lg object-cover border border-slate-200 p-0.5" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-sky-50 flex items-center justify-center text-sky-600">
                      <Building2 size={20} />
                    </div>
                  )}
                  <div>
                    <p className="font-black text-sm text-slate-800 uppercase">{c.name}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">KODE: {c.code}</p>
                  </div>
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  {activeTab === "ACTIVE" ? (
                    <>
                      <button onClick={() => handleEdit(c)} className="p-2 text-slate-400 hover:text-amber-500 bg-amber-50 rounded-lg cursor-pointer"><Pencil size={14}/></button>
                      <button onClick={() => handleDelete(c.id)} className="p-2 text-slate-400 hover:text-rose-500 bg-rose-50 rounded-lg cursor-pointer"><Trash2 size={14}/></button>
                    </>
                  ) : (
                    <button onClick={() => handleRestore(c)} className="p-2 text-slate-400 hover:text-emerald-500 bg-emerald-50 rounded-lg cursor-pointer" title="Restore"><Save size={14}/></button>
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
