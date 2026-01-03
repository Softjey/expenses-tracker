"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import {
  CalendarIcon,
  Loader2,
  Plus,
  Trash2,
  Pencil,
  Check,
  AlertCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
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

import { CreateMerchantDialog } from "@/components/create-merchant-dialog";
import { CreateCategoryDialog } from "@/components/create-category-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

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
import { Badge } from "@/components/ui/badge";

// Types
type Category = {
  id: string;
  name: string;
  type: string;
};

type Merchant = {
  id: string;
  name: string;
};

type RecurringRule = {
  id: string;
  frequency: string;
  interval: number;
  amount: number;
  currency: string;
  type: string;
  startDate: string;
  endDate?: string | null;
  categoryId: string;
  category: Category;
  merchantId?: string | null;
  merchant?: Merchant | null;
  description?: string | null;
  notes?: string | null;
  isActive: boolean;
};

type RecurringOccurrence = {
  date: Date;
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

const formSchema = z.object({
  frequency: z.enum(["DAILY", "WEEKLY", "MONTHLY", "YEARLY"]),
  interval: z.number().int().min(1),
  amount: z.number().positive(),
  currency: z.string().length(3),
  spread: z.number().min(0).optional(),
  type: z.enum(["EXPENSE", "INCOME"]),
  startDate: z.date(),
  endDate: z.date().optional().nullable(),
  categoryId: z.string().min(1, "Category is required"),
  merchantId: z.string().optional(),
  description: z.string().optional(),
  notes: z.string().optional(),
  isActive: z.boolean(),
});

export default function RecurringPage() {
  const [rules, setRules] = useState<RecurringRule[]>([]);
  const [occurrences, setOccurrences] = useState<RecurringOccurrence[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [merchantDialogOpen, setMerchantDialogOpen] = useState(false);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<RecurringRule | null>(null);
  const [updateModeDialogOpen, setUpdateModeDialogOpen] = useState(false);
  const [pendingValues, setPendingValues] = useState<z.infer<
    typeof formSchema
  > | null>(null);
  const [approvingIds, setApprovingIds] = useState<Set<string>>(new Set());
  const [deletingRuleId, setDeletingRuleId] = useState<string | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      frequency: "MONTHLY",
      interval: 1,
      amount: 0,
      currency: "USD",
      spread: 0,
      type: "EXPENSE",
      startDate: new Date(),
      isActive: true,
      description: "",
      notes: "",
    },
  });

  useEffect(() => {
    fetchRules();
    fetchOccurrences();
    fetchCategories();
    fetchMerchants();
  }, []);

  useEffect(() => {
    if (editingRule) {
      form.reset({
        frequency: editingRule.frequency as
          | "DAILY"
          | "WEEKLY"
          | "MONTHLY"
          | "YEARLY",
        interval: editingRule.interval,
        amount: editingRule.amount,
        currency: editingRule.currency,
        spread:
          (editingRule as RecurringRule & { spread?: number }).spread || 0,
        type: editingRule.type as "EXPENSE" | "INCOME",
        startDate: new Date(editingRule.startDate),
        endDate: editingRule.endDate
          ? new Date(editingRule.endDate)
          : undefined,
        categoryId: editingRule.categoryId,
        merchantId: editingRule.merchantId || undefined,
        description: editingRule.description || "",
        notes: editingRule.notes || "",
        isActive: editingRule.isActive,
      });
    } else {
      form.reset({
        frequency: "MONTHLY",
        interval: 1,
        amount: 0,
        spread: 0,
        currency: "USD",
        type: "EXPENSE",
        startDate: new Date(),
        isActive: true,
        description: "",
        notes: "",
      });
    }
  }, [editingRule, form]);

  const fetchRules = async () => {
    try {
      const res = await fetch("/api/recurring");
      if (res.ok) {
        const data = await res.json();
        setRules(data);
      }
    } catch (error) {
      console.error("Failed to fetch rules", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchOccurrences = async () => {
    try {
      const res = await fetch("/api/recurring/occurrences");
      if (res.ok) {
        const data = await res.json();
        // Parse dates
        const parsed = data.map(
          (occ: RecurringOccurrence & { date: string }) => ({
            ...occ,
            date: new Date(occ.date),
          })
        );
        setOccurrences(parsed);
      }
    } catch (error) {
      console.error("Failed to fetch occurrences", error);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch("/api/categories");
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
      }
    } catch (error) {
      console.error("Failed to fetch categories", error);
    }
  };

  const fetchMerchants = async () => {
    try {
      const res = await fetch("/api/merchants");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setMerchants(data);
      }
    } catch (error) {
      console.error("Failed to fetch merchants", error);
    }
  };

  const handleDiscard = async (occurrence: RecurringOccurrence) => {
    // Create a $0 transaction to mark as "skipped"
    const occId = occurrence.ruleId + occurrence.date.toISOString();
    setApprovingIds(new Set(approvingIds).add(occId));

    try {
      const res = await fetch("/api/recurring/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ruleId: occurrence.ruleId,
          date: occurrence.date.toISOString(),
          amount: 0,
          description: `SKIPPED: ${occurrence.description}`,
        }),
      });

      if (!res.ok) throw new Error("Failed to discard");

      await fetchOccurrences();
    } catch (error) {
      console.error("Error discarding:", error);
    } finally {
      setApprovingIds((prev) => {
        const next = new Set(prev);
        next.delete(occId);
        return next;
      });
    }
  };

  const handleEditApprove = (occurrence: RecurringOccurrence) => {
    // Pre-populate form with occurrence data
    const rule = rules.find((r) => r.id === occurrence.ruleId);
    if (!rule) return;

    form.reset({
      type: rule.type as "EXPENSE" | "INCOME",
      amount: occurrence.amount,
      currency: occurrence.currency,
      description: occurrence.description,
      categoryId: rule.categoryId,
      merchantId: rule.merchantId || undefined,
      startDate: occurrence.date,
    });

    setIsDialogOpen(true);
  };

  const handleApprove = async (occurrence: RecurringOccurrence) => {
    const occId = occurrence.ruleId + occurrence.date.toISOString();
    setApprovingIds(new Set(approvingIds).add(occId));

    try {
      const res = await fetch("/api/recurring/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ruleId: occurrence.ruleId,
          date: occurrence.date.toISOString(),
        }),
      });

      if (!res.ok) throw new Error("Failed to approve");

      await fetchOccurrences();
    } catch (error) {
      console.error("Error approving:", error);
    } finally {
      setApprovingIds((prev) => {
        const next = new Set(prev);
        next.delete(occId);
        return next;
      });
    }
  };

  const handleApproveAll = async () => {
    const pending = occurrences.filter(
      (o) => o.status === "OVERDUE" || o.status === "DUE"
    );

    for (const occ of pending) {
      await handleApprove(occ);
    }
  };

  const handleSmartUpdate = async (mode: "all" | "future") => {
    if (!pendingValues || !editingRule) return;

    try {
      const res = await fetch(`/api/recurring/${editingRule.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...pendingValues, updateMode: mode }),
      });

      if (!res.ok) throw new Error("Failed to update rule");

      await fetchRules();
      await fetchOccurrences();
      setUpdateModeDialogOpen(false);
      setEditingRule(null);
      setPendingValues(null);
      setIsDialogOpen(false);
      form.reset();
    } catch (error) {
      console.error("Error updating rule:", error);
    }
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!editingRule) {
      // Create new rule
      try {
        const res = await fetch("/api/recurring", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        });

        if (!res.ok) throw new Error("Failed to create rule");

        await fetchRules();
        await fetchOccurrences();
        setIsDialogOpen(false);
        form.reset();
      } catch (error) {
        console.error("Error creating rule:", error);
      }
    } else {
      // Check for sensitive changes
      const hasSensitiveChanges =
        values.amount !== editingRule.amount ||
        values.currency !== editingRule.currency ||
        values.frequency !== editingRule.frequency ||
        values.interval !== editingRule.interval ||
        values.startDate.getTime() !==
          new Date(editingRule.startDate).getTime();

      if (hasSensitiveChanges) {
        setPendingValues(values);
        setUpdateModeDialogOpen(true);
      } else {
        // Just update normally
        try {
          const res = await fetch(`/api/recurring/${editingRule.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...values, updateMode: "all" }),
          });

          if (!res.ok) throw new Error("Failed to update rule");

          await fetchRules();
          await fetchOccurrences();
          setIsDialogOpen(false);
          setEditingRule(null);
          form.reset();
        } catch (error) {
          console.error("Error updating rule:", error);
        }
      }
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingRuleId(id);
  };

  const confirmDelete = async () => {
    if (!deletingRuleId) return;

    try {
      const res = await fetch(`/api/recurring/${deletingRuleId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete rule");
      fetchRules();
      fetchOccurrences();
    } catch (error) {
      console.error("Error deleting rule:", error);
    } finally {
      setDeletingRuleId(null);
    }
  };

  const filteredCategories = categories.filter(
    (c) => c.type === "BOTH" || c.type === form.watch("type")
  );

  const pendingOccurrences = occurrences.filter(
    (o) => o.status === "OVERDUE" || o.status === "DUE"
  );
  const upcomingOccurrences = occurrences.filter(
    (o) => o.status === "UPCOMING"
  );

  return (
    <div className="container mx-auto py-10 space-y-8">
      {/* Pending Section */}
      {pendingOccurrences.length > 0 && (
        <Card className="border-orange-200 bg-orange-50/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-orange-600" />
                  Pending Recurring Transactions
                </CardTitle>
                <CardDescription>
                  {pendingOccurrences.length} transaction
                  {pendingOccurrences.length > 1 ? "s" : ""} need your approval
                </CardDescription>
              </div>
              <Button onClick={handleApproveAll} variant="default">
                Approve All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Merchant</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingOccurrences.map((occ) => {
                  const occId = occ.ruleId + occ.date.toISOString();
                  const isApproving = approvingIds.has(occId);
                  return (
                    <TableRow key={occId}>
                      <TableCell>{format(occ.date, "MMM d, yyyy")}</TableCell>
                      <TableCell>{occ.description}</TableCell>
                      <TableCell>{occ.merchantName || "-"}</TableCell>
                      <TableCell>
                        {new Intl.NumberFormat("en-US", {
                          style: "currency",
                          currency: occ.currency,
                        }).format(occ.amount)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            occ.status === "OVERDUE" ? "destructive" : "default"
                          }
                        >
                          {occ.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleApprove(occ)}
                            disabled={isApproving}
                          >
                            {isApproving ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <Check className="h-4 w-4 mr-1" /> Approve
                              </>
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditApprove(occ)}
                            disabled={isApproving}
                          >
                            <Pencil className="h-4 w-4 mr-1" /> Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDiscard(occ)}
                            disabled={isApproving}
                          >
                            Skip
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Upcoming Section */}
      {upcomingOccurrences.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Recurring Transactions</CardTitle>
            <CardDescription>
              Next {upcomingOccurrences.slice(0, 5).length} scheduled
              transactions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Merchant</TableHead>
                  <TableHead>Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {upcomingOccurrences.slice(0, 5).map((occ) => {
                  const occId = occ.ruleId + occ.date.toISOString();
                  return (
                    <TableRow key={occId}>
                      <TableCell>{format(occ.date, "MMM d, yyyy")}</TableCell>
                      <TableCell>{occ.description}</TableCell>
                      <TableCell>{occ.merchantName || "-"}</TableCell>
                      <TableCell>
                        {new Intl.NumberFormat("en-US", {
                          style: "currency",
                          currency: occ.currency,
                        }).format(occ.amount)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Rules Management */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Recurring Rules</h1>
        <Dialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) setEditingRule(null);
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Add Rule
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-150 max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingRule ? "Edit Rule" : "Create Recurring Rule"}
              </DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
              >
                <div className="grid grid-cols-2 gap-4">
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
                </div>

                <div className="grid grid-cols-2 gap-4">
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
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Input placeholder="Rent, Salary, etc." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
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
                              <SelectValue placeholder="Select merchant (optional)" />
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
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="frequency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Frequency</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select frequency" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="DAILY">Daily</SelectItem>
                            <SelectItem value="WEEKLY">Weekly</SelectItem>
                            <SelectItem value="MONTHLY">Monthly</SelectItem>
                            <SelectItem value="YEARLY">Yearly</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="interval"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Interval (every X)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="1"
                            {...field}
                            onChange={(e) =>
                              field.onChange(parseInt(e.target.value, 10))
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Start Date</FormLabel>
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
                              disabled={(date) => date < new Date("1900-01-01")}
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
                    name="endDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>End Date (Optional)</FormLabel>
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
                              selected={field.value || undefined}
                              onSelect={field.onChange}
                              disabled={(date) => date < new Date("1900-01-01")}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Active</FormLabel>
                      </div>
                    </FormItem>
                  )}
                />

                <Button type="submit" className="w-full">
                  {editingRule ? "Update Rule" : "Create Rule"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        <AlertDialog
          open={updateModeDialogOpen}
          onOpenChange={setUpdateModeDialogOpen}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Update Recurring Rule</AlertDialogTitle>
              <AlertDialogDescription>
                You are changing sensitive fields (amount, frequency, etc.). How
                would you like to apply this change?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-col space-y-2 sm:space-y-0">
              <AlertDialogCancel
                onClick={() => {
                  setUpdateModeDialogOpen(false);
                  setPendingValues(null);
                }}
              >
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction onClick={() => handleSmartUpdate("all")}>
                Update All (Past & Future)
              </AlertDialogAction>
              <AlertDialogAction onClick={() => handleSmartUpdate("future")}>
                Update Future Only
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

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
      </div>

      <AlertDialog
        open={!!deletingRuleId}
        onOpenChange={(open) => !open && setDeletingRuleId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Recurring Rule</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this recurring rule? This action
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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          <div className="col-span-full flex justify-center py-10">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : rules.length === 0 ? (
          <div className="col-span-full text-center py-10 text-muted-foreground">
            No recurring rules found. Create one to get started.
          </div>
        ) : (
          rules.map((rule) => (
            <Card
              key={rule.id}
              className={cn("relative", !rule.isActive && "opacity-60")}
            >
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg font-semibold">
                    {rule.description || rule.category.name}
                  </CardTitle>
                  <span
                    className={cn(
                      "font-bold",
                      rule.type === "INCOME" ? "text-green-600" : "text-red-600"
                    )}
                  >
                    {rule.type === "INCOME" ? "+" : "-"}
                    {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: rule.currency,
                    }).format(rule.amount)}
                  </span>
                </div>
                <div className="text-sm text-muted-foreground">
                  {rule.interval > 1 ? `Every ${rule.interval} ` : ""}
                  {rule.frequency}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Category:</span>
                    <span>{rule.category.name}</span>
                  </div>
                  {rule.merchant && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Merchant:</span>
                      <span>{rule.merchant.name}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Start:</span>
                    <span>
                      {format(new Date(rule.startDate), "MMM d, yyyy")}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status:</span>
                    <span
                      className={
                        rule.isActive ? "text-green-600" : "text-gray-500"
                      }
                    >
                      {rule.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>
                <div className="mt-4 flex justify-end space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingRule(rule);
                      setIsDialogOpen(true);
                    }}
                  >
                    <Pencil className="h-4 w-4 mr-1" /> Edit
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(rule.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-1" /> Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
