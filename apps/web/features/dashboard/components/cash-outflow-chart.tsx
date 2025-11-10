"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Cell } from "recharts";
import { useEffect, useState } from "react";
import { getCashOutflow, type CashOutflowData } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";

export function CashOutflowChart() {
  const [outflowData, setOutflowData] = useState<CashOutflowData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchOutflow() {
      try {
        const data = await getCashOutflow();
        setOutflowData(data);
      } catch (error) {
        console.error("Error fetching cash outflow:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchOutflow();
  }, []);

  if (loading) {
    return (
      <Card className="rounded-2xl border bg-white shadow-sm">
        <CardHeader className="p-4">
          <CardTitle className="text-base font-semibold">Cash Outflow Forecast</CardTitle>
          <CardDescription className="text-xs">
            Expected payment obligations grouped by due date ranges.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <Skeleton className="h-[320px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!outflowData) {
    return null;
  }

  // Group invoices by date ranges (including overdue)
  const now = new Date();
  const ranges = [
    { label: "0 - 7 days", days: 7, color: "#60a5fa" },
    { label: "8-30 days", days: 30, color: "#3b82f6" },
    { label: "31-60 days", days: 60, color: "#1e40af" },
    { label: "60+ days", days: Infinity, color: "#1e3a8a" },
  ];

  const chartData = ranges.map((range, index) => {
    const previousRange = index === 0 ? null : ranges[index - 1] ?? null;
    const prevDays = previousRange?.days ?? 0;
    const currentDays = range.days;

    const invoicesInRange = outflowData.invoices.filter((invoice) => {
      const dueDate = new Date(invoice.dueDate);
      const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      // Use absolute value to include both overdue and upcoming
      const absDays = Math.abs(daysUntilDue);

      if (currentDays === Infinity) {
        return absDays > prevDays;
      }
      return absDays > prevDays && absDays <= currentDays;
    });

    const totalAmount = invoicesInRange.reduce((sum, inv) => sum + inv.remainingAmount, 0);

    return {
      label: range.label,
      amount: totalAmount / 1000, // Convert to thousands
      fullAmount: totalAmount,
      count: invoicesInRange.length,
      color: range.color,
    };
  });

  return (
    <Card className="h-full rounded-2xl border bg-white shadow-sm">
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-base font-semibold">Cash Outflow Forecast</CardTitle>
        <CardDescription className="text-xs text-gray-500">
          Expected payment obligations grouped by due date ranges.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4 pt-2">
        <div className="h-[240px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
              <XAxis
                dataKey="label"
                tick={{ fill: "#6b7280", fontSize: 11 }}
                axisLine={{ stroke: "#e5e7eb" }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "#6b7280", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(value) => `€${value}k`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "white",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  padding: "12px",
                }}
                formatter={(value: number) => {
                  return [`€${value.toFixed(2)}k`, "Expected Outflow"];
                }}
                cursor={{ fill: "rgba(59, 130, 246, 0.1)" }}
                content={({ payload }) => {
                  if (!payload || payload.length === 0) return null;
                  const data = payload[0]?.payload;
                  if (!data) return null;
                  return (
                    <div className="rounded-lg border bg-white p-3 shadow-lg">
                      <div className="space-y-1">
                        <div className="font-semibold text-gray-900">{data.label}</div>
                        <div className="text-sm">
                          <span className="text-blue-600">Expected Outflow:</span>{" "}
                          <span className="font-bold text-blue-700">
                            € {data.fullAmount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                          </span>
                        </div>
                        <div className="text-xs text-gray-600">
                          {data.count} invoice{data.count !== 1 ? "s" : ""}
                        </div>
                      </div>
                    </div>
                  );
                }}
              />
              <Bar dataKey="amount" radius={[8, 8, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Summary */}
        <div className="mt-4 rounded-lg bg-blue-50 p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-blue-900">Total Expected Outflow</span>
            <span className="text-lg font-bold text-blue-700">
              € {outflowData.totalExpectedOutflow.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
            </span>
          </div>
          <div className="mt-1 text-xs text-blue-600">
            {outflowData.invoiceCount} unpaid invoice{outflowData.invoiceCount !== 1 ? "s" : ""}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}