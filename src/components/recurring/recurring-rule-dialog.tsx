"use client";

import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DateInput } from "@/components/ui/date-input";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { CreateMerchantDialog } from "@/components/create-merchant-dialog";
import { CreateCategoryDialog } from "@/components/create-category-dialog";
import {
  useCreateRecurringRule,
  useUpdateRecurringRule,
  RecurringRule,
} from "@/hooks/use-recurring";
import { useCategories } from "@/hooks/use-categories";
import { useMerchants } from "@/hooks/use-merchants";
import { toISODateTimeString } from "@/lib/date-utils";
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

interface RecurringRuleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingRule: RecurringRule | null;
  onSuccess: () => void;
}

export function RecurringRuleDialog({
  open,
  onOpenChange,
  editingRule,
  onSuccess,
}: RecurringRuleDialogProps) {
  const { data: categories = [] } = useCategories();
  const { data: merchants = [] } = useMerchants();
  const createRule = useCreateRecurringRule();
  const updateRule = useUpdateRecurringRule();

  const [merchantDialogOpen, setMerchantDialogOpen] = useState(false);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [updateModeDialogOpen, setUpdateModeDialogOpen] = useState(false);
  const [pendingValues, setPendingValues] = useState<z.infer<
    typeof formSchema
  > | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      frequency: "MONTHLY",
      interval: 1,
      amount: 0,
      currency: "PLN",
      spread: 0,
      type: "EXPENSE",
      startDate: new Date(),
      isActive: true,
      description: "",
      notes: "",
    },
  });

  const frequency = useWatch({
    control: form.control,
    name: "frequency",
  });

  const type = useWatch({
    control: form.control,
    name: "type",
  });

  useEffect(() => {
    if (editingRule) {
      form.reset({
        frequency: editingRule.frequency,
        interval: editingRule.interval,
        amount: editingRule.amount,
        currency: editingRule.currency,
        spread: editingRule.spread || 0,
        type: editingRule.type,
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
        currency: "PLN",
        spread: 0,
        type: "EXPENSE",
        startDate: new Date(),
        isActive: true,
        description: "",
        notes: "",
      });
    }
  }, [editingRule, form, open]);

  const handleSmartUpdate = async (mode: "FUTURE" | "ALL") => {
    if (!pendingValues || !editingRule) return;

    try {
      await updateRule.mutateAsync({
        id: editingRule.id,
        data: {
          ...pendingValues,
          startDate: toISODateTimeString(pendingValues.startDate),
          endDate: pendingValues.endDate
            ? toISODateTimeString(pendingValues.endDate)
            : null,
          spread: pendingValues.spread ?? 0,
          description: pendingValues.description ?? null,
          notes: pendingValues.notes ?? null,
          merchantId: pendingValues.merchantId ?? null,
        },
        updateMode: mode,
      });
      setUpdateModeDialogOpen(false);
      setPendingValues(null);
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error("Error updating rule:", error);
    }
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    const transformedValues = {
      ...values,
      startDate: toISODateTimeString(values.startDate),
      endDate: values.endDate ? toISODateTimeString(values.endDate) : null,
      spread: values.spread ?? 0,
      description: values.description ?? null,
      notes: values.notes ?? null,
      merchantId: values.merchantId ?? null,
    };

    if (!editingRule) {
      try {
        await createRule.mutateAsync(transformedValues);
        onOpenChange(false);
        onSuccess();
      } catch (error) {
        console.error("Error creating rule:", error);
      }
    } else {
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
        try {
          await updateRule.mutateAsync({
            id: editingRule.id,
            data: transformedValues,
            updateMode: "ALL",
          });
          onOpenChange(false);
          onSuccess();
        } catch (error) {
          console.error("Error updating rule:", error);
        }
      }
    }
  };

  const filteredCategories = categories.filter((c) => c.type === type);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-150 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingRule ? "Edit Recurring Rule" : "Create Recurring Rule"}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                        value={field.value}
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
                  name="frequency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Frequency</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        value={field.value}
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
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} />
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
                        value={field.value}
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

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="interval"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Interval (Every X {frequency.toLowerCase()})
                      </FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
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
                        <Input type="number" step="0.1" {...field} />
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
                    <FormItem>
                      <FormLabel>Start Date</FormLabel>
                      <FormControl>
                        <DateInput
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="DD/MM/YYYY"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Date (Optional)</FormLabel>
                      <FormControl>
                        <DateInput
                          value={field.value || undefined}
                          onChange={field.onChange}
                          placeholder="DD/MM/YYYY"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

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
                    <Select onValueChange={field.onChange} value={field.value}>
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
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select merchant" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {merchants.map((merchant) => (
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

              <Button
                type="submit"
                className="w-full"
                disabled={createRule.isPending || updateRule.isPending}
              >
                {(createRule.isPending || updateRule.isPending) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {editingRule ? "Update Rule" : "Create Rule"}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <CreateMerchantDialog
        open={merchantDialogOpen}
        onOpenChange={setMerchantDialogOpen}
      />
      <CreateCategoryDialog
        open={categoryDialogOpen}
        onOpenChange={setCategoryDialogOpen}
      />

      <AlertDialog
        open={updateModeDialogOpen}
        onOpenChange={setUpdateModeDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Update Recurring Rule</AlertDialogTitle>
            <AlertDialogDescription>
              You have changed sensitive fields. How would you like to apply
              these changes?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel onClick={() => setPendingValues(null)}>
              Cancel
            </AlertDialogCancel>
            <Button
              variant="outline"
              onClick={() => handleSmartUpdate("FUTURE")}
            >
              Future occurrences only
            </Button>
            <AlertDialogAction onClick={() => handleSmartUpdate("ALL")}>
              All occurrences (re-calculate)
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
