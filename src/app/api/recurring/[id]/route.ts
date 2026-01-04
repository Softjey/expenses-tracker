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

const recurringRuleSchema = z.object({
  frequency: z.enum(["DAILY", "WEEKLY", "MONTHLY", "YEARLY", "ONE_TIME"]),
  interval: z.number().int().min(1).default(1),
  amount: z.number().positive(),
  currency: z.string().length(3),
  spread: z.number().min(0).optional(),
  type: z.enum(["EXPENSE", "INCOME"]),
  startDate: z.string().transform((str) => parseISODateTimeString(str)),
  endDate: z
    .string()
    .optional()
    .nullable()
    .transform((str) => (str ? parseISODateTimeString(str) : null)),
  categoryId: z.string(),
  merchantId: z.string().min(1, "Merchant is required"),
  description: z.string().optional(),
  notes: z.string().optional(),
  isActive: z.boolean().optional(),
});

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return unauthorizedResponse();

  try {
    const rule = await prisma.recurringRule.findUnique({
      where: { id },
    });

    if (!rule || rule.userId !== user.id) {
      return notFoundResponse("Rule not found or unauthorized");
    }

    await prisma.recurringRule.delete({
      where: { id },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Error deleting recurring rule:", error);
    return errorResponse(error);
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return unauthorizedResponse();

  try {
    const body = await req.json();
    const { updateMode, ...ruleData } = body;
    const data = recurringRuleSchema.parse(ruleData);

    const rule = await prisma.recurringRule.findUnique({
      where: { id },
    });

    if (!rule || rule.userId !== user.id) {
      return notFoundResponse("Rule not found or unauthorized");
    }

    // Verify category ownership if changing
    if (data.categoryId !== rule.categoryId) {
      const category = await prisma.category.findUnique({
        where: { id: data.categoryId },
      });

      if (!category || category.userId !== user.id) {
        return errorResponse("Category not found or unauthorized", 400);
      }
    }

    if (updateMode === "future") {
      // 1. End current rule
      await prisma.recurringRule.update({
        where: { id },
        data: {
          isActive: false,
          endDate: new Date(),
        },
      });

      // 2. Create new rule
      const newRule = await prisma.recurringRule.create({
        data: {
          ...data,
          userId: user.id,
          startDate: new Date(), // Start the new rule from today
        },
      });

      return successResponse(newRule);
    }

    // Default: Update all (in-place)
    const updatedRule = await prisma.recurringRule.update({
      where: { id },
      data: {
        ...data,
      },
    });

    return successResponse(updatedRule);
  } catch (error) {
    return errorResponse(error);
  }
}
