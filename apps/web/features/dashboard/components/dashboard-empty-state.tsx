"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Line, LineChart, ResponsiveContainer } from "recharts";

const spendTrend = [
  { label: "Jan", value: 7800 },
  { label: "Feb", value: 8600 },
  { label: "Mar", value: 9400 },
  { label: "Apr", value: 10400 },
  { label: "May", value: 11600 },
  { label: "Jun", value: 12679 },
];

const spendCards = [
  {
    label: "Total Spend",
    amount: "€ 12.679,25",
    change: "+8.2% from last month",
  },
  {
    label: "Total Spend",
    amount: "€ 12.679,25",
    change: "+8.2% from last month",
  },
  {
    label: "Total Spend",
    amount: "€ 12.679,25",
    change: "+8.2% from last month",
  },
  {
    label: "Total Spend",
    amount: "€ 12.679,25",
    change: "+8.2% from last month",
  },
];

export function DashboardEmptyState() {
  return (
    <section className="flex flex-1 items-center justify-center px-6 py-8">
      <div className="grid w-full max-w-[1164px] grid-cols-[repeat(4,279px)] gap-4">
        {spendCards.map((card, index) => (
          <Card
            key={`${card.label}-${index}`}
            className="h-[120px] w-[279px] rounded-2xl border bg-white shadow-sm"
          >
            <CardHeader className="space-y-3 p-4 pb-2">
              <div className="flex items-start justify-between">
                <div className="space-y-1.5">
                  <CardDescription className="text-xs text-muted-foreground">
                    {card.label}
                  </CardDescription>
                  <CardTitle className="text-2xl font-semibold tracking-tight text-slate-900">
                    {card.amount}
                  </CardTitle>
                  <p className="text-xs font-medium text-emerald-500">
                    {card.change}
                  </p>
                </div>
                <span className="pt-px text-[11px] font-medium text-muted-foreground">
                  (YTD)
                </span>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-2">
              <div className="h-[44px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={spendTrend}
                    margin={{ top: 4, right: 4, left: 4, bottom: 0 }}
                  >
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#22c55e"
                      strokeWidth={2.5}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
