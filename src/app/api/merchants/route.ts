import { prisma } from "@/lib/prisma";
import {
  getSessionUser,
  unauthorizedResponse,
  errorResponse,
  successResponse,
} from "@/lib/api-utils";
import { z } from "zod";

const merchantSchema = z.object({
  name: z.string().min(1, "Name is required"),
});

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return unauthorizedResponse();

  try {
    const merchants = await prisma.merchant.findMany({
      where: { userId: user.id },
      orderBy: { name: "asc" },
    });

    return successResponse(merchants);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return unauthorizedResponse();

  try {
    const body = await req.json();
    const { name } = merchantSchema.parse(body);

    const merchant = await prisma.merchant.create({
      data: {
        name,
        userId: user.id,
      },
    });

    return successResponse(merchant);
  } catch (error) {
    return errorResponse(error);
  }
}
