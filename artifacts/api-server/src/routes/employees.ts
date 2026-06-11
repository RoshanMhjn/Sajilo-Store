import { Router } from "express";
import { db, employeesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

let empCounter = 1001;

router.get("/employees", async (req, res) => {
  const { search, department, status } = req.query;
  let employees = await db.select().from(employeesTable).orderBy(employeesTable.name);
  if (search) employees = employees.filter(e => e.name.toLowerCase().includes(String(search).toLowerCase()));
  if (department) employees = employees.filter(e => e.department === department);
  if (status) employees = employees.filter(e => e.status === status);
  res.json(employees.map(e => ({ ...e, salary: Number(e.salary) })));
});

router.post("/employees", async (req, res) => {
  const { name, email, phone, address, position, department, role, joiningDate, salary } = req.body;
  const employeeId = req.body.employeeId || `EMP${++empCounter}`;
  const [emp] = await db.insert(employeesTable).values({ employeeId, name, email, phone, address, position, department, role, joiningDate, salary: String(salary) }).returning();
  res.status(201).json({ ...emp, salary: Number(emp.salary) });
});

router.get("/employees/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const [emp] = await db.select().from(employeesTable).where(eq(employeesTable.id, id));
  if (!emp) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...emp, salary: Number(emp.salary) });
});

router.patch("/employees/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const updates: Record<string, unknown> = {};
  for (const f of ["name","email","phone","address","position","department","role","salary","status"]) {
    if (req.body[f] !== undefined) updates[f] = f === "salary" ? String(req.body[f]) : req.body[f];
  }
  const [emp] = await db.update(employeesTable).set(updates).where(eq(employeesTable.id, id)).returning();
  if (!emp) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...emp, salary: Number(emp.salary) });
});

router.delete("/employees/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  await db.delete(employeesTable).where(eq(employeesTable.id, id));
  res.status(204).send();
});

export default router;
