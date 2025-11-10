"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { useEffect, useState } from "react";
import { getInvoiceTrends, type InvoiceTrend } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";

export function InvoiceTrendChart() {
  const [trends, setTrends] = useState<InvoiceTrend[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTrends() {
      try {
        const data = await getInvoiceTrends();
        setTrends(data);
      } catch (error) {
        console.error("Error fetching invoice trends:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchTrends();
  }, []);

  if (loading) {
    return (
      <Card className="col-span-1 rounded-2xl border bg-white shadow-sm lg:col-span-2">
        <CardHeader className="p-4">
          <CardTitle className="text-base font-semibold">Invoice Volume + Value Trend</CardTitle>
          <CardDescription className="text-xs">
            Invoice count and total spend over 12 months.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  // Format data for the chart
  const chartData = trends.map((trend) => {
    const [, month] = trend.month.split("-");
    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const monthIndex = month ? parseInt(month, 10) - 1 : -1;
    const monthName = monthIndex >= 0 && monthIndex < monthNames.length ? monthNames[monthIndex] : trend.month;

    return {
      month: monthName,
      fullMonth: trend.month,
      count: trend.count,
      spend: trend.totalSpend / 1000, // Convert to thousands
    };
  });

  // Get the latest month data for the info box
  const latestData = chartData.length > 0 ? chartData[chartData.length - 1] : null;

  return (
    <Card className="h-full rounded-2xl border bg-white shadow-sm">
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-base font-semibold">Invoice Volume + Value Trend</CardTitle>
        <CardDescription className="text-xs text-gray-500">
          Invoice count and total spend over 12 months.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4 pt-2">
        <div className="relative h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
              <XAxis
                dataKey="month"
                tick={{ fill: "#6b7280", fontSize: 12 }}
                axisLine={{ stroke: "#e5e7eb" }}
                tickLine={false}
              />
              <YAxis tick={{ fill: "#6b7280", fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "white",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  padding: "8px 12px",
                }}
                formatter={(value: number, name: string) => {
                  if (name === "spend") return [`€ ${value.toFixed(2)}k`, "Total Spend"];
                  return [value, "Invoice count"];
                }}
              />
              <Legend
                wrapperStyle={{ paddingTop: "20px" }}
                iconType="circle"
                formatter={(value: string) => {
                  if (value === "spend") return "Total Spend (€k)";
                  return "Invoice Count";
                }}
              />
              <Line
                type="monotone"
                dataKey="count"
                stroke="#3b82f6"
                strokeWidth={2.5}
                dot={{ fill: "#3b82f6", r: 4 }}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="spend"
                stroke="#1e40af"
                strokeWidth={2.5}
                dot={{ fill: "#1e40af", r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>

          {/* Info box */}
          {latestData && (
            <div className="absolute right-6 top-6 rounded-lg bg-white border border-gray-200 p-3 shadow-md">
              <p className="text-xs font-medium text-gray-600">
                {latestData.month} {latestData.fullMonth.split("-")[0]}
              </p>
              <p className="mt-1 text-sm">
                <span className="font-semibold text-blue-600">Invoice count:</span>{" "}
                <span className="font-bold text-blue-700">{latestData.count}</span>
              </p>
              <p className="text-sm">
                <span className="font-semibold text-blue-600">Total Spend:</span>{" "}
                <span className="font-bold text-blue-700">
                  € {latestData.spend.toFixed(3).replace(".", ",")}
                </span>
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}