import { LedgerEvent } from "../../ledger/src/engine";
import { InventoryState, SalesState } from "./types";

export interface StaffMember {
  id: string;
  name: string;
  role: "ADMIN" | "CASHIER" | "WAITER";
  pin: string;
  isActive: boolean;
}

export interface TableMaster {
  id: string;
  label: string;
  type: "MEJA" | "LESEHAN";
  capacity: number;
  status: "KOSONG" | "TERISI" | "REQUEST_BAYAR" | "PAID";
  currentBill: number;
  isActive: boolean;
  savedItems?: any[];
}

export interface CategoryMaster {
  id: string;
  name: string;
}

export interface ProductMaster {
  sku: string;
  name: string;
  price: number;
  categoryId: string;
  isActive: boolean;
  isArchived: boolean;
}

export class ProjectionEngine {
  private lastProcessedSeq: number = 0;

  private isInitialized: boolean = false;
  private companyName: string = "";
  private branchId: string = "";
  private regionName: string = "";
  private latitude: number = 0;
  private longitude: number = 0;
  private staffList: StaffMember[] = [];
  private tables: TableMaster[] = [];
  private categories: CategoryMaster[] = [];
  private products: ProductMaster[] = [];
  private inventory: InventoryState = {};
  private sales: SalesState = {
    total_revenue: 0,
    total_transactions: 0,
    last_invoice: null,
  };
  private activeOperator: StaffMember | null = null;

  private handleEvent(event: LedgerEvent) {
    switch (event.type) {
      case "SYSTEM_INITIALIZED": {
        const payload = event.payload as any;
        this.isInitialized = true;
        this.companyName = payload.company_name || "";
        this.branchId = payload.branch_id || "";
        this.regionName = payload.region_name || "";
        this.latitude = Number(payload.latitude) || 0;
        this.longitude = Number(payload.longitude) || 0;
        this.staffList = [
          {
            id: "ADMIN-000",
            name: payload.admin_name || "",
            role: "ADMIN",
            pin: payload.admin_pin || "",
            isActive: true,
          },
        ];
        break;
      }

      case "MEMBER_REGISTERED": {
        const payload = event.payload as any;
        if (payload.phone && payload.phone.includes(":")) {
          const parts = payload.phone.split(":");
          const extractedRole = parts[0] as "ADMIN" | "CASHIER" | "WAITER";
          const extractedPin = parts[1];
          this.staffList.push({
            id: payload.member_id,
            name: payload.name || "STAF BARU",
            role: extractedRole,
            pin: extractedPin,
            isActive: true,
          });
        }
        break;
      }

      case "TABLE_ADDED": {
        const payload = event.payload as any;
        if (
          !this.tables.some(
            (t) =>
              t.id === payload.id || t.label === payload.label.toUpperCase(),
          )
        ) {
          this.tables.push({
            id: payload.id,
            label: payload.label.toUpperCase(),
            type: payload.type as "MEJA" | "LESEHAN",
            capacity: Number(payload.capacity) || 2,
            status: "KOSONG",
            currentBill: 0,
            isActive: true,
          });
        }
        break;
      }

      case "TABLE_TOGGLED": {
        const payload = event.payload as any;
        this.tables = this.tables.map((t) =>
          t.id === payload.id ? { ...t, isActive: payload.isActive } : t,
        );
        break;
      }

      case "TABLE_ORDER_PLACED": {
        const payload = event.payload as any;
        const labelUpper = payload.tableLabel.toUpperCase();
        const tableIndex = this.tables.findIndex((t) => t.label === labelUpper);

        if (tableIndex >= 0) {
          this.tables[tableIndex] = {
            ...this.tables[tableIndex],
            status: "TERISI" as const,
            currentBill: Number(payload.grandTotal) || 0,
            savedItems: payload.items || [],
          };
        } else {
          this.tables.push({
            id: payload.id || `V-ID-${labelUpper}-${Date.now()}`,
            label: labelUpper,
            type: "MEJA" as const,
            capacity: 4,
            status: "TERISI" as const,
            currentBill: Number(payload.grandTotal) || 0,
            savedItems: payload.items || [],
            isActive: true,
          });
        }
        break;
      }

      case "TABLE_PAYMENT_PROCESSED": {
        const payload = event.payload as any;
        this.tables = this.tables.map((t) =>
          t.label === payload.tableLabel.toUpperCase()
            ? { ...t, status: "PAID" as const }
            : t,
        );
        break;
      }

      case "TABLE_CLEARED": {
        const payload = event.payload as any;
        this.tables = this.tables
          .map((t) =>
            t.label === payload.tableLabel.toUpperCase()
              ? {
                  ...t,
                  status: "KOSONG" as const,
                  currentBill: 0,
                  savedItems: [],
                }
              : t,
          )
          .filter((t) => t.status !== "KOSONG" || t.id.startsWith("MEJA-ID"));
        break;
      }

      // ==============================================================
      // PERBAIKAN BUG: ORDER_VOIDED
      // ==============================================================
      case "ORDER_VOIDED": {
        const payload = event.payload as any;
        const labelUpper = payload.tableLabel.toUpperCase();

        this.tables = this.tables
          .map((t) => {
            if (t.label === labelUpper && t.savedItems) {
              let itemPrice = 0;
              const updatedItems = t.savedItems
                .map((item: any) => {
                  if (item.sku === payload.sku) {
                    itemPrice = item.price;
                    return {
                      ...item,
                      qty: Math.max(0, item.qty - payload.qtyToVoid),
                    };
                  }
                  return item;
                })
                .filter((item: any) => item.qty > 0);

              // PERBAIKAN KRUSIAL:
              // Jika item di meja sudah habis dibatalkan, paksa currentBill menjadi 0 (membuang hantu pajak)
              // dan paksa status menjadi KOSONG.
              const newBill =
                updatedItems.length === 0
                  ? 0
                  : Math.max(0, t.currentBill - itemPrice * payload.qtyToVoid);
              const newStatus = updatedItems.length === 0 ? "KOSONG" : t.status;

              return {
                ...t,
                savedItems: updatedItems,
                currentBill: newBill,
                status: newStatus,
              };
            }
            return t;
          })
          // PERBAIKAN KRUSIAL 2:
          // Hancurkan meja Virtual / Take Away yang sudah KOSONG akibat Void.
          .filter((t) => t.status !== "KOSONG" || t.id.startsWith("MEJA-ID"));

        // Mematikan produk jika alasan Void adalah "BARANG_KOSONG"
        if (payload.voidType === "BARANG_KOSONG") {
          this.products = this.products.map((p) =>
            p.sku === payload.sku ? { ...p, isActive: false } : p,
          );
        }
        break;
      }

      case "CATEGORY_ADDED": {
        const payload = event.payload as any;
        if (!this.categories.some((c) => c.id === payload.id)) {
          this.categories.push({
            id: payload.id,
            name: payload.name.toUpperCase(),
          });
        }
        break;
      }

      case "CATEGORY_DELETED": {
        const payload = event.payload as any;
        this.categories = this.categories.filter((c) => c.id !== payload.id);
        break;
      }

      case "PRODUCT_ADDED": {
        const payload = event.payload as any;
        const index = this.products.findIndex((p) => p.sku === payload.sku);
        if (index >= 0) {
          this.products[index] = {
            sku: payload.sku,
            name: payload.name.toUpperCase(),
            price: Number(payload.price) || 0,
            categoryId: payload.categoryId,
            isActive: true,
            isArchived: false,
          };
        } else {
          this.products.push({
            sku: payload.sku,
            name: payload.name.toUpperCase(),
            price: Number(payload.price) || 0,
            categoryId: payload.categoryId,
            isActive: true,
            isArchived: false,
          });
        }
        break;
      }

      case "PRODUCT_EDITED": {
        const payload = event.payload as any;
        this.products = this.products.map((p) =>
          p.sku === payload.sku
            ? {
                ...p,
                name: payload.name.toUpperCase(),
                price: Number(payload.price) || 0,
                categoryId: payload.categoryId,
              }
            : p,
        );
        break;
      }

      case "PRODUCT_TOGGLED": {
        const payload = event.payload as any;
        this.products = this.products.map((p) =>
          p.sku === payload.sku ? { ...p, isActive: payload.isActive } : p,
        );
        break;
      }

      case "PRODUCT_ARCHIVED": {
        const payload = event.payload as any;
        this.products = this.products.map((p) =>
          p.sku === payload.sku
            ? { ...p, isArchived: true, isActive: false }
            : p,
        );
        break;
      }

      case "PRODUCT_DELETED": {
        const payload = event.payload as any;
        this.products = this.products.map((p) =>
          p.sku === payload.sku
            ? { ...p, isArchived: true, isActive: false }
            : p,
        );
        break;
      }

      case "STAFF_UPDATED": {
        const payload = event.payload as any;
        this.staffList = this.staffList.map((s) =>
          s.id === payload.id
            ? {
                ...s,
                name: payload.name.toUpperCase(),
                role: payload.role,
                pin: payload.pin,
                isActive: payload.isActive,
              }
            : s,
        );
        break;
      }

      case "STAFF_TOGGLED": {
        const payload = event.payload as any;
        this.staffList = this.staffList.map((s) =>
          s.id === payload.id ? { ...s, isActive: payload.isActive } : s,
        );
        break;
      }

      case "SHIFT_OPENED": {
        const payload = event.payload as any;
        if (payload.operator_id) {
          const found = this.staffList.find(
            (s) => s.id === payload.operator_id,
          );
          if (found) {
            this.activeOperator = found;
          }
        }
        break;
      }

      case "SHIFT_CLOSED": {
        this.activeOperator = null;
        break;
      }

      case "SALE_CREATED": {
        const payload = event.payload as any;
        this.sales.total_revenue += payload.grand_total || 0;
        this.sales.total_transactions += 1;
        this.sales.last_invoice = payload.invoice_id;

        if (payload.items) {
          payload.items.forEach((item: any) => {
            this.updateStock(item.sku, -(item.qty || 0), event.hlc);
          });
        }
        break;
      }

      case "STOCK_ADJUSTED": {
        const payload = event.payload as any;
        this.updateStock(payload.sku, payload.delta, event.hlc);
        break;
      }

      default:
        break;
    }
  }

  private updateStock(sku: string, delta: number, hlc: string) {
    if (!this.inventory[sku]) {
      this.inventory[sku] = { stock: 0, last_updated: hlc };
    }
    this.inventory[sku].stock += delta;
    this.inventory[sku].last_updated = hlc;
  }

  private hardResetState() {
    this.isInitialized = false;
    this.companyName = "";
    this.branchId = "";
    this.regionName = "";
    this.latitude = 0;
    this.longitude = 0;
    this.staffList = [];
    this.tables = [];
    this.categories = [];
    this.products = [];
    this.inventory = {};
    this.sales = {
      total_revenue: 0,
      total_transactions: 0,
      last_invoice: null,
    };
    this.activeOperator = null;
    this.lastProcessedSeq = 0;
  }

  public async runProjection(events: LedgerEvent[]) {
    if (events.length === 0) return this.getState();

    if (events[events.length - 1].seq < this.lastProcessedSeq) {
      this.hardResetState();
    }

    for (const event of events) {
      if (event.seq > this.lastProcessedSeq) {
        this.handleEvent(event);
        this.lastProcessedSeq = event.seq;
      }
    }

    return this.getState();
  }

  public getInitialState() {
    return {
      isInitialized: false,
      companyName: "",
      branchId: "",
      regionName: "",
      latitude: 0,
      longitude: 0,
      staffList: [],
      tables: [],
      categories: [],
      products: [],
      inventory: {},
      sales: { total_revenue: 0, total_transactions: 0, last_invoice: null },
      activeOperator: null,
    };
  }

  public getState() {
    return {
      isInitialized: this.isInitialized,
      companyName: this.companyName,
      branchId: this.branchId,
      regionName: this.regionName,
      latitude: this.latitude,
      longitude: this.longitude,
      staffList: [...this.staffList],
      tables: [...this.tables],
      categories: [...this.categories],
      products: [...this.products],
      inventory: { ...this.inventory },
      sales: { ...this.sales },
      activeOperator: this.activeOperator ? { ...this.activeOperator } : null,
    };
  }
}
