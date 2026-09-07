import {
  pgTable,
  text,
  serial,
  timestamp,
  integer,
  numeric,
  jsonb,
  index,
} from "drizzle-orm/pg-core";

export const posSessionsTable = pgTable(
  "pos_sessions",
  {
    id: serial("id").primaryKey(),
    cashierId: integer("cashier_id").notNull(),
    openingCash: numeric("opening_cash", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    closingCash: numeric("closing_cash", { precision: 12, scale: 2 }),
    expectedCash: numeric("expected_cash", { precision: 12, scale: 2 }),
    cashSales: numeric("cash_sales", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    difference: numeric("difference", { precision: 12, scale: 2 }),
    status: text("status").notNull().default("open"),
    openedAt: timestamp("opened_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    notes: text("notes"),
  },
  (table) => ({
    cashierIdx: index("pos_sessions_cashier_idx").on(table.cashierId),
    statusIdx: index("pos_sessions_status_idx").on(table.status),
  }),
);

export const suspendedSalesTable = pgTable(
  "suspended_sales",
  {
    id: serial("id").primaryKey(),
    cashierId: integer("cashier_id").notNull(),
    customerId: integer("customer_id"),
    items: jsonb("items").notNull(),
    paymentMethod: text("payment_method").notNull().default("cash"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    cashierIdx: index("suspended_sales_cashier_idx").on(table.cashierId),
  }),
);

export const saleReturnsTable = pgTable(
  "sale_returns",
  {
    id: serial("id").primaryKey(),
    saleId: integer("sale_id").notNull(),
    cashierId: integer("cashier_id"),
    items: jsonb("items").notNull(),
    refundAmount: numeric("refund_amount", {
      precision: 12,
      scale: 2,
    }).notNull(),
    reason: text("reason"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({ saleIdx: index("sale_returns_sale_idx").on(table.saleId) }),
);
