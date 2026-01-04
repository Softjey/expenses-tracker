import { prisma } from "@/lib/prisma";
import {
  getSessionUser,
  unauthorizedResponse,
  errorResponse,
  successResponse,
} from "@/lib/api-utils";
import { convertCurrency } from "@/lib/exchange-rates";
import { Prisma } from "@prisma/client";
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  eachMonthOfInterval,
  format,
} from "date-fns";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return unauthorizedResponse();

  try {
    const { searchParams } = new URL(req.url);
    const preferredCurrency =
      searchParams.get("currency") || user.preferredCurrency;
    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");

    let startDate: Date;
    let endDate: Date;

    if (fromParam && toParam && fromParam !== "all") {
      startDate = new Date(fromParam);
      endDate = new Date(toParam);
      endDate.setHours(23, 59, 59, 999);
    } else {
      startDate = startOfMonth(new Date());
      endDate = endOfMonth(new Date());
    }

    const where: Prisma.TransactionWhereInput = {
      userId: user.id,
      ...(fromParam !== "all" && {
        date: {
          gte: startDate,
          lte: endDate,
        },
      }),
    };

    const transactions = await prisma.transaction.findMany({
      where,
      include: { category: true, merchant: true },
    });

    const convertedTransactions = await Promise.all(
      transactions.map(async (t) => {
        let converted = await convertCurrency(
          t.amount,
          t.currency,
          preferredCurrency,
          t.date
        );
        if (t.spread && t.currency !== preferredCurrency) {
          converted =
            t.type === "EXPENSE"
              ? converted * (1 + t.spread / 100)
              : converted * (1 - t.spread / 100);
        }
        return { ...t, convertedAmount: converted };
      })
    );

    const totalExpenses = convertedTransactions
      .filter((t) => t.type === "EXPENSE")
      .reduce((sum, t) => sum + t.convertedAmount, 0);
    const totalIncome = convertedTransactions
      .filter((t) => t.type === "INCOME")
      .reduce((sum, t) => sum + t.convertedAmount, 0);

    const expensesByCategoryMap = new Map<string, number>();
    const incomeByCategoryMap = new Map<string, number>();
    const expensesByMerchantMap = new Map<string, number>();

    convertedTransactions.forEach((t) => {
      const map =
        t.type === "EXPENSE" ? expensesByCategoryMap : incomeByCategoryMap;
      map.set(
        t.category.name,
        (map.get(t.category.name) || 0) + t.convertedAmount
      );

      if (t.type === "EXPENSE" && t.merchant) {
        expensesByMerchantMap.set(
          t.merchant.name,
          (expensesByMerchantMap.get(t.merchant.name) || 0) + t.convertedAmount
        );
      }
    });

    const diffDays = Math.ceil(
      Math.abs(endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    const isMonthlyView = diffDays > 60;
    const spendingTrendMap = new Map<string, number>();

    if (isMonthlyView) {
      eachMonthOfInterval({ start: startDate, end: endDate }).forEach((date) =>
        spendingTrendMap.set(format(date, "yyyy-MM"), 0)
      );
    } else {
      eachDayOfInterval({ start: startDate, end: endDate }).forEach((date) =>
        spendingTrendMap.set(format(date, "yyyy-MM-dd"), 0)
      );
    }

    convertedTransactions
      .filter((t) => t.type === "EXPENSE")
      .forEach((t) => {
        const key = format(t.date, isMonthlyView ? "yyyy-MM" : "yyyy-MM-dd");
        if (spendingTrendMap.has(key)) {
          spendingTrendMap.set(
            key,
            (spendingTrendMap.get(key) || 0) + t.convertedAmount
          );
        }
      });

    return successResponse({
      totalExpenses: Number(totalExpenses.toFixed(2)),
      totalIncome: Number(totalIncome.toFixed(2)),
      netBalance: Number((totalIncome - totalExpenses).toFixed(2)),
      currency: preferredCurrency,
      expensesByCategory: Array.from(expensesByCategoryMap.entries()).map(
        ([name, value]) => ({ name, value })
      ),
      incomeByCategory: Array.from(incomeByCategoryMap.entries()).map(
        ([name, value]) => ({ name, value })
      ),
      expensesByMerchant: Array.from(expensesByMerchantMap.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10),
      spendingTrend: Array.from(spendingTrendMap.entries()).map(
        ([date, value]) => ({ date, value })
      ),
      isMonthlyView,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
