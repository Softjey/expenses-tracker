"use client";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
import type { Category, Transaction, Merchant } from "@prisma/client";
import { format } from "date-fns";
import { CalendarIcon, Loader2, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { CreateMerchantDialog } from "@/components/create-merchant-dialog";
import { CreateCategoryDialog } from "@/components/create-category-dialog";

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

type TransactionWithDetails = Transaction & {
  category: Category;
  merchant?: Merchant | null;
};

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<TransactionWithDetails[]>(
    []
  );
  const [categories, setCategories] = useState<Category[]>([]);
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [merchantDialogOpen, setMerchantDialogOpen] = useState(false);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] =
    useState<TransactionWithDetails | null>(null);
  const [deletingTransactionId, setDeletingTransactionId] = useState<
    string | null
  >(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: 0,
      currency: "USD",
      spread: 0,
      date: new Date(),
      description: "",
      notes: "",
      categoryId: "",
      merchantId: "",
      type: "EXPENSE",
    },
  });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const [transRes, catsRes, merchRes] = await Promise.all([
        fetch("/api/transactions"),
        fetch("/api/categories"),
        fetch("/api/merchants"),
      ]);
      const transData = await transRes.json();
      const catsData = await catsRes.json();
      const merchData = await merchRes.json();
      if (transRes.ok) setTransactions(transData);
      if (catsRes.ok) setCategories(catsData);
      if (merchRes.ok && Array.isArray(merchData)) setMerchants(merchData);
    } catch (error) {
      console.error("Failed to fetch data", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (editingTransaction) {
      form.reset({
        amount: editingTransaction.amount,
        currency: editingTransaction.currency,
        spread: editingTransaction.spread || 0,
        date: new Date(editingTransaction.date),
        description: editingTransaction.description || "",
        notes: editingTransaction.notes || "",
        categoryId: editingTransaction.categoryId,
        merchantId: editingTransaction.merchantId || "",
        type: editingTransaction.type as "EXPENSE" | "INCOME",
      });
    }
  }, [editingTransaction, form]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      const payload = {
        ...values,
        merchantId:
          values.merchantId === "_none" ? undefined : values.merchantId,
      };

      const url = editingTransaction
        ? `/api/transactions/${editingTransaction.id}`
        : "/api/transactions";
      const method = editingTransaction ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        body: JSON.stringify(payload),
        headers: { "Content-Type": "application/json" },
      });
      if (res.ok) {
        setOpen(false);
        setEditingTransaction(null);
        form.reset();
        fetchData();
      }
    } catch (error) {
      console.error("Failed to save transaction", error);
    }
  }

  async function deleteTransaction(id: string) {
    setDeletingTransactionId(id);
  }

  async function confirmDelete() {
    if (!deletingTransactionId) return;
    try {
      const res = await fetch(`/api/transactions/${deletingTransactionId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchData();
      }
    } catch (error) {
      console.error("Failed to delete transaction", error);
    } finally {
      setDeletingTransactionId(null);
    }
  }

  const filteredCategories = categories.filter(
    (c) => c.type === form.watch("type")
  );

  return (
    <div className="container mx-auto py-10">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Transactions</h1>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button onClick={() => setEditingTransaction(null)}>
              <Plus className="mr-2 h-4 w-4" /> Add Transaction
            </Button>
          </SheetTrigger>
          <SheetContent className="overflow-y-auto p-6">
            <SheetHeader className="px-0">
              <SheetTitle>
                {editingTransaction ? "Edit Transaction" : "Add Transaction"}
              </SheetTitle>
              <SheetDescription>Create a new transaction.</SheetDescription>
            </SheetHeader>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4 mt-4"
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
                          {...field}
                          onChange={(e) =>
                            field.onChange(parseFloat(e.target.value))
                          }
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
                            <SelectValue placeholder="Select currency" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="USD">USD</SelectItem>
                          <SelectItem value="EUR">EUR</SelectItem>
                          <SelectItem value="PLN">PLN</SelectItem>
                          <SelectItem value="GBP">GBP</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="spread"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Spread (%)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          {...field}
                          onChange={(e) =>
                            field.onChange(parseFloat(e.target.value))
                          }
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
                      <FormLabel>Category</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          if (value === "_create_new") {
                            setCategoryDialogOpen(true);
                          } else {
                            field.onChange(value);
                          }
                        }}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {filteredCategories.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name}
                            </SelectItem>
                          ))}
                          <SelectItem
                            value="_create_new"
                            className="font-semibold text-blue-600"
                          >
                            + Create New Category
                          </SelectItem>
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
                      <FormLabel>Merchant (Optional)</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          if (value === "_create_new") {
                            setMerchantDialogOpen(true);
                          } else {
                            field.onChange(value);
                          }
                        }}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select merchant" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="_none">None</SelectItem>
                          {merchants.map((merchant) => (
                            <SelectItem key={merchant.id} value={merchant.id}>
                              {merchant.name}
                            </SelectItem>
                          ))}
                          <SelectItem
                            value="_create_new"
                            className="font-semibold text-blue-600"
                          >
                            + Create New Merchant
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <CreateMerchantDialog
                  open={merchantDialogOpen}
                  onOpenChange={setMerchantDialogOpen}
                  onSuccess={(merchant) => {
                    setMerchants([...merchants, merchant]);
                    form.setValue("merchantId", merchant.id);
                  }}
                />
                <CreateCategoryDialog
                  open={categoryDialogOpen}
                  onOpenChange={setCategoryDialogOpen}
                  onSuccess={(category) => {
                    setCategories([...categories, category]);
                    form.setValue("categoryId", category.id);
                  }}
                />
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) =>
                              date > new Date() || date < new Date("1900-01-01")
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
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
                        <Input placeholder="Description" {...field} />
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
                        <Textarea placeholder="Notes" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full">
                  Save Transaction
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
              <TableHead>Amount</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((transaction) => (
              <TableRow key={transaction.id}>
                <TableCell>
                  {format(new Date(transaction.date), "PPP")}
                </TableCell>
                <TableCell>{transaction.category.name}</TableCell>
                <TableCell>{transaction.merchant?.name || "-"}</TableCell>
                <TableCell>{transaction.description}</TableCell>
                <TableCell
                  className={cn(
                    transaction.type === "INCOME"
                      ? "text-green-600"
                      : "text-red-600"
                  )}
                >
                  {transaction.type === "INCOME" ? "+" : "-"}
                  {new Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: transaction.currency,
                  }).format(transaction.amount)}
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingTransaction(transaction);
                        setOpen(true);
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteTransaction(transaction.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {transactions.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-gray-500">
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
        onSuccess={(merchant) => {
          setMerchants([...merchants, merchant]);
          form.setValue("merchantId", merchant.id);
        }}
      />

      <CreateCategoryDialog
        open={categoryDialogOpen}
        onOpenChange={setCategoryDialogOpen}
        onSuccess={(category) => {
          setCategories([...categories, category]);
          form.setValue("categoryId", category.id);
        }}
      />

      <AlertDialog
        open={!!deletingTransactionId}
        onOpenChange={(open) => !open && setDeletingTransactionId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Transaction</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this transaction? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
