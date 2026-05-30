import { z } from "zod";

export const EventMetadataSchema = z.object({
  seq: z.number().int().positive(),
  prev_hash: z.string(),
  hash: z.string(),
  hlc: z.string(),
  origin_device_id: z.string(),
  operator_id: z.string(),
  branch_id: z.string(),
  signature: z.string(),
});

export const MemberSchema = z.object({
  member_id: z.string(),
  name: z.string(),
  tier: z.enum(["BRONZE", "SILVER", "GOLD", "LEGENDARY"]),
  phone: z.string(),
});

const SystemInitializedPayload = z.object({
  company_name: z.string(),
  branch_id: z.string(),
  region_name: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  admin_name: z.string(),
  admin_pin: z.string(),
});

const EnterpriseSaleItemSchema = z.object({
  product_id: z.string(),
  sku: z.string(),
  product_name: z.string(),
  category_id: z.string(),
  category_name: z.string(),
  qty: z.number(),
  selling_price: z.number(),
  discount_amount: z.number().default(0),
  tax_amount: z.number(),
  service_amount: z.number(),
  line_total: z.number(),
});

const EnterpriseSaleCreatedPayload = z.object({
  identity: z.object({
    transaction_id: z.string(),
    invoice_number: z.string(),
    order_number: z.string(),
    transaction_type: z.enum(["DINE_IN", "TAKEAWAY", "DELIVERY"]),
    transaction_status: z.enum(["OPEN", "PAID", "CANCELLED", "REFUNDED"]),
    business_date: z.string(),
    created_at: z.number(),
    paid_at: z.number(),
    closed_at: z.number(),
  }),
  organization: z.object({
    company_id: z.string(),
    company_name: z.string(),
    branch_id: z.string(),
    branch_name: z.string(),
    outlet_type: z.string(),
    region: z.string(),
  }),
  table_info: z.object({
    table_id: z.string(),
    table_name: z.string(),
  }),
  customer: z.object({
    customer_name: z.string(),
  }),
  items: z.array(EnterpriseSaleItemSchema),
  payment: z.object({
    payment_id: z.string(),
    payment_method: z.string(),
    payment_provider: z.string(),
    payment_reference: z.string(),
    amount_paid: z.number(),
    change_amount: z.number(),
    payment_time: z.number(),
  }),
  staff: z.object({
    waiter_id: z.string(),
    waiter_name: z.string(),
    cashier_id: z.string(),
    cashier_name: z.string(),
    supervisor_id: z.string().optional(),
    shift_id: z.string(),
  }),
  device: z.object({
    device_id: z.string(),
    device_name: z.string(),
    app_version: z.string(),
    sync_version: z.string(),
    local_event_id: z.string(),
  }),
  summary: z.object({
    subtotal: z.number(),
    total_discount: z.number(),
    total_tax: z.number(),
    total_service: z.number(),
    grand_total: z.number(),
  }),
});

const TableAddedPayload = z.object({
  id: z.string(),
  label: z.string(),
  type: z.enum(["MEJA", "LESEHAN"]),
  capacity: z.number(),
  created_by: z.enum(["USER", "BOT"]).default("USER"),
});

const TableOrderItemSchema = z.object({
  id: z.string(),
  sku: z.string(),
  name: z.string(),
  price: z.number(),
  qty: z.number(),
  note: z.string().default(""),
  tableLabel: z.string(),
  status: z.enum(["CRUD", "READ_ONLY"]),
  variant_id: z.string().optional(),
  modifiers: z
    .array(
      z.object({
        modifier_sku: z.string(),
        name: z.string(),
        price: z.number(),
      }),
    )
    .optional(),
});

const TableOrderPlacedPayload = z.object({
  id: z.string(),
  tableLabel: z.string(),
  grandTotal: z.number(),
  isVirtual: z.boolean().default(false),
  parentTableId: z.string().optional(),
  items: z.array(TableOrderItemSchema),
});

const MemberPointEarnedPayload = z.object({
  member_id: z.string(),
  invoice_id: z.string(),
  points_added: z.number(),
  current_total_points: z.number(),
});

const MemberTierUpgradedPayload = z.object({
  member_id: z.string(),
  old_tier: z.string(),
  new_tier: z.string(),
  reason: z.string(),
});

const PriceChangedPayload = z.object({
  sku: z.string(),
  new_price: z.number(),
  effective_at: z.string(),
});

const StockAdjustedPayload = z.object({
  sku: z.string(),
  delta: z.number(),
  reason: z.enum(["SALE", "REFUND", "WASTE", "ADJUSTMENT", "RECEIVED"]),
});

const CategoryAddedPayload = z.object({ id: z.string(), name: z.string() });
const CategoryDeletedPayload = z.object({ id: z.string() });
const ProductPayload = z.object({
  sku: z.string(),
  name: z.string(),
  price: z.number(),
  categoryId: z.string(),
});
const ProductToggledPayload = z.object({
  sku: z.string(),
  isActive: z.boolean(),
});
const ProductSkuOnlyPayload = z.object({ sku: z.string() });

const StaffUpdatedPayload = z.object({
  id: z.string(),
  pin: z.string(),
  name: z.string(),
  role: z.enum(["ADMIN", "CASHIER", "WAITER"]),
  isActive: z.boolean(),
});
const StaffToggledPayload = z.object({ id: z.string(), isActive: z.boolean() });

const OrderVoidedPayload = z.object({
  tableLabel: z.string(),
  sku: z.string(),
  qtyToVoid: z.number(),
  voidType: z.enum(["SALAH_INPUT", "BARANG_KOSONG", "CANCEL"]),
  operator_id: z.string(),
  manager_id: z.string().optional(),
  voidNote: z.string().optional(),
  timestamp: z.number().optional(), // AUDIT TRAIL
});

const OrderRefundedPayload = z.object({
  invoice_id: z.string(),
  items: z.array(z.object({ sku: z.string(), qty: z.number() })),
  refundType: z.enum(["CANCEL", "SOLD_OUT"]),
  operator_id: z.string(),
  manager_id: z.string(),
  refundNote: z.string(),
  timestamp: z.number().optional(), // AUDIT TRAIL
});

const PettyCashIssuedPayload = z.object({
  petty_cash_id: z.string(),
  requester_name: z.string(),
  requester_division: z.string(),
  notes: z.string(),
  amount_requested: z.number(),
  cashier_id: z.string(),
  cashier_name: z.string(),
  timestamp: z.number(),
});

const PettyCashResolvedPayload = z.object({
  petty_cash_id: z.string(),
  amount_returned: z.number(),
  has_receipt: z.boolean(),
  cashier_id: z.string(),
  cashier_name: z.string(),
  timestamp: z.number(),
});

export const AppEventSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("SYSTEM_INITIALIZED"),
    payload: SystemInitializedPayload,
  }),
  z.object({
    type: z.literal("SALE_CREATED"),
    payload: EnterpriseSaleCreatedPayload,
  }),
  z.object({
    type: z.literal("SALE_VOIDED"),
    payload: z.object({ invoice_id: z.string(), reason: z.string() }),
  }),
  z.object({ type: z.literal("ORDER_VOIDED"), payload: OrderVoidedPayload }),
  z.object({
    type: z.literal("ORDER_REFUNDED"),
    payload: OrderRefundedPayload,
  }),

  z.object({
    type: z.literal("PETTY_CASH_ISSUED"),
    payload: PettyCashIssuedPayload,
  }),
  z.object({
    type: z.literal("PETTY_CASH_RESOLVED"),
    payload: PettyCashResolvedPayload,
  }),

  z.object({ type: z.literal("TABLE_ADDED"), payload: TableAddedPayload }),
  z.object({
    type: z.literal("TABLE_DELETED"),
    payload: z.object({ id: z.string(), label: z.string() }),
  }),
  z.object({
    type: z.literal("TABLE_TOGGLED"),
    payload: z.object({ id: z.string(), isActive: z.boolean() }),
  }),
  z.object({
    type: z.literal("TABLE_ORDER_PLACED"),
    payload: TableOrderPlacedPayload,
  }),
  z.object({
    type: z.literal("TABLE_PAYMENT_PROCESSED"),
    payload: z.object({ id: z.string(), tableLabel: z.string() }),
  }),
  z.object({
    type: z.literal("TABLE_CLEARED"),
    payload: z.object({ id: z.string(), tableLabel: z.string() }),
  }),

  z.object({
    type: z.literal("CATEGORY_ADDED"),
    payload: CategoryAddedPayload,
  }),
  z.object({
    type: z.literal("CATEGORY_DELETED"),
    payload: CategoryDeletedPayload,
  }),
  z.object({ type: z.literal("PRODUCT_ADDED"), payload: ProductPayload }),
  z.object({ type: z.literal("PRODUCT_EDITED"), payload: ProductPayload }),
  z.object({
    type: z.literal("PRODUCT_TOGGLED"),
    payload: ProductToggledPayload,
  }),
  z.object({
    type: z.literal("PRODUCT_ARCHIVED"),
    payload: ProductSkuOnlyPayload,
  }),
  z.object({
    type: z.literal("PRODUCT_DELETED"),
    payload: ProductSkuOnlyPayload,
  }),

  z.object({ type: z.literal("STAFF_UPDATED"), payload: StaffUpdatedPayload }),
  z.object({ type: z.literal("STAFF_TOGGLED"), payload: StaffToggledPayload }),

  z.object({ type: z.literal("MEMBER_REGISTERED"), payload: MemberSchema }),
  z.object({
    type: z.literal("MEMBER_POINT_EARNED"),
    payload: MemberPointEarnedPayload,
  }),
  z.object({
    type: z.literal("MEMBER_TIER_UPGRADED"),
    payload: MemberTierUpgradedPayload,
  }),
  z.object({
    type: z.literal("STOCK_ADJUSTED"),
    payload: StockAdjustedPayload,
  }),
  z.object({ type: z.literal("PRICE_CHANGED"), payload: PriceChangedPayload }),

  z.object({
    type: z.literal("SHIFT_OPENED"),
    payload: z.object({ initial_cash: z.number(), operator_id: z.string() }),
  }),
  z.object({
    type: z.literal("SHIFT_CLOSED"),
    payload: z.object({ actual_cash: z.number(), system_cash: z.number() }),
  }),
]);

export const EnvelopedEventSchema = z.intersection(
  AppEventSchema,
  z.object({ metadata: EventMetadataSchema }),
);

export type EnvelopedEvent = z.infer<typeof EnvelopedEventSchema>;
export type AppEvent = z.infer<typeof AppEventSchema>;
