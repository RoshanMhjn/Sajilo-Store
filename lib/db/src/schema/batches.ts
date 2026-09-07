import {
  pgTable,
  text,
  serial,
  timestamp,
  integer,
  numeric,
  date,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const productBatchesTable = pgTable(
  "product_batches",
  {
    id: serial("id").primaryKey(),
    productId: integer("product_id").notNull(),
    supplierId: integer("supplier_id"),
    batchNumber: text("batch_number").notNull(),
    manufacturingDate: date("manufacturing_date", { mode: "string" }),
    expiryDate: date("expiry_date", { mode: "string" }),
    quantity: numeric("quantity", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    costPrice: numeric("cost_price", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    enabled: integer("enabled").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    productBatchUnique: uniqueIndex("product_batches_product_batch_unique").on(
      table.productId,
      table.batchNumber,
    ),
    productExpiryIdx: index("product_batches_product_expiry_idx").on(
      table.productId,
      table.expiryDate,
    ),
    expiryIdx: index("product_batches_expiry_idx").on(table.expiryDate),
  }),
);

export type ProductBatch = typeof productBatchesTable.$inferSelect;
