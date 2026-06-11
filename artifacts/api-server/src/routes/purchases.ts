import { Router } from "express";
import { db, purchaseOrdersTable, suppliersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

function generateOrderNumber() {
  return `PO-${Date.now().toString().slice(-8)}`;
}

router.get("/purchases", async (req, res) => {
  const { status, supplierId } = req.query;
  let orders = await db.select().from(purchaseOrdersTable).orderBy(purchaseOrdersTable.createdAt);
  const suppliers = await db.select().from(suppliersTable);
  const sMap = new Map(suppliers.map(s => [s.id, s.name]));
  if (status) orders = orders.filter(o => o.status === status);
  if (supplierId) orders = orders.filter(o => o.supplierId === parseInt(String(supplierId)));
  res.json(orders.map(o => ({ ...o, supplierName: sMap.get(o.supplierId) ?? "", total: Number(o.total), subtotal: Number(o.subtotal), tax: Number(o.tax), items: o.items as any[] })).reverse());
});

router.post("/purchases", async (req, res) => {
  const { supplierId, items, notes, expectedDate } = req.body;
  const itemsArr = items ?? [];
  const subtotal = itemsArr.reduce((s: number, i: any) => s + (i.quantity * i.unitCost), 0);
  const tax = 0;
  const total = subtotal + tax;
  const [order] = await db.insert(purchaseOrdersTable).values({
    orderNumber: generateOrderNumber(),
    supplierId,
    items: itemsArr,
    subtotal: String(subtotal),
    tax: String(tax),
    total: String(total),
    notes,
    expectedDate,
  }).returning();
  const suppliers = await db.select().from(suppliersTable);
  const sMap = new Map(suppliers.map(s => [s.id, s.name]));
  res.status(201).json({ ...order, supplierName: sMap.get(order.supplierId) ?? "", total: Number(order.total), subtotal: Number(order.subtotal), tax: Number(order.tax), items: order.items as any[] });
});

router.get("/purchases/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const [order] = await db.select().from(purchaseOrdersTable).where(eq(purchaseOrdersTable.id, id));
  if (!order) { res.status(404).json({ error: "Not found" }); return; }
  const suppliers = await db.select().from(suppliersTable);
  const sMap = new Map(suppliers.map(s => [s.id, s.name]));
  res.json({ ...order, supplierName: sMap.get(order.supplierId) ?? "", total: Number(order.total), subtotal: Number(order.subtotal), tax: Number(order.tax), items: order.items as any[] });
});

router.patch("/purchases/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const updates: Record<string, unknown> = {};
  if (req.body.supplierId !== undefined) updates.supplierId = req.body.supplierId;
  if (req.body.items !== undefined) {
    updates.items = req.body.items;
    const s = req.body.items.reduce((acc: number, i: any) => acc + (i.quantity * i.unitCost), 0);
    updates.subtotal = String(s);
    updates.total = String(s);
  }
  if (req.body.notes !== undefined) updates.notes = req.body.notes;
  if (req.body.expectedDate !== undefined) updates.expectedDate = req.body.expectedDate;
  const [order] = await db.update(purchaseOrdersTable).set(updates).where(eq(purchaseOrdersTable.id, id)).returning();
  if (!order) { res.status(404).json({ error: "Not found" }); return; }
  const suppliers = await db.select().from(suppliersTable);
  const sMap = new Map(suppliers.map(s => [s.id, s.name]));
  res.json({ ...order, supplierName: sMap.get(order.supplierId) ?? "", total: Number(order.total), subtotal: Number(order.subtotal), tax: Number(order.tax), items: order.items as any[] });
});

router.patch("/purchases/:id/status", async (req, res) => {
  const id = parseInt(req.params.id);
  const { status } = req.body;
  const [order] = await db.update(purchaseOrdersTable).set({ status }).where(eq(purchaseOrdersTable.id, id)).returning();
  if (!order) { res.status(404).json({ error: "Not found" }); return; }
  const suppliers = await db.select().from(suppliersTable);
  const sMap = new Map(suppliers.map(s => [s.id, s.name]));
  res.json({ ...order, supplierName: sMap.get(order.supplierId) ?? "", total: Number(order.total), subtotal: Number(order.subtotal), tax: Number(order.tax), items: order.items as any[] });
});

export default router;
