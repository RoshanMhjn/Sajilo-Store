import { Router } from "express";
import { db, expensesTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";

const router = Router();

router.get("/expenses", async (req, res) => {
  const { category, dateFrom, dateTo } = req.query;
  let expenses = await db.select().from(expensesTable).orderBy(expensesTable.date);
  if (category) expenses = expenses.filter(e => e.category === category);
  if (dateFrom) expenses = expenses.filter(e => e.date >= String(dateFrom));
  if (dateTo) expenses = expenses.filter(e => e.date <= String(dateTo));
  res.json(expenses.map(e => ({ ...e, amount: Number(e.amount) })).reverse());
});

router.post("/expenses", async (req, res) => {
  const { title, category, amount, date, description, paymentMethod } = req.body;
  const [expense] = await db.insert(expensesTable).values({ title, category, amount: String(amount), date, description, paymentMethod: paymentMethod ?? "cash", createdBy: "system" }).returning();
  res.status(201).json({ ...expense, amount: Number(expense.amount) });
});

router.get("/expenses/summary", async (_req, res) => {
  const expenses = await db.select().from(expensesTable);
  const grouped = new Map<string, { total: number; count: number }>();
  for (const e of expenses) {
    const cur = grouped.get(e.category) ?? { total: 0, count: 0 };
    grouped.set(e.category, { total: cur.total + Number(e.amount), count: cur.count + 1 });
  }
  res.json(Array.from(grouped.entries()).map(([category, v]) => ({ category, total: v.total, count: v.count })));
});

router.get("/expenses/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const [expense] = await db.select().from(expensesTable).where(eq(expensesTable.id, id));
  if (!expense) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...expense, amount: Number(expense.amount) });
});

router.patch("/expenses/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const updates: Record<string, unknown> = {};
  for (const f of ["title","category","amount","date","description","paymentMethod","status"]) {
    if (req.body[f] !== undefined) updates[f] = f === "amount" ? String(req.body[f]) : req.body[f];
  }
  const [expense] = await db.update(expensesTable).set(updates).where(eq(expensesTable.id, id)).returning();
  if (!expense) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...expense, amount: Number(expense.amount) });
});

router.delete("/expenses/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  await db.delete(expensesTable).where(eq(expensesTable.id, id));
  res.status(204).send();
});

export default router;
