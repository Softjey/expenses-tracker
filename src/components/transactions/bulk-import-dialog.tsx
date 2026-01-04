"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Upload, AlertCircle } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { ScrollArea } from "@/components/ui/scroll-area";

const transactionSchema = z.object({
  amount: z
    .number({
      required_error: "Amount is required",
      invalid_type_error: "Amount must be a number",
    })
    .positive("Amount must be positive"),
  currency: z
    .string({ required_error: "Currency is required" })
    .length(3, "Currency must be a 3-letter code (e.g. USD)"),
  date: z
    .string({ required_error: "Date is required" })
    .refine((val) => !isNaN(Date.parse(val)), "Invalid date format"),
  description: z.string().optional(),
  notes: z.string().optional(),
  categoryName: z
    .string({ required_error: "Category name is required" })
    .min(1, "Category name cannot be empty"),
  merchantName: z
    .string({ required_error: "Merchant name is required" })
    .min(1, "Merchant name cannot be empty"),
  type: z.enum(["EXPENSE", "INCOME"], {
    required_error: "Type is required",
    invalid_type_error: "Type must be EXPENSE or INCOME",
  }),
});

const bulkImportSchema = z.array(transactionSchema);

const EXAMPLE_JSON = `[
  {
    "amount": 100.50,
    "currency": "PLN",
    "date": "2024-01-04T12:00:00Z",
    "type": "EXPENSE",
    "categoryName": "Food",
    "merchantName": "Biedronka",
    "description": "Groceries",
    "notes": "Weekly shopping"
  },
  {
    "amount": 5000,
    "currency": "USD",
    "date": "2024-01-01T09:00:00Z",
    "type": "INCOME",
    "categoryName": "Salary",
    "merchantName": "Employer Inc",
    "description": "January Salary"
  }
]`;

export function BulkImportDialog() {
  const [open, setOpen] = useState(false);
  const [jsonInput, setJsonInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const queryClient = useQueryClient();

  const handleImport = async () => {
    setIsLoading(true);
    setErrors([]);

    try {
      let parsedData;
      try {
        parsedData = JSON.parse(jsonInput);
      } catch {
        throw new Error("Invalid JSON format. Please check your syntax.");
      }

      if (!Array.isArray(parsedData)) {
        throw new Error(
          "Input must be an array of transactions (start with [ and end with ])"
        );
      }

      const validationResult = bulkImportSchema.safeParse(parsedData);

      if (!validationResult.success) {
        const formattedErrors = validationResult.error.errors.map((err) => {
          const path = err.path.join(".");
          return `Item ${err.path[0]}: ${err.message} (at ${path})`;
        });
        setErrors(formattedErrors);
        return;
      }

      const response = await fetch("/api/transactions/bulk", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(parsedData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to import transactions");
      }

      const result = await response.json();

      toast.success(`Successfully imported ${result.length} transactions`);

      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      queryClient.invalidateQueries({ queryKey: ["merchants"] });
      setOpen(false);
      setJsonInput("");
    } catch (err) {
      setErrors([
        err instanceof Error ? err.message : "An unknown error occurred",
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="mr-2 h-4 w-4" />
          Bulk Import
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-150">
        <DialogHeader>
          <DialogTitle>Bulk Import Transactions</DialogTitle>
          <DialogDescription>
            Paste your transactions in JSON format below. Categories and
            merchants will be created if they don&apos;t exist.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <h4 className="text-sm font-medium leading-none">Example Format</h4>
            <pre className="bg-muted p-2 rounded-md text-xs overflow-x-auto">
              {EXAMPLE_JSON}
            </pre>
          </div>

          <div className="space-y-2">
            <Textarea
              placeholder="Paste JSON here..."
              className="h-50 font-mono text-xs"
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
            />
          </div>

          {errors.length > 0 && (
            <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md">
              <div className="flex items-center gap-2 font-semibold mb-2">
                <AlertCircle className="h-4 w-4" />
                <span>Validation Errors ({errors.length})</span>
              </div>
              <ScrollArea className="h-25">
                <ul className="list-disc pl-5 space-y-1">
                  {errors.map((error, index) => (
                    <li key={index} className="text-xs">
                      {error}
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleImport} disabled={isLoading || !jsonInput}>
            {isLoading ? "Importing..." : "Import"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
