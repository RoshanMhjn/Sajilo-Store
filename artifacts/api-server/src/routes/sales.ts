import { Router } from "express";
import { db, salesTable, customersTable, productsTable, inventoryTable, inventoryMovementsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";

const router = Router();

function generateInvoiceNumber() {
  return `INV-${Date.now().toString().slice(-8)}`;
}

// Tier thresholds (total purchases in NPR)
export function getCustomerTier(totalPurchases: number): { tier: string; discountPct: number } {
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
  const cMap = new Map(customers.map(c => [c.id, { name: c.name, memberNumber: c.memberNumber }]));

  if (customerId) sales = sales.filter(s => s.customerId === parseInt(String(customerId)));
  if (dateFrom) sales = sales.filter(s => new Date(s.createdAt) >= new Date(String(dateFrom)));
  if (dateTo) sales = sales.filter(s => new Date(s.createdAt) <= new Date(String(dateTo)));

  const total = sales.length;
  const paged = sales.reverse().slice(offset, offset + limitNum);

  res.json({
    items: paged.map(s => ({
      ...s,
      total: Number(s.total),
      subtotal: Number(s.subtotal),
      discount: Number(s.discount),
      tax: Number(s.tax),
      amountPaid: Number(s.amountPaid),
      change: Number(s.change),
      tierDiscountPct: Number(s.tierDiscountPct ?? 0),
      pointsEarned: s.pointsEarned ?? 0,
      customerName: s.customerId ? (cMap.get(s.customerId)?.name ?? null) : null,
      memberNumber: s.customerId ? (cMap.get(s.customerId)?.memberNumber ?? null) : null,
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
    const [c] = await db.select().from(customersTable).where(eq(customersTable.id, customerId));
    customer = c;
    if (customer) {
      tierDiscountPct = getCustomerTier(Number(customer.totalPurchases)).discountPct;
    }
  }

  const subtotal = itemsArr.reduce((s: number, i: any) => s + (i.quantity * i.unitPrice * (1 - (i.discount ?? 0) / 100)), 0);
  const taxTotal = itemsArr.reduce((s: number, i: any) => s + (i.quantity * i.unitPrice * ((i.tax ?? 0) / 100)), 0);
  const tierDiscount = subtotal * tierDiscountPct / 100;
  const total = subtotal + taxTotal - tierDiscount;
  const change = Number(amountPaid) - total;
  const pointsEarned = calcPoints(total);

  const itemsWithTotal = itemsArr.map((i: any) => ({
    ...i,
    total: i.quantity * i.unitPrice,
  }));

  const [sale] = await db.insert(salesTable).values({
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
    pointsEarned,
    tierDiscountPct: tierDiscountPct.toFixed(2),
  }).returning();

  // Update inventory
  for (const item of itemsArr) {
    const [inv] = await db.select().from(inventoryTable).where(eq(inventoryTable.productId, item.productId));
    if (inv) {
      const newQty = Math.max(0, Number(inv.quantity) - item.quantity);
      await db.update(inventoryTable).set({ quantity: String(newQty) }).where(eq(inventoryTable.productId, item.productId));
      await db.insert(inventoryMovementsTable).values({ productId: item.productId, type: "stock_out", quantity: String(item.quantity), reference: sale.invoiceNumber, notes: "POS Sale", createdBy: "system" });
    }
  }

  // Update customer loyalty
  if (customerId && customer) {
    const newTotal = Number(customer.totalPurchases) + total;
    const newPoints = customer.loyaltyPoints + pointsEarned;
    const { tier } = getCustomerTier(newTotal);
    await db.update(customersTable).set({
      totalPurchases: newTotal.toFixed(2),
      loyaltyPoints: newPoints,
      membershipTier: tier,
      lastPurchaseDate: new Date(),
    }).where(eq(customersTable.id, customerId));
  }

  const allCustomers = await db.select().from(customersTable);
  const cMap = new Map(allCustomers.map(c => [c.id, { name: c.name, memberNumber: c.memberNumber }]));
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
    customerName: sale.customerId ? (cMap.get(sale.customerId)?.name ?? null) : null,
    memberNumber: sale.customerId ? (cMap.get(sale.customerId)?.memberNumber ?? null) : null,
    cashierName: null,
    items: sale.items as any[],
  });
});

router.get("/sales/summary/today", async (_req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const sales = await db.select().from(salesTable).where(sql`${salesTable.createdAt} >= ${today}`);
  const completed = sales.filter(s => s.status === "completed");
  const totalRevenue = completed.reduce((s, sale) => s + Number(sale.total), 0);
  const cashRevenue = completed.filter(s => s.paymentMethod === "cash").reduce((s, sale) => s + Number(sale.total), 0);
  const cardRevenue = completed.filter(s => s.paymentMethod === "card").reduce((s, sale) => s + Number(sale.total), 0);
  const avgOrder = completed.length > 0 ? totalRevenue / completed.length : 0;
  const methods = ["cash", "card", "digital_wallet"];
  const methodCounts = methods.map(m => ({ m, count: completed.filter(s => s.paymentMethod === m).length }));
  const top = methodCounts.sort((a, b) => b.count - a.count)[0];
  res.json({ totalSales: totalRevenue, totalRevenue, totalTransactions: completed.length, averageOrderValue: avgOrder, topPaymentMethod: top?.m ?? "cash", cashRevenue, cardRevenue });
});

router.get("/sales/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const [sale] = await db.select().from(salesTable).where(eq(salesTable.id, id));
  if (!sale) { res.status(404).json({ error: "Not found" }); return; }
  const customers = await db.select().from(customersTable);
  const cMap = new Map(customers.map(c => [c.id, { name: c.name, memberNumber: c.memberNumber }]));
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
    customerName: sale.customerId ? (cMap.get(sale.customerId)?.name ?? null) : null,
    memberNumber: sale.customerId ? (cMap.get(sale.customerId)?.memberNumber ?? null) : null,
    cashierName: null,
    items: sale.items as any[],
  });
});

router.post("/sales/:id/return", async (req, res) => {
  const id = parseInt(req.params.id);
  const [sale] = await db.select().from(salesTable).where(eq(salesTable.id, id));
  if (!sale) { res.status(404).json({ error: "Not found" }); return; }
  const [updated] = await db.update(salesTable).set({ status: "returned" }).where(eq(salesTable.id, id)).returning();
  res.json({ ...updated, total: Number(updated.total), subtotal: Number(updated.subtotal), discount: Number(updated.discount), tax: Number(updated.tax), amountPaid: Number(updated.amountPaid), change: Number(updated.change), customerName: null, cashierName: null, items: updated.items as any[] });
});

export default router;
