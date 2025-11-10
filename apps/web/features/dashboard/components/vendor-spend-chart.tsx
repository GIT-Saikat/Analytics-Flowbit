"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Cell } from "recharts";
import { useEffect, useState } from "react";
import { getTopVendors, type VendorSpend } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";

export function VendorSpendChart() {
  const [vendors, setVendors] = useState<VendorSpend[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchVendors() {
      try {
        const data = await getTopVendors();
        // Only show top 7 vendors for cleaner display
        setVendors(data.slice(0, 7));
      } catch (error) {
        console.error("Error fetching top vendors:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchVendors();
  }, []);

  if (loading) {
    return (
      <Card className="rounded-2xl border bg-white shadow-sm">
        <CardHeader className="p-4">
          <CardTitle className="text-base font-semibold">Spend by Vendor (Top 10)</CardTitle>
          <CardDescription className="text-xs">
            Vendor spend with cumulative percentage distribution.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <Skeleton className="h-[380px] w-full" />
        </CardContent>
      </Card>
    );
  }

  // Calculate cumulative percentages
  const totalSpend = vendors.reduce((sum, vendor) => sum + vendor.totalSpend, 0);

  const chartData = vendors.map((vendor, index) => {
    const percentage = (vendor.totalSpend / totalSpend) * 100;
    const cumulativePercentage = vendors
      .slice(0, index + 1)
      .reduce((sum, v) => sum + (v.totalSpend / totalSpend) * 100, 0);

    return {
      name: vendor.name,
      spend: vendor.totalSpend / 1000, // Convert to thousands
      percentage: percentage,
      cumulativePercentage: cumulativePercentage,
      fullSpend: vendor.totalSpend,
    };
  });

  // Color palette for bars
  const colors = ["#1e3a8a", "#1e40af", "#3b82f6", "#60a5fa", "#93c5fd", "#bfdbfe"];

  return (
    <Card className="h-full rounded-2xl border bg-white shadow-sm">
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-base font-semibold">
          Spend by Vendor (Top {vendors.length})
        </CardTitle>
        <CardDescription className="text-xs text-gray-500">
          Vendor spend with cumulative percentage distribution.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4 pt-2">
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
              barCategoryGap="20%"
            >
              <XAxis
                type="number"
                tick={{ fill: "#6b7280", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(value) => `€${value}k`}
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fill: "#9ca3af", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={120}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "white",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  padding: "12px",
                }}
                formatter={(value: number) => {
                  return [`€${value.toFixed(2)}k`, "Vendor Spend"];
                }}
                cursor={{ fill: "rgba(59, 130, 246, 0.1)" }}
                content={({ payload }) => {
                  if (!payload || payload.length === 0) return null;
                  const data = payload[0]?.payload;
                  if (!data) return null;
                  return (
                    <div className="rounded-lg border bg-white p-3 shadow-lg">
                      <div className="space-y-1">
                        <div className="font-semibold text-gray-900">{data.name}</div>
                        <div className="text-sm">
                          <span className="text-blue-600">Vendor Spend:</span>{" "}
                          <span className="font-bold text-blue-700">
                            € {data.fullSpend.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                          </span>
                        </div>
                        <div className="text-xs text-gray-600">
                          {data.percentage.toFixed(1)}% of total
                        </div>
                      </div>
                    </div>
                  );
                }}
              />
              <Bar
                dataKey="spend"
                radius={[0, 4, 4, 0]}
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={colors[index % colors.length]}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}