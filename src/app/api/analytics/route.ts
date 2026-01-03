import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";
import { convertCurrency } from "@/lib/exchange-rates";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return new NextResponse("User not found", { status: 404 });
    }

    // Get preferred currency from query or user preference
    const { searchParams } = new URL(req.url);
    const preferredCurrency =
      searchParams.get("currency") || user.preferredCurrency;

    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");

    // Determine date range
    const now = new Date();
    let startDate: Date;
    let endDate: Date;

    if (fromParam && toParam) {
      startDate = new Date(fromParam);
      endDate = new Date(toParam);
      // Set end date to end of day
      endDate.setHours(23, 59, 59, 999);
    } else {
      // Default to current month
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      endDate.setHours(23, 59, 59, 999);
    }

    // Fetch all transactions for the range
    const transactions = await prisma.transaction.findMany({
      where: {
        userId: user.id,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        category: true,
        merchant: true,
      },
    });

    // Convert all transactions to preferred currency
    const convertedTransactions = await Promise.all(
      transactions.map(async (t) => {
        let converted = await convertCurrency(
          t.amount,
          t.currency,
          preferredCurrency,
          t.date
        );

        // Apply spread if it exists and currencies are different
        if (t.spread && t.currency !== preferredCurrency) {
          // For expenses, spread increases the cost (we pay more)
          // For income, spread decreases the value (we receive less) - usually.
          // But user said: "100 eur to pln + spread".
          // Let's assume spread is always ADDED to the cost for expenses.
          // And for income? If I get 100 EUR, and convert to PLN, the bank gives me LESS.
          // So spread should be subtracted?
          // User example: "100 eur to pln + spread from transaction"
          // This strongly suggests adding the percentage.
          // Let's stick to: Expense = Amount * Rate * (1 + Spread/100)
          // Income = Amount * Rate * (1 - Spread/100)

          if (t.type === "EXPENSE") {
            converted = converted * (1 + t.spread / 100);
          } else {
            converted = converted * (1 - t.spread / 100);
          }
        }

        return {
          ...t,
          convertedAmount: converted,
        };
      })
    );

    // Calculate totals in preferred currency
    const totalExpenses = convertedTransactions
      .filter((t) => t.type === "EXPENSE")
      .reduce((sum, t) => sum + t.convertedAmount, 0);

    const totalIncome = convertedTransactions
      .filter((t) => t.type === "INCOME")
      .reduce((sum, t) => sum + t.convertedAmount, 0);

    const netBalance = totalIncome - totalExpenses;

    // Group by category
    const expensesByCategoryMap = new Map<string, number>();
    const incomeByCategoryMap = new Map<string, number>();

    convertedTransactions.forEach((t) => {
      if (t.type === "EXPENSE") {
        const current = expensesByCategoryMap.get(t.category.name) || 0;
        expensesByCategoryMap.set(t.category.name, current + t.convertedAmount);
      } else {
        const current = incomeByCategoryMap.get(t.category.name) || 0;
        incomeByCategoryMap.set(t.category.name, current + t.convertedAmount);
      }
    });

    const expensesByCategory = Array.from(expensesByCategoryMap.entries()).map(
      ([name, value]) => ({ name, value })
    );

    const incomeByCategory = Array.from(incomeByCategoryMap.entries()).map(
      ([name, value]) => ({ name, value })
    );

    // Group by merchant
    const expensesByMerchantMap = new Map<string, number>();

    // Spending trend (Daily or Monthly)
    const spendingTrendMap = new Map<string, number>();

    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const isMonthlyView = diffDays > 60;

    // Initialize map
    if (isMonthlyView) {
      // Initialize months
      let current = new Date(startDate);
      current.setDate(1); // Start of month
      while (current <= endDate) {
        const key = current.toISOString().slice(0, 7); // YYYY-MM
        spendingTrendMap.set(key, 0);
        current.setMonth(current.getMonth() + 1);
      }
    } else {
      // Initialize days
      let current = new Date(startDate);
      while (current <= endDate) {
        const key = current.toISOString().split("T")[0]; // YYYY-MM-DD
        spendingTrendMap.set(key, 0);
        current.setDate(current.getDate() + 1);
      }
    }

    convertedTransactions.forEach((t) => {
      if (t.type === "EXPENSE") {
        // Merchant stats
        if (t.merchant) {
          const merchantName = t.merchant.name;
          const current = expensesByMerchantMap.get(merchantName) || 0;
          expensesByMerchantMap.set(merchantName, current + t.convertedAmount);
        }

        // Trend stats
        let dateKey;
        if (isMonthlyView) {
          dateKey = t.date.toISOString().slice(0, 7);
        } else {
          dateKey = t.date.toISOString().split("T")[0];
        }

        // Only add if within our initialized range (should always be true due to query)
        if (spendingTrendMap.has(dateKey)) {
          const currentTrend = spendingTrendMap.get(dateKey) || 0;
          spendingTrendMap.set(dateKey, currentTrend + t.convertedAmount);
        }
      } else {
        const current = incomeByCategoryMap.get(t.category.name) || 0;
        incomeByCategoryMap.set(t.category.name, current + t.convertedAmount);
      }
    });

    const expensesByMerchant = Array.from(expensesByMerchantMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10); // Top 10 merchants

    const spendingTrend = Array.from(spendingTrendMap.entries())
      .map(([date, value]) => ({ date, value }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json({
      totalExpenses: Math.round(totalExpenses * 100) / 100,
      totalIncome: Math.round(totalIncome * 100) / 100,
      netBalance: Math.round(netBalance * 100) / 100,
      currency: preferredCurrency,
      expensesByCategory,
      incomeByCategory,
      expensesByMerchant,
      spendingTrend,
      isMonthlyView,
    });
  } catch (error) {
    console.error("Failed to fetch analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}
