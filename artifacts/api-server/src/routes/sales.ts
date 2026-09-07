import { Router } from "express";
import {
  db,
  salesTable,
  customersTable,
  inventoryTable,
  inventoryMovementsTable,
  saleReturnsTable,
  productBatchesTable,
} from "@workspace/db";
import { and, eq, sql } from "drizzle-orm";
import { auditLog, getRequestUserId } from "../lib/audit";

const router = Router();

function generateInvoiceNumber() {
  return `INV-${Date.now().toString().slice(-8)}`;
}

// Tier thresholds (total purchases in NPR)
export function getCustomerTier(totalPurchases: number): {
  tier: string;
  discountPct: number;
} {
  if (totalPurchases >= 50000) return { tier: "platinum", discountPct: 10 };
  if (totalPurchases >= 10000) return { tier: "gold", discountPct: 5 };
  return { tier: "basic", discountPct: 0 };
}

// 1 point per NPR 10 spent
function calcPoints(total: number): number {
  return Math.floor(total / 10);
}

router.get("/sales", async (req, res) => {
  const { dateFrom, dateTo, customerId, page = "1", limit = "20" } = req.query;
  const pageNum = parseInt(String(page));
  const limitNum = Math.min(parseInt(String(limit)), 100);
  const offset = (pageNum - 1) * limitNum;

  let sales = await db.select().from(salesTable).orderBy(salesTable.createdAt);
  const customers = await db.select().from(customersTable);
  const cMap = new Map(
    customers.map((c) => [
      c.id,
      { name: c.name, memberNumber: c.memberNumber },
    ]),
  );

  if (customerId)
    sales = sales.filter((s) => s.customerId === parseInt(String(customerId)));
  if (dateFrom)
    sales = sales.filter(
      (s) => new Date(s.createdAt) >= new Date(String(dateFrom)),
    );
  if (dateTo)
    sales = sales.filter(
      (s) => new Date(s.createdAt) <= new Date(String(dateTo)),
    );

  const total = sales.length;
  const paged = sales.reverse().slice(offset, offset + limitNum);

  res.json({
    items: paged.map((s) => ({
      ...s,
      total: Number(s.total),
      subtotal: Number(s.subtotal),
      discount: Number(s.discount),
      tax: Number(s.tax),
      amountPaid: Number(s.amountPaid),
      change: Number(s.change),
      tierDiscountPct: Number(s.tierDiscountPct ?? 0),
      pointsEarned: s.pointsEarned ?? 0,
      customerName: s.customerId
        ? (cMap.get(s.customerId)?.name ?? null)
        : null,
      memberNumber: s.customerId
        ? (cMap.get(s.customerId)?.memberNumber ?? null)
        : null,
      cashierName: null,
      items: s.items as any[],
    })),
    total,
    page: pageNum,
    limit: limitNum,
  });
});

router.post("/sales", async (req, res) => {
  const { customerId, items, paymentMethod, amountPaid, notes } = req.body;
  const itemsArr: any[] = items ?? [];

  // Get customer tier for discount
  let tierDiscountPct = 0;
  let customer = null;
  if (customerId) {
    const [c] = await db
      .select()
      .from(customersTable)
      .where(eq(customersTable.id, customerId));
    customer = c;
    if (customer) {
      tierDiscountPct = getCustomerTier(
        Number(customer.totalPurchases),
      ).discountPct;
    }
  }

  const subtotal = itemsArr.reduce(
    (s: number, i: any) =>
      s + i.quantity * i.unitPrice * (1 - (i.discount ?? 0) / 100),
    0,
  );
  const taxTotal = itemsArr.reduce(
    (s: number, i: any) => s + i.quantity * i.unitPrice * ((i.tax ?? 0) / 100),
    0,
  );
  const tierDiscount = (subtotal * tierDiscountPct) / 100;
  const total = subtotal + taxTotal - tierDiscount;
  const change = Number(amountPaid) - total;
  const pointsEarned = calcPoints(total);

  const itemsWithTotal = itemsArr.map((i: any) => ({
    ...i,
    total: i.quantity * i.unitPrice,
  }));
  const cashierId = getRequestUserId(req);

  const [sale] = await db.transaction(async (tx) => {
    const [createdSale] = await tx
      .insert(salesTable)
      .values({
        invoiceNumber: generateInvoiceNumber(),
        customerId: customerId ?? null,
        items: itemsWithTotal,
        subtotal: subtotal.toFixed(2),
        discount: tierDiscount.toFixed(2),
        tax: taxTotal.toFixed(2),
        total: total.toFixed(2),
        amountPaid: String(amountPaid),
        change: Math.max(0, change).toFixed(2),
        paymentMethod,
        status: "completed",
        notes,
        cashierId,
        pointsEarned,
        tierDiscountPct: tierDiscountPct.toFixed(2),
      })
      .returning();

    for (const item of itemsArr) {
      const [inv] = await tx
        .select()
        .from(inventoryTable)
        .where(eq(inventoryTable.productId, item.productId));
      if (!inv || Number(inv.quantity) < Number(item.quantity))
        throw new Error(`Insufficient stock for product ${item.productId}`);
      const batches = await tx
        .select()
        .from(productBatchesTable)
        .where(
          and(
            eq(productBatchesTable.productId, item.productId),
            eq(productBatchesTable.enabled, 1),
          ),
        )
        .orderBy(
          sql`${productBatchesTable.expiryDate} is null`,
          productBatchesTable.expiryDate,
        );
      const datedBatches = batches.filter(
        (batch) => Number(batch.quantity) > 0,
      );
      if (datedBatches.length > 0) {
        let remaining = Number(item.quantity);
        for (const batch of datedBatches) {
          if (
            batch.expiryDate &&
            new Date(`${batch.expiryDate}T23:59:59`) < new Date()
          )
            continue;
          const used = Math.min(remaining, Number(batch.quantity));
          if (!used) continue;
          await tx
            .update(productBatchesTable)
            .set({ quantity: String(Number(batch.quantity) - used) })
            .where(eq(productBatchesTable.id, batch.id));
          remaining -= used;
          if (remaining <= 0) break;
        }
        if (remaining > 0)
          throw new Error(
            `Insufficient non-expired stock for product ${item.productId}`,
          );
      }
      const newQty = Number(inv.quantity) - Number(item.quantity);
      await tx
        .update(inventoryTable)
        .set({ quantity: String(newQty) })
        .where(eq(inventoryTable.productId, item.productId));
      await tx.insert(inventoryMovementsTable).values({
        productId: item.productId,
        type: "stock_out",
        quantity: String(item.quantity),
        reference: createdSale.invoiceNumber,
        notes: "POS Sale",
        createdBy: "system",
      });
    }

    if (customerId && customer) {
      const newTotal = Number(customer.totalPurchases) + total;
      const newPoints = customer.loyaltyPoints + pointsEarned;
      const { tier } = getCustomerTier(newTotal);
      await tx
        .update(customersTable)
        .set({
          totalPurchases: newTotal.toFixed(2),
          loyaltyPoints: newPoints,
          membershipTier: tier,
          lastPurchaseDate: new Date(),
        })
        .where(eq(customersTable.id, customerId));
    }
    return [createdSale];
  });

  await auditLog({
    req,
    action: "created",
    entityType: "sale",
    entityId: sale.id,
    newValue: sale,
    metadata: { invoiceNumber: sale.invoiceNumber },
  });

  const allCustomers = await db.select().from(customersTable);
  const cMap = new Map(
    allCustomers.map((c) => [
      c.id,
      { name: c.name, memberNumber: c.memberNumber },
    ]),
  );
  res.status(201).json({
    ...sale,
    total: Number(sale.total),
    subtotal: Number(sale.subtotal),
    discount: Number(sale.discount),
    tax: Number(sale.tax),
    amountPaid: Number(sale.amountPaid),
    change: Number(sale.change),
    tierDiscountPct: Number(sale.tierDiscountPct ?? 0),
    pointsEarned: sale.pointsEarned ?? 0,
    customerName: sale.customerId
      ? (cMap.get(sale.customerId)?.name ?? null)
      : null,
    memberNumber: sale.customerId
      ? (cMap.get(sale.customerId)?.memberNumber ?? null)
      : null,
    cashierName: null,
    items: sale.items as any[],
  });
});

router.get("/sales/summary/today", async (_req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const sales = await db
    .select()
    .from(salesTable)
    .where(sql`${salesTable.createdAt} >= ${today}`);
  const completed = sales.filter((s) => s.status === "completed");
  const totalRevenue = completed.reduce((s, sale) => s + Number(sale.total), 0);
  const cashRevenue = completed
    .filter((s) => s.paymentMethod === "cash")
    .reduce((s, sale) => s + Number(sale.total), 0);
  const cardRevenue = completed
    .filter((s) => s.paymentMethod === "card")
    .reduce((s, sale) => s + Number(sale.total), 0);
  const avgOrder = completed.length > 0 ? totalRevenue / completed.length : 0;
  const methods = ["cash", "card", "digital_wallet"];
  const methodCounts = methods.map((m) => ({
    m,
    count: completed.filter((s) => s.paymentMethod === m).length,
  }));
  const top = methodCounts.sort((a, b) => b.count - a.count)[0];
  res.json({
    totalSales: totalRevenue,
    totalRevenue,
    totalTransactions: completed.length,
    averageOrderValue: avgOrder,
    topPaymentMethod: top?.m ?? "cash",
    cashRevenue,
    cardRevenue,
  });
});

router.get("/sales/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const [sale] = await db
    .select()
    .from(salesTable)
    .where(eq(salesTable.id, id));
  if (!sale) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const customers = await db.select().from(customersTable);
  const cMap = new Map(
    customers.map((c) => [
      c.id,
      { name: c.name, memberNumber: c.memberNumber },
    ]),
  );
  res.json({
    ...sale,
    total: Number(sale.total),
    subtotal: Number(sale.subtotal),
    discount: Number(sale.discount),
    tax: Number(sale.tax),
    amountPaid: Number(sale.amountPaid),
    change: Number(sale.change),
    tierDiscountPct: Number(sale.tierDiscountPct ?? 0),
    pointsEarned: sale.pointsEarned ?? 0,
    customerName: sale.customerId
      ? (cMap.get(sale.customerId)?.name ?? null)
      : null,
    memberNumber: sale.customerId
      ? (cMap.get(sale.customerId)?.memberNumber ?? null)
      : null,
    cashierName: null,
    items: sale.items as any[],
  });
});

router.post("/sales/:id/return", async (req, res) => {
  const id = parseInt(req.params.id);
  const [sale] = await db
    .select()
    .from(salesTable)
    .where(eq(salesTable.id, id));
  if (!sale) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  if (sale.status !== "completed") {
    res.status(409).json({ error: "Only completed sales can be refunded" });
    return;
  }
  const requestedItems = Array.isArray(req.body.items) ? req.body.items : [];
  if (!requestedItems.length) {
    res.status(400).json({ error: "Return items are required" });
    return;
  }
  const originalItems = sale.items as any[];
  const returns = await db
    .select()
    .from(saleReturnsTable)
    .where(eq(saleReturnsTable.saleId, id));
  const returnedByProduct = new Map<number, number>();
  for (const record of returns)
    for (const item of record.items as any[])
      returnedByProduct.set(
        item.productId,
        (returnedByProduct.get(item.productId) ?? 0) + Number(item.quantity),
      );
  let refundAmount = 0;
  for (const item of requestedItems) {
    const original = originalItems.find(
      (entry) => Number(entry.productId) === Number(item.productId),
    );
    const quantity = Number(item.quantity);
    if (
      !original ||
      !Number.isFinite(quantity) ||
      quantity <= 0 ||
      (returnedByProduct.get(Number(item.productId)) ?? 0) + quantity >
        Number(original.quantity)
    ) {
      res.status(400).json({
        error: `Invalid refundable quantity for product ${item.productId}`,
      });
      return;
    }
    refundAmount +=
      quantity *
      Number(original.unitPrice) *
      (1 - Number(original.discount ?? 0) / 100);
  }
  const cashierId = getRequestUserId(req);
  const [returnRecord] = await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(saleReturnsTable)
      .values({
        saleId: id,
        cashierId,
        items: requestedItems,
        refundAmount: refundAmount.toFixed(2),
        reason: req.body.reason,
      })
      .returning();
    for (const item of requestedItems) {
      const [inventory] = await tx
        .select()
        .from(inventoryTable)
        .where(eq(inventoryTable.productId, Number(item.productId)));
      if (inventory)
        await tx
          .update(inventoryTable)
          .set({
            quantity: String(
              Number(inventory.quantity) + Number(item.quantity),
            ),
          })
          .where(eq(inventoryTable.id, inventory.id));
      await tx.insert(inventoryMovementsTable).values({
        productId: Number(item.productId),
        type: "returned",
        quantity: String(item.quantity),
        reference: sale.invoiceNumber,
        notes: "Sale refund",
        createdBy: cashierId ? String(cashierId) : "system",
      });
    }
    if (sale.customerId) {
      const [customer] = await tx
        .select()
        .from(customersTable)
        .where(eq(customersTable.id, sale.customerId));
      if (customer)
        await tx
          .update(customersTable)
          .set({
            totalPurchases: Math.max(
              0,
              Number(customer.totalPurchases) - refundAmount,
            ).toFixed(2),
            loyaltyPoints: Math.max(
              0,
              customer.loyaltyPoints - Math.floor(refundAmount / 10),
            ),
          })
          .where(eq(customersTable.id, customer.id));
    }
    return [created];
  });
  const returnedAfter = new Map(returnedByProduct);
  for (const item of requestedItems)
    returnedAfter.set(
      Number(item.productId),
      (returnedAfter.get(Number(item.productId)) ?? 0) + Number(item.quantity),
    );
  const fullyReturned = originalItems.every(
    (item) =>
      (returnedAfter.get(Number(item.productId)) ?? 0) >= Number(item.quantity),
  );
  if (fullyReturned)
    await db
      .update(salesTable)
      .set({ status: "returned" })
      .where(eq(salesTable.id, id));
  await auditLog({
    req,
    action: "refunded",
    entityType: "sale",
    entityId: id,
    oldValue: sale,
    newValue: returnRecord,
    metadata: { refundAmount },
  });
  res
    .status(201)
    .json({ ...returnRecord, refundAmount: Number(returnRecord.refundAmount) });
});

router.post("/sales/:id/void", async (req, res) => {
  const id = Number(req.params.id);
  const [sale] = await db
    .select()
    .from(salesTable)
    .where(eq(salesTable.id, id));
  if (!sale) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  if (sale.status !== "completed") {
    res.status(409).json({ error: "Sale is already voided or returned" });
    return;
  }
  const [updated] = await db
    .update(salesTable)
    .set({ status: "voided", notes: req.body.reason ?? sale.notes })
    .where(eq(salesTable.id, id))
    .returning();
  await auditLog({
    req,
    action: "voided",
    entityType: "sale",
    entityId: id,
    oldValue: sale,
    newValue: updated,
    metadata: { reason: req.body.reason },
  });
  res.json(updated);
});

export default router;
