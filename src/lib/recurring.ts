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
  merchantId: string;
  description?: string | null;
  category: { name: string };
  merchant: { name: string };
};

export type RecurringOccurrence = {
  date: Date;
  status: "PAID" | "OVERDUE" | "DUE" | "UPCOMING" | "SKIPPED";
  ruleId: string;
  amount: number;
  currency: string;
  description: string;
  merchantId: string;
  merchantName: string;
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

  const allSkipped = await prisma.skippedOccurrence.findMany({
    where: {
      ruleId: { in: ruleIds },
    },
  });

  for (const rule of rules) {
    // Use UTC noon to avoid timezone shifts and ensure consistency with parseISODateTimeString
    let currentDate = new Date(
      Date.UTC(
        rule.startDate.getUTCFullYear(),
        rule.startDate.getUTCMonth(),
        rule.startDate.getUTCDate(),
        12,
        0,
        0,
        0
      )
    );

    const end = rule.endDate
      ? new Date(
          Date.UTC(
            rule.endDate.getUTCFullYear(),
            rule.endDate.getUTCMonth(),
            rule.endDate.getUTCDate(),
            12,
            0,
            0,
            0
          )
        )
      : rangeEnd;

    const today = startOfDay(new Date());
    let count = 0;
    const maxOccurrences = rule.occurrences || Infinity;

    const ruleTransactions = allTransactions.filter(
      (t) => t.recurringRuleId === rule.id
    );

    const ruleSkipped = allSkipped.filter((s) => s.ruleId === rule.id);

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

      const isSkipped = ruleSkipped.some((s) => isSameDay(s.date, currentDate));

      let status: RecurringOccurrence["status"] = "UPCOMING";

      if (existingTransaction) {
        status = "PAID";
      } else if (isSkipped) {
        status = "SKIPPED";
      } else if (isBefore(currentDate, today)) {
        status = "OVERDUE";
      } else if (isSameDay(currentDate, today)) {
        status = "DUE";
      }

      if (
        isAfter(currentDate, subDays(rangeStart, 1)) ||
        status === "OVERDUE" ||
        status === "DUE" ||
        status === "SKIPPED"
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
