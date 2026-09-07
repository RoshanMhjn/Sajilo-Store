import { useGetProfitReport } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const money = (value: unknown) =>
  `NPR ${Number(value ?? 0).toLocaleString("en-NP", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function FinancialReports() {
  const { data, isLoading, isError } = useGetProfitReport();
  const report = data as any;
  const metrics = [
    ["Revenue", report?.revenue],
    ["COGS", report?.cogs],
    ["Gross profit", report?.grossProfit],
    ["Operating expenses", report?.operatingExpenses],
    ["Net profit", report?.netProfit],
  ];
  return (
    <div className="p-6 space-y-5 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Financial Reports</h1>
        <p className="text-sm text-muted-foreground">
          Revenue, inventory cost, and operating profitability.
        </p>
      </div>
      {isError ? (
        <Card>
          <CardContent className="p-6 text-sm text-destructive">
            Unable to load the profit report.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {metrics.map(([label, value]) => (
            <Card key={String(label)}>
              <CardContent className="p-4">
                <div className="text-xs text-muted-foreground">{label}</div>
                {isLoading ? (
                  <Skeleton className="h-6 w-24 mt-2" />
                ) : (
                  <div className="text-lg font-semibold mt-1">
                    {money(value)}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Product profitability</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-24" />
          ) : !report?.products?.length ? (
            <div className="text-sm text-muted-foreground">
              No completed sales in this period.
            </div>
          ) : (
            <div className="space-y-2">
              {report.products.map((item: any) => (
                <div
                  key={item.productId}
                  className="flex items-center justify-between border-b py-2 text-sm"
                >
                  <span>Product #{item.productId}</span>
                  <span>
                    {item.unitsSold} units · {money(item.grossProfit)} gross
                    profit · {Number(item.marginPct).toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
