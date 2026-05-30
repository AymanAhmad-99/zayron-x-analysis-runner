export const runtime = 'edge';
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { redirect } from "next/navigation";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ category: string }>;
  searchParams: Promise<{ page?: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category } = await params;
  const label = category.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return {
    title: `${label} — Intelligence Reports`,
    description: `Latest ${label} cyber threat intelligence reports and analysis from ZAYRON-X.`,
    alternates: {
      canonical: `${process.env.NEXT_PUBLIC_SITE_URL}/intelligence/${category}`,
    },
  };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { category } = await params;
  const { page: pageStr } = await searchParams;
  const page = Number(pageStr) || 1;

  // Redirect old /[category] routes to /intelligence/[category]
  redirect(`/intelligence/${category}${page > 1 ? `?page=${page}` : ""}`);
}
