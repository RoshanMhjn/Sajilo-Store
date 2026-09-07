import { Router } from "express";
import { and, desc, eq, ilike, sql } from "drizzle-orm";
import { auditLogsTable, db, usersTable } from "@workspace/db";
import { requirePermission } from "../middlewares/permissions";

const router = Router();

router.get("/audit-logs", requirePermission("audit-logs"), async (req, res) => {
  const page = Math.max(
    1,
    Number.parseInt(String(req.query.page ?? "1"), 10) || 1,
  );
  const limit = Math.min(
    100,
    Math.max(1, Number.parseInt(String(req.query.limit ?? "20"), 10) || 20),
  );
  const conditions = [] as any[];
  if (req.query.action)
    conditions.push(eq(auditLogsTable.action, String(req.query.action)));
  if (req.query.entityType)
    conditions.push(
      eq(auditLogsTable.entityType, String(req.query.entityType)),
    );
  if (req.query.userId)
    conditions.push(eq(auditLogsTable.userId, Number(req.query.userId)));
  if (req.query.search)
    conditions.push(
      ilike(auditLogsTable.action, `%${String(req.query.search)}%`),
    );
  if (req.query.dateFrom)
    conditions.push(
      sql`${auditLogsTable.createdAt} >= ${new Date(String(req.query.dateFrom))}`,
    );
  if (req.query.dateTo)
    conditions.push(
      sql`${auditLogsTable.createdAt} <= ${new Date(String(req.query.dateTo))}`,
    );
  const where = conditions.length ? and(...conditions) : undefined;
  const [rows, count] = await Promise.all([
    db
      .select({
        log: auditLogsTable,
        userName: usersTable.name,
        userEmail: usersTable.email,
      })
      .from(auditLogsTable)
      .leftJoin(usersTable, eq(auditLogsTable.userId, usersTable.id))
      .where(where)
      .orderBy(desc(auditLogsTable.createdAt))
      .limit(limit)
      .offset((page - 1) * limit),
    db
      .select({ count: sql<number>`count(*)` })
      .from(auditLogsTable)
      .where(where),
  ]);
  res.json({
    items: rows.map(({ log, userName, userEmail }) => ({
      ...log,
      userName,
      userEmail,
    })),
    total: Number(count[0]?.count ?? 0),
    page,
    limit,
  });
});

router.get(
  "/audit-logs/:id",
  requirePermission("audit-logs"),
  async (req, res) => {
    const [row] = await db
      .select({
        log: auditLogsTable,
        userName: usersTable.name,
        userEmail: usersTable.email,
      })
      .from(auditLogsTable)
      .leftJoin(usersTable, eq(auditLogsTable.userId, usersTable.id))
      .where(eq(auditLogsTable.id, Number(req.params.id)));
    if (!row) {
      res.status(404).json({ error: "Audit log not found" });
      return;
    }
    res.json({ ...row.log, userName: row.userName, userEmail: row.userEmail });
  },
);

export default router;
