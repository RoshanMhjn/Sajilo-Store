import { useState, useRef } from "react";
import { useListProducts, useListCustomers, useCreateSale, getListInventoryQueryKey, getListProductsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Plus, Minus, Trash2, ShoppingCart, CreditCard, Banknote, Smartphone, CheckCircle2, X } from "lucide-react";

type CartItem = {
  productId: number;
  name: string;
  price: number;
  tax: number;
  quantity: number;
  unit: string;
};

const paymentMethods = [
  { id: "cash", label: "Cash", icon: Banknote },
  { id: "card", label: "Card", icon: CreditCard },
  { id: "digital_wallet", label: "Digital Wallet", icon: Smartphone },
];

export default function POS() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [amountPaid, setAmountPaid] = useState("");
  const [customerId, setCustomerId] = useState<number | null>(null);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [lastSale, setLastSale] = useState<any>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const { data: productsData, isLoading: productsLoading } = useListProducts({ search: search || undefined, limit: 50 });
  const { data: customers } = useListCustomers({ limit: 100 });
  const createSale = useCreateSale();

  const products = (productsData as any)?.items ?? [];
  const customerList = (customers as any)?.items ?? [];

  function addToCart(product: any) {
    setCart(prev => {
      const existing = prev.find(i => i.productId === product.id);
      if (existing) return prev.map(i => i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { productId: product.id, name: product.name, price: Number(product.sellingPrice), tax: Number(product.tax), quantity: 1, unit: product.unit }];
    });
    setSearch("");
    searchRef.current?.focus();
  }

  function updateQty(productId: number, delta: number) {
    setCart(prev => prev.map(i => i.productId === productId ? { ...i, quantity: Math.max(1, i.quantity + delta) } : i).filter(i => i.quantity > 0));
  }

  function removeItem(productId: number) { setCart(prev => prev.filter(i => i.productId !== productId)); }
  function clearCart() { setCart([]); setAmountPaid(""); setCustomerId(null); }

  const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const taxTotal = cart.reduce((s, i) => s + i.price * i.quantity * (i.tax / 100), 0);
  const total = subtotal + taxTotal;
  const paid = parseFloat(amountPaid) || 0;
  const change = Math.max(0, paid - total);

  function numpadPress(val: string) {
    if (val === "C") { setAmountPaid(""); return; }
    if (val === "." && amountPaid.includes(".")) return;
    setAmountPaid(prev => prev + val);
  }

  async function handleCheckout() {
    if (cart.length === 0) { toast({ variant: "destructive", title: "Cart is empty" }); return; }
    if (paymentMethod === "cash" && paid < total) { toast({ variant: "destructive", title: "Insufficient payment" }); return; }

    const salePayload = {
      customerId: customerId ?? undefined,
      items: cart.map(i => ({ productId: i.productId, productName: i.name, quantity: i.quantity, unitPrice: i.price, tax: i.tax, discount: 0 })),
      discount: 0,
      paymentMethod,
      amountPaid: paymentMethod === "cash" ? paid : total,
      notes: "",
    };

    try {
      const sale = await createSale.mutateAsync({ data: salePayload as any });
      await qc.invalidateQueries({ queryKey: getListProductsQueryKey() });
      await qc.invalidateQueries({ queryKey: getListInventoryQueryKey() });
      setLastSale(sale);
      setReceiptOpen(true);
      clearCart();
      toast({ title: "Sale completed successfully" });
    } catch { toast({ variant: "destructive", title: "Failed to process sale" }); }
  }

  return (
    <div className="flex h-[calc(100vh-3rem)] bg-background">
      {/* Product Search Panel */}
      <div className="flex-1 flex flex-col border-r border-border">
        <div className="p-4 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              ref={searchRef}
              placeholder="Search products by name or scan barcode..."
              className="pl-9"
              value={search}
              onChange={e => setSearch(e.target.value)}
              autoFocus
              data-testid="input-pos-search"
            />
          </div>
        </div>
        <ScrollArea className="flex-1 p-4">
          {productsLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="h-24 rounded-lg bg-muted animate-pulse" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
              <ShoppingCart className="h-10 w-10 mb-2 opacity-30" />
              <p className="text-sm">No products found</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {products.map((p: any) => {
                const inCart = cart.find(c => c.productId === p.id);
                const outOfStock = p.currentStock <= 0;
                return (
                  <button
                    key={p.id}
                    onClick={() => !outOfStock && addToCart(p)}
                    disabled={outOfStock}
                    data-testid={`button-pos-product-${p.id}`}
                    className={`relative p-3 rounded-lg border text-left transition-all ${
                      outOfStock ? "opacity-40 cursor-not-allowed bg-muted border-border" :
                      inCart ? "border-primary bg-primary/5 shadow-sm" :
                      "border-border bg-card hover:border-primary/50 hover:bg-accent cursor-pointer"
                    }`}
                  >
                    <div className="text-sm font-medium leading-tight line-clamp-2">{p.name}</div>
                    <div className="text-lg font-bold mt-1 text-primary">${Number(p.sellingPrice).toFixed(2)}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{p.currentStock} {p.unit} in stock</div>
                    {inCart && (
                      <div className="absolute top-2 right-2">
                        <Badge className="h-5 min-w-5 text-xs px-1">{inCart.quantity}</Badge>
                      </div>
                    )}
                    {outOfStock && <div className="text-xs text-destructive font-medium mt-0.5">Out of stock</div>}
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Cart & Checkout Panel */}
      <div className="w-80 shrink-0 flex flex-col bg-card">
        {/* Cart header */}
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <h2 className="font-semibold flex items-center gap-2">
            <ShoppingCart className="h-4 w-4" />Cart
            {cart.length > 0 && <Badge variant="secondary">{cart.length}</Badge>}
          </h2>
          {cart.length > 0 && (
            <Button variant="ghost" size="sm" className="text-destructive h-7 px-2 text-xs" onClick={clearCart}>
              <X className="h-3.5 w-3.5 mr-1" />Clear
            </Button>
          )}
        </div>

        {/* Cart items */}
        <ScrollArea className="flex-1">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground mt-8">
              <ShoppingCart className="h-8 w-8 mb-2 opacity-30" />
              <p className="text-sm">Add products to cart</p>
            </div>
          ) : (
            <div className="p-3 space-y-2">
              {cart.map(item => (
                <div key={item.productId} className="flex items-center gap-2 py-2 border-b border-border/50 last:border-0" data-testid={`cart-item-${item.productId}`}>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{item.name}</div>
                    <div className="text-xs text-muted-foreground">${item.price.toFixed(2)} × {item.quantity}</div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => updateQty(item.productId, -1)}>
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                    <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => updateQty(item.productId, 1)}>
                      <Plus className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive ml-1" onClick={() => removeItem(item.productId)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="w-14 text-right text-sm font-semibold">${(item.price * item.quantity).toFixed(2)}</div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Totals & Payment */}
        <div className="border-t border-border p-3 space-y-3">
          <div className="space-y-1 text-sm">
            <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
            <div className="flex justify-between text-muted-foreground"><span>Tax</span><span>${taxTotal.toFixed(2)}</span></div>
            <div className="flex justify-between font-bold text-base border-t border-border pt-1"><span>Total</span><span>${total.toFixed(2)}</span></div>
          </div>

          {/* Customer */}
          <Select value={customerId?.toString() ?? "walkIn"} onValueChange={v => setCustomerId(v === "walkIn" ? null : parseInt(v))}>
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Walk-in customer" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="walkIn">Walk-in Customer</SelectItem>
              {customerList.map((c: any) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>

          {/* Payment method */}
          <div className="grid grid-cols-3 gap-1">
            {paymentMethods.map(pm => {
              const Icon = pm.icon;
              return (
                <button
                  key={pm.id}
                  onClick={() => setPaymentMethod(pm.id)}
                  data-testid={`button-payment-${pm.id}`}
                  className={`flex flex-col items-center gap-0.5 py-2 rounded-md border text-xs transition-colors ${paymentMethod === pm.id ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary/50"}`}
                >
                  <Icon className="h-4 w-4" />
                  {pm.label}
                </button>
              );
            })}
          </div>

          {/* Amount Paid (cash only) */}
          {paymentMethod === "cash" && (
            <div className="space-y-2">
              <div className="flex gap-1">
                <Input className="h-8 text-sm font-mono" placeholder="Amount paid" value={amountPaid} onChange={e => setAmountPaid(e.target.value)} data-testid="input-amount-paid" />
                {change > 0 && <div className="text-xs text-green-700 font-semibold self-center ml-1 whitespace-nowrap">Change: ${change.toFixed(2)}</div>}
              </div>
              <div className="grid grid-cols-4 gap-1">
                {["1","2","3","4","5","6","7","8","9","00","0","."].map(v => (
                  <button key={v} onClick={() => numpadPress(v)} className="h-8 text-sm font-mono rounded-md bg-muted hover:bg-muted/80 transition-colors">{v}</button>
                ))}
              </div>
              <button onClick={() => numpadPress("C")} className="w-full h-7 text-xs rounded-md bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors">Clear</button>
              <div className="grid grid-cols-2 gap-1">
                {[total, Math.ceil(total), Math.ceil(total / 5) * 5, Math.ceil(total / 10) * 10].filter((v, i, arr) => arr.indexOf(v) === i).slice(0, 4).map(v => (
                  <button key={v} onClick={() => setAmountPaid(v.toFixed(2))} className="h-7 text-xs rounded-md bg-accent hover:bg-accent/80 transition-colors font-medium">${v.toFixed(2)}</button>
                ))}
              </div>
            </div>
          )}

          <Button
            className="w-full h-10 text-sm font-semibold"
            disabled={cart.length === 0 || createSale.isPending || (paymentMethod === "cash" && paid < total)}
            onClick={handleCheckout}
            data-testid="button-checkout"
          >
            {createSale.isPending ? "Processing..." : `Charge $${total.toFixed(2)}`}
          </Button>
        </div>
      </div>

      {/* Receipt Dialog */}
      <Dialog open={receiptOpen} onOpenChange={setReceiptOpen}>
        <DialogContent className="max-w-xs">
          <DialogHeader><DialogTitle className="text-center">Sale Complete</DialogTitle></DialogHeader>
          {lastSale && (
            <div className="space-y-4 text-sm">
              <div className="flex justify-center">
                <CheckCircle2 className="h-12 w-12 text-green-500" />
              </div>
              <div className="text-center">
                <div className="font-mono font-bold text-lg">{lastSale.invoiceNumber}</div>
                <div className="text-muted-foreground text-xs">{new Date(lastSale.createdAt).toLocaleString()}</div>
              </div>
              <Separator />
              <div className="space-y-1">
                {(lastSale.items as any[]).map((item: any, i: number) => (
                  <div key={i} className="flex justify-between">
                    <span>{item.productName ?? item.name} ×{item.quantity}</span>
                    <span>${(item.quantity * item.unitPrice).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <Separator />
              <div className="space-y-1">
                <div className="flex justify-between text-muted-foreground"><span>Tax</span><span>${Number(lastSale.tax).toFixed(2)}</span></div>
                <div className="flex justify-between font-bold text-base"><span>Total</span><span>${Number(lastSale.total).toFixed(2)}</span></div>
                {lastSale.paymentMethod === "cash" && Number(lastSale.change) > 0 && (
                  <div className="flex justify-between text-green-700 font-medium"><span>Change</span><span>${Number(lastSale.change).toFixed(2)}</span></div>
                )}
              </div>
              <div className="text-center text-xs text-muted-foreground capitalize">Payment: {lastSale.paymentMethod.replace("_", " ")}</div>
              <Button className="w-full" onClick={() => setReceiptOpen(false)} data-testid="button-receipt-close">New Sale</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
