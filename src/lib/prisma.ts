import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

async function fixRecurringSpreads() {
  try {
    const transactions = await prisma.transaction.findMany({
      where: {
        recurringRuleId: {
          not: null,
        },
      },
      include: {
        recurringRule: true,
      },
    });

    let updatedCount = 0;

    for (const tx of transactions) {
      if (tx.recurringRule) {
        const ruleSpread = tx.recurringRule.spread ?? 0;
        const txSpread = tx.spread ?? 0;

        if (txSpread !== ruleSpread) {
          await prisma.transaction.update({
            where: { id: tx.id },
            data: {
              spread: ruleSpread,
            },
          });
          updatedCount++;
        }
      }
    }

    if (updatedCount > 0) {
      console.log(`Fixed spread for ${updatedCount} recurring transactions.`);
    }
  } catch (error) {
    console.error("Error fixing recurring spreads:", error);
  }
}

fixRecurringSpreads();
