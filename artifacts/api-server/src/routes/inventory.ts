import { Router } from "express";
import {
  db,
  inventoryTable,
  inventoryMovementsTable,
  productsTable,
  productBatchesTable,
  expensesTable,
  payrollTable,
  salesTable,
} from "@workspace/db";
import { eq, and, asc, gte, sql } from "drizzle-orm";
import { auditLog, getRequestUserId } from "../lib/audit";

const router = Router();

router.get("/inventory", async (_req, res) => {
  const items = await db.select().from(inventoryTable);
  const products = await db.select().from(productsTable);
  const pMap = new Map(products.map((p) => [p.id, p]));
  const result = items.map((i) => {
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
  const movements = await db
    .select()
    .from(inventoryMovementsTable)
    .orderBy(inventoryMovementsTable.createdAt);
  const products = await db.select().from(productsTable);
  const pMap = new Map(products.map((p) => [p.id, p.name]));
  let result = movements.map((m) => ({
    ...m,
    quantity: Number(m.quantity),
    productName: pMap.get(m.productId) ?? "",
  }));
  if (productId)
    result = result.filter((m) => m.productId === parseInt(String(productId)));
  if (type) result = result.filter((m) => m.type === type);
  res.json(result.reverse());
});

router.post("/inventory/movements", async (req, res) => {
  const { productId, type, quantity, reference, notes } = req.body;
  if (!Number.isFinite(Number(quantity)) || Number(quantity) <= 0) {
    res.status(400).json({ error: "Quantity must be positive" });
    return;
  }
  const [movement] = await db.transaction(async (tx) => {
    const [inv] = await tx
      .select()
      .from(inventoryTable)
      .where(eq(inventoryTable.productId, productId));
    if (!inv) return [];
    const current = Number(inv.quantity);
    const newQty =
      type === "stock_in" || type === "returned"
        ? current + Number(quantity)
        : type === "adjustment"
          ? Number(quantity)
          : Math.max(0, current - Number(quantity));
    const [created] = await tx
      .insert(inventoryMovementsTable)
      .values({
        productId,
        type,
        quantity: String(quantity),
        reference,
        notes,
        createdBy: getRequestUserId(req)?.toString() ?? "system",
      })
      .returning();
    await tx
      .update(inventoryTable)
      .set({
        quantity: String(newQty),
        ...(type === "damaged"
          ? { damagedQty: String(Number(inv.damagedQty) + Number(quantity)) }
          : {}),
      })
      .where(eq(inventoryTable.productId, productId));
    return [created];
  });
  if (!movement) {
    res.status(404).json({ error: "Inventory item not found" });
    return;
  }
  await auditLog({
    req,
    action: type === "adjustment" ? "adjusted" : type,
    entityType: "inventory",
    entityId: productId,
    newValue: movement,
    metadata: { quantity },
  });
  const products = await db.select().from(productsTable);
  const pMap = new Map(products.map((p) => [p.id, p.name]));
  res
    .status(201)
    .json({
      ...movement,
      quantity: Number(movement.quantity),
      productName: pMap.get(movement.productId) ?? "",
    });
});

export default router;
