import { prisma } from "@/lib/prisma";
import {
  getSessionUser,
  unauthorizedResponse,
  errorResponse,
  successResponse,
} from "@/lib/api-utils";
import { z } from "zod";

const categorySchema = z.object({
  name: z.string().min(1),
  type: z.enum(["EXPENSE", "INCOME"]),
});

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return unauthorizedResponse();
  }

  const categories = await prisma.category.findMany({
    where: {
      userId: user.id,
    },
    orderBy: {
      name: "asc",
    },
  });

  return successResponse(categories);
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return unauthorizedResponse();
  }

  try {
    const body = await req.json();
    const { name, type } = categorySchema.parse(body);

    const category = await prisma.category.create({
      data: {
        name,
        type,
        userId: user.id,
      },
    });

    return successResponse(category);
  } catch (error) {
    return errorResponse(error);
  }
}
