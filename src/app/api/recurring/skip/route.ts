import { prisma } from "@/lib/prisma";
import {
  getSessionUser,
  unauthorizedResponse,
  errorResponse,
  notFoundResponse,
  successResponse,
} from "@/lib/api-utils";
import { z } from "zod";
import { parseISODateTimeString } from "@/lib/date-utils";

const skipSchema = z.object({
  ruleId: z.string(),
  date: z.string().transform((str) => parseISODateTimeString(str)),
  action: z.enum(["skip", "unskip"]),
});

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return unauthorizedResponse();

  try {
    const body = await req.json();
    const { ruleId, date, action } = skipSchema.parse(body);

    const rule = await prisma.recurringRule.findUnique({
      where: { id: ruleId },
    });

    if (!rule || rule.userId !== user.id) {
      return notFoundResponse("Rule not found or unauthorized");
    }

    if (action === "skip") {
      await prisma.skippedOccurrence.upsert({
        where: {
          ruleId_date: {
            ruleId,
            date,
          },
        },
        create: {
          ruleId,
          date,
        },
        update: {},
      });
    } else {
      await prisma.skippedOccurrence.deleteMany({
        where: {
          ruleId,
          date,
        },
      });
    }

    return successResponse({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
}
