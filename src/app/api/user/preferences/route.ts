import { prisma } from "@/lib/prisma";
import { z } from "zod";
import {
  errorResponse,
  getSessionUser,
  successResponse,
} from "@/lib/api-utils";

export const dynamic = "force-dynamic";

const updatePreferencesSchema = z.object({
  preferredCurrency: z.string().min(3).max(3),
});

export async function GET() {
  const user = await getSessionUser();
  if (!user) return errorResponse("Unauthorized", 401);

  const userData = await prisma.user.findUnique({
    where: { id: user.id },
    select: { preferredCurrency: true },
  });

  if (!userData) {
    return errorResponse("User not found", 404);
  }

  return successResponse(userData);
}

export async function PUT(req: Request) {
  const user = await getSessionUser();
  if (!user) return errorResponse("Unauthorized", 401);

  try {
    const body = await req.json();
    const { preferredCurrency } = updatePreferencesSchema.parse(body);

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { preferredCurrency },
    });

    return successResponse(updatedUser);
  } catch (error) {
    return errorResponse(error);
  }
}
