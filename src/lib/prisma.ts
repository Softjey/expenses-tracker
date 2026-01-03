import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = global as unknown as { prisma: PrismaClient };
const connectionString = `${process.env.DATABASE_URL}`;

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ["query"],
    adapter: new PrismaPg({ connectionString }),
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
