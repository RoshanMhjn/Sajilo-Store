import { Router } from "express";
import { db, inventoryTable, inventoryMovementsTable, productsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/inventory", async (_req, res) => {
  const items = await db.select().from(inventoryTable);
  const products = await db.select().from(productsTable);
  const pMap = new Map(products.map(p => [p.id, p]));
  const result = items.map(i => {
    const p = pMap.get(i.productId);
    return {
      id: i.id,
      productId: i.productId,
      productName: p?.name ?? "",
      sku: p?.sku ?? "",
      quantity: Number(i.quantity),
      reservedQty: Number(i.reservedQty),
      damagedQty: Number(i.damagedQty),
      unit: p?.unit ?? "pcs",
      warehouseId: i.warehouseId,
      warehouseName: i.warehouseName,
      updatedAt: i.updatedAt,
    };
  });
  res.json(result);
});

router.get("/inventory/movements", async (req, res) => {
  const { productId, type } = req.query;
  const movements = await db.select().from(inventoryMovementsTable).orderBy(inventoryMovementsTable.createdAt);
  const products = await db.select().from(productsTable);
  const pMap = new Map(products.map(p => [p.id, p.name]));
  let result = movements.map(m => ({ ...m, quantity: Number(m.quantity), productName: pMap.get(m.productId) ?? "" }));
  if (productId) result = result.filter(m => m.productId === parseInt(String(productId)));
  if (type) result = result.filter(m => m.type === type);
  res.json(result.reverse());
});

router.post("/inventory/movements", async (req, res) => {
  const { productId, type, quantity, reference, notes } = req.body;
  const [movement] = await db.insert(inventoryMovementsTable).values({ productId, type, quantity: String(quantity), reference, notes, createdBy: "system" }).returning();
  // Update inventory
  const [inv] = await db.select().from(inventoryTable).where(eq(inventoryTable.productId, productId));
  if (inv) {
    const current = Number(inv.quantity);
    let newQty = current;
    if (type === "stock_in" || type === "returned") newQty = current + quantity;
    else if (type === "stock_out" || type === "damaged") newQty = Math.max(0, current - quantity);
    else if (type === "adjustment") newQty = quantity;
    await db.update(inventoryTable).set({ quantity: String(newQty) }).where(eq(inventoryTable.productId, productId));
  }
  const products = await db.select().from(productsTable);
  const pMap = new Map(products.map(p => [p.id, p.name]));
  res.status(201).json({ ...movement, quantity: Number(movement.quantity), productName: pMap.get(movement.productId) ?? "" });
});

export default router;
