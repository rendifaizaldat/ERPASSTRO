import React, { useState } from "react";
import {
  X,
  Users,
  Pencil,
  ToggleLeft,
  ToggleRight,
  ShieldAlert,
  Info,
  ArchiveRestore,
} from "lucide-react";
import { useToast } from "../../components/Toast";

interface SidebarStaffManagementProps {
  isStaffOpen: boolean;
  setIsStaffOpen: (open: boolean) => void;
  staffName: string;
  setStaffName: (name: string) => void;
  staffRole: "ADMIN" | "CASHIER" | "WAITER";
  setStaffRole: (role: "ADMIN" | "CASHIER" | "WAITER") => void;
  staffPin: string;
  setStaffPin: (pin: string) => void;
  staffError: string | null;
  handleAddStaffSubmit: (e: React.FormEvent) => Promise<void>;
  existingStaffList: any[];
  handleDeleteStaffAction: (pin: string, name: string) => Promise<void>;

  // PERBAIKAN: Menyelaraskan interface dengan PosProvider (Berbasis ID)
  editStaff: (
    id: string,
    data: { name: string; role: string; pin: string; isActive: boolean },
  ) => Promise<void>;
  toggleStaffStatus: (id: string, isActive: boolean) => Promise<void>;
}

export const SidebarStaffManagement = ({
  isStaffOpen,
  setIsStaffOpen,
  staffName,
  setStaffName,
  staffRole,
  setStaffRole,
  staffPin,
  setStaffPin,
  staffError,
  handleAddStaffSubmit,
  existingStaffList,
  editStaff,
  toggleStaffStatus,
}: SidebarStaffManagementProps) => {
  const { showToast } = useToast();

  const [isEditing, setIsEditing] = useState(false);
  // PERBAIKAN: Menggunakan editingId, bukan editingPin
  const [editingId, setEditingId] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<"ACTIVE" | "ARCHIVED">("ACTIVE");

  const isProtected = (pin: string) => pin === "112233" || pin === "0000";

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isEditing && editingId) {
      if (!staffName.trim()) {
        showToast("Nama staf tidak boleh kosong!", "ERROR");
        return;
      }

      const existing = existingStaffList.find((s) => s.id === editingId);

      // Mencegah edit PIN ke PIN yang sedang dipakai staf aktif lain
      const isPinInUse = existingStaffList.some(
        (s: any) =>
          s.pin === staffPin && s.isActive !== false && s.id !== editingId,
      );

      if (isPinInUse) {
        showToast("GAGAL: PIN ini sudah digunakan staf aktif lain!", "ERROR");
        return;
      }

      // PERBAIKAN: Memanggil editStaff dengan ID dan menyertakan PIN di dalam payload
      await editStaff(editingId, {
        name: staffName.trim().toUpperCase(),
        role: staffRole,
        pin: staffPin,
        isActive: existing ? existing.isActive : true,
      });

      showToast("Data staf berhasil diperbarui!", "SUCCESS");
      resetForm();
    } else {
      await handleAddStaffSubmit(e);
    }
  };

  const handleEditClick = (staff: any) => {
    setStaffName(staff.name);
    setStaffRole(staff.role);
    setStaffPin(staff.pin);
    setEditingId(staff.id); // Set ID untuk diedit
    setIsEditing(true);
  };

  const handleToggleClick = async (staff: any) => {
    const newStatus = staff.isActive === false ? true : false;
    // PERBAIKAN: Memanggil toggleStaffStatus dengan ID staf
    await toggleStaffStatus(staff.id, newStatus);
    showToast(
      `Staf ${staff.name} berhasil di-${newStatus ? "aktifkan" : "nonaktifkan"}`,
      newStatus ? "SUCCESS" : "WARNING",
    );
  };

  const resetForm = () => {
    setStaffName("");
    setStaffRole("CASHIER");
    setStaffPin("");
    setIsEditing(false);
    setEditingId(null);
  };

  const filteredStaff = existingStaffList.filter((s: any) => {
    const isActive = s.isActive !== false;
    return activeTab === "ACTIVE" ? isActive : !isActive;
  });

  return (
    <>
      <div
        className={`fixed inset-0 bg-slate-900/60 z-70 transition-opacity duration-300 ${isStaffOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={() => setIsStaffOpen(false)}
      />
      <div
        className={`fixed right-0 top-0 h-full w-full max-w-md bg-white z-80 shadow-2xl transition-transform duration-500 ease-in-out transform flex flex-col ${isStaffOpen ? "translate-x-0" : "translate-x-full"}`}
      >
        <div className="p-4 border-b flex justify-between items-center bg-slate-50 text-slate-900 shrink-0">
          <div className="flex items-center gap-2">
            <Users size={16} className="text-orange-600" />
            <h3 className="font-black text-xs uppercase tracking-widest">
              Staff Management
            </h3>
          </div>
          <button
            onClick={() => setIsStaffOpen(false)}
            className="p-1.5 text-slate-400 hover:bg-slate-200 rounded-lg"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 flex-1 overflow-y-auto space-y-5 text-sm">
          {/* ===================== FORM INPUT / EDIT ===================== */}
          <div className="relative">
            {isEditing && (
              <button
                onClick={resetForm}
                className="absolute right-0 -top-6 text-[9px] font-black uppercase text-red-500 hover:bg-red-50 px-2 py-1 rounded transition-colors cursor-pointer"
              >
                Batal Edit
              </button>
            )}

            <form
              onSubmit={handleFormSubmit}
              className={`p-4 border-2 rounded-2xl space-y-3 transition-colors ${isEditing ? "bg-blue-50/50 border-blue-200" : "bg-slate-50 border-slate-100"}`}
            >
              <span
                className={`font-black text-[10px] uppercase block ${isEditing ? "text-blue-600" : "text-slate-800"}`}
              >
                {isEditing ? "Mode Edit Data Staf" : "Pendaftaran Staf Baru"}
              </span>

              {staffError && (
                <div className="p-2 bg-red-50 text-red-600 rounded-lg font-bold text-[10px] uppercase">
                  {staffError}
                </div>
              )}

              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">
                  Nama Lengkap Staf
                </label>
                <input
                  type="text"
                  required
                  value={staffName}
                  onChange={(e) => setStaffName(e.target.value)}
                  placeholder="NAMA STAF"
                  className="w-full px-3 py-2 bg-white border-2 border-slate-200 rounded-xl text-xs font-black uppercase focus:outline-none focus:border-orange-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">
                    Hak Otoritas Role
                  </label>
                  <select
                    value={staffRole}
                    onChange={(e) => setStaffRole(e.target.value as any)}
                    className="w-full px-3 py-2 bg-white border-2 border-slate-200 rounded-xl text-xs font-black uppercase focus:outline-none focus:border-orange-400"
                  >
                    <option value="CASHIER">KASIR</option>
                    <option value="WAITER">PELAYAN</option>
                    <option value="ADMIN">ADMINISTRATOR</option>
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">
                    PIN Keamanan
                  </label>
                  <input
                    type="password"
                    required
                    maxLength={6}
                    value={staffPin}
                    onChange={(e) =>
                      setStaffPin(e.target.value.replace(/\D/g, ""))
                    }
                    placeholder="6 ANGKA"
                    className="w-full px-3 py-2 bg-white border-2 border-slate-200 rounded-xl text-xs font-black tracking-widest focus:outline-none focus:border-orange-400"
                  />
                </div>
              </div>

              <div className="flex items-start gap-2 text-[9px] text-slate-500 bg-white p-2 rounded-lg border border-slate-200 leading-relaxed">
                <Info size={12} className="shrink-0 text-blue-500 mt-0.5" />
                <p>
                  Sistem menggunakan ID tersembunyi. PIN dapat diganti atau
                  didaur ulang dari karyawan lama asalkan tidak bentrok dengan
                  staf aktif lainnya.
                </p>
              </div>

              <button
                type="submit"
                className={`w-full text-white py-3 rounded-xl font-black text-[10px] uppercase tracking-widest cursor-pointer transition-all ${isEditing ? "bg-blue-600 hover:bg-blue-700" : "bg-slate-900 hover:bg-slate-800"}`}
              >
                {isEditing ? "Simpan Perubahan" : "Daftarkan Staf"}
              </button>
            </form>
          </div>

          {/* ===================== LIST STAF DENGAN TAB ===================== */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between mb-2">
              <span className="font-black text-[10px] text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <div className="w-1 h-3 bg-orange-500 rounded-full"></div>
                Database Karyawan
              </span>

              <div className="flex bg-slate-100 p-1 rounded-xl">
                <button
                  onClick={() => setActiveTab("ACTIVE")}
                  className={`px-3 py-1 rounded-lg font-black text-[9px] uppercase transition-all cursor-pointer ${
                    activeTab === "ACTIVE"
                      ? "bg-white text-orange-600 shadow-sm"
                      : "text-slate-400 hover:text-slate-600"
                  }`}
                >
                  Aktif
                </button>
                <button
                  onClick={() => setActiveTab("ARCHIVED")}
                  className={`px-3 py-1 rounded-lg font-black text-[9px] uppercase transition-all cursor-pointer ${
                    activeTab === "ARCHIVED"
                      ? "bg-white text-red-600 shadow-sm"
                      : "text-slate-400 hover:text-slate-600"
                  }`}
                >
                  Arsip
                </button>
              </div>
            </div>

            <div className="divide-y border-2 border-slate-100 rounded-2xl bg-white overflow-hidden shadow-sm max-h-300px overflow-y-auto">
              {filteredStaff.length === 0 ? (
                <div className="p-6 text-center text-slate-300 font-black uppercase text-xs">
                  Tidak Ada Staf di Kategori Ini
                </div>
              ) : (
                filteredStaff.map((s: any) => {
                  const isProtectedStaff = isProtected(s.pin);
                  const isActive = s.isActive !== false;

                  return (
                    <div
                      key={s.id || s.pin} // PERBAIKAN: Gunakan s.id sebagai React key
                      className={`p-3.5 flex justify-between items-center text-xs transition-all ${!isActive ? "bg-slate-50" : "hover:bg-slate-50"}`}
                    >
                      <div>
                        <div className="font-black text-slate-900 uppercase flex items-center gap-2 text-sm">
                          <span
                            className={
                              !isActive ? "line-through text-slate-400" : ""
                            }
                          >
                            {s.name}
                          </span>
                          {isProtectedStaff && (
                            <span title="Akun Terlindungi (Admin Utama)">
                              <ShieldAlert
                                size={12}
                                className="text-orange-500"
                              />
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[9px] font-bold text-slate-400 uppercase bg-slate-100 px-1.5 py-0.5 rounded">
                            {s.role}
                          </span>
                          {!isActive && (
                            <span className="text-[8px] font-black text-red-500 uppercase bg-red-100 px-1.5 py-0.5 rounded flex items-center gap-1">
                              <ArchiveRestore size={8} /> ARSIP
                            </span>
                          )}
                        </div>
                        <div className="text-[8px] font-mono text-slate-300 mt-1 uppercase">
                          ID: {s.id}
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        {isProtectedStaff ? (
                          <span className="text-[8px] font-black text-orange-500 bg-orange-100 px-2 py-1 rounded-md uppercase">
                            Admin Utama
                          </span>
                        ) : (
                          <>
                            {activeTab === "ACTIVE" ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleToggleClick(s)}
                                  className="p-1.5 text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                                  title="Nonaktifkan Karyawan"
                                >
                                  <ToggleRight size={18} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleEditClick(s)}
                                  className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer transition-colors"
                                  title="Edit Data"
                                >
                                  <Pencil size={14} />
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleToggleClick(s)}
                                className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-900 text-white hover:bg-slate-800 rounded-md font-black text-[9px] uppercase transition-all cursor-pointer"
                              >
                                <ArchiveRestore size={10} />
                                Pulihkan
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="pt-2 pb-6 text-center">
            <div className="text-[9px] text-slate-400 uppercase tracking-wider">
              ⚡ Hak akses dan ID dienkripsi penuh oleh sistem
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
