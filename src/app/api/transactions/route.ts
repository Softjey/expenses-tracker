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

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const categoryId = searchParams.get("categoryId");
  const type = searchParams.get("type");

  const where: any = {
    user: {
      email: session.user.email,
    },
  };

  if (from && to) {
    where.date = {
      gte: new Date(from),
      lte: new Date(to),
    };
  }

  if (categoryId) {
    where.categoryId = categoryId;
  }

  if (type) {
    where.type = type;
  }

  const transactions = await prisma.transaction.findMany({
    where,
    include: {
      category: true,
      merchant: true,
    },
    orderBy: {
      date: "desc",
    },
  });

  return NextResponse.json(transactions);
}

export async function POST(req: Request) {
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

    const transaction = await prisma.transaction.create({
      data: {
        ...data,
        userId: user.id,
      },
    });

    return NextResponse.json(transaction);
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
