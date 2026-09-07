import { Router } from "express";
import {
  db,
  purchaseOrdersTable,
  suppliersTable,
  inventoryTable,
  inventoryMovementsTable,
  productBatchesTable,
} from "@workspace/db";
import { eq } from "drizzle-orm";
import { auditLog, getRequestUserId } from "../lib/audit";

const router = Router();

function generateOrderNumber() {
  return `PO-${Date.now().toString().slice(-8)}`;
}

router.get("/purchases", async (req, res) => {
  const { status, supplierId } = req.query;
  let orders = await db
    .select()
    .from(purchaseOrdersTable)
    .orderBy(purchaseOrdersTable.createdAt);
  const suppliers = await db.select().from(suppliersTable);
  const sMap = new Map(suppliers.map((s) => [s.id, s.name]));
  if (status) orders = orders.filter((o) => o.status === status);
  if (supplierId)
    orders = orders.filter(
      (o) => o.supplierId === parseInt(String(supplierId)),
    );
  res.json(
    orders
      .map((o) => ({
        ...o,
        supplierName: sMap.get(o.supplierId) ?? "",
        total: Number(o.total),
        subtotal: Number(o.subtotal),
        tax: Number(o.tax),
        items: o.items as any[],
      }))
      .reverse(),
  );
});

router.post("/purchases", async (req, res) => {
  const { supplierId, items, notes, expectedDate } = req.body;
  const itemsArr = items ?? [];
  const subtotal = itemsArr.reduce(
    (s: number, i: any) => s + i.quantity * i.unitCost,
    0,
  );
  const tax = 0;
  const total = subtotal + tax;
  const [order] = await db
    .insert(purchaseOrdersTable)
    .values({
      orderNumber: generateOrderNumber(),
      supplierId,
      items: itemsArr,
      subtotal: String(subtotal),
      tax: String(tax),
      total: String(total),
      notes,
      expectedDate,
    })
    .returning();
  const suppliers = await db.select().from(suppliersTable);
  const sMap = new Map(suppliers.map((s) => [s.id, s.name]));
  res
    .status(201)
    .json({
      ...order,
      supplierName: sMap.get(order.supplierId) ?? "",
      total: Number(order.total),
      subtotal: Number(order.subtotal),
      tax: Number(order.tax),
      items: order.items as any[],
    });
});

router.get("/purchases/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const [order] = await db
    .select()
    .from(purchaseOrdersTable)
    .where(eq(purchaseOrdersTable.id, id));
  if (!order) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const suppliers = await db.select().from(suppliersTable);
  const sMap = new Map(suppliers.map((s) => [s.id, s.name]));
  res.json({
    ...order,
    supplierName: sMap.get(order.supplierId) ?? "",
    total: Number(order.total),
    subtotal: Number(order.subtotal),
    tax: Number(order.tax),
    items: order.items as any[],
  });
});

router.patch("/purchases/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const updates: Record<string, unknown> = {};
  if (req.body.supplierId !== undefined)
    updates.supplierId = req.body.supplierId;
  if (req.body.items !== undefined) {
    updates.items = req.body.items;
    const s = req.body.items.reduce(
      (acc: number, i: any) => acc + i.quantity * i.unitCost,
      0,
    );
    updates.subtotal = String(s);
    updates.total = String(s);
  }
  if (req.body.notes !== undefined) updates.notes = req.body.notes;
  if (req.body.expectedDate !== undefined)
    updates.expectedDate = req.body.expectedDate;
  const [order] = await db
    .update(purchaseOrdersTable)
    .set(updates)
    .where(eq(purchaseOrdersTable.id, id))
    .returning();
  if (!order) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const suppliers = await db.select().from(suppliersTable);
  const sMap = new Map(suppliers.map((s) => [s.id, s.name]));
  res.json({
    ...order,
    supplierName: sMap.get(order.supplierId) ?? "",
    total: Number(order.total),
    subtotal: Number(order.subtotal),
    tax: Number(order.tax),
    items: order.items as any[],
  });
});

router.patch("/purchases/:id/status", async (req, res) => {
  const id = parseInt(req.params.id);
  const { status } = req.body;
  const [existing] = await db
    .select()
    .from(purchaseOrdersTable)
    .where(eq(purchaseOrdersTable.id, id));
  if (!existing) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  if (!["draft", "ordered", "received", "cancelled"].includes(status)) {
    res.status(400).json({ error: "Invalid purchase status" });
    return;
  }
  const [order] = await db.transaction(async (tx) => {
    const [updated] = await tx
      .update(purchaseOrdersTable)
      .set({ status })
      .where(eq(purchaseOrdersTable.id, id))
      .returning();
    if (status === "received" && existing.status !== "received") {
      for (const item of existing.items as any[]) {
        const productId = Number(item.productId);
        const quantity = Number(item.quantity);
        if (
          !Number.isInteger(productId) ||
          !Number.isFinite(quantity) ||
          quantity <= 0
        )
          throw new Error("Invalid purchase item");
        const [inventory] = await tx
          .select()
          .from(inventoryTable)
          .where(eq(inventoryTable.productId, productId));
        if (inventory)
          await tx
            .update(inventoryTable)
            .set({ quantity: String(Number(inventory.quantity) + quantity) })
            .where(eq(inventoryTable.id, inventory.id));
        else
          await tx
            .insert(inventoryTable)
            .values({ productId, quantity: String(quantity) });
        await tx
          .insert(inventoryMovementsTable)
          .values({
            productId,
            type: "stock_in",
            quantity: String(quantity),
            reference: existing.orderNumber,
            notes: "Purchase received",
            createdBy: getRequestUserId(req)?.toString() ?? "system",
          });
        if (item.batchNumber)
          await tx
            .insert(productBatchesTable)
            .values({
              productId,
              batchNumber: String(item.batchNumber),
              quantity: String(quantity),
              costPrice: String(item.unitCost ?? 0),
              expiryDate: item.expiryDate,
            });
      }
    }
    return [updated];
  });
  await auditLog({
    req,
    action: status === "received" ? "received" : "status_changed",
    entityType: "purchase_order",
    entityId: id,
    oldValue: existing,
    newValue: order,
  });
  if (!order) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const suppliers = await db.select().from(suppliersTable);
  const sMap = new Map(suppliers.map((s) => [s.id, s.name]));
  res.json({
    ...order,
    supplierName: sMap.get(order.supplierId) ?? "",
    total: Number(order.total),
    subtotal: Number(order.subtotal),
    tax: Number(order.tax),
    items: order.items as any[],
  });
});

export default router;
