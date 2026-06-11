import { useState } from "react";
import { useListInventory, useListInventoryMovements, useCreateInventoryMovement, getListInventoryQueryKey, getListInventoryMovementsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Plus, AlertTriangle, TrendingUp, TrendingDown, ArrowLeftRight, Wrench } from "lucide-react";

const movementSchema = z.object({
  productId: z.number({ required_error: "Product required" }),
  type: z.enum(["stock_in", "stock_out", "adjustment", "damaged", "returned"]),
  quantity: z.number().min(0.01, "Quantity must be positive"),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

const movementTypeConfig: Record<string, { label: string; color: string; icon: any }> = {
  stock_in: { label: "Stock In", color: "text-green-600", icon: TrendingUp },
  stock_out: { label: "Stock Out", color: "text-red-600", icon: TrendingDown },
  adjustment: { label: "Adjustment", color: "text-blue-600", icon: Wrench },
  damaged: { label: "Damaged", color: "text-orange-600", icon: AlertTriangle },
  returned: { label: "Returned", color: "text-purple-600", icon: ArrowLeftRight },
};

export default function Inventory() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: inventory, isLoading } = useListInventory({});
  const { data: movements, isLoading: movementsLoading } = useListInventoryMovements({});
  const createMovement = useCreateInventoryMovement();

  const form = useForm<z.infer<typeof movementSchema>>({
    resolver: zodResolver(movementSchema),
    defaultValues: { type: "stock_in", quantity: 0, reference: "", notes: "" },
  });

  const items = (inventory as any[]) ?? [];
  const movItems = (movements as any[]) ?? [];

  async function onSubmit(values: z.infer<typeof movementSchema>) {
    try {
      await createMovement.mutateAsync({ data: values as any });
      await qc.invalidateQueries({ queryKey: getListInventoryQueryKey() });
      await qc.invalidateQueries({ queryKey: getListInventoryMovementsQueryKey() });
      toast({ title: "Inventory movement recorded" });
      setOpen(false);
      form.reset();
    } catch { toast({ variant: "destructive", title: "Failed to record movement" }); }
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Inventory</h1>
          <p className="text-sm text-muted-foreground">{items.length} products tracked</p>
        </div>
        <Button onClick={() => setOpen(true)} data-testid="button-adjust-inventory"><Plus className="h-4 w-4 mr-2" />Adjust Stock</Button>
      </div>

      <Tabs defaultValue="levels">
        <TabsList>
          <TabsTrigger value="levels">Stock Levels</TabsTrigger>
          <TabsTrigger value="movements">Movement History</TabsTrigger>
        </TabsList>

        <TabsContent value="levels">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Qty in Stock</TableHead>
                    <TableHead>Reserved</TableHead>
                    <TableHead>Damaged</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? Array.from({ length: 6 }).map((_, i) => (
                    <TableRow key={i}>{Array.from({ length: 7 }).map((__, j) => <TableCell key={j}><Skeleton className="h-4" /></TableCell>)}</TableRow>
                  )) : items.map((inv: any) => (
                    <TableRow key={inv.id} data-testid={`row-inventory-${inv.id}`}>
                      <TableCell className="font-medium">{inv.productName}</TableCell>
                      <TableCell className="font-mono text-xs">{inv.sku}</TableCell>
                      <TableCell className="font-semibold">{inv.quantity}</TableCell>
                      <TableCell className="text-muted-foreground">{inv.reservedQty}</TableCell>
                      <TableCell className={inv.damagedQty > 0 ? "text-destructive" : "text-muted-foreground"}>{inv.damagedQty}</TableCell>
                      <TableCell className="text-muted-foreground">{inv.unit}</TableCell>
                      <TableCell>
                        {inv.quantity <= 0
                          ? <Badge variant="destructive">Out of Stock</Badge>
                          : inv.quantity <= 20
                          ? <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">Low Stock</Badge>
                          : <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-100">In Stock</Badge>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="movements">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movementsLoading ? Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>{Array.from({ length: 6 }).map((__, j) => <TableCell key={j}><Skeleton className="h-4" /></TableCell>)}</TableRow>
                  )) : movItems.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="py-12 text-center text-muted-foreground">No movements recorded</TableCell></TableRow>
                  ) : movItems.map((m: any) => {
                    const cfg = movementTypeConfig[m.type] ?? { label: m.type, color: "", icon: ArrowLeftRight };
                    const Icon = cfg.icon;
                    return (
                      <TableRow key={m.id}>
                        <TableCell className="text-sm text-muted-foreground">{new Date(m.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell className="font-medium">{m.productName}</TableCell>
                        <TableCell>
                          <div className={`flex items-center gap-1.5 ${cfg.color}`}>
                            <Icon className="h-3.5 w-3.5" />
                            <span className="text-sm font-medium">{cfg.label}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-semibold">{m.quantity}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{m.reference ?? "—"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{m.notes ?? "—"}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Record Stock Movement</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="productId" render={({ field }) => (
                <FormItem><FormLabel>Product</FormLabel>
                  <Select value={field.value?.toString() ?? ""} onValueChange={v => field.onChange(parseInt(v))}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {items.map((inv: any) => <SelectItem key={inv.productId} value={String(inv.productId)}>{inv.productName}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="type" render={({ field }) => (
                <FormItem><FormLabel>Movement Type</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      {Object.entries(movementTypeConfig).map(([v, c]) => <SelectItem key={v} value={v}>{c.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="quantity" render={({ field }) => (
                <FormItem><FormLabel>Quantity</FormLabel><FormControl><Input type="number" step="0.01" min="0" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="reference" render={({ field }) => (
                <FormItem><FormLabel>Reference</FormLabel><FormControl><Input placeholder="PO number, invoice, etc." {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem><FormLabel>Notes</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createMovement.isPending}>Record</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
