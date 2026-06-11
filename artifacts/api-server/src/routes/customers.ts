import { Router } from "express";
import { db, customersTable, salesTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";

const router = Router();

router.get("/customers", async (req, res) => {
  const { search, page = "1", limit = "20" } = req.query;
  const pageNum = parseInt(String(page));
  const limitNum = Math.min(parseInt(String(limit)), 100);
  const offset = (pageNum - 1) * limitNum;

  let customers = await db.select().from(customersTable).orderBy(customersTable.name);
  if (search) customers = customers.filter(c => c.name.toLowerCase().includes(String(search).toLowerCase()) || (c.phone && c.phone.includes(String(search))));

  const total = customers.length;
  const paged = customers.slice(offset, offset + limitNum);
  res.json({
    items: paged.map(c => ({ ...c, totalPurchases: Number(c.totalPurchases) })),
    total, page: pageNum, limit: limitNum,
  });
});

router.post("/customers", async (req, res) => {
  const { name, email, phone, address } = req.body;
  const [customer] = await db.insert(customersTable).values({ name, email, phone, address }).returning();
  res.status(201).json({ ...customer, totalPurchases: Number(customer.totalPurchases) });
});

router.get("/customers/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const [customer] = await db.select().from(customersTable).where(eq(customersTable.id, id));
  if (!customer) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...customer, totalPurchases: Number(customer.totalPurchases) });
});

router.patch("/customers/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const updates: Record<string, unknown> = {};
  for (const f of ["name","email","phone","address"]) if (req.body[f] !== undefined) updates[f] = req.body[f];
  const [customer] = await db.update(customersTable).set(updates).where(eq(customersTable.id, id)).returning();
  if (!customer) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...customer, totalPurchases: Number(customer.totalPurchases) });
});

router.delete("/customers/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  await db.delete(customersTable).where(eq(customersTable.id, id));
  res.status(204).send();
});

router.get("/customers/:id/purchase-history", async (req, res) => {
  const id = parseInt(req.params.id);
  const sales = await db.select().from(salesTable).where(eq(salesTable.customerId, id)).orderBy(salesTable.createdAt);
  const [customer] = await db.select().from(customersTable).where(eq(customersTable.id, id));
  res.json(sales.map(s => ({ ...s, total: Number(s.total), subtotal: Number(s.subtotal), discount: Number(s.discount), tax: Number(s.tax), amountPaid: Number(s.amountPaid), change: Number(s.change), customerName: customer?.name ?? null, cashierName: null, items: s.items as any[] })).reverse());
});

export default router;
