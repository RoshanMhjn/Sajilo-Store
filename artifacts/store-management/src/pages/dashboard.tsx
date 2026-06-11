import { useGetDashboardSummary, useGetSalesChart, useGetTopProducts, useGetLowStockItems, useGetRecentActivity } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Package, ShoppingCart, TrendingUp, AlertTriangle, Users, ArrowUpRight, ArrowDownRight, Activity, ShoppingBag, Clock } from "lucide-react";
import { Link } from "wouter";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

function StatCard({
  title, value, sub, icon: Icon, trend, trendUp, accent,
}: {
  title: string; value: string | number; sub: string; icon: any; trend?: string | number; trendUp?: boolean; accent?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${accent ?? "bg-primary/10"}`}>
          <Icon className={`h-4 w-4 ${accent ? "text-white" : "text-primary"}`} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <div className="flex items-center gap-1 mt-1">
          {trend !== undefined && (
            <span className={`flex items-center text-xs font-medium ${trendUp ? "text-green-600" : "text-red-500"}`}>
              {trendUp ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
              {trend}
            </span>
          )}
          <p className="text-xs text-muted-foreground">{sub}</p>
        </div>
      </CardContent>
    </Card>
  );
}

const CHART_COLORS = { revenue: "#6366f1", sales: "#22c55e" };

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function timeAgo(date: string | Date) {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export default function Dashboard() {
  const { data: summary, isLoading: summaryLoading } = useGetDashboardSummary();
  const { data: chartData, isLoading: chartLoading } = useGetSalesChart();
  const { data: topProducts, isLoading: topLoading } = useGetTopProducts();
  const { data: lowStock } = useGetLowStockItems();
  const { data: activity } = useGetRecentActivity();

  const chartPoints = (chartData as any[] | undefined) ?? [];
  const topProds = (topProducts as any[] | undefined) ?? [];
  const lowStockItems = (lowStock as any[] | undefined) ?? [];
  const activityItems = (activity as any[] | undefined) ?? [];

  const isLoading = summaryLoading;

  return (
    <div className="flex-1 space-y-6 p-6 pt-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-sm text-muted-foreground">Welcome back — here's what's happening today.</p>
        </div>
        <Link
          href="/pos"
          className="inline-flex items-center gap-2 justify-center whitespace-nowrap rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 transition-colors"
        >
          <ShoppingCart className="h-4 w-4" />
          Open POS
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          [1, 2, 3, 4].map(i => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="h-4 w-24 bg-muted rounded" />
                <div className="h-8 w-8 bg-muted rounded-lg" />
              </CardHeader>
              <CardContent>
                <div className="h-8 w-20 bg-muted rounded mb-2" />
                <div className="h-3 w-32 bg-muted rounded" />
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <StatCard
              title="Today's Revenue"
              value={`$${(summary?.todayRevenue ?? 0).toFixed(2)}`}
              sub="vs. yesterday"
              icon={DollarSign}
              trend={`${summary?.revenueChange ?? 0}%`}
              trendUp={(summary?.revenueChange ?? 0) >= 0}
            />
            <StatCard
              title="Today's Sales"
              value={summary?.salesChange ?? 0}
              sub="completed transactions"
              icon={ShoppingCart}
            />
            <StatCard
              title="Total Products"
              value={summary?.totalProducts ?? 0}
              sub="active in catalog"
              icon={Package}
            />
            <StatCard
              title="Low Stock Alerts"
              value={summary?.lowStockCount ?? 0}
              sub="items need reordering"
              icon={AlertTriangle}
              accent={(summary?.lowStockCount ?? 0) > 0 ? "bg-red-500" : "bg-green-500"}
            />
          </>
        )}
      </div>

      {/* Secondary KPIs */}
      {!isLoading && (
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard
            title="Monthly Revenue"
            value={`$${(summary?.monthlyRevenue ?? 0).toFixed(2)}`}
            sub="this month"
            icon={TrendingUp}
            trend={`${summary?.revenueChange ?? 0}%`}
            trendUp={(summary?.revenueChange ?? 0) >= 0}
          />
          <StatCard
            title="Active Employees"
            value={summary?.activeEmployees ?? 0}
            sub="on payroll"
            icon={Users}
          />
          <StatCard
            title="Total Customers"
            value={summary?.totalCustomers ?? 0}
            sub="registered accounts"
            icon={ShoppingBag}
          />
        </div>
      )}

      {/* Charts Row */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Revenue Area Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Revenue Trend</CardTitle>
            <CardDescription>Daily revenue & sales volume — last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            {chartLoading ? (
              <div className="h-[260px] bg-muted/40 rounded-lg animate-pulse" />
            ) : chartPoints.length === 0 ? (
              <div className="h-[260px] flex items-center justify-center text-muted-foreground text-sm border border-dashed rounded-lg">
                No sales data yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={chartPoints} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={CHART_COLORS.revenue} stopOpacity={0.2} />
                      <stop offset="95%" stopColor={CHART_COLORS.revenue} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} interval={4} />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} />
                  <Tooltip
                    labelFormatter={v => formatDate(v as string)}
                    formatter={(v: number, name: string) => [name === "revenue" ? `$${v.toFixed(2)}` : v, name === "revenue" ? "Revenue" : "Sales"]}
                    contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", backgroundColor: "hsl(var(--card))", color: "hsl(var(--foreground))" }}
                  />
                  <Legend formatter={v => v === "revenue" ? "Revenue" : "Sales Count"} />
                  <Area type="monotone" dataKey="revenue" stroke={CHART_COLORS.revenue} fill="url(#colorRevenue)" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Top Products Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Top Products</CardTitle>
            <CardDescription>By revenue (all time)</CardDescription>
          </CardHeader>
          <CardContent>
            {topLoading ? (
              <div className="h-[260px] bg-muted/40 rounded-lg animate-pulse" />
            ) : topProds.length === 0 ? (
              <div className="h-[260px] flex items-center justify-center text-muted-foreground text-sm border border-dashed rounded-lg">
                No data yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={topProds.slice(0, 6)} layout="vertical" margin={{ top: 0, right: 8, left: 4, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-border" />
                  <XAxis type="number" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} />
                  <YAxis
                    type="category"
                    dataKey="productName"
                    tick={{ fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    width={72}
                    tickFormatter={v => v.length > 10 ? v.slice(0, 10) + "…" : v}
                  />
                  <Tooltip
                    formatter={(v: number) => [`$${v.toFixed(2)}`, "Revenue"]}
                    contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", backgroundColor: "hsl(var(--card))", color: "hsl(var(--foreground))" }}
                  />
                  <Bar dataKey="revenue" fill={CHART_COLORS.revenue} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Low Stock */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle>Low Stock Items</CardTitle>
              <CardDescription>Items at or below reorder point</CardDescription>
            </div>
            <Link href="/inventory" className="text-xs text-primary hover:underline">View all</Link>
          </CardHeader>
          <CardContent>
            {lowStockItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-24 text-muted-foreground gap-2">
                <Package className="h-6 w-6 opacity-30" />
                <p className="text-sm">All items are well-stocked!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {lowStockItems.slice(0, 7).map((item: any) => (
                  <div key={item.productId} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`h-2 w-2 rounded-full shrink-0 ${item.currentStock === 0 ? "bg-red-500" : "bg-amber-400"}`} />
                      <span className="text-sm font-medium truncate">{item.productName}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-muted-foreground">{item.currentStock} / {item.minStock} {item.unit}</span>
                      <Badge variant={item.currentStock === 0 ? "destructive" : "secondary"} className="text-xs h-5 px-1.5">
                        {item.currentStock === 0 ? "Out" : "Low"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest transactions & events</CardDescription>
            </div>
            <Link href="/sales" className="text-xs text-primary hover:underline">View sales</Link>
          </CardHeader>
          <CardContent>
            {activityItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-24 text-muted-foreground gap-2">
                <Activity className="h-6 w-6 opacity-30" />
                <p className="text-sm">No recent activity</p>
              </div>
            ) : (
              <div className="space-y-2">
                {activityItems.slice(0, 7).map((item: any) => (
                  <div key={item.id} className="flex items-center gap-3 py-1.5 border-b border-border/50 last:border-0">
                    <div className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 ${item.type === "sale" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}`}>
                      {item.type === "sale" ? <ShoppingCart className="h-3.5 w-3.5" /> : <Package className="h-3.5 w-3.5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.description}</p>
                      <p className="text-xs text-muted-foreground">{item.user}</p>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                      <Clock className="h-3 w-3" />
                      {timeAgo(item.createdAt)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
