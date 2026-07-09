import React, { useState, useEffect, useRef } from "react";
import { useWms } from "../../core/WmsProvider";
import {
  ShoppingCart,
  PackagePlus,
  ArrowLeftRight,
  Receipt,
  CreditCard,
  Box,
  Truck,
  ClipboardCheck,
  BarChart3,
  GitMerge,
  Mail,
  ChevronLeft,
  ChevronRight,
  GripVertical,
  Settings,
  Brain,
  Tags,
} from "lucide-react";

interface MenuProps {
  activeMenu: string;
  setActiveMenu: (menuId: string) => void;
}

export const PusatSidebar: React.FC<MenuProps> = ({
  activeMenu,
  setActiveMenu,
}) => {
  const { currentOperator } = useWms();
  const userRole = currentOperator?.role?.toUpperCase() || "STAFF";
  const isManagerOrAdmin = userRole === "SUPERADMIN" || userRole === "MANAGER";

  // State untuk lebar sidebar (default 260px)
  const [width, setWidth] = useState<number>(() => {
    const saved = localStorage.getItem("pusatSidebarWidth");
    return saved ? Number(saved) : 260;
  });

  // State untuk mode (full / icons-only)
  const [isIconOnly, setIsIconOnly] = useState<boolean>(() => {
    const saved = localStorage.getItem("pusatSidebarMode");
    return saved === "icons-only";
  });

  // Ref untuk drag
  const sidebarRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  // Fungsi drag
  const startDrag = (e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    document.addEventListener("mousemove", onDrag);
    document.addEventListener("mouseup", stopDrag);
  };

  const onDrag = (e: MouseEvent) => {
    if (!isDragging.current) return;
    const newWidth =
      e.clientX - (sidebarRef.current?.getBoundingClientRect().left || 0);
    const minWidth = isIconOnly ? 60 : 200;
    const clamped = Math.min(Math.max(newWidth, minWidth), 400);
    setWidth(clamped);
  };

  const stopDrag = () => {
    isDragging.current = false;
    document.removeEventListener("mousemove", onDrag);
    document.removeEventListener("mouseup", stopDrag);
  };

  // Simpan lebar ke localStorage saat berubah
  useEffect(() => {
    localStorage.setItem("pusatSidebarWidth", String(width));
  }, [width]);

  // Simpan mode ke localStorage
  useEffect(() => {
    localStorage.setItem(
      "pusatSidebarMode",
      isIconOnly ? "icons-only" : "full",
    );
  }, [isIconOnly]);

  // Toggle mode
  const toggleMode = () => {
    setIsIconOnly((prev) => !prev);
    if (!isIconOnly) {
      setWidth(72); // icon-only width
    } else {
      setWidth(240); // full width
    }
  };

  // Daftar menu
  const menus = [

    {
      id: "master_company",
      label: "Master Perusahaan",
      icon: Building2,
      group: "Master Organisasi",
      visible: isManagerOrAdmin,
    },
    {
      id: "master_region",
      label: "Master Region",
      icon: Map,
      group: "Master Organisasi",
      visible: isManagerOrAdmin,
    },
    {
      id: "master_branch",
      label: "Master Outlet",
      icon: Store,
      group: "Master Organisasi",
      visible: isManagerOrAdmin,
    },

    {
      id: "po",
      label: "Purchase Order",
      icon: ShoppingCart,
      group: "Transaksi",
      visible: true,
    },
    {
      id: "receiving",
      label: "Barang Masuk",
      icon: PackagePlus,
      group: "Transaksi",
      visible: true,
    },
    {
      id: "return",
      label: "Retur Barang",
      icon: ArrowLeftRight,
      group: "Transaksi",
      visible: true,
    },
    {
      id: "ar_outlet",
      label: "Piutang Outlet",
      icon: Receipt,
      group: "Keuangan",
      visible: true,
    },
    {
      id: "ap_vendor",
      label: "Hutang Vendor",
      icon: CreditCard,
      group: "Keuangan",
      visible: true,
    },
    {
      id: "E_wallet",
      label: "E-Wallet",
      icon: CreditCard,
      group: "Keuangan",
      visible: true,
    },
    {
      id: "COA",
      label: "Chart of Accounts",
      icon: Brain,
      group: "Keuangan",
      visible: true,
    },
    {
      id: "master_product",
      label: "Master Produk",
      icon: Box,
      group: "Master Data",
      visible: true,
    },
    {
      id: "master_category",
      label: "Master Kategori (COA)",
      icon: Tags,
      group: "Master Data",
      visible: true,
    },
    {
      id: "master_vendor",
      label: "Manajemen Vendor",
      icon: Truck,
      group: "Master Data",
      visible: true,
    },
    {
      id: "stock_opname",
      label: "Stok Opname",
      icon: ClipboardCheck,
      group: "Inventory",
      visible: true,
    },
    {
      id: "product_merge",
      label: "Merge Item Naming",
      icon: GitMerge,
      group: "Administrator",
      visible: isManagerOrAdmin,
    },
    {
      id: "mail_hub",
      label: "Mail & Komunikasi",
      icon: Mail,
      group: "Administrator",
      visible: true,
    },
    {
      id: "reports",
      label: "Laporan & Analisis",
      icon: BarChart3,
      group: "Analisis",
      visible: isManagerOrAdmin,
    },
  ];

  const visibleMenus = menus.filter((m) => m.visible);
  const menuGroups = Array.from(new Set(visibleMenus.map((m) => m.group)));

  // Ukuran ikon berdasarkan mode
  const iconSize = isIconOnly ? 20 : 20;

  return (
    <div
      ref={sidebarRef}
      className="relative h-full bg-white border-r border-slate-200 flex flex-col shadow-sm transition-all duration-200"
      style={{ width: `${width}px`, minWidth: isIconOnly ? "72px" : "200px" }}
    >
      {/* Header Sidebar dengan logo dan toggle */}
      <div className="flex items-center justify-between h-14 px-3 border-b border-slate-100 shrink-0">
        {!isIconOnly && (
          <span className="font-bold text-xs text-slate-700 uppercase tracking-wider">
            Menu
          </span>
        )}
        <button
          onClick={toggleMode}
          className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-500"
          title={isIconOnly ? "Tampilkan teks" : "Sembunyikan teks"}
        >
          {isIconOnly ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {/* Menu Items */}
      <div className="flex-1 overflow-y-auto py-4 px-2 custom-scrollbar">
        {menuGroups.map((groupName) => (
          <div key={groupName} className="mb-4">
            {!isIconOnly && (
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-2">
                {groupName}
              </h3>
            )}
            <div className="flex flex-col gap-1">
              {visibleMenus
                .filter((m) => m.group === groupName)
                .map((menu) => {
                  const Icon = menu.icon;
                  const isActive = activeMenu === menu.id;

                  return (
                    <button
                      key={menu.id}
                      onClick={() => setActiveMenu(menu.id)}
                      className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl font-bold text-xs uppercase tracking-wide transition-all ${
                        isActive
                          ? "bg-blue-50 text-blue-700 border border-blue-200 shadow-sm"
                          : "text-slate-600 hover:bg-slate-50 hover:text-blue-600 border border-transparent"
                      } ${isIconOnly ? "justify-center" : "justify-start"}`}
                      title={isIconOnly ? menu.label : ""}
                    >
                      <Icon
                        size={iconSize}
                        className={`shrink-0 ${
                          isActive ? "text-blue-600" : "text-slate-400"
                        }`}
                      />
                      {!isIconOnly && (
                        <span className="text-left flex-1 truncate">
                          {menu.label}
                        </span>
                      )}
                      {isActive && !isIconOnly && (
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0" />
                      )}
                    </button>
                  );
                })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer (opsional) */}
      <div className="border-t border-slate-100 p-2 shrink-0">
        <button
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-slate-500 hover:bg-slate-50 transition-colors ${
            isIconOnly ? "justify-center" : "justify-start"
          }`}
          title={isIconOnly ? "Pengaturan" : ""}
        >
          <Settings size={isIconOnly ? 24 : 18} />
          {!isIconOnly && <span>Pengaturan</span>}
        </button>
      </div>

      {/* Handle drag (garis vertikal) */}
      <div
        className="absolute top-0 right-0 w-1.5 h-full cursor-col-resize group hover:bg-blue-400 transition-colors"
        onMouseDown={startDrag}
        style={{ zIndex: 10 }}
      >
        <div className="w-full h-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <GripVertical size={14} className="text-blue-500" />
        </div>
      </div>
    </div>
  );
};
