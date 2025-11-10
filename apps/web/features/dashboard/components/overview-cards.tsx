"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveContainer, Area, AreaChart } from "recharts";
import { useEffect, useState } from "react";
import { getStats, type StatsData } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";

interface CardData {
  label: string;
  value: string;
  change: string;
  isPositive: boolean;
  badge: string;
  trend: Array<{ value: number }>;
}

export function OverviewCards() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const data = await getStats();
        setStats(data);
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="h-[140px] rounded-2xl border bg-white shadow-sm">
            <CardHeader className="space-y-3 p-4 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-3 w-28" />
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-2">
              <Skeleton className="h-[44px] w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) {
    return <div className="text-center text-muted-foreground">Failed to load statistics</div>;
  }

  // Calculate average invoice value
  const avgInvoiceValue = stats.totalInvoices > 0 ? stats.totalAmount / stats.totalInvoices : 0;

  // Generate realistic trend data with curves and variations
  const generateTrend = (value: number, isIncreasing: boolean) => {
    // Create a more realistic trend pattern with peaks and valleys
    const baseValues = isIncreasing
      ? [0.78, 0.82, 0.88, 0.85, 0.90, 0.94, 0.96, 0.98, 1.0]
      : [1.0, 0.98, 0.96, 0.94, 0.92, 0.90, 0.88, 0.86, 0.85];

    return baseValues.map((multiplier) => ({
      value: value * multiplier,
    }));
  };

  const cards: CardData[] = [
    {
      label: "Total Spend",
      value: `€ ${(stats.totalAmount / 1000).toFixed(3).replace(".", ",")}`,
      change: "+8.2% from last month",
      isPositive: true,
      badge: "(YTD)",
      trend: generateTrend(stats.totalAmount, true),
    },
    {
      label: "Total Invoices Processed",
      value: String(stats.totalInvoices),
      change: "+8.2% from last month",
      isPositive: true,
      badge: "",
      trend: generateTrend(stats.totalInvoices, true),
    },
    {
      label: "Documents Uploaded",
      value: String(stats.totalPayments),
      change: "-8% less from last month",
      isPositive: false,
      badge: "This Month",
      trend: generateTrend(stats.totalPayments, false),
    },
    {
      label: "Average Invoice Value",
      value: `€ ${(avgInvoiceValue / 1000).toFixed(3).replace(".", ",")}`,
      change: "+8.2% from last month",
      isPositive: true,
      badge: "",
      trend: generateTrend(avgInvoiceValue, true),
    },
  ];

  return (
    <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card, index) => (
        <Card
          key={`${card.label}-${index}`}
          className="h-[130px] rounded-xl border bg-white shadow-sm"
        >
          <CardHeader className="space-y-2 p-4 pb-1">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <CardDescription className="text-[11px] font-medium text-gray-500">
                  {card.label}
                </CardDescription>
                <CardTitle className="text-2xl font-bold tracking-tight text-gray-900">
                  {card.value}
                </CardTitle>
                <p
                  className={`text-[11px] font-medium ${card.isPositive ? "text-emerald-600" : "text-red-600"}`}
                >
                  {card.change}
                </p>
              </div>
              {card.badge && (
                <span className="rounded bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600">
                  {card.badge}
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-3 pt-1">
            <div className="h-[28px] w-full overflow-hidden rounded">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart 
                  data={card.trend} 
                  margin={{ top: 6, right: 0, left: 0, bottom: 12 }}
                >
                  <defs>
                    <linearGradient id={`gradient-${index}`} x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="0%"
                        stopColor={card.isPositive ? "#22c55e" : "#ef4444"}
                        stopOpacity={0.3}
                      />
                      <stop
                        offset="95%"
                        stopColor={card.isPositive ? "#22c55e" : "#ef4444"}
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke={card.isPositive ? "#22c55e" : "#ef4444"}
                    strokeWidth={2}
                    fill={`url(#gradient-${index})`}
                    dot={false}
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
