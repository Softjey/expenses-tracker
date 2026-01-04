import { prisma } from "@/lib/prisma";
import {
  getSessionUser,
  unauthorizedResponse,
  errorResponse,
  notFoundResponse,
  successResponse,
} from "@/lib/api-utils";
import { z } from "zod";

const approveSchema = z.object({
  ruleId: z.string(),
  date: z.string().transform((str) => new Date(str)),
  amount: z.number().positive().optional(),
  description: z.string().optional(),
});

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return unauthorizedResponse();

  try {
    const body = await req.json();
    const { ruleId, date, amount, description } = approveSchema.parse(body);

    // Fetch the rule
    const rule = await prisma.recurringRule.findUnique({
      where: { id: ruleId },
    });

    if (!rule || rule.userId !== user.id) {
      return notFoundResponse("Rule not found or unauthorized");
    }

    // Create the transaction
    const transaction = await prisma.transaction.create({
      data: {
        amount: amount || rule.amount,
        currency: rule.currency,
        date: date,
        description:
          description || rule.description || `Recurring: ${rule.frequency}`,
        type: rule.type,
        categoryId: rule.categoryId,
        userId: user.id,
        recurringRuleId: rule.id,
        merchantId: rule.merchantId,
      },
    });

    return successResponse(transaction);
  } catch (error) {
    return errorResponse(error);
  }
}
