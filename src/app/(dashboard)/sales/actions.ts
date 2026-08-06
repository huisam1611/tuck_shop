"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

const saleSchema = z.object({
  saleDate: z.string().date(),
  paymentMethod: z.enum(["cash", "e_payment"]),
  items: z.array(z.object({ product_id: z.string().uuid(), quantity: z.number().int().positive() })).min(1),
  clientRequestId: z.string().uuid().optional(),
});

export type SaleActionState = { error?: string; success?: string };

const voidSaleSchema = z.object({ saleId: z.string().uuid(), reason: z.string().trim().min(1).max(240) });

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
    clientRequestId: formData.get("clientRequestId") || undefined,
  });
  if (!values.success) return { error: "Add at least one product and check the order details." };

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("create_sale", {
      p_client_request_id: values.data.clientRequestId ?? crypto.randomUUID(),
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

export async function voidSale(_previousState: SaleActionState, formData: FormData): Promise<SaleActionState> {
  const values = voidSaleSchema.safeParse({ saleId: formData.get("saleId"), reason: formData.get("reason") });
  if (!values.success) return { error: "A void reason is required." };

  try {
    const supabase = await createClient();
    const { error } = await supabase.rpc("void_sale", { p_sale_id: values.data.saleId, p_reason: values.data.reason });
    if (error) return { error: error.message };
    revalidatePath("/sales");
    revalidatePath("/sales/history");
    revalidatePath("/inventory");
    return { success: "Sale voided and stock restored." };
  } catch {
    return { error: "Sales are not connected yet. Add Supabase settings to .env.local." };
  }
}
