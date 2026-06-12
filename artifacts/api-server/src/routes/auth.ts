import { Router } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

// Role-based permissions
export const ROLE_PERMISSIONS: Record<string, string[]> = {
  super_admin: ["*"],
  manager: ["dashboard", "pos", "products", "inventory", "categories", "suppliers", "purchases", "sales", "customers", "employees", "attendance", "leaves", "payroll", "expenses", "notifications", "ai-insights", "ai-assistant"],
  cashier: ["pos", "sales", "customers", "notifications"],
  billing: ["pos", "sales", "customers", "notifications"],
  staff: ["pos"],
};

export function hasPermission(role: string, permission: string): boolean {
  const perms = ROLE_PERMISSIONS[role] ?? ["pos"];
  return perms.includes("*") || perms.includes(permission);
}

router.post("/auth/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) { res.status(400).json({ error: "Email and password required" }); return; }
  const users = await db.select().from(usersTable).where(eq(usersTable.email, email));
  const user = users[0];
  if (!user || user.password !== password) { res.status(401).json({ error: "Invalid credentials" }); return; }
  const token = Buffer.from(`${user.id}:${user.email}:${Date.now()}`).toString("base64");
  const permissions = ROLE_PERMISSIONS[user.role] ?? ["pos"];
  res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role, avatar: user.avatar, createdAt: user.createdAt, permissions },
  });
});

router.get("/auth/me", async (req, res) => {
  const auth = req.headers.authorization;
  if (!auth) { res.status(401).json({ error: "Unauthorized" }); return; }
  try {
    const decoded = Buffer.from(auth.replace("Bearer ", ""), "base64").toString();
    const [idStr] = decoded.split(":");
    const id = parseInt(idStr);
    const users = await db.select().from(usersTable).where(eq(usersTable.id, id));
    const user = users[0];
    if (!user) { res.status(401).json({ error: "User not found" }); return; }
    const permissions = ROLE_PERMISSIONS[user.role] ?? ["pos"];
    res.json({ id: user.id, name: user.name, email: user.email, role: user.role, avatar: user.avatar, createdAt: user.createdAt, permissions });
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
});

export default router;
