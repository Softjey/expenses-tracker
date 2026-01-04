import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { MerchantsClient } from "@/components/merchants/merchants-client";

export const metadata: Metadata = {
  title: "Merchants | Expenses Tracker",
  description: "Manage your merchants",
};

export default async function MerchantsPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  return <MerchantsClient />;
}
