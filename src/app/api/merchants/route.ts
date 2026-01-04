import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
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

export async function DELETE(req: Request) {
  const user = await getSessionUser();
  if (!user) return unauthorizedResponse();

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return errorResponse("Merchant ID is required", 400);
    }

    const merchant = await prisma.merchant.findUnique({
      where: { id },
    });

    if (!merchant || merchant.userId !== user.id) {
      return errorResponse("Merchant not found or unauthorized", 404);
    }

    await prisma.merchant.delete({
      where: { id },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Error deleting merchant:", error);
    return errorResponse(error);
  }
}
