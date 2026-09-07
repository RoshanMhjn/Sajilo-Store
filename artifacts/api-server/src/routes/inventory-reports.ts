import { Router } from "express";
import { and, asc, eq, gte, sql } from "drizzle-orm";
import {
  db,
  expensesTable,
  inventoryTable,
  inventoryMovementsTable,
  payrollTable,
  productBatchesTable,
  productsTable,
  salesTable,
} from "@workspace/db";
import { auditLog, getRequestUserId } from "../lib/audit";

const router = Router();
const money = (value: number) => Math.round(value * 100) / 100;

router.get("/inventory/valuation", async (_req, res) => {
  const [products, inventory] = await Promise.all([
    db.select().from(productsTable),
    db.select().from(inventoryTable),
  ]);
  const stock = new Map(
    inventory.map((item) => [item.productId, Number(item.quantity)]),
  );
  const items = products.map((product) => {
    const quantity = stock.get(product.id) ?? 0;
    const costValue = money(quantity * Number(product.costPrice));
    const salesValue = money(quantity * Number(product.sellingPrice));
    return {
      productId: product.id,
      productName: product.name,
      quantity,
      costValue,
      salesValue,
      grossProfit: money(salesValue - costValue),
    };
  });
  res.json({
    totalProducts: products.length,
    totalUnits: items.reduce((sum, item) => sum + item.quantity, 0),
    inventoryCostValue: money(
      items.reduce((sum, item) => sum + item.costValue, 0),
    ),
    potentialSalesValue: money(
      items.reduce((sum, item) => sum + item.salesValue, 0),
    ),
    potentialGrossProfit: money(
      items.reduce((sum, item) => sum + item.grossProfit, 0),
    ),
    items,
  });
});

router.get("/inventory/alerts", async (_req, res) => {
  const [products, inventory] = await Promise.all([
    db.select().from(productsTable),
    db.select().from(inventoryTable),
  ]);
  const stock = new Map(
    inventory.map((item) => [item.productId, Number(item.quantity)]),
  );
  const alerts = products.flatMap((product) => {
    const current = stock.get(product.id) ?? 0;
    const result: string[] = [];
    if (current <= 0) result.push("out_of_stock");
    else if (current <= Number(product.minStock)) result.push("low_stock");
    if (current > Number(product.maxStock)) result.push("overstock");
    return result.map((type) => ({
      type,
      productId: product.id,
      productName: product.name,
      current,
      minimum: Number(product.minStock),
      maximum: Number(product.maxStock),
      reorderLevel: Number(product.reorderPoint),
      reorderQuantity: Number(product.reorderQuantity),
    }));
  });
  res.json(alerts);
});

router.get("/inventory/analytics", async (_req, res) => {
  const [movements, sales, products] = await Promise.all([
    db.select().from(inventoryMovementsTable),
    db.select().from(salesTable).where(eq(salesTable.status, "completed")),
    db.select().from(productsTable),
  ]);
  const names = new Map(products.map((product) => [product.id, product.name]));
  const sold = new Map<number, number>();
  for (const sale of sales)
    for (const item of sale.items as any[])
      sold.set(
        Number(item.productId),
        (sold.get(Number(item.productId)) ?? 0) + Number(item.quantity),
      );
  const ranked = products
    .map((product) => ({
      productId: product.id,
      productName: product.name,
      unitsSold: sold.get(product.id) ?? 0,
    }))
    .sort((a, b) => b.unitsSold - a.unitsSold);
  res.json({
    fastMoving: ranked.slice(0, 10),
    slowMoving: ranked.filter((item) => item.unitsSold > 0).slice(-10),
    deadStock: ranked.filter((item) => item.unitsSold === 0),
    recentMovements: movements
      .slice(-20)
      .reverse()
      .map((movement) => ({
        ...movement,
        quantity: Number(movement.quantity),
        productName: names.get(movement.productId) ?? "",
      })),
  });
});

router.get("/inventory/batches", async (req, res) => {
  const rows = await db
    .select()
    .from(productBatchesTable)
    .where(
      req.query.productId
        ? eq(productBatchesTable.productId, Number(req.query.productId))
        : undefined,
    )
    .orderBy(asc(productBatchesTable.expiryDate));
  res.json(
    rows.map((row) => ({
      ...row,
      quantity: Number(row.quantity),
      costPrice: Number(row.costPrice),
    })),
  );
});

router.post("/inventory/batches", async (req, res) => {
  const productId = Number(req.body.productId);
  const batchNumber = String(req.body.batchNumber ?? "").trim();
  const quantity = Number(req.body.quantity ?? 0);
  const costPrice = Number(req.body.costPrice ?? 0);
  if (
    !Number.isInteger(productId) ||
    !batchNumber ||
    !Number.isFinite(quantity) ||
    quantity < 0 ||
    !Number.isFinite(costPrice) ||
    costPrice < 0
  ) {
    res
      .status(400)
      .json({
        error: "Valid product, batch number, quantity, and cost are required",
      });
    return;
  }
  const [duplicate] = await db
    .select({ id: productBatchesTable.id })
    .from(productBatchesTable)
    .where(
      and(
        eq(productBatchesTable.productId, productId),
        eq(productBatchesTable.batchNumber, batchNumber),
      ),
    );
  if (duplicate) {
    res
      .status(409)
      .json({ error: "Batch number already exists for this product" });
    return;
  }
  const [batch] = await db
    .insert(productBatchesTable)
    .values({
      productId,
      batchNumber,
      supplierId: req.body.supplierId ? Number(req.body.supplierId) : null,
      manufacturingDate: req.body.manufacturingDate,
      expiryDate: req.body.expiryDate,
      quantity: String(quantity),
      costPrice: String(costPrice),
    })
    .returning();
  await auditLog({
    req,
    action: "created",
    entityType: "product_batch",
    entityId: batch.id,
    newValue: batch,
  });
  res
    .status(201)
    .json({
      ...batch,
      quantity: Number(batch.quantity),
      costPrice: Number(batch.costPrice),
    });
});

router.get("/inventory/expiry", async (req, res) => {
  const days = Math.max(1, Number(req.query.days ?? 30));
  const now = Date.now();
  const rows = await db
    .select()
    .from(productBatchesTable)
    .where(
      sql`${productBatchesTable.expiryDate} is not null and ${productBatchesTable.quantity} > 0`,
    );
  const products = await db.select().from(productsTable);
  const names = new Map(products.map((product) => [product.id, product.name]));
  res.json(
    rows
      .filter(
        (row) =>
          new Date(`${row.expiryDate}T00:00:00`).getTime() <=
          now + days * 86400000,
      )
      .map((row) => ({
        ...row,
        productName: names.get(row.productId) ?? "",
        quantity: Number(row.quantity),
        costPrice: Number(row.costPrice),
        daysRemaining: Math.ceil(
          (new Date(`${row.expiryDate}T00:00:00`).getTime() - now) / 86400000,
        ),
      })),
  );
});

router.post("/inventory/disposals", async (req, res) => {
  const productId = Number(req.body.productId);
  const quantity = Number(req.body.quantity);
  if (
    !["damaged", "expired", "wasted"].includes(req.body.type) ||
    !Number.isFinite(quantity) ||
    quantity <= 0
  ) {
    res
      .status(400)
      .json({ error: "Valid disposal type and quantity are required" });
    return;
  }
  const [inventory] = await db
    .select()
    .from(inventoryTable)
    .where(eq(inventoryTable.productId, productId));
  if (!inventory || quantity > Number(inventory.quantity)) {
    res
      .status(400)
      .json({ error: "Disposal quantity exceeds available stock" });
    return;
  }
  const [movement] = await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(inventoryMovementsTable)
      .values({
        productId,
        type: "damaged",
        quantity: String(quantity),
        notes: `${req.body.type}: ${req.body.notes ?? ""}`,
        createdBy: getRequestUserId(req)?.toString() ?? "system",
      })
      .returning();
    await tx
      .update(inventoryTable)
      .set({
        quantity: String(Number(inventory.quantity) - quantity),
        damagedQty: String(Number(inventory.damagedQty) + quantity),
      })
      .where(eq(inventoryTable.id, inventory.id));
    return [created];
  });
  await auditLog({
    req,
    action: "disposed",
    entityType: "inventory",
    entityId: productId,
    oldValue: inventory,
    newValue: movement,
  });
  res.status(201).json(movement);
});

router.get("/reports/profit", async (req, res) => {
  const from = req.query.dateFrom
    ? new Date(String(req.query.dateFrom))
    : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const to = req.query.dateTo ? new Date(String(req.query.dateTo)) : new Date();
  const [sales, expenses, payroll, products] = await Promise.all([
    db
      .select()
      .from(salesTable)
      .where(
        and(
          eq(salesTable.status, "completed"),
          gte(salesTable.createdAt, from),
          sql`${salesTable.createdAt} <= ${to}`,
        ),
      ),
    db
      .select()
      .from(expensesTable)
      .where(
        sql`${expensesTable.date} >= ${from.toISOString().slice(0, 10)} and ${expensesTable.date} <= ${to.toISOString().slice(0, 10)}`,
      ),
    db
      .select()
      .from(payrollTable)
      .where(
        and(
          gte(payrollTable.createdAt, from),
          sql`${payrollTable.createdAt} <= ${to}`,
        ),
      ),
    db.select().from(productsTable),
  ]);
  const costs = new Map(
    products.map((product) => [product.id, Number(product.costPrice)]),
  );
  let revenue = 0;
  let cogs = 0;
  const productTotals = new Map<
    number,
    { unitsSold: number; revenue: number; cogs: number }
  >();
  for (const sale of sales) {
    revenue += Number(sale.total);
    for (const item of sale.items as any[]) {
      const units = Number(item.quantity);
      const itemRevenue = units * Number(item.unitPrice);
      const itemCogs =
        units *
        Number(item.costPrice ?? costs.get(Number(item.productId)) ?? 0);
      cogs += itemCogs;
      const current = productTotals.get(Number(item.productId)) ?? {
        unitsSold: 0,
        revenue: 0,
        cogs: 0,
      };
      productTotals.set(Number(item.productId), {
        unitsSold: current.unitsSold + units,
        revenue: current.revenue + itemRevenue,
        cogs: current.cogs + itemCogs,
      });
    }
  }
  const generalExpenses = expenses.reduce(
    (sum, item) => sum + Number(item.amount),
    0,
  );
  const payrollExpenses = payroll.reduce(
    (sum, item) => sum + Number(item.netPay),
    0,
  );
  const grossProfit = revenue - cogs;
  const operatingExpenses = generalExpenses + payrollExpenses;
  res.json({
    revenue: money(revenue),
    cogs: money(cogs),
    grossProfit: money(grossProfit),
    generalExpenses: money(generalExpenses),
    payrollExpenses: money(payrollExpenses),
    operatingExpenses: money(operatingExpenses),
    netProfit: money(grossProfit - operatingExpenses),
    products: Array.from(productTotals.entries()).map(([productId, item]) => ({
      productId,
      ...item,
      grossProfit: money(item.revenue - item.cogs),
      marginPct: item.revenue
        ? money(((item.revenue - item.cogs) / item.revenue) * 100)
        : 0,
    })),
  });
});

export default router;
