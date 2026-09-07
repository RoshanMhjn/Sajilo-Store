import { Router } from "express";
import { and, eq, gte, sql } from "drizzle-orm";
import {
  db,
  posSessionsTable,
  salesTable,
  suspendedSalesTable,
} from "@workspace/db";
import { auditLog, getRequestUserId } from "../lib/audit";
import { requirePermission } from "../middlewares/permissions";

const router = Router();

router.post("/pos/sessions", requirePermission("pos"), async (req, res) => {
  const cashierId = getRequestUserId(req);
  if (!cashierId) {
    res.status(401).json({ error: "Authenticated cashier required" });
    return;
  }
  const [open] = await db
    .select()
    .from(posSessionsTable)
    .where(
      and(
        eq(posSessionsTable.cashierId, cashierId),
        eq(posSessionsTable.status, "open"),
      ),
    );
  if (open) {
    res
      .status(409)
      .json({ error: "Cashier session already open", session: open });
    return;
  }
  const openingCash = Number(req.body.openingCash);
  if (!Number.isFinite(openingCash) || openingCash < 0) {
    res
      .status(400)
      .json({ error: "Opening cash must be a non-negative number" });
    return;
  }
  const [session] = await db
    .insert(posSessionsTable)
    .values({ cashierId, openingCash: openingCash.toFixed(2) })
    .returning();
  await auditLog({
    req,
    action: "opened",
    entityType: "pos_session",
    entityId: session.id,
    newValue: session,
  });
  res.status(201).json(session);
});

router.get(
  "/pos/sessions/current",
  requirePermission("pos"),
  async (req, res) => {
    const cashierId = getRequestUserId(req);
    const [session] = cashierId
      ? await db
          .select()
          .from(posSessionsTable)
          .where(
            and(
              eq(posSessionsTable.cashierId, cashierId),
              eq(posSessionsTable.status, "open"),
            ),
          )
      : [];
    if (!session) {
      res.json(null);
      return;
    }
    const [cash] = await db
      .select({ total: sql<string>`coalesce(sum(${salesTable.total}), 0)` })
      .from(salesTable)
      .where(
        and(
          eq(salesTable.cashierId, cashierId!),
          eq(salesTable.paymentMethod, "cash"),
          eq(salesTable.status, "completed"),
          gte(salesTable.createdAt, session.openedAt),
        ),
      );
    res.json({
      ...session,
      cashSales: Number(cash?.total ?? 0),
      expectedCash: Number(session.openingCash) + Number(cash?.total ?? 0),
    });
  },
);

router.post(
  "/pos/sessions/:id/close",
  requirePermission("pos"),
  async (req, res) => {
    const cashierId = getRequestUserId(req);
    const [session] = await db
      .select()
      .from(posSessionsTable)
      .where(
        and(
          eq(posSessionsTable.id, Number(req.params.id)),
          eq(posSessionsTable.cashierId, cashierId ?? -1),
          eq(posSessionsTable.status, "open"),
        ),
      );
    if (!session) {
      res.status(404).json({ error: "Open session not found" });
      return;
    }
    const actualCash = Number(req.body.closingCash);
    if (!Number.isFinite(actualCash) || actualCash < 0) {
      res
        .status(400)
        .json({ error: "Closing cash must be a non-negative number" });
      return;
    }
    const [cash] = await db
      .select({ total: sql<string>`coalesce(sum(${salesTable.total}), 0)` })
      .from(salesTable)
      .where(
        and(
          eq(salesTable.cashierId, cashierId!),
          eq(salesTable.paymentMethod, "cash"),
          eq(salesTable.status, "completed"),
          gte(salesTable.createdAt, session.openedAt),
        ),
      );
    const cashSales = Number(cash?.total ?? 0);
    const expectedCash = Number(session.openingCash) + cashSales;
    const [closed] = await db
      .update(posSessionsTable)
      .set({
        closingCash: actualCash.toFixed(2),
        expectedCash: expectedCash.toFixed(2),
        cashSales: cashSales.toFixed(2),
        difference: (actualCash - expectedCash).toFixed(2),
        status: "closed",
        closedAt: new Date(),
        notes: req.body.notes,
      })
      .where(eq(posSessionsTable.id, session.id))
      .returning();
    await auditLog({
      req,
      action: "closed",
      entityType: "pos_session",
      entityId: session.id,
      oldValue: session,
      newValue: closed,
    });
    res.json(closed);
  },
);

router.get(
  "/pos/suspended-sales",
  requirePermission("pos"),
  async (req, res) => {
    const cashierId = getRequestUserId(req);
    const rows = cashierId
      ? await db
          .select()
          .from(suspendedSalesTable)
          .where(eq(suspendedSalesTable.cashierId, cashierId))
      : [];
    res.json(rows);
  },
);

router.post(
  "/pos/suspended-sales",
  requirePermission("pos"),
  async (req, res) => {
    const cashierId = getRequestUserId(req);
    if (
      !cashierId ||
      !Array.isArray(req.body.items) ||
      !req.body.items.length
    ) {
      res.status(400).json({ error: "Cashier and cart items are required" });
      return;
    }
    const [held] = await db
      .insert(suspendedSalesTable)
      .values({
        cashierId,
        customerId: req.body.customerId ?? null,
        items: req.body.items,
        paymentMethod: req.body.paymentMethod ?? "cash",
        notes: req.body.notes,
      })
      .returning();
    await auditLog({
      req,
      action: "suspended",
      entityType: "suspended_sale",
      entityId: held.id,
      newValue: held,
    });
    res.status(201).json(held);
  },
);

router.delete(
  "/pos/suspended-sales/:id",
  requirePermission("pos"),
  async (req, res) => {
    const cashierId = getRequestUserId(req);
    const [deleted] = await db
      .delete(suspendedSalesTable)
      .where(
        and(
          eq(suspendedSalesTable.id, Number(req.params.id)),
          eq(suspendedSalesTable.cashierId, cashierId ?? -1),
        ),
      )
      .returning();
    if (!deleted) {
      res.status(404).json({ error: "Suspended sale not found" });
      return;
    }
    await auditLog({
      req,
      action: "deleted",
      entityType: "suspended_sale",
      entityId: deleted.id,
      oldValue: deleted,
    });
    res.status(204).send();
  },
);

export default router;
