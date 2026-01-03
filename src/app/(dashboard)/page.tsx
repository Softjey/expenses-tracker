"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DateRangeSelector,
  DateRangeType,
} from "@/components/date-range-selector";
import { startOfMonth, endOfMonth } from "date-fns";

export default function Home() {
  const { data: session } = useSession();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currency, setCurrency] = useState<string>("PLN");
  const [rangeType, setRangeType] = useState<DateRangeType>("current_month");
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });

  useEffect(() => {
    if (session) {
      fetchPreferences();
    }
  }, [session]);

  useEffect(() => {
    if (session && currency) {
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
    setLoading(true);
    try {
      const params = new URLSearchParams({ currency });
      if (rangeType === "all") {
        params.append("from", "all");
      } else if (dateRange.from && dateRange.to) {
        params.append("from", dateRange.from.toISOString());
        params.append("to", dateRange.to.toISOString());
      }

      const res = await fetch(`/api/analytics?${params}`);
      const json = await res.json();
      setData(json);
    } catch (error) {
      console.error("Failed to fetch analytics", error);
    } finally {
      setLoading(false);
    }
  }

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Link href="/login">
          <Button>Login</Button>
        </Link>
      </div>
    );
  }

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8"];

  const currencySymbols: Record<string, string> = {
    PLN: "zł",
    USD: "$",
    EUR: "€",
    GBP: "£",
  };

  const symbol = currencySymbols[currency] || currency;

  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1 container mx-auto p-4">
        {loading ? (
          <div className="flex justify-center mt-10">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-3 mb-8">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Total Expenses
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">
                    {symbol}
                    {data?.totalExpenses.toFixed(2)}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Total Income
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {symbol}
                    {data?.totalIncome.toFixed(2)}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Net Balance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div
                    className={`text-2xl font-bold ${
                      data?.netBalance >= 0 ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {symbol}
                    {data?.netBalance.toFixed(2)}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="mb-4 flex justify-end gap-4">
              <DateRangeSelector
                value={rangeType}
                onChange={(type, range) => {
                  setRangeType(type);
                  setDateRange(range);
                }}
              />
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

            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Expenses by Category</CardTitle>
                </CardHeader>
                <CardContent className="h-75">
                  {data?.expensesByCategory.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={data.expensesByCategory}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          fill="#8884d8"
                          paddingAngle={5}
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
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full items-center justify-center text-gray-500">
                      No data available
                    </div>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Income by Category</CardTitle>
                </CardHeader>
                <CardContent className="h-75">
                  {data?.incomeByCategory.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={data.incomeByCategory}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          fill="#82ca9d"
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {data.incomeByCategory.map(
                            (entry: any, index: number) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={COLORS[index % COLORS.length]}
                              />
                            )
                          )}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full items-center justify-center text-gray-500">
                      No data available
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
