# Sajilo Pasal: Major Features and Code Guide

This document explains the main capabilities of Sajilo Pasal and points to the code that implements them. The application is a pnpm monorepo with:

- A React frontend in `artifacts/store-management`.
- An Express API in `artifacts/api-server`.
- A PostgreSQL data layer using Drizzle ORM in `lib/db`.
- Generated API hooks and types in `lib/api-client-react` and `lib/api-zod`.

## Application Architecture

A typical request follows this path:

```text
React page
  -> generated React Query hook
  -> /api HTTP endpoint
  -> Express route
  -> Drizzle query
  -> PostgreSQL
```

The API mounts all feature routers below the `/api` prefix:

```ts
// artifacts/api-server/src/app.ts
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/api", router);
```

```ts
// artifacts/api-server/src/routes/index.ts
router.use(healthRouter);
router.use(authRouter);
router.use(dashboardRouter);
router.use(productsRouter);
router.use(inventoryRouter);
router.use(salesRouter);
router.use(customersRouter);
router.use(employeesRouter);
router.use(payrollRouter);
router.use(aiRouter);
```

`app.ts` is responsible for cross-cutting HTTP behavior such as JSON parsing, CORS, request logging, and mounting the feature routes. The route index acts as the API catalog and keeps each domain in its own file.

## Authentication and Role-Based Access

### What it provides

- Login with email and password.
- A current-user endpoint at `GET /api/auth/me`.
- Normalized roles: super admin, manager, cashier, billing, and staff.
- Permission-based visibility and route protection in the frontend.
- Demo users that are created or synchronized when login is attempted.

### Server-side permissions

```ts
// artifacts/api-server/src/routes/auth.ts
export const ROLE_PERMISSIONS: Record<string, string[]> = {
  super_admin: ["*"],
  manager: [
    "dashboard",
    "pos",
    "products",
    "inventory",
    "categories",
    "suppliers",
    "purchases",
    "sales",
    "customers",
    "employees",
    "attendance",
    "leaves",
    "payroll",
    "expenses",
    "notifications",
    "ai-insights",
    "ai-assistant",
  ],
  cashier: ["pos", "sales", "customers", "notifications"],
  billing: ["pos", "sales", "customers", "notifications"],
  staff: ["pos"],
};

export function hasPermission(role: string, permission: string): boolean {
  const perms = ROLE_PERMISSIONS[normalizeRole(role)] ?? ["pos"];
  return perms.includes("*") || perms.includes(permission);
}
```

`hasPermission` treats `*` as full access. Unknown roles receive only the default POS permission. `normalizeRole` also maps aliases such as `admin`, `store_manager`, and `accountant` to the canonical role names.

### Login response

```ts
// artifacts/api-server/src/routes/auth.ts
const role = normalizeRole(user.role);
const token = Buffer.from(
  `${user.id}:${user.email}:${role}:${Date.now()}`,
).toString("base64");

res.json({
  token,
  user: {
    id: user.id,
    name: user.name,
    email: user.email,
    role,
    permissions: ROLE_PERMISSIONS[role] ?? ["pos"],
  },
});
```

The current implementation uses a base64-encoded value as a lightweight demo token. Base64 is encoding, not encryption or cryptographic signing, so production authentication should replace this with a signed, expiring session or JWT mechanism and hashed passwords.

### Frontend auth state

```tsx
// artifacts/store-management/src/lib/auth.tsx
const [token, setTokenState] = useState<string | null>(
  localStorage.getItem("store_auth_token"),
);

const {
  data: user,
  isLoading,
  error,
} = useGetMe({
  query: {
    queryKey: ["/api/auth/me"] as const,
    enabled: !!token,
    retry: false,
  },
});

const can = (permission: string) =>
  hasPermission((user as any)?.role, permission);
```

The frontend stores the token in local storage, asks the API for the current user, and exposes `can(permission)` through `AuthProvider`. If the current-user request fails, the token is removed and the user is logged out.

### Protected routes

```tsx
// artifacts/store-management/src/App.tsx
function ProtectedRoute({ component: Component, permission }) {
  const { isAuthenticated, isLoading, can } = useAuth();

  if (isLoading) return <LoadingState />;
  if (!isAuthenticated) return <RedirectToLogin />;

  if (permission && !can(permission)) {
    return <AccessDenied />;
  }

  return (
    <Layout>
      <Component />
    </Layout>
  );
}
```

Every main screen is wrapped in `ProtectedRoute`. Authentication and authorization are therefore handled before the page is rendered, while the sidebar also hides links the current role cannot use.

## Dashboard and Reporting

### What it provides

- Today’s sales and revenue.
- Monthly revenue and estimated profit.
- Revenue change compared with the previous month.
- Product count, low-stock count, pending purchase orders, employees, and customers.
- Sales charts, top products, low-stock lists, and recent activity.

### Dashboard summary calculation

```ts
// artifacts/api-server/src/routes/dashboard.ts
const todayRevenue = todaySalesArr
  .filter((s) => s.status === "completed")
  .reduce((sum, sale) => sum + Number(sale.total), 0);

const lowStockCount = products.filter(
  (product) =>
    (inventoryByProduct.get(product.id) ?? 0) <= Number(product.minStock),
).length;

res.json({
  todayRevenue,
  totalProducts: products.length,
  lowStockCount,
  pendingOrders: pendingOrders.length,
  activeEmployees: employees.length,
  totalCustomers: customers.length,
  monthlyRevenue,
  monthlyProfit,
  revenueChange: parseFloat(revenueChange.toFixed(1)),
});
```

The dashboard combines sales, products, inventory, employees, customers, and purchase-order data into a single summary response. Completed sales are the only sales included in revenue metrics.

## Point of Sale and Checkout

### What it provides

- Product search and stock-aware product selection.
- Cart quantity changes and item removal.
- Walk-in or registered customer selection.
- Cash, card, and digital-wallet payment options.
- Tax, customer-tier discounts, amount paid, change, and loyalty points.
- Successful checkout invalidates product and inventory queries.
- Printable receipt output.

### Frontend checkout flow

```tsx
// artifacts/store-management/src/pages/pos.tsx
const subtotal = cart.reduce(
  (sum, item) => sum + item.price * item.quantity,
  0,
);
const taxTotal = cart.reduce(
  (sum, item) => sum + item.price * item.quantity * (item.tax / 100),
  0,
);
const tierDiscount = (subtotal * tierDiscountPct) / 100;
const total = subtotal + taxTotal - tierDiscount;

const sale = await createSale.mutateAsync({
  data: {
    customerId: customerId ?? undefined,
    items: cart.map((item) => ({
      productId: item.productId,
      productName: item.name,
      quantity: item.quantity,
      unitPrice: item.price,
      tax: item.tax,
      discount: 0,
    })),
    paymentMethod,
    amountPaid: paymentMethod === "cash" ? paid : total,
  },
});
```

The POS calculates display totals immediately for a responsive checkout experience, then sends the cart to the API. The API recalculates the authoritative totals before saving the sale.

### Server-side sale creation

```ts
// artifacts/api-server/src/routes/sales.ts
const subtotal = itemsArr.reduce(
  (sum, item) =>
    sum + item.quantity * item.unitPrice * (1 - (item.discount ?? 0) / 100),
  0,
);
const taxTotal = itemsArr.reduce(
  (sum, item) => sum + item.quantity * item.unitPrice * ((item.tax ?? 0) / 100),
  0,
);
const tierDiscount = (subtotal * tierDiscountPct) / 100;
const total = subtotal + taxTotal - tierDiscount;
const change = Number(amountPaid) - total;
const pointsEarned = Math.floor(total / 10);
```

The API calculates the subtotal, tax, customer-tier discount, final total, change, and loyalty points. This prevents the browser’s displayed values from being the only source of truth.

### Customer loyalty tiers

```ts
export function getCustomerTier(totalPurchases: number) {
  if (totalPurchases >= 50000) {
    return { tier: "platinum", discountPct: 10 };
  }
  if (totalPurchases >= 10000) {
    return { tier: "gold", discountPct: 5 };
  }
  return { tier: "basic", discountPct: 0 };
}
```

Customers receive a discount based on lifetime purchases. Completed sales add points at one point per NPR 10, update the customer’s lifetime total, recalculate the tier, and record the latest purchase date.

## Inventory and Stock Movements

### What it provides

- Current quantity, reserved quantity, and damaged quantity.
- Product and warehouse context for inventory rows.
- A movement history with filters by product and movement type.
- Stock-in, stock-out, returned, damaged, and adjustment operations.
- Automatic stock reduction after a POS sale.

### Inventory movement endpoint

```ts
// artifacts/api-server/src/routes/inventory.ts
const [movement] = await db
  .insert(inventoryMovementsTable)
  .values({
    productId,
    type,
    quantity: String(quantity),
    reference,
    notes,
    createdBy: "system",
  })
  .returning();

const current = Number(inv.quantity);
let newQty = current;
if (type === "stock_in" || type === "returned") newQty = current + quantity;
else if (type === "stock_out" || type === "damaged") {
  newQty = Math.max(0, current - quantity);
} else if (type === "adjustment") {
  newQty = quantity;
}

await db
  .update(inventoryTable)
  .set({ quantity: String(newQty) })
  .where(eq(inventoryTable.productId, productId));
```

Every movement creates an audit record and then updates the current inventory quantity. The `Math.max(0, ...)` guard prevents stock from becoming negative for outgoing movements.

### Inventory data model

```ts
// lib/db/src/schema/inventory.ts
export const inventoryTable = pgTable("inventory", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull(),
  quantity: numeric("quantity", { precision: 12, scale: 2 })
    .notNull()
    .default("0"),
  reservedQty: numeric("reserved_qty", { precision: 12, scale: 2 })
    .notNull()
    .default("0"),
  damagedQty: numeric("damaged_qty", { precision: 12, scale: 2 })
    .notNull()
    .default("0"),
});
```

Inventory quantities are stored as PostgreSQL numeric values and converted to JavaScript numbers when returned from API endpoints.

## Products, Categories, Suppliers, and Purchasing

These modules support the stock lifecycle around the POS:

- **Products:** product name, SKU, pricing, tax, unit, minimum stock, and category data.
- **Categories:** grouping products for organization and filtering.
- **Suppliers:** supplier contact and purchasing information.
- **Purchase orders:** order creation, supplier association, status tracking, and received/ordered workflows.

The route registry exposes these domains through separate routers, such as `products.ts`, `categories.ts`, `suppliers.ts`, and `purchases.ts`. The dashboard reads purchase orders with status `ordered` to calculate pending orders.

## Sales History and Returns

### What it provides

- Paginated sales history.
- Filtering by date range and customer.
- Invoice numbers and payment details.
- Customer and membership information on each sale.
- Return status updates.

```ts
// artifacts/api-server/src/routes/sales.ts
router.get("/sales", async (req, res) => {
  const { dateFrom, dateTo, customerId, page = "1", limit = "20" } = req.query;
  const pageNum = parseInt(String(page));
  const limitNum = Math.min(parseInt(String(limit)), 100);
  const offset = (pageNum - 1) * limitNum;

  // Load, filter, reverse into newest-first order, and paginate.
  const total = sales.length;
  const paged = sales.reverse().slice(offset, offset + limitNum);

  res.json({ items: paged, total, page: pageNum, limit: limitNum });
});
```

The endpoint caps page size at 100 and returns pagination metadata so the frontend can build a stable history view.

A return changes the sale status to `returned` through `POST /api/sales/:id/return`. The current return endpoint changes the sale status but does not yet create compensating inventory movements, so that is an important area to extend before relying on returns for stock accounting.

## Customer Management

Customers can be selected at checkout and are associated with:

- Name and contact details.
- Membership number.
- Membership tier.
- Lifetime purchases.
- Loyalty points.
- Last purchase date.

The POS uses the customer list to display membership status and apply the tier discount. The sales API updates the customer record after a completed sale.

## Employees, Attendance, Leave, and Payroll

The application includes dedicated screens and API routers for:

- Employee records and status.
- Attendance tracking.
- Leave requests and management.
- Payroll calculations and records.
- Expense tracking.

These modules are grouped in the frontend navigation under **HR & Payroll** and **Finance**. Managers receive these permissions, while cashier, billing, and staff roles do not receive them by default.

The same pattern is used across these domains: a page calls a generated API hook, the matching Express router validates or transforms the request, and Drizzle reads or writes the relevant PostgreSQL table.

## Notifications

Notifications are available in the header for roles with the `notifications` permission. The layout loads notifications and shows an unread badge:

```tsx
// artifacts/store-management/src/components/layout.tsx
const { data: notifications } = useListNotifications();
const unreadCount =
  notifications?.filter((item: any) => !item.isRead).length ?? 0;

{
  unreadCount > 0 && <Badge>{unreadCount > 9 ? "9+" : unreadCount}</Badge>;
}
```

The notification link is permission-aware and routes users to the notifications screen. This keeps operational alerts visible without showing them to roles that do not have access.

## AI Analytics and Assistant

### What it provides

- Weekly revenue trend insights.
- Low-stock and out-of-stock alerts.
- Transaction velocity and average order value.
- Best-selling product insight.
- 30-day revenue forecast.
- Slow-moving product recommendations.
- A natural-language-style assistant for common store questions.

### Example insight calculation

```ts
// artifacts/api-server/src/routes/ai.ts
const revenueChange =
  lastWeekRevenue > 0
    ? ((thisWeekRevenue - lastWeekRevenue) / lastWeekRevenue) * 100
    : 0;

const lowStockCount = products.filter(
  (product) =>
    (inventoryByProduct.get(product.id) ?? 0) <= Number(product.minStock),
).length;

insights.push({
  id: "low-stock-alert",
  type: "inventory_alert",
  title: `${lowStockCount} products below minimum stock`,
  severity: lowStockCount > 5 ? "alert" : "warning",
  change: lowStockCount,
});
```

The current AI endpoints are deterministic analytics and rule-based responses built from live database data. The forecast uses the previous 30 days, applies a fixed 5% growth assumption, gives weekends a 30% multiplier, and adds controlled randomness. It is useful as a product feature, but it should be described as an estimate rather than a trained machine-learning forecast.

## Data Model and ORM

The database schema is split by domain and re-exported from `lib/db/src/schema/index.ts`:

```ts
// lib/db/src/schema/index.ts
export * from "./users";
export * from "./products";
export * from "./inventory";
export * from "./sales";
export * from "./customers";
export * from "./employees";
export * from "./payroll";
export * from "./notifications";
```

A sale stores line items as JSONB while keeping totals and payment fields as numeric columns:

```ts
// lib/db/src/schema/sales.ts
export const salesTable = pgTable("sales", {
  id: serial("id").primaryKey(),
  invoiceNumber: text("invoice_number").notNull().unique(),
  customerId: integer("customer_id"),
  items: jsonb("items").notNull().default([]),
  subtotal: numeric("subtotal", { precision: 12, scale: 2 }).notNull(),
  tax: numeric("tax", { precision: 12, scale: 2 }).notNull(),
  total: numeric("total", { precision: 12, scale: 2 }).notNull(),
  paymentMethod: text("payment_method").notNull().default("cash"),
  status: text("status").notNull().default("completed"),
});
```

This structure makes sales easy to retrieve as complete transactions while keeping the values used for reporting queryable as columns.

## Frontend Navigation and Screens

The main client routes are declared in `artifacts/store-management/src/App.tsx` and include:

- `/` dashboard
- `/pos` point of sale
- `/products`, `/inventory`, `/categories`, `/suppliers`, `/purchases`
- `/sales`, `/customers`
- `/employees`, `/attendance`, `/leaves`, `/payroll`
- `/expenses`, `/notifications`
- `/ai-insights`, `/ai-assistant`

The sidebar groups the same screens into Overview, Inventory, Sales, HR & Payroll, Finance, and AI Tools. Each navigation item carries a permission name, so the visible menu is derived from the signed-in user’s role rather than being hard-coded per user.

## Useful Development Commands

From the repository root:

```bash
pnpm install
pnpm run typecheck
pnpm run build
```

The API can be started with the workspace task or directly with the API package. The configured API task uses PostgreSQL and port `5000`:

```text
DATABASE_URL=postgresql://appuser:password@localhost:5432/smart_store_manager
PORT=5000
pnpm --filter @workspace/api-server run start
```

## Code Map

| Area                 | Main files                                                                                                                                               |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API setup            | `artifacts/api-server/src/app.ts`, `artifacts/api-server/src/index.ts`                                                                                   |
| API route registry   | `artifacts/api-server/src/routes/index.ts`                                                                                                               |
| Authentication       | `artifacts/api-server/src/routes/auth.ts`, `artifacts/store-management/src/lib/auth.tsx`                                                                 |
| Dashboard            | `artifacts/api-server/src/routes/dashboard.ts`, `artifacts/store-management/src/pages/dashboard.tsx`                                                     |
| POS                  | `artifacts/api-server/src/routes/sales.ts`, `artifacts/store-management/src/pages/pos.tsx`                                                               |
| Inventory            | `artifacts/api-server/src/routes/inventory.ts`, `lib/db/src/schema/inventory.ts`                                                                         |
| AI features          | `artifacts/api-server/src/routes/ai.ts`, `artifacts/store-management/src/pages/ai-insights.tsx`, `artifacts/store-management/src/pages/ai-assistant.tsx` |
| Navigation           | `artifacts/store-management/src/App.tsx`, `artifacts/store-management/src/components/layout.tsx`                                                         |
| Database schemas     | `lib/db/src/schema`                                                                                                                                      |
| Generated API client | `lib/api-client-react`, `lib/api-zod`                                                                                                                    |

## Important Implementation Notes

1. The API recalculates sale totals, but request validation is relatively permissive in several route handlers. Strong Zod validation at the API boundary would make malformed input safer to handle.
2. The demo token is base64 encoded and should not be treated as secure authentication in production.
3. Passwords are currently stored and compared directly in the demo login flow; production deployments should hash passwords.
4. Inventory updates and sale creation are separate database operations. A database transaction would reduce the chance of a partial checkout if one update fails.
5. Sale returns currently update sale status without restoring inventory. Return workflows should add reverse inventory movements and customer loyalty adjustments if that behavior is required.
6. AI forecasts and insights are rule-based calculations over current database records, not external generative AI or a trained forecasting model.
