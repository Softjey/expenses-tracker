import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

const merchantSchema = z.object({
  name: z.string().min(1, "Name is required"),
})

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const merchants = await prisma.merchant.findMany({
      where: { userId: session.user.id },
      orderBy: { name: "asc" },
    })

    return NextResponse.json(merchants)
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch merchants" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { name } = merchantSchema.parse(body)

    const merchant = await prisma.merchant.create({
      data: {
        name,
        userId: session.user.id,
      },
    })

    return NextResponse.json(merchant)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    return NextResponse.json({ error: "Failed to create merchant" }, { status: 500 })
  }
}
