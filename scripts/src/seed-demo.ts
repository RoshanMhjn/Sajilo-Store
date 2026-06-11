import { db } from "@workspace/db";
import { notificationsTable, salesTable, productsTable, customersTable } from "@workspace/db";

async function seed() {
  console.log("Seeding demo data...");

  // Seed notifications
  const existingNotifs = await db.select().from(notificationsTable);
  if (existingNotifs.length === 0) {
    await db.insert(notificationsTable).values([
      { title: "Low Stock Alert", message: "Basmati Rice stock has dropped below reorder point (5 units left)", type: "alert", isRead: false, userId: 1 },
      { title: "Purchase Order Received", message: "PO from FreshFarm Suppliers has been delivered and logged", type: "success", isRead: false, userId: 1 },
      { title: "Payroll Processed", message: "June 2026 payroll has been processed for 8 active employees", type: "info", isRead: false, userId: 1 },
      { title: "Sales Milestone", message: "Today's revenue exceeded daily target by 15% — great work team!", type: "success", isRead: true, userId: 1 },
      { title: "Critical Stock Alert", message: "Chicken Breast is critically low (2 units remaining) — reorder immediately", type: "alert", isRead: false, userId: 1 },
      { title: "New Customer Registered", message: "New premium customer Alice Johnson joined the loyalty program", type: "info", isRead: true, userId: 1 },
      { title: "AI Forecast Updated", message: "Sales forecasting model updated with latest 30 days of data", type: "info", isRead: true, userId: 1 },
    ]);
    console.log("Seeded 7 notifications");
  } else {
    console.log(`Notifications already exist (${existingNotifs.length}), skipping`);
  }

  // Seed sales data
  const existingSales = await db.select().from(salesTable);
  if (existingSales.length < 5) {
    const products = await db.select().from(productsTable).limit(12);
    const customers = await db.select().from(customersTable).limit(5);

    if (products.length === 0) {
      console.log("No products found, skipping sales seed");
      return;
    }

    const paymentMethods = ["cash", "card", "digital_wallet"] as const;

    for (let i = 0; i < 25; i++) {
      const daysAgo = Math.floor(Math.random() * 30);
      const saleDate = new Date();
      saleDate.setDate(saleDate.getDate() - daysAgo);

      const prod1 = products[Math.floor(Math.random() * products.length)];
      const prod2 = products[Math.floor(Math.random() * products.length)];
      const qty1 = Math.floor(Math.random() * 4) + 1;
      const qty2 = Math.floor(Math.random() * 3) + 1;

      const price1 = Number(prod1.sellingPrice);
      const price2 = Number(prod2.sellingPrice);
      const subtotal = price1 * qty1 + price2 * qty2;
      const taxAmt = subtotal * 0.05;
      const total = subtotal + taxAmt;
      const pm = paymentMethods[Math.floor(Math.random() * 3)];
      const customerId = customers.length > 0 && Math.random() > 0.5
        ? customers[Math.floor(Math.random() * customers.length)].id
        : null;
      const invNum = `INV-2026-${String(1000 + i).padStart(4, "0")}`;

      const items = [
        { productId: prod1.id, productName: prod1.name, quantity: qty1, unitPrice: price1, tax: Number(prod1.tax), discount: 0, subtotal: price1 * qty1, total: price1 * qty1 },
        { productId: prod2.id, productName: prod2.name, quantity: qty2, unitPrice: price2, tax: Number(prod2.tax), discount: 0, subtotal: price2 * qty2, total: price2 * qty2 },
      ];

      await db.insert(salesTable).values({
        invoiceNumber: invNum,
        customerId,
        items,
        subtotal: subtotal.toFixed(2),
        tax: taxAmt.toFixed(2),
        discount: "0",
        total: total.toFixed(2),
        paymentMethod: pm,
        amountPaid: total.toFixed(2),
        change: "0",
        status: "completed",
        createdAt: saleDate,
      });
    }
    console.log("Seeded 25 sales");
  } else {
    console.log(`Sales already exist (${existingSales.length}), skipping`);
  }

  console.log("Done!");
  process.exit(0);
}

seed().catch((e) => { console.error(e); process.exit(1); });
