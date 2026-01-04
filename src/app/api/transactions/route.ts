import { prisma } from "@/lib/prisma";
import {
  getSessionUser,
  unauthorizedResponse,
  errorResponse,
  successResponse,
} from "@/lib/api-utils";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { parseISODateTimeString } from "@/lib/date-utils";

const transactionSchema = z.object({
  amount: z.number().positive(),
  currency: z.string().length(3),
  spread: z.number().min(0).optional(),
  date: z.string().transform((str) => parseISODateTimeString(str)),
  description: z.string().optional(),
  notes: z.string().optional(),
  categoryId: z.string(),
  merchantId: z.string().min(1, "Merchant is required"),
  type: z.enum(["EXPENSE", "INCOME"]),
});

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return unauthorizedResponse();
  }

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const categoryId = searchParams.get("categoryId");
  const type = searchParams.get("type") as "EXPENSE" | "INCOME" | null;

  const where: Prisma.TransactionWhereInput = {
    userId: user.id,
  };

  if (from && to) {
    where.date = {
      gte: parseISODateTimeString(from),
      lte: parseISODateTimeString(to),
    };
  }

  if (categoryId) {
    where.categoryId = categoryId;
  }

  if (type) {
    where.type = type;
  }

  const transactions = await prisma.transaction.findMany({
    where,
    include: {
      category: true,
      merchant: true,
    },
    orderBy: {
      date: "desc",
    },
  });

  return successResponse(transactions);
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return unauthorizedResponse();
  }

  try {
    const body = await req.json();
    const data = transactionSchema.parse(body);

    const transaction = await prisma.transaction.create({
      data: {
        ...data,
        userId: user.id,
      },
    });

    return successResponse(transaction);
  } catch (error) {
    return errorResponse(error);
  }
}
