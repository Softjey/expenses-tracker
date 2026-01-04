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

const categorySchema = z.object({
  name: z.string().min(1),
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
    // Verify ownership
    const category = await prisma.category.findUnique({
      where: { id },
    });

    if (!category || category.userId !== user.id) {
      return notFoundResponse("Category not found or unauthorized");
    }

    await prisma.category.delete({
      where: { id },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Error deleting category:", error);
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
    const { name, type } = categorySchema.parse(body);

    // Verify ownership
    const category = await prisma.category.findUnique({
      where: { id },
    });

    if (!category || category.userId !== user.id) {
      return notFoundResponse("Category not found or unauthorized");
    }

    const updatedCategory = await prisma.category.update({
      where: { id },
      data: { name, type },
    });

    return successResponse(updatedCategory);
  } catch (error) {
    return errorResponse(error);
  }
}
