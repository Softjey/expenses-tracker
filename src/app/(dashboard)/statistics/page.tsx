"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format, subDays } from "date-fns";
import { DatePickerWithRange } from "@/components/date-range-picker";
import { DateRange } from "react-day-picker";

export default function StatisticsPage() {
  const { data: session } = useSession();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currency, setCurrency] = useState<string>("PLN");
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });

  useEffect(() => {
    if (session) {
      fetchPreferences();
    }
  }, [session]);

  useEffect(() => {
    if (session && currency && dateRange?.from && dateRange?.to) {
      fetchAnalytics();
    }
  }, [session, currency, dateRange]);

  async function fetchPreferences() {
    try {
      const res = await fetch("/api/user/preferences");
      if (res.ok) {
        const json = await res.json();
        setCurrency(json.preferredCurrency || "PLN");
      }
    } catch (error) {
      console.error("Failed to fetch preferences", error);
    }
  }

  async function fetchAnalytics() {
    if (!dateRange?.from || !dateRange?.to) return;

    setLoading(true);
    try {
      const params = new URLSearchParams({
        currency,
        from: dateRange.from.toISOString(),
        to: dateRange.to.toISOString(),
      });
      const res = await fetch(`/api/analytics?${params}`);
      const json = await res.json();
      setData(json);
    } catch (error) {
      console.error("Failed to fetch analytics", error);
    } finally {
      setLoading(false);
    }
  }

  const COLORS = [
    "#0088FE",
    "#00C49F",
    "#FFBB28",
    "#FF8042",
    "#8884d8",
    "#82ca9d",
    "#ffc658",
    "#8dd1e1",
    "#a4de6c",
    "#d0ed57",
  ];

  const currencySymbols: Record<string, string> = {
    PLN: "zł",
    USD: "$",
    EUR: "€",
    GBP: "£",
  };

  const symbol = currencySymbols[currency] || currency;

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">Statistics</h1>
        <div className="flex items-center gap-4">
          <DatePickerWithRange date={dateRange} setDate={setDateRange} />
          <Select
            value={currency}
            onValueChange={async (val) => {
              setCurrency(val);
              try {
                await fetch("/api/user/preferences", {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ preferredCurrency: val }),
                });
              } catch (error) {
                console.error("Failed to save preference", error);
              }
            }}
          >
            <SelectTrigger className="w-45">
              <SelectValue placeholder="Select currency" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PLN">PLN (złoty)</SelectItem>
              <SelectItem value="USD">USD ($)</SelectItem>
              <SelectItem value="EUR">EUR (€)</SelectItem>
              <SelectItem value="GBP">GBP (£)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Spending Trend */}
      <Card>
        <CardHeader>
          <CardTitle>Spending Trend</CardTitle>
          <CardDescription>
            Expenses over time ({data?.isMonthlyView ? "Monthly" : "Daily"})
          </CardDescription>
        </CardHeader>
        <CardContent className="h-100">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data?.spendingTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickFormatter={(date) => {
                  if (data?.isMonthlyView) {
                    return format(new Date(date + "-01"), "MMM yyyy");
                  }
                  return format(new Date(date), "MMM d");
                }}
              />
              <YAxis />
              <Tooltip
                formatter={(value: number | undefined) => [
                  `${symbol}${(value ?? 0).toFixed(2)}`,
                  "Amount",
                ]}
                labelFormatter={(label) => {
                  if (data?.isMonthlyView) {
                    return format(new Date(label + "-01"), "MMMM yyyy");
                  }
                  return format(new Date(label), "MMMM d, yyyy");
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="value"
                name="Expenses"
                stroke="#8884d8"
                strokeWidth={2}
                activeDot={{ r: 8 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid gap-8 md:grid-cols-2">
        {/* Expenses by Category */}
        <Card>
          <CardHeader>
            <CardTitle>Expenses by Category</CardTitle>
            <CardDescription>Distribution of your spending</CardDescription>
          </CardHeader>
          <CardContent className="h-100">
            {data?.expensesByCategory.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.expensesByCategory}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) =>
                      `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                    }
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {data.expensesByCategory.map(
                      (entry: any, index: number) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      )
                    )}
                  </Pie>
                  <Tooltip
                    formatter={(value: number | undefined) => [
                      `${symbol}${(value ?? 0).toFixed(2)}`,
                      "Amount",
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                No expense data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Income by Category */}
        <Card>
          <CardHeader>
            <CardTitle>Income Sources</CardTitle>
            <CardDescription>Where your money comes from</CardDescription>
          </CardHeader>
          <CardContent className="h-100">
            {data?.incomeByCategory.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.incomeByCategory}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) =>
                      `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                    }
                    outerRadius={120}
                    fill="#82ca9d"
                    dataKey="value"
                  >
                    {data.incomeByCategory.map((entry: any, index: number) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number | undefined) => [
                      `${symbol}${(value ?? 0).toFixed(2)}`,
                      "Amount",
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                No income data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Merchants */}
      <Card>
        <CardHeader>
          <CardTitle>Top Merchants</CardTitle>
          <CardDescription>Where you spend the most (Top 10)</CardDescription>
        </CardHeader>
        <CardContent className="h-100">
          {data?.expensesByMerchant.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data.expensesByMerchant}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={100} />
                <Tooltip
                  formatter={(value: number | undefined) => [
                    `${symbol}${(value ?? 0).toFixed(2)}`,
                    "Amount",
                  ]}
                />
                <Legend />
                <Bar
                  dataKey="value"
                  name="Amount Spent"
                  fill="#8884d8"
                  radius={[0, 4, 4, 0]}
                >
                  {data.expensesByMerchant.map((entry: any, index: number) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              No merchant data available
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
