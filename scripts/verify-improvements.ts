import { PrismaClient } from "@prisma/client"
import { hash } from "bcryptjs"

import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import Database from 'better-sqlite3'

const connectionString = process.env.DATABASE_URL?.replace("file:", "") || "dev.db"
const adapter = new PrismaBetterSqlite3({ url: connectionString })
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log("Starting verification...")

  // 1. Create a test user
  const email = `test-improvements-${Date.now()}@example.com`
  const password = await hash("password123", 12)
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash: password,
    },
  })
  console.log("Created user:", user.email)

  // 2. Create a category
  const category = await prisma.category.create({
    data: {
      name: "Test Category",
      type: "EXPENSE",
      userId: user.id,
    },
  })
  console.log("Created category:", category.name)

  // 3. Create a merchant
  const merchant = await prisma.merchant.create({
    data: {
      name: "Test Merchant",
      userId: user.id,
    },
  })
  console.log("Created merchant:", merchant.name)

  // 4. Create a transaction with merchant
  const transaction = await prisma.transaction.create({
    data: {
      amount: 50.0,
      currency: "USD",
      date: new Date(),
      type: "EXPENSE",
      categoryId: category.id,
      merchantId: merchant.id,
      userId: user.id,
      description: "Transaction with merchant",
    },
  })
  console.log("Created transaction with merchant:", transaction.id)

  // 5. Create a recurring rule with merchant
  const rule = await prisma.recurringRule.create({
    data: {
      frequency: "MONTHLY",
      interval: 1,
      amount: 100.0,
      currency: "USD",
      type: "EXPENSE",
      startDate: new Date(),
      categoryId: category.id,
      merchantId: merchant.id,
      userId: user.id,
      isActive: true,
      description: "Recurring with merchant",
    },
  })
  console.log("Created recurring rule with merchant:", rule.id)

  // 6. Verify data integrity
  const fetchedTransaction = await prisma.transaction.findUnique({
    where: { id: transaction.id },
    include: { merchant: true },
  })

  if (fetchedTransaction?.merchant?.name !== "Test Merchant") {
    throw new Error("Transaction merchant not linked correctly")
  }
  console.log("Verified transaction merchant link")

  const fetchedRule = await prisma.recurringRule.findUnique({
    where: { id: rule.id },
    include: { merchant: true },
  })

  if (fetchedRule?.merchant?.name !== "Test Merchant") {
    throw new Error("Recurring rule merchant not linked correctly")
  }
  console.log("Verified recurring rule merchant link")

  // Cleanup
  await prisma.user.delete({ where: { id: user.id } })
  console.log("Cleanup complete.")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
