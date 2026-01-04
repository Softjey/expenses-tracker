import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export type RecurringRule = {
  id: string;
  frequency: "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";
  interval: number;
  amount: number;
  currency: string;
  spread?: number;
  type: "EXPENSE" | "INCOME";
  startDate: string;
  endDate?: string | null;
  categoryId: string;
  category: {
    id: string;
    name: string;
    type: string;
  };
  merchantId?: string | null;
  merchant?: {
    id: string;
    name: string;
  } | null;
  description?: string | null;
  notes?: string | null;
  isActive: boolean;
  nextOccurrence?: string | null;
};

export type RecurringOccurrence = {
  date: string;
  status: "PAID" | "OVERDUE" | "DUE" | "UPCOMING";
  ruleId: string;
  amount: number;
  currency: string;
  spread?: number;
  description: string;
  merchantId?: string | null;
  merchantName?: string | null;
  categoryName: string;
  transactionId?: string;
};

export function useRecurringRules() {
  return useQuery<RecurringRule[]>({
    queryKey: ["recurring-rules"],
    queryFn: async () => {
      const res = await fetch("/api/recurring");
      if (!res.ok) throw new Error("Failed to fetch recurring rules");
      return res.json();
    },
  });
}

export function useRecurringOccurrences() {
  return useQuery<RecurringOccurrence[]>({
    queryKey: ["recurring-occurrences"],
    queryFn: async () => {
      const res = await fetch("/api/recurring/occurrences");
      if (!res.ok) throw new Error("Failed to fetch recurring occurrences");
      return res.json();
    },
  });
}

export function useCreateRecurringRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      data: Omit<
        RecurringRule,
        "id" | "category" | "merchant" | "nextOccurrence"
      >
    ) => {
      const res = await fetch("/api/recurring", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create recurring rule");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring-rules"] });
      queryClient.invalidateQueries({ queryKey: ["recurring-occurrences"] });
    },
  });
}

export function useUpdateRecurringRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      data,
      updateMode,
    }: {
      id: string;
      data: Partial<
        Omit<RecurringRule, "id" | "category" | "merchant" | "nextOccurrence">
      >;
      updateMode?: "FUTURE" | "ALL";
    }) => {
      const res = await fetch(
        `/api/recurring/${id}${updateMode ? `?updateMode=${updateMode}` : ""}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        }
      );
      if (!res.ok) throw new Error("Failed to update recurring rule");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring-rules"] });
      queryClient.invalidateQueries({ queryKey: ["recurring-occurrences"] });
    },
  });
}

export function useDeleteRecurringRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/recurring/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete recurring rule");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring-rules"] });
      queryClient.invalidateQueries({ queryKey: ["recurring-occurrences"] });
    },
  });
}

export function useApproveOccurrence() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      ruleId: string;
      date: string;
      amount: number;
      description: string;
    }) => {
      const res = await fetch("/api/recurring/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to approve occurrence");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring-occurrences"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
    },
  });
}
