import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { StatisticsClient } from "@/components/statistics/statistics-client";

export const metadata: Metadata = {
  title: "Statistics | Expenses Tracker",
  description: "View your spending statistics",
};

export default async function StatisticsPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  return <StatisticsClient />;
}
