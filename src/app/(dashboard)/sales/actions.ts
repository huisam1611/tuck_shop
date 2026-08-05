"use server";

import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

const saleSchema = z.object({
  saleDate: z.string().date(),
  paymentMethod: z.enum(["cash", "e_payment"]),
  items: z.array(z.object({ product_id: z.string().uuid(), quantity: z.number().int().positive() })).min(1),
});

export type SaleActionState = { error?: string; success?: string };

export async function createSale(_previousState: SaleActionState, formData: FormData): Promise<SaleActionState> {
  let rawItems: unknown;
  try {
    rawItems = JSON.parse(String(formData.get("items") ?? "[]"));
  } catch {
    return { error: "Your order items are invalid." };
  }

  const values = saleSchema.safeParse({
    saleDate: formData.get("saleDate"),
    paymentMethod: formData.get("paymentMethod"),
    items: rawItems,
  });
  if (!values.success) return { error: "Add at least one product and check the order details." };

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("create_sale", {
      p_client_request_id: crypto.randomUUID(),
      p_sale_date: values.data.saleDate,
      p_payment_method: values.data.paymentMethod,
      p_items: values.data.items,
    });
    if (error) return { error: error.message };
    const sale = Array.isArray(data) ? data[0] : data;
    return { success: `Order ${String(sale?.daily_order_number ?? "").padStart(3, "0")} saved.` };
  } catch {
    return { error: "Sales are not connected yet. Add Supabase settings to .env.local." };
  }
}
