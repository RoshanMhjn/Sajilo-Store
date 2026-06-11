import { Router } from "express";
import { db, payrollTable, employeesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router = Router();

function toNum(n: unknown) { return Number(n ?? 0); }

router.get("/payroll", async (req, res) => {
  const { month, year, employeeId } = req.query;
  let records = await db.select().from(payrollTable).orderBy(payrollTable.createdAt);
  const employees = await db.select().from(employeesTable);
  const eMap = new Map(employees.map(e => [e.id, e.name]));
  if (month) records = records.filter(r => r.month === parseInt(String(month)));
  if (year) records = records.filter(r => r.year === parseInt(String(year)));
  if (employeeId) records = records.filter(r => r.employeeId === parseInt(String(employeeId)));
  res.json(records.map(r => ({ ...r, basicSalary: toNum(r.basicSalary), bonus: toNum(r.bonus), allowances: toNum(r.allowances), deductions: toNum(r.deductions), tax: toNum(r.tax), netPay: toNum(r.netPay), employeeName: eMap.get(r.employeeId) ?? "" })).reverse());
});

router.post("/payroll", async (req, res) => {
  const { employeeId, month, year, basicSalary, bonus = 0, allowances = 0, deductions = 0, tax = 0 } = req.body;
  const net = Number(basicSalary) + Number(bonus) + Number(allowances) - Number(deductions) - Number(tax);
  const [record] = await db.insert(payrollTable).values({ employeeId, month, year, basicSalary: String(basicSalary), bonus: String(bonus), allowances: String(allowances), deductions: String(deductions), tax: String(tax), netPay: String(net) }).returning();
  const employees = await db.select().from(employeesTable);
  const eMap = new Map(employees.map(e => [e.id, e.name]));
  res.status(201).json({ ...record, basicSalary: toNum(record.basicSalary), bonus: toNum(record.bonus), allowances: toNum(record.allowances), deductions: toNum(record.deductions), tax: toNum(record.tax), netPay: toNum(record.netPay), employeeName: eMap.get(record.employeeId) ?? "" });
});

router.get("/payroll/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const [record] = await db.select().from(payrollTable).where(eq(payrollTable.id, id));
  if (!record) { res.status(404).json({ error: "Not found" }); return; }
  const employees = await db.select().from(employeesTable);
  const eMap = new Map(employees.map(e => [e.id, e.name]));
  res.json({ ...record, basicSalary: toNum(record.basicSalary), bonus: toNum(record.bonus), allowances: toNum(record.allowances), deductions: toNum(record.deductions), tax: toNum(record.tax), netPay: toNum(record.netPay), employeeName: eMap.get(record.employeeId) ?? "" });
});

router.post("/payroll/process", async (req, res) => {
  const { month, year } = req.body;
  const employees = await db.select().from(employeesTable).where(eq(employeesTable.status, "active"));
  const records = [];
  for (const emp of employees) {
    const salary = Number(emp.salary);
    const tax = salary * 0.1;
    const net = salary - tax;
    const [record] = await db.insert(payrollTable).values({ employeeId: emp.id, month, year, basicSalary: String(salary), bonus: "0", allowances: "0", deductions: "0", tax: String(tax), netPay: String(net) }).returning();
    records.push({ ...record, basicSalary: toNum(record.basicSalary), bonus: 0, allowances: 0, deductions: 0, tax: toNum(record.tax), netPay: toNum(record.netPay), employeeName: emp.name });
  }
  res.json(records);
});

export default router;
