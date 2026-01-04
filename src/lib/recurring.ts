import {
  addDays,
  addWeeks,
  addMonths,
  addYears,
  isBefore,
  isAfter,
  isSameDay,
  startOfDay,
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
  const ruleIds = rules.map((r) => r.id);

  // Fetch all transactions for these rules in the relevant range to avoid N+1 queries
  const allTransactions = await prisma.transaction.findMany({
    where: {
      recurringRuleId: { in: ruleIds },
    },
  });

  for (const rule of rules) {
    // Use UTC parts to avoid timezone shifts when calculating occurrences.
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
    let count = 0;
    const maxOccurrences = rule.occurrences || Infinity;

    const ruleTransactions = allTransactions.filter(
      (t) => t.recurringRuleId === rule.id
    );

    while (
      (isBefore(currentDate, end) || isSameDay(currentDate, end)) &&
      count < maxOccurrences
    ) {
      if (isAfter(currentDate, rangeEnd)) break;

      const margin = 3;
      const searchStart = subDays(currentDate, margin);
      const searchEnd = addDaysFns(currentDate, margin);

      const existingTransaction = ruleTransactions.find(
        (t) => t.date >= searchStart && t.date <= searchEnd
      );

      let status: RecurringOccurrence["status"] = "UPCOMING";

      if (existingTransaction) {
        status = "PAID";
      } else if (isBefore(currentDate, today)) {
        status = "OVERDUE";
      } else if (isSameDay(currentDate, today)) {
        status = "DUE";
      }

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
          count = maxOccurrences;
      }
      count++;
    }
  }

  return occurrences.sort((a, b) => a.date.getTime() - b.date.getTime());
}
