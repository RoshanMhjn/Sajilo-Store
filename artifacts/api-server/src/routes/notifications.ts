import { Router } from "express";
import { db, notificationsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/notifications", async (_req, res) => {
  const notifications = await db.select().from(notificationsTable).orderBy(notificationsTable.createdAt);
  res.json(notifications.reverse());
});

router.patch("/notifications/:id/read", async (req, res) => {
  const id = parseInt(req.params.id);
  const [notif] = await db.update(notificationsTable).set({ isRead: true }).where(eq(notificationsTable.id, id)).returning();
  if (!notif) { res.status(404).json({ error: "Not found" }); return; }
  res.json(notif);
});

router.patch("/notifications/read-all", async (_req, res) => {
  await db.update(notificationsTable).set({ isRead: true });
  res.json({ status: "ok" });
});

router.post("/notifications", async (req, res) => {
  const { title, message, type, userId } = req.body;
  const [notif] = await db.insert(notificationsTable).values({ title, message, type: type ?? "info", isRead: false, userId: userId ?? 1 }).returning();
  res.status(201).json(notif);
});

export default router;
