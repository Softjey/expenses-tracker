"use client";

import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { DateInput } from "@/components/ui/date-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { Loader2, Plus, Trash2, Pencil } from "lucide-react";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { CreateMerchantDialog } from "@/components/create-merchant-dialog";
import { CreateCategoryDialog } from "@/components/create-category-dialog";
import { useTransactions } from "@/hooks/use-transactions";
import { useCategories } from "@/hooks/use-categories";
import { useMerchants } from "@/hooks/use-merchants";
import { toISODateTimeString } from "@/lib/date-utils";
import type { TransactionWithDetails } from "@/hooks/use-transactions";

const formSchema = z.object({
  amount: z.number().min(0.01, "Amount must be positive"),
  currency: z.string().length(3),
  spread: z.number().min(0).optional(),
  date: z.date(),
  description: z.string().optional(),
  notes: z.string().optional(),
  categoryId: z.string().min(1, "Category is required"),
  merchantId: z.string().optional(),
  type: z.enum(["EXPENSE", "INCOME"]),
});

export function TransactionsClient() {
  const {
    data: transactions,
    isLoading,
    createTransaction,
    updateTransaction,
    deleteTransaction,
  } = useTransactions();
  const { data: categories } = useCategories();
  const { data: merchants } = useMerchants();

  const [open, setOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<string | null>(
    null
  );
  const [merchantDialogOpen, setMerchantDialogOpen] = useState(false);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [deletingTransactionId, setDeletingTransactionId] = useState<
    string | null
  >(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: 0,
      currency: "PLN",
      spread: 0,
      date: new Date(),
      description: "",
      notes: "",
      categoryId: "",
      merchantId: "",
      type: "EXPENSE",
    },
  });

  const type = useWatch({
    control: form.control,
    name: "type",
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const payload = {
      ...values,
      date: toISODateTimeString(values.date),
      spread: values.spread ?? 0,
      description: values.description ?? null,
      notes: values.notes ?? null,
      merchantId: values.merchantId ?? null,
    };

    try {
      if (editingTransaction) {
        await updateTransaction({ id: editingTransaction, data: payload });
      } else {
        await createTransaction(payload);
      }
      setOpen(false);
      setEditingTransaction(null);
      form.reset();
    } catch (error) {
      console.error("Transaction error:", error);
    }
  }

  const handleEdit = (transaction: TransactionWithDetails) => {
    setEditingTransaction(transaction.id);
    form.reset({
      amount: transaction.amount,
      currency: transaction.currency,
      spread: transaction.spread || 0,
      date: new Date(transaction.date),
      description: transaction.description || "",
      notes: transaction.notes || "",
      categoryId: transaction.categoryId,
      merchantId: transaction.merchantId || "",
      type: transaction.type,
    });
    setOpen(true);
  };

  const handleCloseSheet = () => {
    setOpen(false);
    setEditingTransaction(null);
    form.reset();
  };

  if (isLoading) {
    return (
      <div className="flex justify-center mt-10">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Transactions</h2>
        <Sheet open={open} onOpenChange={handleCloseSheet}>
          <SheetTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Add Transaction
            </Button>
          </SheetTrigger>
          <SheetContent className="sm:max-w-135 p-6 overflow-y-auto">
            <SheetHeader className="p-0">
              <SheetTitle>
                {editingTransaction ? "Edit Transaction" : "Add Transaction"}
              </SheetTitle>
              <SheetDescription>
                Enter the details of your transaction here.
              </SheetDescription>
            </SheetHeader>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4 py-4"
              >
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="EXPENSE">Expense</SelectItem>
                          <SelectItem value="INCOME">Income</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Amount</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            value={field.value || ""}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="currency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Currency</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Currency" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="PLN">PLN</SelectItem>
                            <SelectItem value="USD">USD</SelectItem>
                            <SelectItem value="EUR">EUR</SelectItem>
                            <SelectItem value="GBP">GBP</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="spread"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Spread (%)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.1"
                          value={field.value || ""}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date</FormLabel>
                      <FormControl>
                        <DateInput
                          value={field.value}
                          onChange={field.onChange}
                          max={new Date()}
                          min={new Date("1900-01-01")}
                          placeholder="DD/MM/YYYY"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="categoryId"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel>Category</FormLabel>
                        <Button
                          type="button"
                          variant="link"
                          className="h-auto p-0 text-xs"
                          onClick={() => setCategoryDialogOpen(true)}
                        >
                          Add New
                        </Button>
                      </div>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories
                            ?.filter((c) => c.type === type)
                            .map((category) => (
                              <SelectItem key={category.id} value={category.id}>
                                {category.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="merchantId"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel>Merchant (Optional)</FormLabel>
                        <Button
                          type="button"
                          variant="link"
                          className="h-auto p-0 text-xs"
                          onClick={() => setMerchantDialogOpen(true)}
                        >
                          Add New
                        </Button>
                      </div>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select merchant" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {merchants?.map((merchant) => (
                            <SelectItem key={merchant.id} value={merchant.id}>
                              {merchant.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full">
                  {editingTransaction ? "Update Transaction" : "Save Transaction"}
                </Button>
              </form>
            </Form>
          </SheetContent>
        </Sheet>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Merchant</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="w-25">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions?.map((transaction) => (
              <TableRow key={transaction.id}>
                <TableCell>
                  {format(new Date(transaction.date), "dd.MM.yyyy")}
                </TableCell>
                <TableCell>{transaction.category.name}</TableCell>
                <TableCell>{transaction.merchant?.name || "-"}</TableCell>
                <TableCell>{transaction.description || "-"}</TableCell>
                <TableCell
                  className={cn(
                    "text-right font-medium",
                    transaction.type === "EXPENSE"
                      ? "text-red-600"
                      : "text-green-600"
                  )}
                >
                  {transaction.type === "EXPENSE" ? "-" : "+"}
                  {transaction.amount.toFixed(2)} {transaction.currency}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(transaction)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeletingTransactionId(transaction.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {transactions?.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center py-10 text-muted-foreground"
                >
                  No transactions found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <CreateMerchantDialog
        open={merchantDialogOpen}
        onOpenChange={setMerchantDialogOpen}
      />
      <CreateCategoryDialog
        open={categoryDialogOpen}
        onOpenChange={setCategoryDialogOpen}
      />

      <AlertDialog
        open={!!deletingTransactionId}
        onOpenChange={() => setDeletingTransactionId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              transaction.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deletingTransactionId) {
                  deleteTransaction(deletingTransactionId);
                  setDeletingTransactionId(null);
                }
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
