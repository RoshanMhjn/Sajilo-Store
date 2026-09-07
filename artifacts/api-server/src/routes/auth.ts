import { Router } from "express";
import { db, usersTable } from "@workspace/db";
import { eq, inArray } from "drizzle-orm";

const router = Router();

const ROLE_ALIASES: Record<string, string> = {
  admin: "super_admin",
  superadmin: "super_admin",
  super_admin: "super_admin",
  manager: "manager",
  store_manager: "manager",
  cashier: "cashier",
  billing: "billing",
  accountant: "billing",
  staff: "staff",
  inventory_staff: "staff",
};

export function normalizeRole(role: string | null | undefined): string {
  const normalized = (role ?? "").trim().toLowerCase().replace(/\s+/g, "_");
  return ROLE_ALIASES[normalized] ?? (normalized || "cashier");
}

// Role-based permissions
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
    "audit-logs",
  ],
  cashier: ["pos", "sales", "customers", "notifications"],
  billing: ["pos", "sales", "customers", "notifications"],
  staff: ["pos"],
};

export const DEMO_USERS = [
  {
    name: "Admin User",
    email: "admin@store.com",
    password: "password",
    role: "super_admin",
  },
  {
    name: "Super Admin User",
    email: "superadmin@store.com",
    password: "password",
    role: "super_admin",
  },
  {
    name: "Store Manager",
    email: "manager@store.com",
    password: "password",
    role: "manager",
  },
  {
    name: "Store Manager Alias",
    email: "store_manager@store.com",
    password: "password",
    role: "manager",
  },
  {
    name: "Cashier User",
    email: "cashier@store.com",
    password: "password",
    role: "cashier",
  },
  {
    name: "Billing User",
    email: "billing@store.com",
    password: "password",
    role: "billing",
  },
  {
    name: "Accountant User",
    email: "accountant@store.com",
    password: "password",
    role: "billing",
  },
  {
    name: "Staff User",
    email: "staff@store.com",
    password: "password",
    role: "staff",
  },
  {
    name: "Inventory Staff User",
    email: "inventory_staff@store.com",
    password: "password",
    role: "staff",
  },
  {
    name: "Demo User",
    email: "demo@store.com",
    password: "password",
    role: "super_admin",
  },
];

export async function ensureDemoUsers() {
  const emails = DEMO_USERS.map((user) => user.email.toLowerCase());
  const existingUsers = await db
    .select()
    .from(usersTable)
    .where(inArray(usersTable.email, emails));
  const existingByEmail = new Map(
    existingUsers.map((user) => [user.email.toLowerCase(), user]),
  );

  for (const user of DEMO_USERS) {
    const lowerEmail = user.email.toLowerCase();
    const existing = existingByEmail.get(lowerEmail);
    const resolvedRole = normalizeRole(user.role);

    if (!existing) {
      await db.insert(usersTable).values({
        name: user.name,
        email: user.email,
        password: user.password,
        role: resolvedRole,
      });
      continue;
    }

    const existingRole = normalizeRole(existing.role);
    if (
      existing.password !== user.password ||
      existingRole !== resolvedRole ||
      existing.name !== user.name
    ) {
      await db
        .update(usersTable)
        .set({ name: user.name, password: user.password, role: resolvedRole })
        .where(eq(usersTable.email, user.email));
    }
  }
}

export function hasPermission(role: string, permission: string): boolean {
  const perms = ROLE_PERMISSIONS[normalizeRole(role)] ?? ["pos"];
  return perms.includes("*") || perms.includes(permission);
}

router.post("/auth/login", async (req, res) => {
  await ensureDemoUsers();

  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: "Email and password required" });
    return;
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const users = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, normalizedEmail));
  const user =
    users[0] ??
    (
      await db
        .select()
        .from(usersTable)
        .where(
          inArray(
            usersTable.email,
            DEMO_USERS.map((entry) => entry.email.toLowerCase()),
          ),
        )
    ).find((candidate) => candidate.email.toLowerCase() === normalizedEmail);

  if (!user || user.password !== String(password)) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const role = normalizeRole(user.role);
  const token = Buffer.from(
    `${user.id}:${user.email}:${role}:${Date.now()}`,
  ).toString("base64");
  const permissions = ROLE_PERMISSIONS[role] ?? ["pos"];
  res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role,
      avatar: user.avatar,
      createdAt: user.createdAt,
      permissions,
    },
  });
});

router.get("/auth/me", async (req, res) => {
  const auth = req.headers.authorization;
  if (!auth) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const decoded = Buffer.from(
      auth.replace("Bearer ", ""),
      "base64",
    ).toString();
    const [idStr, emailStr, roleStr] = decoded.split(":");
    const id = parseInt(idStr);
    const users = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, id));
    const user = users[0];
    if (!user) {
      res.status(401).json({ error: "User not found" });
      return;
    }
    const role = normalizeRole(roleStr || user.role);
    const permissions = ROLE_PERMISSIONS[role] ?? ["pos"];
    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role,
      avatar: user.avatar,
      createdAt: user.createdAt,
      permissions,
    });
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
});

export default router;
