import {
  addDays,
  addWeeks,
  addMonths,
  addYears,
  isBefore,
  isAfter,
  isSameDay,
  startOfDay,
  endOfDay,
  subDays,
  addDays as addDaysFns,
} from "date-fns";
import { prisma } from "@/lib/prisma";

export type RecurringRule = {
  id: string;
  frequency: string;
  interval: number;
  startDate: Date;
  endDate?: Date | null;
  occurrences?: number | null;
  amount: number;
  currency: string;
  type: string;
  categoryId: string;
  merchantId?: string | null;
  description?: string | null;
  category: { name: string };
  merchant?: { name: string } | null;
};

export type RecurringOccurrence = {
  date: Date;
  status: "PAID" | "OVERDUE" | "DUE" | "UPCOMING";
  ruleId: string;
  amount: number;
  currency: string;
  description: string;
  merchantId?: string | null;
  merchantName?: string | null;
  categoryName: string;
  transactionId?: string;
};

export async function getRecurringOccurrences(
  rules: RecurringRule[],
  rangeStart: Date,
  rangeEnd: Date
): Promise<RecurringOccurrence[]> {
  const occurrences: RecurringOccurrence[] = [];

  for (const rule of rules) {
    // Use UTC parts to avoid timezone shifts when calculating occurrences.
    // This ensures that a start date of April 1st stays April 1st regardless of server timezone.
    let currentDate = new Date(
      rule.startDate.getUTCFullYear(),
      rule.startDate.getUTCMonth(),
      rule.startDate.getUTCDate()
    );

    const end = rule.endDate
      ? new Date(
          rule.endDate.getUTCFullYear(),
          rule.endDate.getUTCMonth(),
          rule.endDate.getUTCDate()
        )
      : rangeEnd;

    const today = startOfDay(new Date());

    // Limit occurrences if specified
    let count = 0;
    const maxOccurrences = rule.occurrences || Infinity;

    while (
      (isBefore(currentDate, end) || isSameDay(currentDate, end)) &&
      count < maxOccurrences
    ) {
      // Only consider dates within the requested range (or slightly before for overdue checks)
      // We want to show overdue items even if they are before rangeStart, but for simplicity
      // let's assume the caller handles the "lookback" for overdue items.
      // Actually, for "Overdue", we should check everything from startDate up to today.

      if (isAfter(currentDate, rangeEnd)) break;

      // Check if a transaction exists for this rule around this date
      // We allow a margin of error (e.g., +/- 3 days) to find a matching transaction
      const margin = 3;
      const searchStart = subDays(currentDate, margin);
      const searchEnd = addDaysFns(currentDate, margin);

      const existingTransaction = await prisma.transaction.findFirst({
        where: {
          recurringRuleId: rule.id,
          date: {
            gte: searchStart,
            lte: searchEnd,
          },
        },
      });

      let status: RecurringOccurrence["status"] = "UPCOMING";

      if (existingTransaction) {
        status = "PAID";
      } else if (isBefore(currentDate, today)) {
        status = "OVERDUE";
      } else if (isSameDay(currentDate, today)) {
        status = "DUE";
      }

      // Only add if it's within the requested display range OR if it's overdue/due (even if before rangeStart)
      // If the user asks for "this month", but there is an overdue item from last month, we probably want to show it?
      // For now, let's stick to the requested range, but the caller should probably request "from beginning of time"
      // if they want to see all overdue.
      // BETTER APPROACH: The UI will likely ask for "Upcoming" (future) and "Pending" (past/today).

      if (
        isAfter(currentDate, subDays(rangeStart, 1)) ||
        status === "OVERDUE" ||
        status === "DUE"
      ) {
        occurrences.push({
          date: currentDate,
          status,
          ruleId: rule.id,
          amount: rule.amount,
          currency: rule.currency,
          description: rule.description || `Recurring ${rule.frequency}`,
          merchantId: rule.merchantId,
          merchantName: rule.merchant?.name,
          categoryName: rule.category.name,
          transactionId: existingTransaction?.id,
        });
      }

      // Advance date
      switch (rule.frequency) {
        case "DAILY":
          currentDate = addDays(currentDate, rule.interval);
          break;
        case "WEEKLY":
          currentDate = addWeeks(currentDate, rule.interval);
          break;
        case "MONTHLY":
          currentDate = addMonths(currentDate, rule.interval);
          break;
        case "YEARLY":
          currentDate = addYears(currentDate, rule.interval);
          break;
        default:
          count = maxOccurrences; // Break loop
      }
      count++;
    }
  }

  // Sort by date
  return occurrences.sort((a, b) => a.date.getTime() - b.date.getTime());
}
