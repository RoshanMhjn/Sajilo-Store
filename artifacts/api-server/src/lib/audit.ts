import type { Request } from "express";
import { db, auditLogsTable } from "@workspace/db";

const SENSITIVE_KEY =
  /(password|token|secret|credential|authorization|api[-_]?key)/i;

export function getRequestUserId(req: Request): number | null {
  const authorization = req.headers.authorization;
  if (!authorization?.startsWith("Bearer ")) return null;
  try {
    const [id] = Buffer.from(authorization.slice("Bearer ".length), "base64")
      .toString()
      .split(":");
    const userId = Number.parseInt(id, 10);
    return Number.isInteger(userId) ? userId : null;
  } catch {
    return null;
  }
}

function safeValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(safeValue);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [
      key,
      SENSITIVE_KEY.test(key) ? "[REDACTED]" : safeValue(entry),
    ]),
  );
}

export async function auditLog(input: {
  req?: Request;
  userId?: number | null;
  action: string;
  entityType: string;
  entityId?: number | string | null;
  oldValue?: unknown;
  newValue?: unknown;
  metadata?: unknown;
}) {
  await db.insert(auditLogsTable).values({
    userId: input.userId ?? (input.req ? getRequestUserId(input.req) : null),
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId == null ? null : String(input.entityId),
    oldValue: safeValue(input.oldValue) as any,
    newValue: safeValue(input.newValue) as any,
    metadata: safeValue(input.metadata) as any,
    ipAddress: input.req?.ip ?? null,
  });
}

export function auditSnapshot<T extends Record<string, unknown>>(
  value: T,
): Partial<T> {
  return safeValue(value) as Partial<T>;
}
