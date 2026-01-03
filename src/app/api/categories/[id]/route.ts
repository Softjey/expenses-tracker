import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { NextResponse } from "next/server"
import { z } from "zod"

const categorySchema = z.object({
  name: z.string().min(1),
  type: z.enum(["EXPENSE", "INCOME", "BOTH"]),
})

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
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

    // Verify ownership
    const category = await prisma.category.findUnique({
      where: { id },
    })

    if (!category || category.userId !== user.id) {
      return new NextResponse("Category not found or unauthorized", { status: 404 })
    }

    await prisma.category.delete({
      where: { id },
    })

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    return NextResponse.json(
      { message: "Something went wrong" },
      { status: 500 }
    )
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
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

    // Verify ownership
    const category = await prisma.category.findUnique({
      where: { id },
    })

    if (!category || category.userId !== user.id) {
      return new NextResponse("Category not found or unauthorized", { status: 404 })
    }

    const updatedCategory = await prisma.category.update({
      where: { id },
      data: { name, type },
    })

    return NextResponse.json(updatedCategory)
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
