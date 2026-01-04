import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function getSessionUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  return user;
}

export function unauthorizedResponse() {
  return new NextResponse("Unauthorized", { status: 401 });
}

export function notFoundResponse(message = "Not found") {
  return new NextResponse(message, { status: 404 });
}

export function errorResponse(message: string | any, status = 500) {
  return NextResponse.json({ message }, { status });
}

export function successResponse(data: any, status = 200) {
  return NextResponse.json(data, { status });
}
