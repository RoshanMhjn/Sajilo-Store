import { useState } from "react";
import { useListPayroll, useCreatePayrollRecord, useProcessPayroll, useListEmployees, getListPayrollQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Plus, DollarSign, Zap } from "lucide-react";

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  processed: "bg-green-100 text-green-800",
  paid: "bg-blue-100 text-blue-800",
};

const schema = z.object({
  employeeId: z.number({ required_error: "Employee required" }),
  month: z.number().min(1).max(12),
  year: z.number().min(2020),
  basicSalary: z.number().min(0),
  bonus: z.number().min(0).default(0),
  allowances: z.number().min(0).default(0),
  deductions: z.number().min(0).default(0),
  tax: z.number().min(0).default(0),
});

const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];

export default function Payroll() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [processOpen, setProcessOpen] = useState(false);
  const [processMonth, setProcessMonth] = useState(new Date().getMonth() + 1);
  const [processYear, setProcessYear] = useState(new Date().getFullYear());
  const [monthFilter, setMonthFilter] = useState(new Date().getMonth() + 1);
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear());

  const { data, isLoading } = useListPayroll({ month: monthFilter, year: yearFilter });
  const { data: employees } = useListEmployees({});
  const createMut = useCreatePayrollRecord();
  const processMut = useProcessPayroll();

  const records = (data as any[]) ?? [];
  const empList = (employees as any[]) ?? [];

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { month: new Date().getMonth() + 1, year: new Date().getFullYear(), basicSalary: 0, bonus: 0, allowances: 0, deductions: 0, tax: 0 },
  });

  async function onSubmit(values: z.infer<typeof schema>) {
    try {
      await createMut.mutateAsync({ data: values as any });
      await qc.invalidateQueries({ queryKey: getListPayrollQueryKey() });
      toast({ title: "Payroll record created" });
      setOpen(false);
    } catch { toast({ variant: "destructive", title: "Failed to create payroll record" }); }
  }

  async function handleBulkProcess() {
    try {
      await processMut.mutateAsync({ data: { month: processMonth, year: processYear } as any });
      await qc.invalidateQueries({ queryKey: getListPayrollQueryKey() });
      toast({ title: `Payroll processed for ${months[processMonth - 1]} ${processYear}` });
      setProcessOpen(false);
    } catch { toast({ variant: "destructive", title: "Failed to process payroll" }); }
  }

  const totalNetPay = records.reduce((s, r) => s + Number(r.netPay), 0);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Payroll</h1>
          <p className="text-sm text-muted-foreground">{records.length} records</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setProcessOpen(true)} data-testid="button-process-payroll">
            <Zap className="h-4 w-4 mr-2" />Process Payroll
          </Button>
          <Button onClick={() => setOpen(true)} data-testid="button-add-payroll"><Plus className="h-4 w-4 mr-2" />Add Record</Button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Select value={String(monthFilter)} onValueChange={v => setMonthFilter(parseInt(v))}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>{months.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={String(yearFilter)} onValueChange={v => setYearFilter(parseInt(v))}>
          <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
          <SelectContent>{[2024, 2025, 2026].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
        </Select>
        {records.length > 0 && (
          <Card className="ml-auto">
            <CardContent className="py-2 px-4">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Total Net Pay:</span>
                <span className="font-bold text-lg">${totalNetPay.toLocaleString()}</span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Basic Salary</TableHead>
                <TableHead>Bonus</TableHead>
                <TableHead>Deductions</TableHead>
                <TableHead>Tax</TableHead>
                <TableHead>Net Pay</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>{Array.from({ length: 8 }).map((__, j) => <TableCell key={j}><Skeleton className="h-4" /></TableCell>)}</TableRow>
              )) : records.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="py-12 text-center text-muted-foreground">
                  <DollarSign className="h-8 w-8 mx-auto mb-2 opacity-40" />No payroll records for this period
                </TableCell></TableRow>
              ) : records.map((r: any) => (
                <TableRow key={r.id} data-testid={`row-payroll-${r.id}`}>
                  <TableCell className="font-medium">{r.employeeName}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{months[r.month - 1]} {r.year}</TableCell>
                  <TableCell>${Number(r.basicSalary).toLocaleString()}</TableCell>
                  <TableCell className="text-green-700">+${Number(r.bonus).toLocaleString()}</TableCell>
                  <TableCell className="text-red-700">-${Number(r.deductions).toLocaleString()}</TableCell>
                  <TableCell className="text-red-700">-${Number(r.tax).toLocaleString()}</TableCell>
                  <TableCell className="font-bold">${Number(r.netPay).toLocaleString()}</TableCell>
                  <TableCell><Badge className={statusColors[r.status] ?? ""}>{r.status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Payroll Record</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
              <FormField control={form.control} name="employeeId" render={({ field }) => (
                <FormItem><FormLabel>Employee</FormLabel>
                  <Select value={field.value?.toString() ?? ""} onValueChange={v => {
                    field.onChange(parseInt(v));
                    const emp = empList.find((e: any) => e.id === parseInt(v));
                    if (emp) form.setValue("basicSalary", Number(emp.salary));
                  }}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger></FormControl>
                    <SelectContent>{empList.map((e: any) => <SelectItem key={e.id} value={String(e.id)}>{e.name}</SelectItem>)}</SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="month" render={({ field }) => (
                  <FormItem><FormLabel>Month</FormLabel>
                    <Select value={String(field.value)} onValueChange={v => field.onChange(parseInt(v))}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>{months.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}</SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="year" render={({ field }) => (<FormItem><FormLabel>Year</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value))} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="basicSalary" render={({ field }) => (<FormItem><FormLabel>Basic Salary</FormLabel><FormControl><Input type="number" step="0.01" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="bonus" render={({ field }) => (<FormItem><FormLabel>Bonus</FormLabel><FormControl><Input type="number" step="0.01" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="deductions" render={({ field }) => (<FormItem><FormLabel>Deductions</FormLabel><FormControl><Input type="number" step="0.01" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="tax" render={({ field }) => (<FormItem><FormLabel>Tax</FormLabel><FormControl><Input type="number" step="0.01" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} /></FormControl><FormMessage /></FormItem>)} />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createMut.isPending}>Save</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={processOpen} onOpenChange={setProcessOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Process Bulk Payroll</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">This will auto-generate payroll records for all active employees.</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Month</label>
                <Select value={String(processMonth)} onValueChange={v => setProcessMonth(parseInt(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{months.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Year</label>
                <Input type="number" value={processYear} onChange={e => setProcessYear(parseInt(e.target.value))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProcessOpen(false)}>Cancel</Button>
            <Button onClick={handleBulkProcess} disabled={processMut.isPending}>
              {processMut.isPending ? "Processing..." : "Process"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
