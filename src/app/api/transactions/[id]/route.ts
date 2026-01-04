import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import {
  getSessionUser,
  unauthorizedResponse,
  errorResponse,
  notFoundResponse,
  successResponse,
} from "@/lib/api-utils";
import { z } from "zod";
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

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) {
    return unauthorizedResponse();
  }

  try {
    const transaction = await prisma.transaction.findUnique({
      where: { id },
    });

    if (!transaction || transaction.userId !== user.id) {
      return notFoundResponse("Transaction not found or unauthorized");
    }

    await prisma.transaction.delete({
      where: { id },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Error deleting transaction:", error);
    return errorResponse(error);
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) {
    return unauthorizedResponse();
  }

  try {
    const body = await req.json();
    const data = transactionSchema.parse(body);

    const transaction = await prisma.transaction.findUnique({
      where: { id },
    });

    if (!transaction || transaction.userId !== user.id) {
      return notFoundResponse("Transaction not found or unauthorized");
    }

    const updatedTransaction = await prisma.transaction.update({
      where: { id },
      data: {
        ...data,
      },
    });

    return successResponse(updatedTransaction);
  } catch (error) {
    return errorResponse(error);
  }
}
