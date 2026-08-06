import Link from "next/link";
import { notFound } from "next/navigation";

import { getCurrentProfile, getProduct } from "@/lib/data";

import { ProductEditForm } from "../product-edit-form";

export const dynamic = "force-dynamic";

export const metadata = { title: "Edit product" };

export default async function ProductEditPage({ params }: { params: Promise<{ id: string }> }) {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin") notFound();
  const { id } = await params;
  const product = await getProduct(id);
  if (!product) notFound();

  return (
    <div className="min-h-screen px-4 py-5 sm:px-6 lg:px-10 lg:py-8">
      <header className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-sm font-semibold text-blue-700">Catalogue</p><h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">Edit product</h1><p className="mt-2 text-sm text-slate-500">Update catalogue details without changing current stock.</p></div>
        <Link href="/products" className="text-sm font-semibold text-blue-700 hover:text-blue-800">← Back to products</Link>
      </header>
      <ProductEditForm product={product} demo={product.id.startsWith("demo-")} />
    </div>
  );
}
