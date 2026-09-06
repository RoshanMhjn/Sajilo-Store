import { useState } from "react";
import {
  useListPurchaseOrders,
  useCreatePurchaseOrder,
  useUpdatePurchaseOrderStatus,
  useListSuppliers,
  useListProducts,
  getListPurchaseOrdersQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, ClipboardList, Trash2 } from "lucide-react";

const formatNpr = (amount: number) =>
  `रू ${amount.toLocaleString("en-NP", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const statusConfig: Record<string, string> = {
  draft: "outline",
  approved: "secondary",
  ordered: "default",
  received: "default",
  completed: "default",
};
const statusColors: Record<string, string> = {
  draft: "border-gray-400 text-gray-600",
  approved: "bg-blue-100 text-blue-700",
  ordered: "bg-yellow-100 text-yellow-800",
  received: "bg-purple-100 text-purple-800",
  completed: "bg-green-100 text-green-800",
};
const nextStatus: Record<string, string> = {
  draft: "approved",
  approved: "ordered",
  ordered: "received",
  received: "completed",
};

export default function Purchases() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");
  const [supplierId, setSupplierId] = useState<number | null>(null);
  const [items, setItems] = useState<any[]>([
    { productId: null, productName: "", quantity: 1, unitCost: 0 },
  ]);

  const { data, isLoading } = useListPurchaseOrders({
    status: statusFilter || undefined,
    supplierId: supplierId ?? undefined,
  });
  const { data: suppliers } = useListSuppliers({});
  const { data: productsData } = useListProducts({ limit: 100 });
  const createMut = useCreatePurchaseOrder();
  const updateStatus = useUpdatePurchaseOrderStatus();

  const orders = (data as any[]) ?? [];
  const supplierList = (suppliers as any[]) ?? [];
  const productList = ((productsData as any)?.items ?? []) as any[];

  function addItem() {
    setItems((prev) => [
      ...prev,
      { productId: null, productName: "", quantity: 1, unitCost: 0 },
    ]);
  }
  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }
  function updateItem(idx: number, key: string, value: any) {
    setItems((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, [key]: value } : item)),
    );
  }

  const subtotal = items.reduce((s, i) => s + i.quantity * i.unitCost, 0);

  async function handleCreate() {
    if (!supplierId) {
      toast({ variant: "destructive", title: "Select a supplier" });
      return;
    }
    if (items.some((i) => !i.productId)) {
      toast({ variant: "destructive", title: "Fill all item products" });
      return;
    }
    try {
      await createMut.mutateAsync({ data: { supplierId, items } as any });
      await qc.invalidateQueries({ queryKey: getListPurchaseOrdersQueryKey() });
      toast({ title: "Purchase order created" });
      setOpen(false);
      setItems([
        { productId: null, productName: "", quantity: 1, unitCost: 0 },
      ]);
      setSupplierId(null);
    } catch {
      toast({ variant: "destructive", title: "Failed to create PO" });
    }
  }

  async function handleStatusUpdate(id: number, status: string) {
    try {
      await updateStatus.mutateAsync({ id, data: { status } as any });
      await qc.invalidateQueries({ queryKey: getListPurchaseOrdersQueryKey() });
      toast({ title: `Order status updated to ${status}` });
    } catch {
      toast({ variant: "destructive", title: "Failed to update status" });
    }
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Purchase Orders</h1>
          <p className="text-sm text-muted-foreground">
            {orders.length} orders
          </p>
        </div>
        <Button onClick={() => setOpen(true)} data-testid="button-create-po">
          <Plus className="h-4 w-4 mr-2" />
          New Order
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex gap-2">
            <Select
              value={statusFilter || "all"}
              onValueChange={(v) => setStatusFilter(v === "all" ? "" : v)}
            >
              <SelectTrigger className="w-36">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {["draft", "approved", "ordered", "received", "completed"].map(
                  (s) => (
                    <SelectItem key={s} value={s}>
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order #</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 7 }).map((__, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : orders.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="py-12 text-center text-muted-foreground"
                  >
                    <ClipboardList className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    No purchase orders
                  </TableCell>
                </TableRow>
              ) : (
                orders.map((o: any) => (
                  <TableRow key={o.id} data-testid={`row-po-${o.id}`}>
                    <TableCell className="font-mono text-sm font-medium">
                      {o.orderNumber}
                    </TableCell>
                    <TableCell>{o.supplierName}</TableCell>
                    <TableCell>{(o.items as any[]).length} items</TableCell>
                    <TableCell className="font-semibold">
                      {formatNpr(Number(o.total))}
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[o.status] ?? ""}>
                        {o.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(o.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {nextStatus[o.status] && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() =>
                            handleStatusUpdate(o.id, nextStatus[o.status])
                          }
                        >
                          Mark {nextStatus[o.status]}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Purchase Order</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">
                Supplier
              </label>
              <Select
                value={supplierId?.toString() ?? ""}
                onValueChange={(v) => setSupplierId(parseInt(v))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select supplier" />
                </SelectTrigger>
                <SelectContent>
                  {supplierList.map((s: any) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Items</label>
                <Button size="sm" variant="outline" onClick={addItem}>
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Add Item
                </Button>
              </div>
              {items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-5">
                    <Select
                      value={item.productId?.toString() ?? ""}
                      onValueChange={(v) => {
                        const p = productList.find(
                          (p: any) => p.id === parseInt(v),
                        );
                        updateItem(idx, "productId", parseInt(v));
                        updateItem(idx, "productName", p?.name ?? "");
                        updateItem(idx, "unitCost", p?.costPrice ?? 0);
                      }}
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder="Product" />
                      </SelectTrigger>
                      <SelectContent>
                        {productList.map((p: any) => (
                          <SelectItem key={p.id} value={String(p.id)}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-3">
                    <Input
                      className="h-8 text-sm"
                      type="number"
                      placeholder="Qty"
                      min="1"
                      value={item.quantity}
                      onChange={(e) =>
                        updateItem(idx, "quantity", parseFloat(e.target.value))
                      }
                    />
                  </div>
                  <div className="col-span-3">
                    <Input
                      className="h-8 text-sm"
                      type="number"
                      placeholder="Cost"
                      step="0.01"
                      value={item.unitCost}
                      onChange={(e) =>
                        updateItem(idx, "unitCost", parseFloat(e.target.value))
                      }
                    />
                  </div>
                  <div className="col-span-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => removeItem(idx)}
                      disabled={items.length === 1}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-end border-t pt-3">
              <div className="text-right">
                <div className="text-sm text-muted-foreground">Subtotal</div>
                <div className="text-xl font-bold">{formatNpr(subtotal)}</div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={createMut.isPending}>
              Create Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
