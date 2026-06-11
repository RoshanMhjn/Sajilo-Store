import { Router } from "express";
import { db, attendanceTable, employeesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/attendance", async (req, res) => {
  const { employeeId, dateFrom, dateTo } = req.query;
  let records = await db.select().from(attendanceTable).orderBy(attendanceTable.date);
  const employees = await db.select().from(employeesTable);
  const eMap = new Map(employees.map(e => [e.id, e.name]));
  if (employeeId) records = records.filter(r => r.employeeId === parseInt(String(employeeId)));
  if (dateFrom) records = records.filter(r => r.date >= String(dateFrom));
  if (dateTo) records = records.filter(r => r.date <= String(dateTo));
  res.json(records.map(r => ({ ...r, workingHours: r.workingHours ? Number(r.workingHours) : null, overtime: r.overtime ? Number(r.overtime) : null, employeeName: eMap.get(r.employeeId) ?? "" })).reverse());
});

router.post("/attendance", async (req, res) => {
  const { employeeId, date, type, time, status, notes } = req.body;
  const existing = await db.select().from(attendanceTable).where(eq(attendanceTable.employeeId, employeeId));
  const todayRecord = existing.find(r => r.date === date);
  if (todayRecord && type === "check_out") {
    const checkInTime = todayRecord.checkIn ? new Date(`${date}T${todayRecord.checkIn}`) : null;
    const checkOutTime = time ? new Date(`${date}T${time}`) : new Date();
    const hours = checkInTime ? (checkOutTime.getTime() - checkInTime.getTime()) / 3600000 : 0;
    const overtime = Math.max(0, hours - 8);
    const [updated] = await db.update(attendanceTable).set({ checkOut: time ?? new Date().toTimeString().slice(0, 5), workingHours: String(hours.toFixed(2)), overtime: String(overtime.toFixed(2)) }).where(eq(attendanceTable.id, todayRecord.id)).returning();
    const employees = await db.select().from(employeesTable);
    const eMap = new Map(employees.map(e => [e.id, e.name]));
    res.status(201).json({ ...updated, workingHours: Number(updated.workingHours), overtime: Number(updated.overtime), employeeName: eMap.get(updated.employeeId) ?? "" });
    return;
  }
  const [record] = await db.insert(attendanceTable).values({ employeeId, date, checkIn: type === "check_in" ? (time ?? new Date().toTimeString().slice(0, 5)) : null, status: status ?? "present" }).returning();
  const employees = await db.select().from(employeesTable);
  const eMap = new Map(employees.map(e => [e.id, e.name]));
  res.status(201).json({ ...record, workingHours: record.workingHours ? Number(record.workingHours) : null, overtime: record.overtime ? Number(record.overtime) : null, employeeName: eMap.get(record.employeeId) ?? "" });
});

export default router;
