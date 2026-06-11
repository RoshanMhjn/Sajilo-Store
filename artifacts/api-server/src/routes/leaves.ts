import { Router } from "express";
import { db, leaveRequestsTable, employeesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/leaves", async (req, res) => {
  const { employeeId, status } = req.query;
  let leaves = await db.select().from(leaveRequestsTable).orderBy(leaveRequestsTable.createdAt);
  const employees = await db.select().from(employeesTable);
  const eMap = new Map(employees.map(e => [e.id, e.name]));
  if (employeeId) leaves = leaves.filter(l => l.employeeId === parseInt(String(employeeId)));
  if (status) leaves = leaves.filter(l => l.status === status);
  res.json(leaves.map(l => ({ ...l, days: l.days ? Number(l.days) : null, employeeName: eMap.get(l.employeeId) ?? "" })).reverse());
});

router.post("/leaves", async (req, res) => {
  const { employeeId, leaveType, startDate, endDate, reason } = req.body;
  const start = new Date(startDate);
  const end = new Date(endDate);
  const days = Math.ceil((end.getTime() - start.getTime()) / 86400000) + 1;
  const [leave] = await db.insert(leaveRequestsTable).values({ employeeId, leaveType, startDate, endDate, days: String(days), reason }).returning();
  const employees = await db.select().from(employeesTable);
  const eMap = new Map(employees.map(e => [e.id, e.name]));
  res.status(201).json({ ...leave, days: Number(leave.days), employeeName: eMap.get(leave.employeeId) ?? "" });
});

router.patch("/leaves/:id/status", async (req, res) => {
  const id = parseInt(req.params.id);
  const { status, notes } = req.body;
  const [leave] = await db.update(leaveRequestsTable).set({ status, approvedBy: status === "approved" ? "Manager" : undefined }).where(eq(leaveRequestsTable.id, id)).returning();
  if (!leave) { res.status(404).json({ error: "Not found" }); return; }
  const employees = await db.select().from(employeesTable);
  const eMap = new Map(employees.map(e => [e.id, e.name]));
  res.json({ ...leave, days: Number(leave.days), employeeName: eMap.get(leave.employeeId) ?? "" });
});

export default router;
