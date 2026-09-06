import {
  useGetAiInsights,
  useGetAiForecast,
  useGetSlowMovingProducts,
  useGetReorderSuggestions,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Info,
  Package,
  ShoppingCart,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const formatNpr = (amount: number) =>
  `रू ${amount.toLocaleString("en-NP", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const severityConfig: Record<string, { icon: any; color: string; bg: string }> =
  {
    success: {
      icon: CheckCircle,
      color: "text-green-700",
      bg: "bg-green-50 border-green-200",
    },
    warning: {
      icon: AlertTriangle,
      color: "text-yellow-700",
      bg: "bg-yellow-50 border-yellow-200",
    },
    alert: {
      icon: AlertTriangle,
      color: "text-red-700",
      bg: "bg-red-50 border-red-200",
    },
    info: {
      icon: Info,
      color: "text-blue-700",
      bg: "bg-blue-50 border-blue-200",
    },
  };

const urgencyColors: Record<string, string> = {
  critical: "bg-red-100 text-red-800",
  high: "bg-orange-100 text-orange-800",
  medium: "bg-yellow-100 text-yellow-800",
  low: "bg-green-100 text-green-800",
};

export default function AiInsights() {
  const { data: insights, isLoading: insightsLoading } = useGetAiInsights();
  const { data: forecast, isLoading: forecastLoading } = useGetAiForecast();
  const { data: slowMoving, isLoading: slowLoading } =
    useGetSlowMovingProducts();
  const { data: reorderSuggestions, isLoading: reorderLoading } =
    useGetReorderSuggestions();

  const insightList = (insights as any[]) ?? [];
  const forecastData = forecast as any;
  const forecastPoints = forecastData?.forecastPoints ?? [];
  const slowList = (slowMoving as any[]) ?? [];
  const reorderList = (reorderSuggestions as any[]) ?? [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center">
          <Sparkles className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">AI Analytics</h1>
          <p className="text-sm text-muted-foreground">
            Machine learning-powered insights for your store
          </p>
        </div>
      </div>

      {/* AI Insights Cards */}
      <div>
        <h2 className="text-base font-semibold mb-3">Business Insights</h2>
        {insightsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {insightList.map((insight: any) => {
              const cfg =
                severityConfig[insight.severity] ?? severityConfig.info;
              const Icon = cfg.icon;
              return (
                <Card key={insight.id} className={`border ${cfg.bg}`}>
                  <CardContent className="pt-4 pb-4">
                    <div className="flex gap-3">
                      <Icon
                        className={`h-5 w-5 mt-0.5 shrink-0 ${cfg.color}`}
                      />
                      <div>
                        <div className={`font-semibold text-sm ${cfg.color}`}>
                          {insight.title}
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {insight.description}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Tabs defaultValue="forecast">
        <TabsList>
          <TabsTrigger value="forecast">30-Day Forecast</TabsTrigger>
          <TabsTrigger value="slow">Slow-Moving Products</TabsTrigger>
          <TabsTrigger value="reorder">Reorder Suggestions</TabsTrigger>
        </TabsList>

        <TabsContent value="forecast">
          <div className="space-y-4">
            {forecastLoading ? (
              <Skeleton className="h-64" />
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardContent className="pt-4 pb-4">
                      <div className="text-sm text-muted-foreground">
                        Next Week Revenue
                      </div>
                      <div className="text-2xl font-bold mt-1">
                        {formatNpr(Number(forecastData?.nextWeekRevenue ?? 0))}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        AI forecast
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4 pb-4">
                      <div className="text-sm text-muted-foreground">
                        Next Month Revenue
                      </div>
                      <div className="text-2xl font-bold mt-1">
                        {formatNpr(Number(forecastData?.nextMonthRevenue ?? 0))}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {Math.round((forecastData?.confidence ?? 0) * 100)}%
                        confidence
                      </div>
                    </CardContent>
                  </Card>
                </div>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      Revenue Forecast (30 days)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={260}>
                      <AreaChart data={forecastPoints}>
                        <defs>
                          <linearGradient
                            id="colorRevenue"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="5%"
                              stopColor="hsl(var(--primary))"
                              stopOpacity={0.15}
                            />
                            <stop
                              offset="95%"
                              stopColor="hsl(var(--primary))"
                              stopOpacity={0}
                            />
                          </linearGradient>
                        </defs>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="hsl(var(--border))"
                        />
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 10 }}
                          tickFormatter={(v) => v.slice(5)}
                        />
                        <YAxis
                          tick={{ fontSize: 10 }}
                          tickFormatter={(v) => `रू${v}`}
                        />
                        <Tooltip
                          formatter={(v: any) => [
                            formatNpr(Number(v)),
                            "Revenue",
                          ]}
                        />
                        <Area
                          type="monotone"
                          dataKey="revenue"
                          stroke="hsl(var(--primary))"
                          fill="url(#colorRevenue)"
                          strokeWidth={2}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                    {forecastData?.seasonalTrends && (
                      <div className="mt-3 space-y-1">
                        {forecastData.seasonalTrends.map(
                          (trend: string, i: number) => (
                            <div
                              key={i}
                              className="flex items-center gap-2 text-xs text-muted-foreground"
                            >
                              <div className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                              {trend}
                            </div>
                          ),
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </TabsContent>

        <TabsContent value="slow">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Days Since Sale</TableHead>
                    <TableHead>Current Stock</TableHead>
                    <TableHead>Stock Value</TableHead>
                    <TableHead>Recommendation</TableHead>
                    <TableHead>Suggested Discount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {slowLoading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 7 }).map((__, j) => (
                          <TableCell key={j}>
                            <Skeleton className="h-4" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : slowList.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="py-12 text-center text-muted-foreground"
                      >
                        <Package className="h-8 w-8 mx-auto mb-2 opacity-40" />
                        All products are moving well
                      </TableCell>
                    </TableRow>
                  ) : (
                    slowList.map((p: any) => (
                      <TableRow
                        key={p.productId}
                        data-testid={`row-slow-${p.productId}`}
                      >
                        <TableCell className="font-medium">
                          {p.productName}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {p.sku}
                        </TableCell>
                        <TableCell>
                          <span
                            className={
                              p.daysSinceLastSale > 60
                                ? "text-red-600 font-semibold"
                                : p.daysSinceLastSale > 30
                                  ? "text-yellow-600"
                                  : ""
                            }
                          >
                            {p.daysSinceLastSale === 999
                              ? "Never sold"
                              : `${p.daysSinceLastSale} days`}
                          </span>
                        </TableCell>
                        <TableCell>{p.currentStock}</TableCell>
                        <TableCell>{formatNpr(Number(p.stockValue))}</TableCell>
                        <TableCell className="capitalize">
                          {p.recommendation}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className="text-orange-700 border-orange-300"
                          >
                            {p.suggestedDiscount}% off
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reorder">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Current Stock</TableHead>
                    <TableHead>Reorder Point</TableHead>
                    <TableHead>Suggested Qty</TableHead>
                    <TableHead>Est. Cost</TableHead>
                    <TableHead>Urgency</TableHead>
                    <TableHead>Supplier</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reorderLoading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 8 }).map((__, j) => (
                          <TableCell key={j}>
                            <Skeleton className="h-4" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : reorderList.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="py-12 text-center text-muted-foreground"
                      >
                        <ShoppingCart className="h-8 w-8 mx-auto mb-2 opacity-40" />
                        No reorder suggestions
                      </TableCell>
                    </TableRow>
                  ) : (
                    reorderList.map((r: any) => (
                      <TableRow
                        key={r.productId}
                        data-testid={`row-reorder-${r.productId}`}
                      >
                        <TableCell className="font-medium">
                          {r.productName}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {r.sku}
                        </TableCell>
                        <TableCell
                          className={
                            r.currentStock === 0 ? "text-red-600 font-bold" : ""
                          }
                        >
                          {r.currentStock}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {r.reorderPoint}
                        </TableCell>
                        <TableCell className="font-semibold">
                          {r.suggestedQuantity}
                        </TableCell>
                        <TableCell>
                          {formatNpr(Number(r.estimatedCost))}
                        </TableCell>
                        <TableCell>
                          <Badge className={urgencyColors[r.urgency] ?? ""}>
                            {r.urgency}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {r.preferredSupplierName ?? "—"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
