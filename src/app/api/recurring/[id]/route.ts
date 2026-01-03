import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";
import { z } from "zod";

const recurringRuleSchema = z.object({
  frequency: z.enum(["DAILY", "WEEKLY", "MONTHLY", "YEARLY", "ONE_TIME"]),
  interval: z.number().int().min(1).default(1),
  amount: z.number().positive(),
  currency: z.string().length(3),
  spread: z.number().min(0).optional(),
  type: z.enum(["EXPENSE", "INCOME"]),
  startDate: z.string().transform((str) => new Date(str)),
  endDate: z
    .string()
    .optional()
    .nullable()
    .transform((str) => (str ? new Date(str) : null)),
  categoryId: z.string(),
  merchantId: z.string().optional().nullable(),
  description: z.string().optional(),
  notes: z.string().optional(),
  isActive: z.boolean().optional(),
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

    const rule = await prisma.recurringRule.findUnique({
      where: { id },
    });

    if (!rule || rule.userId !== user.id) {
      return new NextResponse("Rule not found or unauthorized", {
        status: 404,
      });
    }

    await prisma.recurringRule.delete({
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
    const { updateMode, ...ruleData } = body;
    const data = recurringRuleSchema.parse(ruleData);

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return new NextResponse("User not found", { status: 404 });
    }

    const rule = await prisma.recurringRule.findUnique({
      where: { id },
    });

    if (!rule || rule.userId !== user.id) {
      return new NextResponse("Rule not found or unauthorized", {
        status: 404,
      });
    }

    // Verify category ownership if changing
    if (data.categoryId !== rule.categoryId) {
      const category = await prisma.category.findUnique({
        where: { id: data.categoryId },
      });

      if (!category || category.userId !== user.id) {
        return new NextResponse("Category not found or unauthorized", {
          status: 400,
        });
      }
    }

    if (updateMode === "future") {
      // 1. End current rule
      await prisma.recurringRule.update({
        where: { id },
        data: {
          isActive: false,
          endDate: new Date(),
        },
      });

      // 2. Create new rule
      const newRule = await prisma.recurringRule.create({
        data: {
          ...data,
          userId: user.id,
          startDate: new Date(), // Start the new rule from today
        },
      });

      return NextResponse.json(newRule);
    }

    // Default: Update all (in-place)
    const updatedRule = await prisma.recurringRule.update({
      where: { id },
      data: {
        ...data,
      },
    });

    return NextResponse.json(updatedRule);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: error.issues }, { status: 400 });
    }
    return NextResponse.json(
      { message: "Something went wrong" },
      { status: 500 }
    );
  }
}
