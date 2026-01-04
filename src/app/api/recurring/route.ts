import { prisma } from "@/lib/prisma";
import {
  getSessionUser,
  unauthorizedResponse,
  errorResponse,
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
  merchantId: z.string().optional().nullable(),
  description: z.string().optional(),
  notes: z.string().optional(),
  isActive: z.boolean().optional(),
});

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return unauthorizedResponse();

  try {
    const rules = await prisma.recurringRule.findMany({
      where: { userId: user.id },
      include: {
        category: true,
        merchant: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return successResponse(rules);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return unauthorizedResponse();

  try {
    const body = await req.json();
    const data = recurringRuleSchema.parse(body);

    // Verify category ownership
    const category = await prisma.category.findUnique({
      where: { id: data.categoryId },
    });

    if (!category || category.userId !== user.id) {
      return errorResponse("Category not found or unauthorized", 400);
    }

    const rule = await prisma.recurringRule.create({
      data: {
        ...data,
        userId: user.id,
      },
    });

    return successResponse(rule, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
