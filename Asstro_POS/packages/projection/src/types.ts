export interface InventoryState {
  [sku: string]: {
    stock: number;
    last_updated: string;
  };
}

export interface SalesState {
  total_revenue: number;
  total_transactions: number;
  last_invoice: string | null;
}
