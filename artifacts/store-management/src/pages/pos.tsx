import { useState, useRef } from "react";
import {
  useListProducts,
  useListCustomers,
  useCreateSale,
  getListInventoryQueryKey,
  getListProductsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Search,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  CreditCard,
  Banknote,
  Smartphone,
  CheckCircle2,
  X,
  Printer,
  Star,
} from "lucide-react";

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
  { id: "esewa", label: "eSewa", icon: Smartphone },
];

const tierConfig: Record<
  string,
  {
    label: string;
    discount: number;
    color: string;
    next?: string;
    nextAt?: number;
  }
> = {
  basic: {
    label: "Basic",
    discount: 0,
    color: "bg-gray-100 text-gray-700",
    next: "Gold",
    nextAt: 10000,
  },
  gold: {
    label: "Gold",
    discount: 5,
    color: "bg-yellow-100 text-yellow-800",
    next: "Platinum",
    nextAt: 50000,
  },
  platinum: {
    label: "Platinum",
    discount: 10,
    color: "bg-blue-100 text-blue-800",
  },
};

function fmt(amount: number) {
  return `रू ${amount.toLocaleString("en-NP", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function POS() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [amountPaid, setAmountPaid] = useState("");
  const [customerId, setCustomerId] = useState<number | null>(null);
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerSearchOpen, setCustomerSearchOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [lastSale, setLastSale] = useState<any>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const { data: productsData, isLoading: productsLoading } = useListProducts({
    search: search || undefined,
    limit: 50,
  });
  const { data: customers } = useListCustomers({
    search: customerSearch || undefined,
    limit: 200,
  });
  const createSale = useCreateSale();

  const products = (productsData as any)?.items ?? [];
  const customerList = (customers as any)?.items ?? [];
  const tierInfo = selectedCustomer
    ? (tierConfig[selectedCustomer.membershipTier] ?? tierConfig.basic)
    : null;
  const tierDiscountPct = tierInfo?.discount ?? 0;

  function addToCart(product: any) {
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === product.id);
      if (existing)
        return prev.map((i) =>
          i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i,
        );
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          price: Number(product.sellingPrice),
          tax: Number(product.tax),
          quantity: 1,
          unit: product.unit,
        },
      ];
    });
    setSearch("");
    searchRef.current?.focus();
  }

  function updateQty(productId: number, delta: number) {
    setCart((prev) =>
      prev
        .map((i) =>
          i.productId === productId
            ? { ...i, quantity: Math.max(1, i.quantity + delta) }
            : i,
        )
        .filter((i) => i.quantity > 0),
    );
  }

  function removeItem(productId: number) {
    setCart((prev) => prev.filter((i) => i.productId !== productId));
  }
  function clearCart() {
    setCart([]);
    setAmountPaid("");
    setCustomerId(null);
    setSelectedCustomer(null);
    setCustomerSearch("");
    setCustomerSearchOpen(false);
  }

  const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const taxTotal = cart.reduce(
    (s, i) => s + i.price * i.quantity * (i.tax / 100),
    0,
  );
  const tierDiscount = (subtotal * tierDiscountPct) / 100;
  const total = subtotal + taxTotal - tierDiscount;
  const pointsToEarn = Math.floor(total / 10);
  const paid = parseFloat(amountPaid) || 0;
  const change = Math.max(0, paid - total);

  function numpadPress(val: string) {
    if (val === "C") {
      setAmountPaid("");
      return;
    }
    if (val === "." && amountPaid.includes(".")) return;
    setAmountPaid((prev) => prev + val);
  }

  async function handleCheckout() {
    if (cart.length === 0) {
      toast({ variant: "destructive", title: "Cart is empty" });
      return;
    }
    if (paymentMethod === "cash" && paid < total) {
      toast({ variant: "destructive", title: "Insufficient payment" });
      return;
    }

    const salePayload = {
      customerId: customerId ?? undefined,
      items: cart.map((i) => ({
        productId: i.productId,
        productName: i.name,
        quantity: i.quantity,
        unitPrice: i.price,
        tax: i.tax,
        discount: 0,
      })),
      paymentMethod,
      amountPaid: paymentMethod === "cash" ? paid : total,
      notes: "",
    };

    try {
      const sale = await createSale.mutateAsync({ data: salePayload as any });
      await qc.invalidateQueries({ queryKey: getListProductsQueryKey() });
      await qc.invalidateQueries({ queryKey: getListInventoryQueryKey() });
      setLastSale({
        ...sale,
        customerName: selectedCustomer?.name,
        memberNumber: selectedCustomer?.memberNumber,
        tier: selectedCustomer?.membershipTier,
      });
      setReceiptOpen(true);
      clearCart();
      toast({ title: "Sale completed successfully" });
    } catch {
      toast({ variant: "destructive", title: "Failed to process sale" });
    }
  }

  function printReceipt() {
    window.print();
  }

  return (
    <>
      {/* Print styles – only visible when printing */}
      <style>{`
        @media print {
          body > * { display: none !important; }
          .print-receipt { display: block !important; position: fixed; top: 0; left: 0; width: 80mm; font-size: 12px; }
          .no-print { display: none !important; }
        }
        .print-receipt { display: none; }
      `}</style>

      {/* Hidden print receipt */}
      {lastSale && (
        <div className="print-receipt p-4 font-mono text-xs">
          <div className="text-center font-bold text-base mb-1">
            Supermarket OS
          </div>
          <div className="text-center text-xs mb-1">
            Kathmandu, Nepal | Tel: 01-4XXXXXX
          </div>
          <div className="text-center border-t border-b border-dashed py-1 mb-2">
            <div>Invoice: {lastSale.invoiceNumber}</div>
            <div>{new Date(lastSale.createdAt).toLocaleString("ne-NP")}</div>
          </div>
          {lastSale.customerName && (
            <div className="mb-1">
              <div>Customer: {lastSale.customerName}</div>
              <div>Member #: {lastSale.memberNumber ?? "—"}</div>
              <div>
                Tier: {tierConfig[lastSale.tier ?? "basic"]?.label ?? "Basic"}
              </div>
            </div>
          )}
          <div className="border-t border-dashed pt-1 mb-1">
            {(lastSale.items as any[]).map((item: any, i: number) => (
              <div key={i} className="flex justify-between">
                <span>
                  {item.productName ?? item.name} ×{item.quantity}
                </span>
                <span>रू{(item.quantity * item.unitPrice).toFixed(2)}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-dashed pt-1">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>रू{Number(lastSale.subtotal).toFixed(2)}</span>
            </div>
            {Number(lastSale.discount) > 0 && (
              <div className="flex justify-between">
                <span>
                  Tier Discount ({Number(lastSale.tierDiscountPct).toFixed(0)}%)
                </span>
                <span>-रू{Number(lastSale.discount).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Tax</span>
              <span>रू{Number(lastSale.tax).toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold">
              <span>TOTAL</span>
              <span>रू{Number(lastSale.total).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Paid ({lastSale.paymentMethod})</span>
              <span>रू{Number(lastSale.amountPaid).toFixed(2)}</span>
            </div>
            {Number(lastSale.change) > 0 && (
              <div className="flex justify-between">
                <span>Change</span>
                <span>रू{Number(lastSale.change).toFixed(2)}</span>
              </div>
            )}
          </div>
          {(lastSale.pointsEarned ?? 0) > 0 && (
            <div className="border-t border-dashed mt-1 pt-1 text-center">
              Points Earned: +{lastSale.pointsEarned} pts
            </div>
          )}
          <div className="text-center mt-2 text-xs">
            Thank you for shopping!
            <br />
            धन्यवाद!
          </div>
        </div>
      )}

      <div className="flex h-[calc(100vh-3rem)] bg-background no-print">
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
                onChange={(e) => setSearch(e.target.value)}
                autoFocus
                data-testid="input-pos-search"
              />
            </div>
          </div>
          <ScrollArea className="flex-1 p-4">
            {productsLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-24 rounded-lg bg-muted animate-pulse"
                  />
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
                  const inCart = cart.find((c) => c.productId === p.id);
                  const outOfStock = p.currentStock <= 0;
                  return (
                    <button
                      key={p.id}
                      onClick={() => !outOfStock && addToCart(p)}
                      disabled={outOfStock}
                      data-testid={`button-pos-product-${p.id}`}
                      className={`relative p-3 rounded-lg border text-left transition-all ${
                        outOfStock
                          ? "opacity-40 cursor-not-allowed bg-muted border-border"
                          : inCart
                            ? "border-primary bg-primary/5 shadow-sm"
                            : "border-border bg-card hover:border-primary/50 hover:bg-accent cursor-pointer"
                      }`}
                    >
                      <div className="text-sm font-medium leading-tight line-clamp-2">
                        {p.name}
                      </div>
                      <div className="text-base font-bold mt-1 text-primary">
                        रू {Number(p.sellingPrice).toLocaleString()}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {p.currentStock} {p.unit} in stock
                      </div>
                      {inCart && (
                        <div className="absolute top-2 right-2">
                          <Badge className="h-5 min-w-5 text-xs px-1">
                            {inCart.quantity}
                          </Badge>
                        </div>
                      )}
                      {outOfStock && (
                        <div className="text-xs text-destructive font-medium mt-0.5">
                          Out of stock
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Cart & Checkout Panel */}
        <div className="w-80 shrink-0 flex flex-col bg-card">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <h2 className="font-semibold flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              Cart
              {cart.length > 0 && (
                <Badge variant="secondary">{cart.length}</Badge>
              )}
            </h2>
            {cart.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive h-7 px-2 text-xs"
                onClick={clearCart}
              >
                <X className="h-3.5 w-3.5 mr-1" />
                Clear
              </Button>
            )}
          </div>

          <ScrollArea className="flex-1">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-muted-foreground mt-8">
                <ShoppingCart className="h-8 w-8 mb-2 opacity-30" />
                <p className="text-sm">Add products to cart</p>
              </div>
            ) : (
              <div className="p-3 space-y-2">
                {cart.map((item) => (
                  <div
                    key={item.productId}
                    className="flex items-center gap-2 py-2 border-b border-border/50 last:border-0"
                    data-testid={`cart-item-${item.productId}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">
                        {item.name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        रू {item.price.toLocaleString()} × {item.quantity}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => updateQty(item.productId, -1)}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-6 text-center text-sm font-medium">
                        {item.quantity}
                      </span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => updateQty(item.productId, 1)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-destructive ml-1"
                        onClick={() => removeItem(item.productId)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="w-18 text-right text-sm font-semibold">
                      रू {(item.price * item.quantity).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          <div className="border-t border-border p-3 space-y-3">
            {/* Customer selector */}
            <div className="relative">
              <div className="flex items-center gap-2">
                <Input
                  value={customerSearch}
                  onChange={(event) => setCustomerSearch(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      setCustomerSearchOpen(true);
                    }
                  }}
                  placeholder="Search customer by name or phone..."
                  className="h-8 text-xs"
                  data-testid="input-pos-customer-search"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => setCustomerSearchOpen(true)}
                  aria-label="Search customers"
                  title="Search customers"
                  data-testid="button-pos-customer-search"
                >
                  <Search className="h-3.5 w-3.5" />
                </Button>
              </div>
              {customerSearchOpen && customerSearch.trim() && (
                <div className="absolute left-0 right-0 top-10 z-50 max-h-64 overflow-y-auto rounded-md border border-border bg-popover p-1 shadow-md">
                  {customerList.length > 0 ? (
                    customerList.map((customer: any) => (
                      <button
                        type="button"
                        key={customer.id}
                        className="w-full rounded-sm px-3 py-2 text-left hover:bg-accent"
                        onClick={() => {
                          setCustomerId(customer.id);
                          setSelectedCustomer(customer);
                          setCustomerSearchOpen(false);
                          setCustomerSearch("");
                        }}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-medium">
                            {customer.name}
                          </span>
                          <Badge variant="secondary" className="text-[10px]">
                            {tierConfig[customer.membershipTier]?.label ??
                              "Basic"}
                          </Badge>
                        </div>
                        <div className="mt-0.5 text-[11px] text-muted-foreground">
                          {customer.phone || "No phone"} ·{" "}
                          {customer.memberNumber || "No member number"}
                        </div>
                        <div className="mt-0.5 text-[11px] text-muted-foreground">
                          {customer.email || "No email"} ·{" "}
                          {customer.loyaltyPoints ?? 0} points
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="px-3 py-2 text-xs text-muted-foreground">
                      No customers found
                    </div>
                  )}
                </div>
              )}
            </div>
            {!selectedCustomer && (
              <div className="text-[11px] text-muted-foreground">
                Walk-in customer
              </div>
            )}

            {/* Customer loyalty info */}
            {selectedCustomer && (
              <Card className="border-0 bg-muted/50 py-0">
                <CardContent className="p-2 space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Star className="h-3.5 w-3.5 text-yellow-500" />
                      <div>
                        <div className="text-xs font-medium">
                          {selectedCustomer.name}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          {selectedCustomer.phone || "No phone"} ·{" "}
                          {selectedCustomer.memberNumber || "No member number"}
                        </div>
                      </div>
                    </div>
                    <Badge
                      className={`text-[10px] px-1.5 py-0 ${tierConfig[selectedCustomer.membershipTier]?.color ?? ""}`}
                    >
                      {tierConfig[selectedCustomer.membershipTier]?.label ??
                        "Basic"}
                    </Badge>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>
                      Points:{" "}
                      {(selectedCustomer.loyaltyPoints ?? 0).toLocaleString()}
                    </span>
                    {tierDiscountPct > 0 && (
                      <span className="text-green-700 font-medium">
                        {tierDiscountPct}% discount applied
                      </span>
                    )}
                  </div>
                  {cart.length > 0 && (
                    <div className="text-xs text-blue-600 font-medium">
                      +{pointsToEarn} pts to earn
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Totals */}
            <div className="space-y-1 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span>{fmt(subtotal)}</span>
              </div>
              {tierDiscount > 0 && (
                <div className="flex justify-between text-green-700">
                  <span>Tier Discount ({tierDiscountPct}%)</span>
                  <span>-{fmt(tierDiscount)}</span>
                </div>
              )}
              <div className="flex justify-between text-muted-foreground">
                <span>Tax</span>
                <span>{fmt(taxTotal)}</span>
              </div>
              <div className="flex justify-between font-bold text-base border-t border-border pt-1">
                <span>Total</span>
                <span>{fmt(total)}</span>
              </div>
            </div>

            {/* Payment method */}
            <div className="grid grid-cols-3 gap-1">
              {paymentMethods.map((pm) => {
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

            {/* Cash numpad */}
            {paymentMethod === "cash" && (
              <div className="space-y-2">
                <div className="flex gap-1">
                  <Input
                    className="h-8 text-sm font-mono"
                    placeholder="Amount paid (रू)"
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(e.target.value)}
                    data-testid="input-amount-paid"
                  />
                  {change > 0 && (
                    <div className="text-xs text-green-700 font-semibold self-center ml-1 whitespace-nowrap">
                      ↩ {fmt(change)}
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-4 gap-1">
                  {[
                    "1",
                    "2",
                    "3",
                    "4",
                    "5",
                    "6",
                    "7",
                    "8",
                    "9",
                    "00",
                    "0",
                    ".",
                  ].map((v) => (
                    <button
                      key={v}
                      onClick={() => numpadPress(v)}
                      className="h-8 text-sm font-mono rounded-md bg-muted hover:bg-muted/80 transition-colors"
                    >
                      {v}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => numpadPress("C")}
                  className="w-full h-7 text-xs rounded-md bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
                >
                  Clear
                </button>
                <div className="grid grid-cols-2 gap-1">
                  {[
                    total,
                    Math.ceil(total / 100) * 100,
                    Math.ceil(total / 500) * 500,
                    Math.ceil(total / 1000) * 1000,
                  ]
                    .filter((v, i, arr) => arr.indexOf(v) === i && v >= total)
                    .slice(0, 4)
                    .map((v) => (
                      <button
                        key={v}
                        onClick={() => setAmountPaid(v.toFixed(0))}
                        className="h-7 text-xs rounded-md bg-accent hover:bg-accent/80 transition-colors font-medium"
                      >
                        रू {v.toLocaleString()}
                      </button>
                    ))}
                </div>
              </div>
            )}

            <Button
              className="w-full h-10 text-sm font-semibold"
              disabled={
                cart.length === 0 ||
                createSale.isPending ||
                (paymentMethod === "cash" && paid < total)
              }
              onClick={handleCheckout}
              data-testid="button-checkout"
            >
              {createSale.isPending ? "Processing..." : `Charge ${fmt(total)}`}
            </Button>
          </div>
        </div>
      </div>

      {/* Receipt Dialog */}
      <Dialog open={receiptOpen} onOpenChange={setReceiptOpen}>
        <DialogContent className="max-w-sm no-print">
          <DialogHeader>
            <DialogTitle className="text-center">Sale Complete ✓</DialogTitle>
          </DialogHeader>
          {lastSale && (
            <div className="space-y-3 text-sm">
              <div className="flex justify-center">
                <CheckCircle2 className="h-12 w-12 text-green-500" />
              </div>
              <div className="text-center">
                <div className="font-mono font-bold text-lg">
                  {lastSale.invoiceNumber}
                </div>
                <div className="text-muted-foreground text-xs">
                  {new Date(lastSale.createdAt).toLocaleString()}
                </div>
              </div>

              {lastSale.customerName && (
                <div className="bg-muted rounded-md p-2 text-xs space-y-0.5">
                  <div className="font-medium">{lastSale.customerName}</div>
                  <div className="text-muted-foreground">
                    Member: {lastSale.memberNumber ?? "—"}
                  </div>
                  <div className="flex items-center gap-1">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${tierConfig[lastSale.tier ?? "basic"]?.color ?? ""}`}
                    >
                      {tierConfig[lastSale.tier ?? "basic"]?.label ?? "Basic"}
                    </span>
                    {(lastSale.pointsEarned ?? 0) > 0 && (
                      <span className="text-blue-600 font-medium">
                        +{lastSale.pointsEarned} pts earned
                      </span>
                    )}
                  </div>
                </div>
              )}

              <Separator />
              <div className="space-y-1">
                {(lastSale.items as any[]).map((item: any, i: number) => (
                  <div key={i} className="flex justify-between text-xs">
                    <span>
                      {item.productName ?? item.name} ×{item.quantity}
                    </span>
                    <span>{fmt(item.quantity * item.unitPrice)}</span>
                  </div>
                ))}
              </div>
              <Separator />
              <div className="space-y-1 text-xs">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span>{fmt(Number(lastSale.subtotal))}</span>
                </div>
                {Number(lastSale.discount) > 0 && (
                  <div className="flex justify-between text-green-700">
                    <span>
                      Tier Discount (
                      {Number(lastSale.tierDiscountPct).toFixed(0)}%)
                    </span>
                    <span>-{fmt(Number(lastSale.discount))}</span>
                  </div>
                )}
                <div className="flex justify-between text-muted-foreground">
                  <span>Tax</span>
                  <span>{fmt(Number(lastSale.tax))}</span>
                </div>
                <div className="flex justify-between font-bold text-sm">
                  <span>Total</span>
                  <span>{fmt(Number(lastSale.total))}</span>
                </div>
                {Number(lastSale.change) > 0 && (
                  <div className="flex justify-between text-green-700 font-medium">
                    <span>Change</span>
                    <span>{fmt(Number(lastSale.change))}</span>
                  </div>
                )}
              </div>
              <div className="text-center text-xs text-muted-foreground capitalize">
                Payment: {lastSale.paymentMethod.replace("_", " ")}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 gap-2"
                  onClick={printReceipt}
                >
                  <Printer className="h-4 w-4" />
                  Print
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => setReceiptOpen(false)}
                  data-testid="button-receipt-close"
                >
                  New Sale
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
