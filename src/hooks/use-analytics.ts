import { useQuery } from "@tanstack/react-query";

export interface AnalyticsData {
  totalExpenses: number;
  totalIncome: number;
  netBalance: number;
  currency: string;
  expensesByCategory: { name: string; value: number }[];
  incomeByCategory: { name: string; value: number }[];
  expensesByMerchant: { name: string; value: number }[];
  spendingTrend: { date: string; value: number }[];
  isMonthlyView: boolean;
}

interface AnalyticsParams {
  currency: string;
  from?: string;
  to?: string;
}

export function useAnalytics(params: AnalyticsParams) {
  return useQuery<AnalyticsData>({
    queryKey: ["analytics", params.currency, params.from, params.to],
    queryFn: async () => {
      const searchParams = new URLSearchParams({ currency: params.currency });
      if (params.from) {
        searchParams.append("from", params.from);
      }
      if (params.to) {
        searchParams.append("to", params.to);
      }

      const res = await fetch(`/api/analytics?${searchParams}`);
      if (!res.ok) throw new Error("Failed to fetch analytics");
      return res.json();
    },
    enabled: !!params.currency,
  });
}
