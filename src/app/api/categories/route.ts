import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { NextResponse } from "next/server"
import { z } from "zod"

const categorySchema = z.object({
  name: z.string().min(1),
  type: z.enum(["EXPENSE", "INCOME", "BOTH"]),
})

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return new NextResponse("Unauthorized", { status: 401 })
  }

  const categories = await prisma.category.findMany({
    where: {
      user: {
        email: session.user.email,
      },
    },
    orderBy: {
      name: "asc",
    },
  })

  return NextResponse.json(categories)
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return new NextResponse("Unauthorized", { status: 401 })
  }

  try {
    const body = await req.json()
    const { name, type } = categorySchema.parse(body)

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user) {
      return new NextResponse("User not found", { status: 404 })
    }

    const category = await prisma.category.create({
      data: {
        name,
        type,
        userId: user.id,
      },
    })

    return NextResponse.json(category)
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: (error as z.ZodError).issues }, { status: 400 })
    }
    return NextResponse.json(
      { message: "Something went wrong" },
      { status: 500 }
    )
  }
}
