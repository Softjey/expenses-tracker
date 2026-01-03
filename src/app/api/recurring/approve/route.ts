import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { NextResponse } from "next/server"
import { z } from "zod"

const approveSchema = z.object({
  ruleId: z.string(),
  date: z.string().transform((str) => new Date(str)),
  amount: z.number().positive().optional(),
  description: z.string().optional(),
})

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return new NextResponse("Unauthorized", { status: 401 })
  }

  try {
    const body = await req.json()
    const { ruleId, date, amount, description } = approveSchema.parse(body)

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user) {
      return new NextResponse("User not found", { status: 404 })
    }

    // Fetch the rule
    const rule = await prisma.recurringRule.findUnique({
      where: { id: ruleId },
    })

    if (!rule || rule.userId !== user.id) {
      return new NextResponse("Rule not found or unauthorized", { status: 404 })
    }

    // Create the transaction
    const transaction = await prisma.transaction.create({
      data: {
        amount: amount || rule.amount,
        currency: rule.currency,
        date: date,
        description: description || rule.description || `Recurring: ${rule.frequency}`,
        type: rule.type,
        categoryId: rule.categoryId,
        userId: user.id,
        recurringRuleId: rule.id,
        merchantId: rule.merchantId,
      },
    })

    return NextResponse.json(transaction)
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: error.issues }, { status: 400 })
    }
    console.error("Error approving recurring transaction:", error)
    return NextResponse.json(
      { message: "Something went wrong" },
      { status: 500 }
    )
  }
}
