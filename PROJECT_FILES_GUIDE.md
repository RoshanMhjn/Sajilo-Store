# Sajilo Pasal Project Files Guide

This document explains the important folders and files in the Sajilo Pasal repository, especially `.agents/memory` and `artifacts`. It also explains the difference between the API server, the mockup sandbox, and the production store-management frontend.

## Repository at a Glance

Sajilo Pasal is a pnpm monorepo. The root contains shared configuration, application packages, database code, generated API code, scripts, and documentation.

```text
Smart-Store-Manager/
├── .agents/
│   └── memory/
├── .vscode/
├── artifacts/
│   ├── api-server/
│   ├── mockup-sandbox/
│   └── store-management/
├── attached_assets/
├── lib/
│   ├── api-client-react/
│   ├── api-spec/
│   ├── api-zod/
│   └── db/
├── scripts/
├── FEATURES.md
├── PROJECT_FILES_GUIDE.md
├── README.md
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
├── tsconfig.json
└── tsconfig.base.json
```

## `.agents/memory`

The `.agents` folder contains project-local information intended to help coding agents understand decisions and conventions. It is not part of the running web application and is not required for the API or frontend to start.

### `.agents/memory/MEMORY.md`

This is the short index of project memories. It currently points to the Nepal-focused ERP note:

```text
- [Nepalese ERP overhaul](nepal-erp.md) — NPR currency, tiers, RBAC, member numbers, invoice print — full stack done
```

Purpose:

- Provides a quick list of important project-specific memories.
- Helps an agent find longer notes without scanning every file.
- Should stay concise and link to the detailed notes in the same directory.

### `.agents/memory/nepal-erp.md`

This file records decisions made during the Nepalese supermarket ERP implementation. It contains conventions that should be preserved when changing the application.

Important decisions documented there include:

- Prices use Nepalese rupees and the `en-NP` number format.
- Customer loyalty tiers are Basic, Gold, and Platinum.
- Loyalty points are calculated at one point per NPR 10 spent.
- Roles are `super_admin`, `manager`, `cashier`, `billing`, and `staff`.
- Navigation and protected routes use role permissions.
- Customer member numbers use the `MBR-XXXXXX` format.
- POS receipts use a printable 80mm layout.
- Demo data includes Nepalese categories, products, customers, and realistic pricing.

This file is a design and maintenance reference. It does not execute code. When changing currency, permissions, loyalty rules, member numbers, or receipt behavior, check this file and the related implementation before editing.

### Memory safety

Do not put secrets in `.agents/memory`. It should contain project decisions, conventions, and useful context only. Passwords, API keys, production database URLs, and tokens belong in local environment configuration or a secret manager.

## `artifacts` Folder

`artifacts` contains the runnable application packages. It is included in the pnpm workspace through this configuration:

```yaml
packages:
  - artifacts/*
```

The folder currently contains three packages with different responsibilities:

| Package            | Purpose                                  | Used by end users?                   |
| ------------------ | ---------------------------------------- | ------------------------------------ |
| `api-server`       | Express backend and REST API             | Yes, indirectly through the frontend |
| `store-management` | Main React store-management application  | Yes                                  |
| `mockup-sandbox`   | Component mockup and preview environment | No, development/design tool          |

The `artifacts` name comes from the project structure used by the workspace tooling. These are not disposable build artifacts. The source code inside these packages is part of the application.

## `artifacts/api-server`

This is the backend service. It exposes the REST endpoints used by the frontend and reads/writes PostgreSQL through the shared database package.

### Important files

```text
artifacts/api-server/
├── src/
│   ├── app.ts
│   ├── index.ts
│   ├── lib/
│   │   └── logger.ts
│   ├── middlewares/
│   └── routes/
├── build.mjs
├── package.json
├── tsconfig.json
└── dist/
```

### `src/app.ts`

Creates and configures the Express application. It handles:

- CORS.
- JSON request parsing.
- URL-encoded request parsing.
- Request logging.
- Mounting all feature routers under `/api`.
- Returning JSON for unhandled server errors.

```ts
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/api", router);
```

### `src/index.ts`

Starts the HTTP server. It reads `PORT` from the environment and calls `app.listen`.

### `src/routes/index.ts`

Registers the domain routers:

- Health checks.
- Authentication.
- Dashboard.
- Categories.
- Products.
- Inventory.
- Suppliers.
- Purchases.
- Sales.
- Customers.
- Employees.
- Attendance.
- Leave management.
- Payroll.
- Expenses.
- Notifications.
- AI analytics and assistant.

### `src/routes/*.ts`

Each route file owns one business area. For example:

- `auth.ts` handles login, current-user lookup, demo users, roles, and permissions.
- `products.ts` handles product listing, creation, editing, barcode lookup, and deletion.
- `sales.ts` handles checkout, invoices, loyalty calculations, sales history, and returns.
- `inventory.ts` handles stock quantities and movement records.
- `employees.ts` handles employee records.
- `ai.ts` calculates insights, forecasts, slow-moving products, and assistant responses.

### `build.mjs`

Uses esbuild to bundle the TypeScript API entry point into `dist/index.mjs`. The generated `dist` folder is runtime output and should not be edited manually.

### API commands

From the repository root:

```bash
# Start in development mode. This builds first, then starts the API.
pnpm --filter @workspace/api-server run dev

# Start the already-built API bundle.
pnpm --filter @workspace/api-server run start

# Typecheck the API.
pnpm --filter @workspace/api-server run typecheck

# Build the API bundle.
pnpm --filter @workspace/api-server run build
```

The local API normally runs at:

```text
http://localhost:5000
```

Health check:

```text
http://localhost:5000/api/healthz
```

The API requires `DATABASE_URL` and `PORT`:

```text
DATABASE_URL=postgresql://appuser:password@localhost:5432/smart_store_manager
PORT=5000
```

## `artifacts/store-management`

This is the main user-facing frontend. It is the application store employees use for daily operations.

### Important files

```text
artifacts/store-management/
├── src/
│   ├── App.tsx
│   ├── main.tsx
│   ├── index.css
│   ├── components/
│   ├── hooks/
│   ├── lib/
│   │   ├── auth.tsx
│   │   └── utils.ts
│   └── pages/
├── public/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── dist/
```

### `src/App.tsx`

Defines the frontend application shell:

- React Query provider.
- Authentication provider.
- Theme provider.
- Toast notifications.
- Wouter routes.
- Protected routes and permission checks.

The main screens include dashboard, POS, products, inventory, categories, suppliers, purchases, sales, customers, employees, attendance, leave management, payroll, expenses, notifications, AI insights, and AI assistant.

### `src/pages/`

Each page represents a user-facing screen. Examples:

- `dashboard.tsx`: business metrics and activity.
- `pos.tsx`: checkout and receipt flow.
- `products.tsx`: product catalog management.
- `inventory.tsx`: current stock and movements.
- `customers.tsx`: customer and loyalty records.
- `employees.tsx`: worker records.
- `ai-insights.tsx`: analytics cards and recommendations.
- `ai-assistant.tsx`: operational question-and-answer interface.

### `src/components/`

Shared React components and layout elements. `layout.tsx` provides the sidebar, top bar, navigation grouping, permission-filtered menu items, notifications badge, and logout control.

### `src/lib/auth.tsx`

Owns client-side authentication state. It stores the local token, calls `/api/auth/me`, exposes the current user, and provides the `can(permission)` helper used by protected pages and navigation.

### `vite.config.ts`

Configures Vite, React, Tailwind CSS, source aliases, the frontend port, and the `/api` development proxy. The proxy normally forwards frontend API calls to port `5000`.

### Frontend commands

```bash
# Start the Vite development server.
pnpm --filter @workspace/store-management run dev

# Typecheck the frontend.
pnpm --filter @workspace/store-management run typecheck

# Build the production frontend bundle.
pnpm --filter @workspace/store-management run build

# Preview a production build.
pnpm --filter @workspace/store-management run serve
```

The local frontend normally runs at:

```text
http://localhost:5173
```

## `artifacts/mockup-sandbox`

The mockup sandbox is a development and design-preview application. It is separate from the real store-management application.

### What it is used for

The sandbox lets developers preview individual React mockup components in isolation. This is useful when:

- Designing a new screen before connecting it to the API.
- Reviewing a component without logging into the complete application.
- Testing visual layouts and responsive behavior.
- Giving a workspace canvas or design tool a URL for a specific component.
- Exploring generated mockup components without adding them to the production navigation.

It is not the production supermarket application and it does not replace `store-management`.

### How component previews work

The sandbox uses a generated module map in `src/.generated/`. `App.tsx` receives a component path, dynamically imports the matching component, identifies an exported React component, and renders it.

The key behavior is conceptually:

```tsx
const key = `./components/mockups/${componentPath}.tsx`;
const loader = modules[key];
const mod = await loader();
return <ResolvedComponent />;
```

The generated module map allows the preview server to discover mockup components without manually adding every component to a central route file.

### Important files

```text
artifacts/mockup-sandbox/
├── src/
│   ├── App.tsx
│   ├── main.tsx
│   ├── index.css
│   ├── components/
│   ├── hooks/
│   ├── lib/
│   └── .generated/
├── mockupPreviewPlugin.ts
├── vite.config.ts
├── index.html
├── package.json
└── dist/
```

- `src/App.tsx`: preview renderer and fallback gallery.
- `src/.generated/`: generated component discovery data. Do not manually edit unless the generation workflow requires it.
- `mockupPreviewPlugin.ts`: Vite plugin that supports mockup preview behavior.
- `vite.config.ts`: Vite configuration for this separate sandbox.
- `src/components/ui/`: reusable visual components used by mockups.

### Mockup sandbox commands

```bash
# Start the mockup preview server.
pnpm --filter @workspace/mockup-sandbox run dev

# Typecheck the sandbox.
pnpm --filter @workspace/mockup-sandbox run typecheck

# Build the sandbox.
pnpm --filter @workspace/mockup-sandbox run build

# Preview a built sandbox.
pnpm --filter @workspace/mockup-sandbox run preview
```

The sandbox usually requires its own `PORT` and `BASE_PATH` environment variables because its Vite configuration validates them at startup. Example:

```powershell
$env:PORT="5174"
$env:BASE_PATH="/"
pnpm --filter @workspace/mockup-sandbox run dev
```

Use a different port from the production frontend if both need to run at the same time.

## How the Three Artifact Packages Relate

```text
                    ┌────────────────────────┐
                    │ store-management       │
                    │ Main React application │
                    └───────────┬────────────┘
                                │ /api requests
                                ▼
                    ┌────────────────────────┐
                    │ api-server              │
                    │ Express REST API        │
                    └───────────┬────────────┘
                                │ Drizzle ORM
                                ▼
                    ┌────────────────────────┐
                    │ lib/db                  │
                    │ PostgreSQL schemas      │
                    └────────────────────────┘

                    ┌────────────────────────┐
                    │ mockup-sandbox           │
                    │ Isolated UI preview tool │
                    └────────────────────────┘
```

The production workflow is:

1. A user opens `store-management`.
2. A page calls a generated API hook.
3. Vite proxies `/api` requests to `api-server` during local development.
4. The API route reads or writes PostgreSQL through `lib/db`.
5. The frontend refreshes its React Query data.

The mockup sandbox is outside this request flow. It is for visual previews and does not normally use the production API.

## Related Folders Outside `artifacts`

### `lib/db`

Database connection, Drizzle schemas, and database commands. Domain schema files define users, products, inventory, sales, customers, employees, payroll, notifications, and other tables.

```bash
pnpm --filter @workspace/db run push
```

### `lib/api-spec`

OpenAPI source contract. It describes API paths, request bodies, response shapes, and generated operation names.

### `lib/api-zod`

Generated API schemas and types based on the API contract.

### `lib/api-client-react`

Generated React Query hooks and HTTP client utilities consumed by the frontend.

### `scripts`

Utility scripts, including `src/seed-demo.ts`, which creates demo categories, products, inventory, customers, employees, sales, and related records.

```bash
pnpm --filter @workspace/scripts run seed-demo
```

### `attached_assets`

Project assets and imported files used by the application or development tooling. Inspect individual files before removing anything because assets may be referenced by the frontend or mockups.

### `.vscode`

Workspace editor configuration. The `tasks.json` file includes the API start task with the local database URL and port configuration.

### `dist`, `node_modules`, and generated folders

These are generated or installed outputs when present:

- `node_modules`: installed dependencies. Never edit manually or commit it.
- `dist`: compiled API or frontend output. Rebuild it instead of editing it directly.
- `.generated`: generated component/module metadata. Regenerate it through the owning tool when possible.

## Which Package Should You Use?

| Goal                                  | Package or folder                                        |
| ------------------------------------- | -------------------------------------------------------- |
| Run the actual store application      | `artifacts/store-management` plus `artifacts/api-server` |
| Add or fix a backend endpoint         | `artifacts/api-server/src/routes`                        |
| Add or fix a frontend screen          | `artifacts/store-management/src/pages`                   |
| Change the sidebar or shared shell    | `artifacts/store-management/src/components`              |
| Preview a UI component in isolation   | `artifacts/mockup-sandbox`                               |
| Change database tables                | `lib/db/src/schema`                                      |
| Change generated API contracts        | `lib/api-spec` then regenerate clients                   |
| Add demo products or records          | `scripts/src/seed-demo.ts`                               |
| Record project conventions for agents | `.agents/memory`                                         |

## Recommended Development Order

For a new end-to-end feature:

1. Update the database schema in `lib/db` if new data is required.
2. Add or update the OpenAPI contract in `lib/api-spec`.
3. Implement the API route in `artifacts/api-server/src/routes`.
4. Regenerate API schemas and React Query hooks.
5. Implement the frontend page or component in `artifacts/store-management`.
6. Add mockup-only previews in `artifacts/mockup-sandbox` when visual exploration is useful.
7. Add or update demo data in `scripts/src/seed-demo.ts`.
8. Run typechecks and production builds.

## Validation Commands

From the repository root:

```bash
pnpm run typecheck
pnpm run build
pnpm --filter @workspace/api-server run typecheck
pnpm --filter @workspace/store-management run typecheck
pnpm --filter @workspace/mockup-sandbox run typecheck
```

When the services are running:

```bash
curl http://localhost:5000/api/healthz
curl http://localhost:5173/api/healthz
```

Expected health response:

```json
{ "status": "ok" }
```

## Summary

- `.agents/memory` stores project knowledge for coding agents; it does not run the application.
- `artifacts/api-server` is the Express backend.
- `artifacts/store-management` is the real user-facing React frontend.
- `artifacts/mockup-sandbox` is an isolated UI component preview environment.
- `lib/db` owns PostgreSQL and Drizzle schemas.
- `lib/api-spec`, `lib/api-zod`, and `lib/api-client-react` keep API contracts and generated client code aligned.
- `scripts/src/seed-demo.ts` creates the demo catalog and operational data.
