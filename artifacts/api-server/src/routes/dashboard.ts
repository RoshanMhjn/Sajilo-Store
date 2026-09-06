import { Router } from "express";
import {
  db,
  salesTable,
  productsTable,
  inventoryTable,
  employeesTable,
  customersTable,
  purchaseOrdersTable,
  notificationsTable,
} from "@workspace/db";
import { eq, sql, and, gte } from "drizzle-orm";

const router = Router();

router.get("/dashboard/summary", async (_req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);

  const todaySalesArr = await db
    .select()
    .from(salesTable)
    .where(sql`${salesTable.createdAt} >= ${today}`);
  const monthSalesArr = await db
    .select()
    .from(salesTable)
    .where(sql`${salesTable.createdAt} >= ${monthStart}`);
  const lastMonthSalesArr = await db
    .select()
    .from(salesTable)
    .where(
      sql`${salesTable.createdAt} >= ${lastMonthStart} AND ${salesTable.createdAt} <= ${lastMonthEnd}`,
    );

  const todayRevenue = todaySalesArr
    .filter((s) => s.status === "completed")
    .reduce((s, sale) => s + Number(sale.total), 0);
  const todaySales = todaySalesArr.filter(
    (s) => s.status === "completed",
  ).length;
  const monthlyRevenue = monthSalesArr
    .filter((s) => s.status === "completed")
    .reduce((s, sale) => s + Number(sale.total), 0);
  const lastMonthRevenue = lastMonthSalesArr
    .filter((s) => s.status === "completed")
    .reduce((s, sale) => s + Number(sale.total), 0);
  const revenueChange =
    lastMonthRevenue > 0
      ? ((monthlyRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
      : 0;

  const products = await db.select().from(productsTable);
  const inventories = await db.select().from(inventoryTable);
  const invMap = new Map(
    inventories.map((i) => [i.productId, Number(i.quantity)]),
  );
  const lowStockCount = products.filter(
    (p) => (invMap.get(p.id) ?? 0) <= Number(p.minStock),
  ).length;

  const employees = await db
    .select()
    .from(employeesTable)
    .where(eq(employeesTable.status, "active"));
  const customers = await db.select().from(customersTable);
  const pendingOrders = await db
    .select()
    .from(purchaseOrdersTable)
    .where(eq(purchaseOrdersTable.status, "ordered"));

  const monthlyProfit = monthlyRevenue * 0.25;

  res.json({
    todaySales: todayRevenue,
    todayRevenue,
    totalProducts: products.length,
    lowStockCount,
    pendingOrders: pendingOrders.length,
    activeEmployees: employees.length,
    totalCustomers: customers.length,
    monthlyRevenue,
    monthlyProfit,
    revenueChange: parseFloat(revenueChange.toFixed(1)),
    salesChange: todaySales,
  });
});

router.get("/dashboard/sales-chart", async (_req, res) => {
  const result = [];
  for (let i = 29; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + 1);
    const daySales = await db
      .select()
      .from(salesTable)
      .where(
        sql`${salesTable.createdAt} >= ${date} AND ${salesTable.createdAt} < ${nextDate}`,
      );
    const completed = daySales.filter((s) => s.status === "completed");
    result.push({
      date: date.toISOString().slice(0, 10),
      revenue: parseFloat(
        completed.reduce((s, sale) => s + Number(sale.total), 0).toFixed(2),
      ),
      sales: completed.length,
    });
  }
  res.json(result);
});

router.get("/dashboard/top-products", async (_req, res) => {
  const sales = await db
    .select()
    .from(salesTable)
    .where(eq(salesTable.status, "completed"));
  const products = await db.select().from(productsTable);
  const pMap = new Map(products.map((p) => [p.id, p]));

  const totals = new Map<number, { sold: number; revenue: number }>();
  for (const sale of sales) {
    const items = sale.items as any[];
    for (const item of items) {
      const cur = totals.get(item.productId) ?? { sold: 0, revenue: 0 };
      totals.set(item.productId, {
        sold: cur.sold + item.quantity,
        revenue:
          cur.revenue + Number(item.total ?? item.quantity * item.unitPrice),
      });
    }
  }

  const result = Array.from(totals.entries())
    .map(([productId, v]) => ({
      productId,
      productName: pMap.get(productId)?.name ?? "",
      totalSold: v.sold,
      revenue: parseFloat(v.revenue.toFixed(2)),
      category: null,
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  res.json(result);
});

router.get("/dashboard/low-stock", async (_req, res) => {
  const products = await db.select().from(productsTable);
  const inventories = await db.select().from(inventoryTable);
  const invMap = new Map(inventories.map((i) => [i.productId, i]));

  const lowStock = products
    .filter((p) => {
      const inv = invMap.get(p.id);
      return (inv ? Number(inv.quantity) : 0) <= Number(p.minStock);
    })
    .map((p) => {
      const inv = invMap.get(p.id);
      return {
        productId: p.id,
        productName: p.name,
        currentStock: inv ? Number(inv.quantity) : 0,
        minStock: Number(p.minStock),
        unit: p.unit,
        sku: p.sku,
      };
    })
    .slice(0, 20);

  res.json(lowStock);
});

router.get("/dashboard/recent-activity", async (_req, res) => {
  const recentSales = await db
    .select()
    .from(salesTable)
    .orderBy(salesTable.createdAt);
  const activities = recentSales
    .reverse()
    .slice(0, 10)
    .map((s, i) => ({
      id: s.id,
      type: "sale",
      description: `New sale ${s.invoiceNumber} - रू ${Number(s.total).toFixed(2)}`,
      createdAt: s.createdAt,
      user: "Cashier",
    }));

  const recentOrders = await db
    .select()
    .from(purchaseOrdersTable)
    .orderBy(purchaseOrdersTable.createdAt);
  const orderActivities = recentOrders
    .reverse()
    .slice(0, 5)
    .map((o) => ({
      id: o.id + 10000,
      type: "purchase",
      description: `Purchase order ${o.orderNumber} - ${o.status}`,
      createdAt: o.createdAt,
      user: "Manager",
    }));

  const all = [...activities, ...orderActivities]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    .slice(0, 15);
  res.json(all);
});

export default router;
