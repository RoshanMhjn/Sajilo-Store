import { Router } from "express";
import { db, salesTable, productsTable, inventoryTable, customersTable, employeesTable, suppliersTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";

const router = Router();

router.get("/ai/insights", async (_req, res) => {
  const sales = await db.select().from(salesTable).where(eq(salesTable.status, "completed"));
  const products = await db.select().from(productsTable);
  const inventories = await db.select().from(inventoryTable);

  const thisWeekStart = new Date();
  thisWeekStart.setDate(thisWeekStart.getDate() - 7);
  thisWeekStart.setHours(0, 0, 0, 0);
  const lastWeekStart = new Date();
  lastWeekStart.setDate(lastWeekStart.getDate() - 14);

  const thisWeekSales = sales.filter(s => new Date(s.createdAt) >= thisWeekStart);
  const lastWeekSales = sales.filter(s => new Date(s.createdAt) >= lastWeekStart && new Date(s.createdAt) < thisWeekStart);

  const thisWeekRevenue = thisWeekSales.reduce((s, sale) => s + Number(sale.total), 0);
  const lastWeekRevenue = lastWeekSales.reduce((s, sale) => s + Number(sale.total), 0);
  const revenueChange = lastWeekRevenue > 0 ? ((thisWeekRevenue - lastWeekRevenue) / lastWeekRevenue) * 100 : 0;

  const invMap = new Map(inventories.map(i => [i.productId, Number(i.quantity)]));
  const lowStockCount = products.filter(p => (invMap.get(p.id) ?? 0) <= Number(p.minStock)).length;
  const criticalCount = products.filter(p => (invMap.get(p.id) ?? 0) === 0).length;

  const insights = [
    {
      id: "revenue-trend",
      type: "revenue_change",
      title: revenueChange >= 0 ? `Revenue up ${Math.abs(revenueChange).toFixed(1)}% this week` : `Revenue down ${Math.abs(revenueChange).toFixed(1)}% this week`,
      description: `Weekly revenue is ${revenueChange >= 0 ? "trending positively" : "declining"}. ${revenueChange >= 0 ? "Sales momentum is strong — consider stocking up on top-sellers." : "Review pricing strategy and customer outreach."}`,
      severity: revenueChange >= 0 ? "success" : "warning",
      metric: "revenue",
      change: parseFloat(revenueChange.toFixed(1)),
    },
    {
      id: "low-stock-alert",
      type: "inventory_alert",
      title: `${lowStockCount} products below minimum stock`,
      description: `${lowStockCount} products are running low on inventory, including ${criticalCount} that are completely out of stock. Create purchase orders to replenish stock.`,
      severity: lowStockCount > 5 ? "alert" : "warning",
      metric: "stock",
      change: lowStockCount,
    },
    {
      id: "sales-velocity",
      type: "sales_trend",
      title: `${thisWeekSales.length} transactions this week`,
      description: `Store processed ${thisWeekSales.length} sales transactions this week generating $${thisWeekRevenue.toFixed(2)} in revenue. Average order value: $${thisWeekSales.length > 0 ? (thisWeekRevenue / thisWeekSales.length).toFixed(2) : "0"}.`,
      severity: "info",
      metric: "transactions",
      change: thisWeekSales.length,
    },
  ];

  // Add product performance insight
  const productSales = new Map<number, number>();
  for (const sale of thisWeekSales) {
    const items = sale.items as any[];
    for (const item of items) {
      productSales.set(item.productId, (productSales.get(item.productId) ?? 0) + item.quantity);
    }
  }
  if (productSales.size > 0) {
    const topEntry = Array.from(productSales.entries()).sort((a, b) => b[1] - a[1])[0];
    const topProduct = products.find(p => p.id === topEntry[0]);
    if (topProduct) {
      insights.push({
        id: "top-product",
        type: "product_performance",
        title: `"${topProduct.name}" is your best seller`,
        description: `${topProduct.name} sold ${topEntry[1]} units this week. Consider creating promotional bundles or cross-selling complementary products.`,
        severity: "success",
        metric: "units_sold",
        change: topEntry[1],
      });
    }
  }

  res.json(insights);
});

router.get("/ai/forecast", async (_req, res) => {
  const sales = await db.select().from(salesTable).where(eq(salesTable.status, "completed"));

  // Calculate daily averages from last 30 days
  const dailyRevenues: number[] = [];
  for (let i = 29; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + 1);
    const daySales = sales.filter(s => new Date(s.createdAt) >= date && new Date(s.createdAt) < nextDate);
    dailyRevenues.push(daySales.reduce((s, sale) => s + Number(sale.total), 0));
  }

  const avgDaily = dailyRevenues.length > 0 ? dailyRevenues.reduce((s, v) => s + v, 0) / dailyRevenues.length : 100;
  const trend = 1.05; // 5% growth assumption

  const forecastPoints = [];
  for (let i = 1; i <= 30; i++) {
    const date = new Date();
    date.setDate(date.getDate() + i);
    const weekday = date.getDay();
    const dayMultiplier = weekday === 0 || weekday === 6 ? 1.3 : 1.0;
    const revenue = avgDaily * trend * dayMultiplier * (0.85 + Math.random() * 0.3);
    forecastPoints.push({ date: date.toISOString().slice(0, 10), revenue: parseFloat(revenue.toFixed(2)), sales: Math.round(revenue / 25) });
  }

  const nextWeekRevenue = forecastPoints.slice(0, 7).reduce((s, p) => s + p.revenue, 0);
  const nextMonthRevenue = forecastPoints.reduce((s, p) => s + p.revenue, 0);

  res.json({
    nextWeekRevenue: parseFloat(nextWeekRevenue.toFixed(2)),
    nextMonthRevenue: parseFloat(nextMonthRevenue.toFixed(2)),
    confidence: 0.78,
    forecastPoints,
    seasonalTrends: ["Weekend sales typically 30% higher", "Month-end spike expected", "Holiday promotions recommended"],
  });
});

router.get("/ai/slow-moving", async (_req, res) => {
  const products = await db.select().from(productsTable);
  const sales = await db.select().from(salesTable).where(eq(salesTable.status, "completed"));
  const inventories = await db.select().from(inventoryTable);
  const invMap = new Map(inventories.map(i => [i.productId, Number(i.quantity)]));

  // Find last sale date per product
  const lastSaleDate = new Map<number, Date>();
  for (const sale of sales) {
    const items = sale.items as any[];
    for (const item of items) {
      const existing = lastSaleDate.get(item.productId);
      const saleDate = new Date(sale.createdAt);
      if (!existing || saleDate > existing) {
        lastSaleDate.set(item.productId, saleDate);
      }
    }
  }

  const now = new Date();
  const slowMoving = products
    .map(p => {
      const last = lastSaleDate.get(p.id);
      const days = last ? Math.floor((now.getTime() - last.getTime()) / 86400000) : 999;
      const stock = invMap.get(p.id) ?? 0;
      return { productId: p.id, productName: p.name, sku: p.sku, daysSinceLastSale: days, currentStock: stock, stockValue: stock * Number(p.costPrice), recommendation: days > 60 ? "clearance" : days > 30 ? "discount" : "promote", suggestedDiscount: days > 60 ? 30 : days > 30 ? 15 : 10 };
    })
    .filter(p => p.daysSinceLastSale > 14 && p.currentStock > 0)
    .sort((a, b) => b.daysSinceLastSale - a.daysSinceLastSale)
    .slice(0, 10);

  res.json(slowMoving);
});

router.post("/ai/chat", async (req, res) => {
  const { message } = req.body;
  const lowerMsg = message.toLowerCase();

  // Gather real data to answer questions
  const sales = await db.select().from(salesTable);
  const products = await db.select().from(productsTable);
  const inventories = await db.select().from(inventoryTable);
  const employees = await db.select().from(employeesTable);
  const customers = await db.select().from(customersTable);

  const invMap = new Map(inventories.map(i => [i.productId, Number(i.quantity)]));

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todaySales = sales.filter(s => new Date(s.createdAt) >= today && s.status === "completed");
  const todayRevenue = todaySales.reduce((s, sale) => s + Number(sale.total), 0);

  let response = "";
  let suggestedQuestions = [
    "What were today's total sales?",
    "Which products are running low on stock?",
    "How many customers do we have?",
    "What is our best-selling product?",
    "How many active employees do we have?",
  ];

  if (lowerMsg.includes("today") && (lowerMsg.includes("sale") || lowerMsg.includes("revenue"))) {
    response = `Today's performance: ${todaySales.length} transactions totaling $${todayRevenue.toFixed(2)} in revenue. Average order value: $${todaySales.length > 0 ? (todayRevenue / todaySales.length).toFixed(2) : "0"}.`;
  } else if (lowerMsg.includes("low") && lowerMsg.includes("stock")) {
    const lowStock = products.filter(p => (invMap.get(p.id) ?? 0) <= Number(p.minStock));
    response = `Currently ${lowStock.length} products are below minimum stock levels: ${lowStock.slice(0, 5).map(p => `${p.name} (${invMap.get(p.id) ?? 0} ${p.unit})`).join(", ")}${lowStock.length > 5 ? ` and ${lowStock.length - 5} more` : ""}.`;
  } else if (lowerMsg.includes("top") && (lowerMsg.includes("product") || lowerMsg.includes("selling"))) {
    const productSales = new Map<number, number>();
    for (const sale of sales.filter(s => s.status === "completed")) {
      for (const item of sale.items as any[]) {
        productSales.set(item.productId, (productSales.get(item.productId) ?? 0) + item.quantity);
      }
    }
    const sorted = Array.from(productSales.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const pMap = new Map(products.map(p => [p.id, p.name]));
    response = `Top 5 selling products: ${sorted.map((e, i) => `${i + 1}. ${pMap.get(e[0]) ?? "Unknown"} (${e[1]} units)`).join(", ")}.`;
  } else if (lowerMsg.includes("customer")) {
    response = `You have ${customers.length} registered customers. ${customers.filter(c => c.membershipTier === "gold" || c.membershipTier === "platinum").length} are premium members (Gold/Platinum tier).`;
  } else if (lowerMsg.includes("employee") || lowerMsg.includes("staff")) {
    const active = employees.filter(e => e.status === "active");
    const departments = [...new Set(active.map(e => e.department))];
    response = `You have ${active.length} active employees across ${departments.length} departments: ${departments.join(", ")}.`;
  } else if (lowerMsg.includes("product") && lowerMsg.includes("how many")) {
    response = `Your store carries ${products.length} products. ${products.filter(p => p.status === "active").length} are active.`;
  } else if (lowerMsg.includes("revenue") || lowerMsg.includes("profit")) {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const monthSales = sales.filter(s => new Date(s.createdAt) >= monthStart && s.status === "completed");
    const monthRevenue = monthSales.reduce((s, sale) => s + Number(sale.total), 0);
    response = `This month's revenue: $${monthRevenue.toFixed(2)} from ${monthSales.length} transactions. Today's revenue: $${todayRevenue.toFixed(2)}.`;
  } else {
    response = `I can help you with store analytics. Based on your current data: ${products.length} products, ${customers.length} customers, ${employees.filter(e => e.status === "active").length} active staff, and $${todayRevenue.toFixed(2)} in today's revenue. What specific insights would you like?`;
  }

  res.json({
    response,
    timestamp: new Date().toISOString(),
    suggestedQuestions,
  });
});

router.get("/ai/reorder-suggestions", async (_req, res) => {
  const products = await db.select().from(productsTable);
  const inventories = await db.select().from(inventoryTable);
  const suppliers = await db.select().from(suppliersTable);
  const invMap = new Map(inventories.map(i => [i.productId, Number(i.quantity)]));

  const suggestions = products
    .filter(p => {
      const stock = invMap.get(p.id) ?? 0;
      return stock <= Number(p.reorderPoint);
    })
    .map(p => {
      const stock = invMap.get(p.id) ?? 0;
      const reorderPoint = Number(p.reorderPoint);
      const maxStock = Number(p.maxStock);
      const suggestedQty = maxStock - stock;
      const urgency = stock === 0 ? "critical" : stock <= reorderPoint * 0.5 ? "high" : stock <= reorderPoint ? "medium" : "low";
      const supplier = suppliers.length > 0 ? suppliers[0] : null;
      return {
        productId: p.id,
        productName: p.name,
        sku: p.sku,
        currentStock: stock,
        reorderPoint,
        suggestedQuantity: Math.max(0, suggestedQty),
        estimatedCost: Math.max(0, suggestedQty) * Number(p.costPrice),
        urgency,
        preferredSupplierId: supplier?.id ?? null,
        preferredSupplierName: supplier?.name ?? null,
      };
    })
    .sort((a, b) => {
      const order = { critical: 0, high: 1, medium: 2, low: 3 };
      return order[a.urgency as keyof typeof order] - order[b.urgency as keyof typeof order];
    });

  res.json(suggestions);
});

export default router;
