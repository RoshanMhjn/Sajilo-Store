import {
  pgTable,
  text,
  serial,
  timestamp,
  integer,
  jsonb,
  index,
} from "drizzle-orm/pg-core";

export const auditLogsTable = pgTable(
  "audit_logs",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id"),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id"),
    oldValue: jsonb("old_value"),
    newValue: jsonb("new_value"),
    metadata: jsonb("metadata"),
    ipAddress: text("ip_address"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    userIdx: index("audit_logs_user_id_idx").on(table.userId),
    actionIdx: index("audit_logs_action_idx").on(table.action),
    entityIdx: index("audit_logs_entity_idx").on(
      table.entityType,
      table.entityId,
    ),
    createdIdx: index("audit_logs_created_at_idx").on(table.createdAt),
  }),
);

export type AuditLog = typeof auditLogsTable.$inferSelect;
