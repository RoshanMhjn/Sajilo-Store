import { Router } from "express";
import {
  db,
  productsTable,
  inventoryTable,
  inventoryMovementsTable,
  categoriesTable,
} from "@workspace/db";
import { eq, ilike, and, lte, sql } from "drizzle-orm";
import { requirePermission } from "../middlewares/permissions";
import { auditLog } from "../lib/audit";

const router = Router();

router.get("/products", async (req, res) => {
  const { search, categoryId, lowStock, page = "1", limit = "20" } = req.query;
  const pageNum = parseInt(String(page));
  const limitNum = Math.min(parseInt(String(limit)), 100);
  const offset = (pageNum - 1) * limitNum;

  let conditions: ReturnType<typeof eq>[] = [];
  if (search)
    conditions.push(
      sql`(${ilike(productsTable.name, `%${search}%`)} OR ${ilike(productsTable.barcode, `%${search}%`)} OR ${ilike(productsTable.sku, `%${search}%`)})` as any,
    );
  if (categoryId)
    conditions.push(
      eq(productsTable.categoryId, parseInt(String(categoryId))) as any,
    );

  const where =
    conditions.length > 0 ? and(...(conditions as any[])) : undefined;
  const products = await db
    .select()
    .from(productsTable)
    .where(where)
    .limit(limitNum)
    .offset(offset)
    .orderBy(productsTable.name);
  const totalResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(productsTable)
    .where(where);
  const total = Number(totalResult[0]?.count ?? 0);

  const inventories = await db.select().from(inventoryTable);
  const invMap = new Map(inventories.map((i) => [i.productId, i]));
  const categories = await db.select().from(categoriesTable);
  const catMap = new Map(categories.map((c) => [c.id, c.name]));

  let items = products.map((p) => {
    const inv = invMap.get(p.id);
    return {
      ...p,
      costPrice: Number(p.costPrice),
      sellingPrice: Number(p.sellingPrice),
      tax: Number(p.tax),
      discount: Number(p.discount),
      minStock: Number(p.minStock),
      maxStock: Number(p.maxStock),
      reorderPoint: Number(p.reorderPoint),
      currentStock: inv ? Number(inv.quantity) : 0,
      categoryName: p.categoryId ? (catMap.get(p.categoryId) ?? null) : null,
    };
  });

  if (lowStock === "true") {
    items = items.filter((p) => p.currentStock <= p.minStock);
  }

  res.json({ items, total, page: pageNum, limit: limitNum });
});

router.post("/products", async (req, res) => {
  const { initialStock, ...data } = req.body;
  if (data.barcode) {
    const [duplicate] = await db
      .select({ id: productsTable.id })
      .from(productsTable)
      .where(eq(productsTable.barcode, String(data.barcode)));
    if (duplicate) {
      res.status(409).json({ error: "Barcode already exists" });
      return;
    }
  }
  const [product] = await db.insert(productsTable).values(data).returning();
  const stockQty = initialStock ?? 0;
  const [inv] = await db
    .insert(inventoryTable)
    .values({ productId: product.id, quantity: String(stockQty) })
    .returning();
  await auditLog({
    req,
    action: "created",
    entityType: "product",
    entityId: product.id,
    newValue: product,
  });
  res.status(201).json({
    ...product,
    costPrice: Number(product.costPrice),
    sellingPrice: Number(product.sellingPrice),
    tax: Number(product.tax),
    discount: Number(product.discount),
    minStock: Number(product.minStock),
    maxStock: Number(product.maxStock),
    reorderPoint: Number(product.reorderPoint),
    currentStock: Number(inv.quantity),
    categoryName: null,
  });
});

router.get("/products/barcode/:barcode", async (req, res) => {
  const [product] = await db
    .select()
    .from(productsTable)
    .where(eq(productsTable.barcode, req.params.barcode));
  if (!product) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const [inv] = await db
    .select()
    .from(inventoryTable)
    .where(eq(inventoryTable.productId, product.id));
  res.json({
    ...product,
    currentStock: inv ? Number(inv.quantity) : 0,
    categoryName: null,
    costPrice: Number(product.costPrice),
    sellingPrice: Number(product.sellingPrice),
    tax: Number(product.tax),
    discount: Number(product.discount),
    minStock: Number(product.minStock),
    maxStock: Number(product.maxStock),
    reorderPoint: Number(product.reorderPoint),
  });
});

router.get("/products/:id", async (req, res) => {
  const id = parseInt(String(req.params.id));
  const [product] = await db
    .select()
    .from(productsTable)
    .where(eq(productsTable.id, id));
  if (!product) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const [inv] = await db
    .select()
    .from(inventoryTable)
    .where(eq(inventoryTable.productId, id));
  const categories = await db.select().from(categoriesTable);
  const catMap = new Map(categories.map((c) => [c.id, c.name]));
  res.json({
    ...product,
    currentStock: inv ? Number(inv.quantity) : 0,
    categoryName: product.categoryId
      ? (catMap.get(product.categoryId) ?? null)
      : null,
    costPrice: Number(product.costPrice),
    sellingPrice: Number(product.sellingPrice),
    tax: Number(product.tax),
    discount: Number(product.discount),
    minStock: Number(product.minStock),
    maxStock: Number(product.maxStock),
    reorderPoint: Number(product.reorderPoint),
  });
});

router.patch("/products/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const [before] = await db
    .select()
    .from(productsTable)
    .where(eq(productsTable.id, id));
  if (!before) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const updates: Record<string, unknown> = {};
  const fields = [
    "name",
    "sku",
    "barcode",
    "description",
    "categoryId",
    "brand",
    "unit",
    "costPrice",
    "sellingPrice",
    "tax",
    "discount",
    "expiryDate",
    "batchNumber",
    "minStock",
    "maxStock",
    "reorderPoint",
    "imageUrl",
    "status",
  ];
  for (const f of fields)
    if (req.body[f] !== undefined) updates[f] = req.body[f];
  if (updates.barcode && updates.barcode !== before.barcode) {
    const [duplicate] = await db
      .select({ id: productsTable.id })
      .from(productsTable)
      .where(eq(productsTable.barcode, String(updates.barcode)));
    if (duplicate && duplicate.id !== id) {
      res.status(409).json({ error: "Barcode already exists" });
      return;
    }
  }
  const [product] = await db
    .update(productsTable)
    .set(updates)
    .where(eq(productsTable.id, id))
    .returning();
  await auditLog({
    req,
    action:
      updates.sellingPrice !== undefined &&
      updates.sellingPrice !== before.sellingPrice
        ? "price_changed"
        : "updated",
    entityType: "product",
    entityId: id,
    oldValue: before,
    newValue: product,
  });
  const [inv] = await db
    .select()
    .from(inventoryTable)
    .where(eq(inventoryTable.productId, id));
  res.json({
    ...product,
    currentStock: inv ? Number(inv.quantity) : 0,
    categoryName: null,
    costPrice: Number(product.costPrice),
    sellingPrice: Number(product.sellingPrice),
    tax: Number(product.tax),
    discount: Number(product.discount),
    minStock: Number(product.minStock),
    maxStock: Number(product.maxStock),
    reorderPoint: Number(product.reorderPoint),
  });
});

router.delete(
  "/products/:id",
  requirePermission("inventory"),
  async (req, res) => {
    const id = parseInt(String(req.params.id));
    const [before] = await db
      .select()
      .from(productsTable)
      .where(eq(productsTable.id, id));
    await db.transaction(async (tx) => {
      await tx
        .delete(inventoryMovementsTable)
        .where(eq(inventoryMovementsTable.productId, id));
      await tx.delete(inventoryTable).where(eq(inventoryTable.productId, id));
      await tx.delete(productsTable).where(eq(productsTable.id, id));
    });
    if (before)
      await auditLog({
        req,
        action: "deleted",
        entityType: "product",
        entityId: id,
        oldValue: before,
      });
    res.status(204).send();
  },
);

export default router;
