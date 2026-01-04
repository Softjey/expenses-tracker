import { Metadata } from "next";
import { RecurringClient } from "@/components/recurring/recurring-client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Recurring Transactions | Expenses Tracker",
  description: "Manage your recurring expenses and income",
};

export default async function RecurringPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="container mx-auto py-6">
      <RecurringClient />
    </div>
  );
}
