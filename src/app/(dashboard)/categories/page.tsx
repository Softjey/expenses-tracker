import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { CategoriesClient } from "@/components/categories/categories-client";

export const metadata: Metadata = {
  title: "Categories | Expenses Tracker",
  description: "Manage your expense and income categories",
};

export default async function CategoriesPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  return <CategoriesClient />;
}
