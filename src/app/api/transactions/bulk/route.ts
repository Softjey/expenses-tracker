import { prisma } from "@/lib/prisma";
import {
  getSessionUser,
  unauthorizedResponse,
  errorResponse,
  successResponse,
} from "@/lib/api-utils";
import { z } from "zod";
import { parseISODateTimeString } from "@/lib/date-utils";

const bulkTransactionSchema = z.array(
  z.object({
    amount: z.number().positive(),
    currency: z.string().length(3),
    date: z
      .string()
      .refine((str) => !isNaN(Date.parse(str)), "Invalid date format"),
    description: z.string().optional(),
    notes: z.string().optional(),
    categoryName: z.string().min(1),
    merchantName: z.string().min(1),
    type: z.enum(["EXPENSE", "INCOME"]),
  })
);

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return unauthorizedResponse();
  }

  try {
    const body = await req.json();
    const transactions = bulkTransactionSchema.parse(body);

    const results = await prisma.$transaction(async (tx) => {
      const createdTransactions = [];

      for (const t of transactions) {
        // Find or create category
        let category = await tx.category.findFirst({
          where: {
            userId: user.id,
            name: {
              equals: t.categoryName,
              mode: "insensitive",
            },
            type: t.type,
          },
        });

        if (!category) {
          category = await tx.category.create({
            data: {
              name: t.categoryName,
              type: t.type,
              userId: user.id,
            },
          });
        }

        // Find or create merchant
        let merchant = await tx.merchant.findFirst({
          where: {
            userId: user.id,
            name: {
              equals: t.merchantName,
              mode: "insensitive",
            },
          },
        });

        if (!merchant) {
          merchant = await tx.merchant.create({
            data: {
              name: t.merchantName,
              userId: user.id,
            },
          });
        }

        const transaction = await tx.transaction.create({
          data: {
            amount: t.amount,
            currency: t.currency,
            date: parseISODateTimeString(t.date),
            description: t.description,
            notes: t.notes,
            type: t.type,
            categoryId: category.id,
            merchantId: merchant.id,
            userId: user.id,
          },
        });

        createdTransactions.push(transaction);
      }

      return createdTransactions;
    });

    return successResponse(results);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.errors, 400);
    }
    return errorResponse(error);
  }
}
