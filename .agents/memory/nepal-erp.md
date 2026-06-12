---
name: Nepalese Supermarket ERP
description: Key decisions and conventions established during the Nepal-focused ERP overhaul
---

## Currency
- Format: `रू ${amount.toLocaleString("en-NP", { minimumFractionDigits: 2 })}` — use `fmt()` helper defined locally in each page
- Never use `$` — all prices in NPR

## Loyalty Tiers
- Basic: 0–9,999 NPR total purchases → 0% discount
- Gold: 10,000–49,999 NPR → 5% discount
- Platinum: 50,000+ NPR → 10% discount
- Points: 1 point per NPR 10 spent (`Math.floor(total / 10)`)
- Tier logic lives in `artifacts/api-server/src/routes/sales.ts` → `getCustomerTier()`

**Why:** Tiers are computed server-side from `totalPurchases` column so they're always consistent.

## Role-Based Access Control
- Roles: `super_admin`, `manager`, `cashier`, `billing`, `staff`
- Permission map in `artifacts/api-server/src/routes/auth.ts` → `ROLE_PERMISSIONS` (mirrored in `auth.tsx`)
- Nav items have a `permission` field filtered by `can()` from `useAuth()`
- `ProtectedRoute` in `App.tsx` accepts `permission` prop; shows 🔒 page if denied

## Customer Member Numbers
- Format: `MBR-XXXXXX` (6-digit random, e.g. `MBR-100001`)
- Auto-generated on `POST /customers` server side
- Existing customers got `MBR-{100000 + id*37}` via SQL migration
- Also searchable in customer list

## DB Schema additions
- `customers.member_number TEXT UNIQUE`
- `sales.points_earned INTEGER DEFAULT 0`
- `sales.tier_discount_pct NUMERIC(5,2) DEFAULT 0`
- Applied via direct SQL (not drizzle-kit push — TTY issue with unique constraint on populated table)

## Seed Users (all password: "password")
- admin@store.com — super_admin
- manager@store.com — manager
- cashier@store.com — cashier
- staff@store.com — staff
- demo@store.com — super_admin

## Invoice Printing
- `window.print()` in POS receipt dialog
- Hidden `div.print-receipt` (font-mono, 80mm width) contains formatted bill with items, NPR amounts, points earned, customer member number
- `@media print` hides `.no-print`, shows `.print-receipt`

## Seed Data
- 12 Nepalese categories (Groceries, Dairy, Meat, Snacks, Beverages, Liquor, Electronics, Clothing, Kitchen, Decorations, Personal Care, Stationery)
- 71 Nepalese products with realistic NPR pricing
- 10 demo customers with realistic member numbers and tier histories
