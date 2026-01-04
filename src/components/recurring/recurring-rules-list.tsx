"use client";

import React from "react";
import { format } from "date-fns";
import { Edit2, Trash2, Power, PowerOff, Loader2 } from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  useRecurringRules,
  useDeleteRecurringRule,
  useUpdateRecurringRule,
  RecurringRule,
} from "@/hooks/use-recurring";
import { cn } from "@/lib/utils";

interface RecurringRulesListProps {
  onEdit: (rule: RecurringRule) => void;
}

export function RecurringRulesList({ onEdit }: RecurringRulesListProps) {
  const { data: rules = [], isLoading } = useRecurringRules();
  const deleteRule = useDeleteRecurringRule();
  const updateRule = useUpdateRecurringRule();

  if (isLoading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (rules.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-muted-foreground">
        No recurring rules found.
      </div>
    );
  }

  const handleToggleActive = async (rule: RecurringRule) => {
    try {
      await updateRule.mutateAsync({
        id: rule.id,
        data: { isActive: !rule.isActive },
        updateMode: "FUTURE",
      });
    } catch (error) {
      console.error("Error toggling rule status:", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (
      confirm(
        "Are you sure you want to delete this recurring rule? All future occurrences will be removed."
      )
    ) {
      try {
        await deleteRule.mutateAsync(id);
      } catch (error) {
        console.error("Error deleting rule:", error);
      }
    }
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Status</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Frequency</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead>Next Date</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rules.map((rule) => (
            <TableRow key={rule.id}>
              <TableCell>
                <Badge variant={rule.isActive ? "default" : "secondary"}>
                  {rule.isActive ? "Active" : "Inactive"}
                </Badge>
              </TableCell>
              <TableCell className="font-medium">
                {rule.description || "No description"}
                {rule.merchant && (
                  <div className="text-xs text-muted-foreground">
                    {rule.merchant.name}
                  </div>
                )}
              </TableCell>
              <TableCell>
                <Badge variant="outline">{rule.category.name}</Badge>
              </TableCell>
              <TableCell>
                {rule.interval > 1 ? `Every ${rule.interval} ` : "Every "}
                {rule.frequency.toLowerCase()}
              </TableCell>
              <TableCell
                className={cn(
                  "text-right font-mono",
                  rule.type === "EXPENSE" ? "text-red-500" : "text-green-500"
                )}
              >
                {rule.type === "EXPENSE" ? "-" : "+"}
                {rule.amount.toFixed(2)} {rule.currency}
              </TableCell>
              <TableCell>
                {rule.nextOccurrence
                  ? format(new Date(rule.nextOccurrence), "MMM d, yyyy")
                  : "N/A"}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleToggleActive(rule)}
                    title={rule.isActive ? "Deactivate" : "Activate"}
                  >
                    {rule.isActive ? (
                      <PowerOff className="h-4 w-4 text-orange-500" />
                    ) : (
                      <Power className="h-4 w-4 text-green-500" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onEdit(rule)}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(rule.id)}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
