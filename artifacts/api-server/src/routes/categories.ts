import { Router } from "express";
import { db, categoriesTable, productsTable } from "@workspace/db";
import { eq, count } from "drizzle-orm";

const router = Router();

router.get("/categories", async (_req, res) => {
  const cats = await db.select().from(categoriesTable).orderBy(categoriesTable.name);
  const productCounts = await db.select({ categoryId: productsTable.categoryId, count: count() })
    .from(productsTable)
    .groupBy(productsTable.categoryId);
  const countMap = new Map(productCounts.map(pc => [pc.categoryId, Number(pc.count)]));
  const parentMap = new Map(cats.map(c => [c.id, c.name]));
  const result = cats.map(c => ({
    id: c.id,
    name: c.name,
    description: c.description,
    parentId: c.parentId,
    parentName: c.parentId ? (parentMap.get(c.parentId) ?? null) : null,
    productCount: countMap.get(c.id) ?? 0,
    createdAt: c.createdAt,
  }));
  res.json(result);
});

router.post("/categories", async (req, res) => {
  const { name, description, parentId } = req.body;
  const [cat] = await db.insert(categoriesTable).values({ name, description, parentId }).returning();
  res.status(201).json({ ...cat, productCount: 0, parentName: null });
});

router.get("/categories/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const [cat] = await db.select().from(categoriesTable).where(eq(categoriesTable.id, id));
  if (!cat) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...cat, productCount: 0, parentName: null });
});

router.patch("/categories/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const { name, description, parentId } = req.body;
  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = name;
  if (description !== undefined) updates.description = description;
  if (parentId !== undefined) updates.parentId = parentId;
  const [cat] = await db.update(categoriesTable).set(updates).where(eq(categoriesTable.id, id)).returning();
  if (!cat) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...cat, productCount: 0, parentName: null });
});

router.delete("/categories/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  await db.delete(categoriesTable).where(eq(categoriesTable.id, id));
  res.status(204).send();
});

export default router;
