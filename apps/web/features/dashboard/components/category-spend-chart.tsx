/* eslint-disable react/prop-types */
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Pie, PieChart, ResponsiveContainer, Cell, Tooltip } from "recharts";
import { useEffect, useState } from "react";
import { getCategorySpend, type CategorySpend } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";

export function CategorySpendChart() {
  const [categories, setCategories] = useState<CategorySpend[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCategories() {
      try {
        const data = await getCategorySpend();
        // Get top categories (limit to avoid too many slices)
        setCategories(data.slice(0, 5));
      } catch (error) {
        console.error("Error fetching category spend:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchCategories();
  }, []);

  if (loading) {
    return (
      <Card className="rounded-2xl border bg-white shadow-sm">
        <CardHeader className="p-4">
          <CardTitle className="text-base font-semibold">Spend by Category</CardTitle>
          <CardDescription className="text-xs">
            Distribution of spending across different categories.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <Skeleton className="h-[320px] w-full" />
        </CardContent>
      </Card>
    );
  }

  const totalSpend = categories.reduce((sum, cat) => sum + cat.totalSpend, 0);

  const chartData = categories.map((category) => ({
    name: category.category,
    value: category.totalSpend,
    percentage: ((category.totalSpend / totalSpend) * 100).toFixed(1),
  }));

  // Color palette for pie chart
  const COLORS = ["#1e40af", "#f97316", "#fbbf24", "#93c5fd", "#a78bfa"];

  const renderLegend = () => {
    if (chartData.length === 0) return null;
    return (
      <div className="mt-4 space-y-2">
        {chartData.map((entry, index) => (
          <div key={`legend-${index}`} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: COLORS[index % COLORS.length] }}
              />
              <span className="text-gray-700">{entry.name}</span>
            </div>
            <span className="font-semibold text-gray-900">
              ${(entry.value / 1000).toFixed(1)}k
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Card className="h-full rounded-2xl border bg-white shadow-sm">
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-base font-semibold">Spend by Category</CardTitle>
        <CardDescription className="text-xs text-gray-500">
          Distribution of spending across different categories.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4 pt-2">
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={95}
                fill="#8884d8"
                paddingAngle={2}
                dataKey="value"
                label={({ percentage }) => `${percentage}%`}
                labelLine={false}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "white",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  padding: "12px",
                }}
                formatter={(value: number) => {
                  return [`$${value.toFixed(2)}`, "Spend"];
                }}
                content={({ payload }) => {
                  if (!payload || payload.length === 0) return null;
                  const data = payload[0]?.payload;
                  if (!data) return null;
                  return (
                    <div className="rounded-lg border bg-white p-3 shadow-lg">
                      <div className="space-y-1">
                        <div className="font-semibold text-gray-900">{data.name}</div>
                        <div className="text-sm">
                          <span className="text-blue-600">Spend:</span>{" "}
                          <span className="font-bold text-blue-700">
                            ${data.value.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                          </span>
                        </div>
                        <div className="text-xs text-gray-600">{data.percentage}% of total</div>
                      </div>
                    </div>
                  );
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        {renderLegend()}
      </CardContent>
    </Card>
  );
}