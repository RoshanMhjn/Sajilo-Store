import { useState } from "react";
import { useListSales, useGetSale, useReturnSale, getListSalesQueryKey, getGetSaleQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Receipt, Eye, RotateCcw } from "lucide-react";

const paymentMethodColors: Record<string, string> = {
  cash: "bg-green-100 text-green-800",
  card: "bg-blue-100 text-blue-800",
  digital_wallet: "bg-purple-100 text-purple-800",
};
const statusColors: Record<string, string> = {
  completed: "bg-green-100 text-green-800",
  returned: "bg-red-100 text-red-800",
  pending: "bg-yellow-100 text-yellow-800",
};

export default function Sales() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [viewId, setViewId] = useState<number | null>(null);

  const { data, isLoading } = useListSales({ page, limit: 20 });
  const { data: saleDetail, isLoading: detailLoading } = useGetSale(viewId!, {
    query: { enabled: !!viewId, queryKey: getGetSaleQueryKey(viewId!) }
  });
  const returnMut = useReturnSale();

  const items = (data as any)?.items ?? [];
  const total = (data as any)?.total ?? 0;

  async function handleReturn(id: number) {
    try {
      await returnMut.mutateAsync({ id, data: {} as any });
      await qc.invalidateQueries({ queryKey: getListSalesQueryKey() });
      if (viewId) await qc.invalidateQueries({ queryKey: getGetSaleQueryKey(viewId) });
      toast({ title: "Sale returned" });
    } catch { toast({ variant: "destructive", title: "Failed to process return" }); }
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Sales History</h1>
          <p className="text-sm text-muted-foreground">{total} transactions</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>{Array.from({ length: 8 }).map((__, j) => <TableCell key={j}><Skeleton className="h-4" /></TableCell>)}</TableRow>
              )) : items.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="py-12 text-center text-muted-foreground">
                  <Receipt className="h-8 w-8 mx-auto mb-2 opacity-40" />No sales recorded
                </TableCell></TableRow>
              ) : items.map((s: any) => (
                <TableRow key={s.id} data-testid={`row-sale-${s.id}`}>
                  <TableCell className="font-mono text-sm font-medium">{s.invoiceNumber}</TableCell>
                  <TableCell className="text-sm">{s.customerName ?? "Walk-in"}</TableCell>
                  <TableCell className="text-sm">{(s.items as any[]).length}</TableCell>
                  <TableCell className="font-semibold">${Number(s.total).toFixed(2)}</TableCell>
                  <TableCell><Badge className={paymentMethodColors[s.paymentMethod] ?? ""}>{s.paymentMethod.replace("_", " ")}</Badge></TableCell>
                  <TableCell><Badge className={statusColors[s.status] ?? ""}>{s.status}</Badge></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{new Date(s.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setViewId(s.id)}>
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
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

      <Dialog open={viewId !== null} onOpenChange={() => setViewId(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Sale Details</DialogTitle></DialogHeader>
          {detailLoading ? <Skeleton className="h-64" /> : saleDetail && (
            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-mono font-bold text-lg">{(saleDetail as any).invoiceNumber}</div>
                  <div className="text-sm text-muted-foreground">{new Date((saleDetail as any).createdAt).toLocaleString()}</div>
                </div>
                <Badge className={statusColors[(saleDetail as any).status] ?? ""}>{(saleDetail as any).status}</Badge>
              </div>
              <Separator />
              <div className="space-y-2">
                {((saleDetail as any).items as any[]).map((item: any, i: number) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span>{item.productName ?? item.name} x{item.quantity}</span>
                    <span className="font-medium">${Number(item.total ?? item.quantity * item.unitPrice).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <Separator />
              <div className="space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>${Number((saleDetail as any).subtotal).toFixed(2)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span>${Number((saleDetail as any).tax).toFixed(2)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Discount</span><span>-${Number((saleDetail as any).discount).toFixed(2)}</span></div>
                <div className="flex justify-between font-bold text-base border-t pt-1"><span>Total</span><span>${Number((saleDetail as any).total).toFixed(2)}</span></div>
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">Payment: </span>
                <span className="font-medium">{(saleDetail as any).paymentMethod.replace("_", " ")}</span>
                {(saleDetail as any).customerName && <span className="ml-4 text-muted-foreground">Customer: <span className="font-medium text-foreground">{(saleDetail as any).customerName}</span></span>}
              </div>
              {(saleDetail as any).status === "completed" && (
                <Button variant="outline" size="sm" className="w-full text-destructive border-destructive hover:bg-destructive/10" onClick={() => handleReturn((saleDetail as any).id)}>
                  <RotateCcw className="h-3.5 w-3.5 mr-2" />Process Return
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
