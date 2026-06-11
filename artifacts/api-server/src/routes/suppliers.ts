import { Router } from "express";
import { db, suppliersTable, purchaseOrdersTable } from "@workspace/db";
import { eq, ilike, count } from "drizzle-orm";

const router = Router();

router.get("/suppliers", async (req, res) => {
  const { search } = req.query;
  let suppliers = await db.select().from(suppliersTable).orderBy(suppliersTable.name);
  if (search) suppliers = suppliers.filter(s => s.name.toLowerCase().includes(String(search).toLowerCase()));
  const orders = await db.select({ supplierId: purchaseOrdersTable.supplierId, count: count() }).from(purchaseOrdersTable).groupBy(purchaseOrdersTable.supplierId);
  const orderMap = new Map(orders.map(o => [o.supplierId, Number(o.count)]));
  res.json(suppliers.map(s => ({ ...s, totalOrders: orderMap.get(s.id) ?? 0 })));
});

router.post("/suppliers", async (req, res) => {
  const { name, contactPerson, email, phone, address, taxNumber } = req.body;
  const [supplier] = await db.insert(suppliersTable).values({ name, contactPerson, email, phone, address, taxNumber }).returning();
  res.status(201).json({ ...supplier, totalOrders: 0 });
});

router.get("/suppliers/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const [supplier] = await db.select().from(suppliersTable).where(eq(suppliersTable.id, id));
  if (!supplier) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...supplier, totalOrders: 0 });
});

router.patch("/suppliers/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const updates: Record<string, unknown> = {};
  for (const f of ["name","contactPerson","email","phone","address","taxNumber","status"]) if (req.body[f] !== undefined) updates[f] = req.body[f];
  const [supplier] = await db.update(suppliersTable).set(updates).where(eq(suppliersTable.id, id)).returning();
  if (!supplier) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...supplier, totalOrders: 0 });
});

router.delete("/suppliers/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  await db.delete(suppliersTable).where(eq(suppliersTable.id, id));
  res.status(204).send();
});

export default router;
