"use server";

import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

const productSchema = z.object({
  productCode: z.string().trim().min(1).max(40),
  name: z.string().trim().min(1).max(120),
  category: z.string().trim().min(1).max(80),
  costPrice: z.coerce.number().min(0),
  sellingPrice: z.coerce.number().min(0),
  minimumStock: z.coerce.number().int().min(0),
});

export type ProductActionState = { error?: string; success?: string };

export async function createProduct(_previousState: ProductActionState, formData: FormData): Promise<ProductActionState> {
  const values = productSchema.safeParse({
    productCode: formData.get("productCode"), name: formData.get("name"), category: formData.get("category"),
    costPrice: formData.get("costPrice"), sellingPrice: formData.get("sellingPrice"), minimumStock: formData.get("minimumStock"),
  });
  if (!values.success) return { error: "Check the product code, name, category, prices, and minimum stock." };

  try {
    const supabase = await createClient();
    const { error } = await supabase.rpc("create_product", {
      p_product_code: values.data.productCode,
      p_name: values.data.name,
      p_category: values.data.category,
      p_cost_price: values.data.costPrice,
      p_selling_price: values.data.sellingPrice,
      p_minimum_stock: values.data.minimumStock,
    });
    return error ? { error: error.message } : { success: "Product created." };
  } catch {
    return { error: "Products are not connected yet. Add Supabase settings to .env.local." };
  }
}
