import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { NextResponse } from "next/server"
import { getRecurringOccurrences } from "@/lib/recurring"
import { startOfMonth, endOfMonth, addMonths, subMonths } from "date-fns"

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return new NextResponse("Unauthorized", { status: 401 })
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user) {
      return new NextResponse("User not found", { status: 404 })
    }

    // Get all active recurring rules
    const rules = await prisma.recurringRule.findMany({
      where: {
        userId: user.id,
        isActive: true,
      },
      include: {
        category: {
          select: { name: true },
        },
        merchant: {
          select: { name: true },
        },
      },
    })

    // Calculate occurrences from the start of time (or 1 year ago) to 3 months from now
    // This ensures we capture all overdue items and upcoming ones
    const rangeStart = subMonths(new Date(), 12)
    const rangeEnd = addMonths(new Date(), 3)

    const occurrences = await getRecurringOccurrences(
      rules as any,
      rangeStart,
      rangeEnd
    )

    return NextResponse.json(occurrences)
  } catch (error) {
    console.error("Error fetching recurring occurrences:", error)
    return NextResponse.json(
      { message: "Something went wrong" },
      { status: 500 }
    )
  }
}
