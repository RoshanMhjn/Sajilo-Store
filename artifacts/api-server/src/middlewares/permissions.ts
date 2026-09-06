import type { RequestHandler } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { hasPermission, normalizeRole } from "../routes/auth";

export function requirePermission(permission: string): RequestHandler {
  return async (req, res, next) => {
    const authorization = req.headers.authorization;
    if (!authorization?.startsWith("Bearer ")) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    try {
      const decoded = Buffer.from(
        authorization.slice("Bearer ".length),
        "base64",
      ).toString();
      const [idString] = decoded.split(":");
      const userId = Number.parseInt(idString, 10);
      if (!Number.isInteger(userId)) {
        res.status(401).json({ error: "Invalid token" });
        return;
      }

      const [user] = await db
        .select({ role: usersTable.role })
        .from(usersTable)
        .where(eq(usersTable.id, userId));
      const role = normalizeRole(user?.role);

      if (!user || !hasPermission(role, permission)) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }

      next();
    } catch {
      res.status(401).json({ error: "Invalid token" });
    }
  };
}
