import { prisma } from "@/lib/prisma";
import {
  getSessionUser,
  unauthorizedResponse,
  errorResponse,
  successResponse,
} from "@/lib/api-utils";
import { getRecurringOccurrences } from "@/lib/recurring";
import { addMonths, subMonths } from "date-fns";

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return unauthorizedResponse();

  try {
    // Get all active recurring rules
    const rules = await prisma.recurringRule.findMany({
      where: {
        userId: user.id,
        isActive: true,
      },
      include: {
        category: {
          select: { name: true },
        },
        merchant: {
          select: { name: true },
        },
      },
    });

    // Calculate occurrences from the start of time (or 1 year ago) to 3 months from now
    // This ensures we capture all overdue items and upcoming ones
    const rangeStart = subMonths(new Date(), 12);
    const rangeEnd = addMonths(new Date(), 3);

    const occurrences = await getRecurringOccurrences(
      rules as any,
      rangeStart,
      rangeEnd
    );

    return successResponse(occurrences);
  } catch (error) {
    return errorResponse(error);
  }
}
