import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export interface Merchant {
  id: string;
  name: string;
}

export function useMerchants() {
  return useQuery<Merchant[]>({
    queryKey: ["merchants"],
    queryFn: async () => {
      const res = await fetch("/api/merchants");
      if (!res.ok) throw new Error("Failed to fetch merchants");
      return res.json();
    },
  });
}

export function useCreateMerchant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { name: string }) => {
      const res = await fetch("/api/merchants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to create merchant");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["merchants"] });
      toast.success("Merchant created successfully");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create merchant");
    },
  });
}

export function useDeleteMerchant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/merchants?id=${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to delete merchant");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["merchants"] });
      toast.success("Merchant deleted successfully");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete merchant");
    },
  });
}
