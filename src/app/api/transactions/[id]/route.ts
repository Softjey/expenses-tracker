import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";
import { z } from "zod";

const transactionSchema = z.object({
  amount: z.number().positive(),
  currency: z.string().length(3),
  spread: z.number().min(0).optional(),
  date: z.string().transform((str) => new Date(str)),
  description: z.string().optional(),
  notes: z.string().optional(),
  categoryId: z.string(),
  merchantId: z.string().optional(),
  type: z.enum(["EXPENSE", "INCOME"]),
});

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return new NextResponse("User not found", { status: 404 });
    }

    const transaction = await prisma.transaction.findUnique({
      where: { id },
    });

    if (!transaction || transaction.userId !== user.id) {
      return new NextResponse("Transaction not found or unauthorized", {
        status: 404,
      });
    }

    await prisma.transaction.delete({
      where: { id },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return NextResponse.json(
      { message: "Something went wrong" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const body = await req.json();
    const data = transactionSchema.parse(body);

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return new NextResponse("User not found", { status: 404 });
    }

    const transaction = await prisma.transaction.findUnique({
      where: { id },
    });

    if (!transaction || transaction.userId !== user.id) {
      return new NextResponse("Transaction not found or unauthorized", {
        status: 404,
      });
    }

    const updatedTransaction = await prisma.transaction.update({
      where: { id },
      data: {
        ...data,
      },
    });

    return NextResponse.json(updatedTransaction);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: (error as z.ZodError).issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { message: "Something went wrong" },
      { status: 500 }
    );
  }
}
