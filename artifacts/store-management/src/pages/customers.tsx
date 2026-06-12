import { useState } from "react";
import { useListCustomers, useCreateCustomer, useUpdateCustomer, useDeleteCustomer, getListCustomersQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Plus, Search, Edit, Trash2, Users, Star, Crown, Award } from "lucide-react";

const tierConfig: Record<string, { label: string; discount: number; color: string; icon: any; nextAt?: number; nextLabel?: string }> = {
  basic:    { label: "Basic",    discount: 0,  color: "bg-gray-100 text-gray-700",     icon: Star,  nextAt: 10000,  nextLabel: "Gold" },
  gold:     { label: "Gold",     discount: 5,  color: "bg-yellow-100 text-yellow-800", icon: Award, nextAt: 50000,  nextLabel: "Platinum" },
  platinum: { label: "Platinum", discount: 10, color: "bg-blue-100 text-blue-800",     icon: Crown },
};

function fmt(amount: number) {
  return `रू ${amount.toLocaleString("en-NP", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const schema = z.object({
  name: z.string().min(1, "Name required"),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
});

export default function Customers() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const { data, isLoading } = useListCustomers({ search: search || undefined, page, limit: 20 });
  const createMut = useCreateCustomer();
  const updateMut = useUpdateCustomer();
  const deleteMut = useDeleteCustomer();

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", email: "", phone: "", address: "" },
  });

  function openCreate() { setEditItem(null); form.reset({ name: "", email: "", phone: "", address: "" }); setOpen(true); }
  function openEdit(c: any) { setEditItem(c); form.reset({ name: c.name, email: c.email ?? "", phone: c.phone ?? "", address: c.address ?? "" }); setOpen(true); }

  async function onSubmit(values: z.infer<typeof schema>) {
    try {
      if (editItem) await updateMut.mutateAsync({ id: editItem.id, data: values as any });
      else await createMut.mutateAsync({ data: values as any });
      await qc.invalidateQueries({ queryKey: getListCustomersQueryKey() });
      toast({ title: editItem ? "Customer updated" : "Customer added" });
      setOpen(false);
    } catch { toast({ variant: "destructive", title: "Failed to save customer" }); }
  }

  async function handleDelete() {
    if (deleteId === null) return;
    try {
      await deleteMut.mutateAsync({ id: deleteId });
      await qc.invalidateQueries({ queryKey: getListCustomersQueryKey() });
      toast({ title: "Customer deleted" });
      setDeleteId(null);
    } catch { toast({ variant: "destructive", title: "Failed to delete" }); }
  }

  const items = (data as any)?.items ?? [];
  const total = (data as any)?.total ?? 0;

  // Tier summary counts
  const tierCounts = { basic: 0, gold: 0, platinum: 0 };
  items.forEach((c: any) => { if (c.membershipTier in tierCounts) (tierCounts as any)[c.membershipTier]++; });

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Customers</h1>
          <p className="text-sm text-muted-foreground">{total} members</p>
        </div>
        <Button onClick={openCreate} data-testid="button-create-customer"><Plus className="h-4 w-4 mr-2" />Add Customer</Button>
      </div>

      {/* Tier summary cards */}
      <div className="grid grid-cols-3 gap-3">
        {(["basic", "gold", "platinum"] as const).map(tier => {
          const cfg = tierConfig[tier];
          const Icon = cfg.icon;
          return (
            <Card key={tier} className="border">
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`h-9 w-9 rounded-full flex items-center justify-center ${cfg.color}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-sm font-semibold">{cfg.label}</div>
                  <div className="text-xs text-muted-foreground">{cfg.discount}% discount · {tierCounts[tier]} members</div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="relative max-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search by name, phone or member #..." className="pl-8" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member #</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead>Points</TableHead>
                <TableHead>Total Spent</TableHead>
                <TableHead className="w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>{Array.from({ length: 7 }).map((__, j) => <TableCell key={j}><Skeleton className="h-4" /></TableCell>)}</TableRow>
              )) : items.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-40" />No customers found
                </TableCell></TableRow>
              ) : items.map((c: any) => {
                const tier = tierConfig[c.membershipTier] ?? tierConfig.basic;
                const Icon = tier.icon;
                const totalSpent = Number(c.totalPurchases);
                const pctToNext = tier.nextAt ? Math.min(100, (totalSpent / tier.nextAt) * 100) : 100;
                return (
                  <TableRow key={c.id} data-testid={`row-customer-${c.id}`}>
                    <TableCell className="font-mono text-xs text-muted-foreground">{c.memberNumber ?? "—"}</TableCell>
                    <TableCell>
                      <div className="font-medium">{c.name}</div>
                      {c.email && <div className="text-xs text-muted-foreground">{c.email}</div>}
                    </TableCell>
                    <TableCell className="text-sm">{c.phone ?? "—"}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Badge className={`${tier.color} gap-1 w-fit`}>
                          <Icon className="h-3 w-3" />{tier.label}
                          {tier.discount > 0 && <span className="opacity-75">·{tier.discount}%</span>}
                        </Badge>
                        {tier.nextAt && (
                          <div className="w-20">
                            <div className="h-1 bg-muted rounded-full overflow-hidden">
                              <div className="h-full bg-primary rounded-full" style={{ width: `${pctToNext}%` }} />
                            </div>
                            <div className="text-[9px] text-muted-foreground mt-0.5">
                              {fmt(Math.max(0, (tier.nextAt ?? 0) - totalSpent))} to {tier.nextLabel}
                            </div>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{(c.loyaltyPoints ?? 0).toLocaleString()} pts</TableCell>
                    <TableCell className="font-medium">{fmt(totalSpent)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(c)}><Edit className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteId(c.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          {total > 20 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <span className="text-sm text-muted-foreground">Page {page} of {Math.ceil(total / 20)}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
                <Button variant="outline" size="sm" disabled={page >= Math.ceil(total / 20)} onClick={() => setPage(p => p + 1)}>Next</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editItem ? "Edit Customer" : "Add Customer"}</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
              <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Full Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="email" render={({ field }) => (<FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="phone" render={({ field }) => (<FormItem><FormLabel>Phone</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="address" render={({ field }) => (<FormItem><FormLabel>Address</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
              {!editItem && (
                <p className="text-xs text-muted-foreground">A unique member number will be auto-generated for the new customer.</p>
              )}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createMut.isPending || updateMut.isPending}>Save</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete Customer</AlertDialogTitle><AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
