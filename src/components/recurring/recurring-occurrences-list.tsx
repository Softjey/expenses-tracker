"use client";

import { format } from "date-fns";
import { Check, Loader2, AlertCircle } from "lucide-react";

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
  useRecurringOccurrences,
  useApproveOccurrence,
} from "@/hooks/use-recurring";
import { cn } from "@/lib/utils";

export function RecurringOccurrencesList() {
  const { data: occurrences = [], isLoading } = useRecurringOccurrences();
  const approveOccurrence = useApproveOccurrence();

  if (isLoading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const pendingOccurrences = occurrences.filter(
    (o) => o.status === "OVERDUE" || o.status === "DUE"
  );

  if (pendingOccurrences.length === 0) {
    return (
      <div className="flex h-40 flex-col items-center justify-center text-muted-foreground gap-2">
        <Check className="h-8 w-8 text-green-500" />
        <span>All caught up! No pending occurrences.</span>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Category</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pendingOccurrences.map((occ) => (
            <TableRow key={`${occ.ruleId}-${occ.date}`}>
              <TableCell>
                <div className="flex flex-col">
                  <span className="font-medium">
                    {format(new Date(occ.date), "MMM d, yyyy")}
                  </span>
                  {occ.status === "OVERDUE" && (
                    <span className="text-[10px] text-red-500 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" /> Overdue
                    </span>
                  )}
                </div>
              </TableCell>
              <TableCell>
                {occ.description}
                {occ.merchantName && (
                  <div className="text-xs text-muted-foreground">
                    {occ.merchantName}
                  </div>
                )}
              </TableCell>
              <TableCell>
                <Badge variant="outline">{occ.categoryName}</Badge>
              </TableCell>
              <TableCell
                className={cn(
                  "text-right font-mono",
                  "text-red-500" // Assuming expenses for now, or we should add type to occurrence
                )}
              >
                -{occ.amount.toFixed(2)} {occ.currency}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-2 text-green-600 hover:text-green-700 hover:bg-green-50"
                    onClick={() =>
                      approveOccurrence.mutate({
                        ruleId: occ.ruleId,
                        date: occ.date,
                        amount: occ.amount,
                        description: occ.description,
                      })
                    }
                    disabled={approveOccurrence.isPending}
                  >
                    <Check className="mr-1 h-4 w-4" />
                    Approve
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
