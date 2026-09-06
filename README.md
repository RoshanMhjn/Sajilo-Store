# Smart Store Manager

Smart Store Manager is a full-stack supermarket and retail operations system. It provides point-of-sale checkout, product and inventory management, customer loyalty, supplier and purchase-order workflows, employee management, attendance, leave, payroll, expenses, notifications, dashboards, and rule-based analytics.

The project is organized as a pnpm monorepo:

- React + Vite frontend for the store-management interface.
- Express 5 API server.
- PostgreSQL database accessed through Drizzle ORM.
- OpenAPI-generated API types and React Query hooks.
- Demo-data seeder with Nepalese supermarket products, customers, employees, sales, and supporting records.

## Features

### Store operations

- Point of Sale with product search, cart management, payment methods, tax, customer discounts, change calculation, loyalty points, and printable receipts.
- Product catalog with SKU, barcode, pricing, tax, stock thresholds, categories, brands, units, and status.
- Inventory quantities, stock movement history, stock-in, stock-out, adjustments, damaged stock, and returned stock.
- Low-stock monitoring and dashboard reporting.
- Suppliers and purchase orders.

### Customers and sales

- Customer records and membership numbers.
- Basic, Gold, and Platinum loyalty tiers.
- Automatic customer purchase totals and loyalty points.
- Sales history, pagination, date/customer filters, invoices, and returns.

### Workforce and finance

- Employee records and roles.
- Attendance tracking.
- Leave requests.
- Payroll records and processing.
- Expense tracking.
- Notifications with unread counts.

### Analytics

- Dashboard revenue, sales, stock, staff, customer, and purchase-order metrics.
- Weekly revenue and product-performance insights.
- Low-stock and slow-moving product analysis.
- Rule-based revenue forecasting.
- Store-data assistant for common operational questions.

### Access control

The application supports these roles:

- `super_admin`
- `manager`
- `cashier`
- `billing`
- `staff`

Navigation and protected screens are filtered by role permissions. The API also returns role and permission information during login.

## Technology Stack

- Node.js 24 or newer
- pnpm workspaces
- TypeScript 5.9
- React 19
- Vite 7
- Express 5
- PostgreSQL
- Drizzle ORM and Drizzle Kit
- TanStack React Query
- Wouter
- Tailwind CSS
- Radix UI components
- Zod and drizzle-zod
- Orval-generated API client
- esbuild for the API bundle

## Requirements

Install these before starting:

1. Node.js 24 or newer
2. pnpm 10 or newer
3. PostgreSQL 14 or newer
4. Git

Check installed versions:

```bash
node --version
pnpm --version
psql --version
```

## Clone and Install

```bash
git clone <your-github-repository-url>
cd Smart-Store-Manager
pnpm install
```

This repository requires pnpm. Do not use `npm install` or `yarn install` because the workspace configuration and lockfile are managed by pnpm.

## PostgreSQL Setup

Create a PostgreSQL database and application user. The default local connection used by the project is:

```text
postgresql://appuser:password@localhost:5432/smart_store_manager
```

### Option A: Create with psql

Connect as a PostgreSQL administrator:

```bash
psql -U postgres
```

Run:

```sql
CREATE USER appuser WITH PASSWORD 'password';
CREATE DATABASE smart_store_manager OWNER appuser;
GRANT ALL PRIVILEGES ON DATABASE smart_store_manager TO appuser;
```

Then connect to the application database and grant schema permissions:

```bash
psql -U appuser -d smart_store_manager
```

```sql
GRANT ALL ON SCHEMA public TO appuser;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO appuser;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO appuser;
```

### Option B: Use an existing PostgreSQL database

Set `DATABASE_URL` to your own PostgreSQL connection string. For example:

```text
postgresql://username:password@localhost:5432/database_name
```

Do not commit real passwords, tokens, or production connection strings to GitHub.

## Configure the Database

The database package reads `DATABASE_URL`. From the repository root, set it in your terminal before running database commands.

PowerShell:

```powershell
$env:DATABASE_URL="postgresql://appuser:password@localhost:5432/smart_store_manager"
```

Command Prompt:

```cmd
set "DATABASE_URL=postgresql://appuser:password@localhost:5432/smart_store_manager"
```

Push the Drizzle schema to the database:

```bash
pnpm --filter @workspace/db run push
```

Review any migration prompt before confirming. In particular, do not truncate existing user data unless you intentionally want to reset it.

## Add Demo Data

The seeder is idempotent for the main catalog records: it skips products, categories, customers, suppliers, employees, and users that already exist according to their stable identifiers.

Set `DATABASE_URL`, then run:

```bash
pnpm --filter @workspace/scripts run seed-demo
```

The demo seeder creates or prepares:

- 12 product categories
- 71 supermarket products with inventory quantities
- Demo users
- Customers and loyalty data
- Suppliers
- Employees
- Purchase orders
- Expenses
- Attendance records
- Payroll records
- Notifications
- Sample sales

The sales, attendance, payroll, expense, and notification sections are seeded as demo records when the seeder runs. Review the seeder before running it against a production database.

## Run the Application Locally

Run the API and frontend in separate terminals.

### Terminal 1: API server

PowerShell:

```powershell
$env:DATABASE_URL="postgresql://appuser:password@localhost:5432/smart_store_manager"
$env:PORT="5000"
pnpm --filter @workspace/api-server run dev
```

Command Prompt:

```cmd
set "DATABASE_URL=postgresql://appuser:password@localhost:5432/smart_store_manager"
set "PORT=5000"
pnpm --filter @workspace/api-server run dev
```

The API runs at:

```text
http://localhost:5000
```

### Terminal 2: frontend

The frontend uses `artifacts/store-management/.env` by default. Its local settings are:

```text
PORT=5173
BASE_PATH=/
VITE_API_URL=http://localhost:5000
```

Start it with:

```bash
pnpm --filter @workspace/store-management run dev
```

The frontend runs at:

```text
http://localhost:5173
```

The Vite development proxy forwards `/api` requests to the API server on port `5000`.

### VS Code task

This repository includes a VS Code task named **Start API backend** in `.vscode/tasks.json`. It starts the API on port `5000` with the configured local PostgreSQL URL.

The frontend still needs to be started with:

```bash
pnpm --filter @workspace/store-management run dev
```

## Demo Login Accounts

The demo seeder includes these accounts. All demo accounts use the password `password`:

| Role          | Email                       |
| ------------- | --------------------------- |
| Super Admin   | `admin@store.com`           |
| Super Admin   | `superadmin@store.com`      |
| Manager       | `manager@store.com`         |
| Manager alias | `store_manager@store.com`   |
| Cashier       | `cashier@store.com`         |
| Billing       | `billing@store.com`         |
| Billing alias | `accountant@store.com`      |
| Staff         | `staff@store.com`           |
| Staff alias   | `inventory_staff@store.com` |
| Demo admin    | `demo@store.com`            |

These credentials are for local demonstration only. Change the authentication implementation and credentials before deploying to a real environment.

## API Health Check

Once the API is running, check it directly:

```bash
curl http://localhost:5000/api/healthz
```

Expected response:

```json
{ "status": "ok" }
```

You can also verify the frontend proxy:

```bash
curl http://localhost:5173/api/healthz
```

## Useful Commands

### Development

```bash
# Start the API in development mode
pnpm --filter @workspace/api-server run dev

# Start the frontend development server
pnpm --filter @workspace/store-management run dev

# Seed demo data
pnpm --filter @workspace/scripts run seed-demo
```

### Validation and builds

```bash
# Typecheck libraries and workspace packages
pnpm run typecheck

# Build the complete workspace
pnpm run build

# Typecheck only the API
pnpm --filter @workspace/api-server run typecheck

# Typecheck only the frontend
pnpm --filter @workspace/store-management run typecheck

# Typecheck utility scripts
pnpm --filter @workspace/scripts run typecheck

# Build the API bundle
pnpm --filter @workspace/api-server run build

# Build the frontend production bundle
pnpm --filter @workspace/store-management run build
```

### Database

```bash
# Push the current Drizzle schema
pnpm --filter @workspace/db run push

# Force-push the schema during development only
pnpm --filter @workspace/db run push-force
```

Use `push-force` only when you understand the data-loss risk. Back up the database before destructive schema operations.

### Generated API client

The API contract is stored in `lib/api-spec/openapi.yaml`. Generated schemas and React Query hooks live in `lib/api-zod` and `lib/api-client-react`.

To inspect available API package scripts:

```bash
pnpm --filter @workspace/api-spec run
```

Regeneration commands depend on the scripts currently defined in `lib/api-spec/package.json`.

## Project Structure

```text
.
├── artifacts/
│   ├── api-server/              Express API and domain routes
│   ├── mockup-sandbox/          UI mockup sandbox
│   └── store-management/        Main React frontend
├── lib/
│   ├── api-client-react/        Generated React Query API client
│   ├── api-spec/                OpenAPI contract
│   ├── api-zod/                 Generated API schemas
│   └── db/                      Drizzle database package and schemas
├── scripts/
│   └── src/seed-demo.ts         Demo data seeder
├── .vscode/tasks.json           VS Code API start task
├── FEATURES.md                  Feature and code guide
├── package.json                 Root workspace commands
├── pnpm-workspace.yaml          Workspace and dependency configuration
└── pnpm-lock.yaml               Locked dependency versions
```

## Request Flow

```text
React page
  -> generated React Query hook
  -> Vite /api proxy
  -> Express route
  -> Drizzle ORM
  -> PostgreSQL
```

The main API route groups include:

- `/api/auth`
- `/api/dashboard`
- `/api/products`
- `/api/inventory`
- `/api/categories`
- `/api/suppliers`
- `/api/purchases`
- `/api/sales`
- `/api/customers`
- `/api/employees`
- `/api/attendance`
- `/api/leaves`
- `/api/payroll`
- `/api/expenses`
- `/api/notifications`
- `/api/ai`

## Environment Variables

### API

| Variable       | Required | Example                                                            | Purpose                      |
| -------------- | -------- | ------------------------------------------------------------------ | ---------------------------- |
| `DATABASE_URL` | Yes      | `postgresql://appuser:password@localhost:5432/smart_store_manager` | PostgreSQL connection string |
| `PORT`         | Yes      | `5000`                                                             | API listening port           |
| `LOG_LEVEL`    | No       | `info`                                                             | API log level                |

### Frontend

| Variable       | Required | Example                 | Purpose                             |
| -------------- | -------- | ----------------------- | ----------------------------------- |
| `PORT`         | Yes      | `5173`                  | Vite development/preview port       |
| `BASE_PATH`    | Yes      | `/`                     | Frontend base path                  |
| `API_PORT`     | No       | `5000`                  | Backend port used by the Vite proxy |
| `VITE_API_URL` | No       | `http://localhost:5000` | Local API URL reference             |

## Troubleshooting

### `pnpm.ps1 cannot be loaded`

On Windows, PowerShell execution policy may block `pnpm.ps1`. Use `pnpm.cmd` or run the command through Command Prompt:

```powershell
pnpm.cmd install
pnpm.cmd --filter @workspace/store-management run dev
```

### `Cannot connect to PostgreSQL`

Check that PostgreSQL is running and that `DATABASE_URL` points to the correct database. Test the connection with:

```bash
psql "postgresql://appuser:password@localhost:5432/smart_store_manager"
```

### `relation does not exist`

Push the schema, then seed demo data:

```bash
pnpm --filter @workspace/db run push
pnpm --filter @workspace/scripts run seed-demo
```

### Frontend requests return 404 or connect to the wrong port

Confirm that:

- The API is running on port `5000`.
- The frontend is running on port `5173`.
- `API_PORT=5000` is set if the API uses a non-default port.
- `artifacts/store-management/.env` does not point to an old port.

### Product creation returns 500

Check the API terminal for database errors. Common causes are:

- PostgreSQL is not running.
- The API is using the wrong `DATABASE_URL`.
- The `products` table has not been created.
- The SKU already exists because SKUs are unique.
- The database user does not have permissions on the `public` schema.

### Port already in use

Find the process using a port and stop it, or choose another port. On Windows PowerShell:

```powershell
Get-NetTCPConnection -LocalPort 5000,5173 -State Listen
Stop-Process -Id <process-id> -Force
```

If changing the API port, update `PORT` and `API_PORT` together.

## Production Notes

This repository is configured primarily for local development and demonstration. Before production use:

- Replace demo credentials and direct password comparison with secure password hashing.
- Replace the demo base64 token with signed, expiring sessions or JWTs.
- Use HTTPS and secure cookie/token handling.
- Store secrets outside the repository.
- Add request validation and rate limiting at the API boundary.
- Use database transactions for checkout, inventory changes, and related loyalty updates.
- Back up PostgreSQL before schema changes.
- Review return handling and inventory reconciliation.
- Configure a production build and process manager.
- Run security, dependency, and integration tests in CI.

## Additional Documentation

- [Feature and code guide](FEATURES.md)
- [OpenAPI contract](lib/api-spec/openapi.yaml)
- [Database schemas](lib/db/src/schema)
- [Demo data seeder](scripts/src/seed-demo.ts)

## License

This project currently declares the MIT license in `package.json`. Confirm the repository licensing requirements before publishing or redistributing it.
