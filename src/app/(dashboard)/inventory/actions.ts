"use server";

import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

const stockInSchema = z.object({ productId: z.string().uuid(), receiptDate: z.string().date(), quantity: z.coerce.number().int().positive(), unitCost: z.coerce.number().min(0), supplierName: z.string().trim().max(160) });
const adjustmentSchema = z.object({ productId: z.string().uuid(), direction: z.enum(["increase", "decrease"]), quantity: z.coerce.number().int().positive(), reason: z.string().trim().min(1).max(240) });
export type InventoryActionState = { error?: string; success?: string };

export async function stockIn(_previousState: InventoryActionState, formData: FormData): Promise<InventoryActionState> {
  const values = stockInSchema.safeParse({ productId: formData.get("productId"), receiptDate: formData.get("receiptDate"), quantity: formData.get("quantity"), unitCost: formData.get("unitCost"), supplierName: formData.get("supplierName") ?? "" });
  if (!values.success) return { error: "Check the stock-in details." };
  try { const supabase = await createClient(); const { error } = await supabase.rpc("stock_in", { p_product_id: values.data.productId, p_receipt_date: values.data.receiptDate, p_quantity: values.data.quantity, p_unit_cost: values.data.unitCost, p_supplier_name: values.data.supplierName || null }); return error ? { error: error.message } : { success: "Stock received." }; } catch { return { error: "Inventory is not connected yet. Add Supabase settings to .env.local." }; }
}

export async function adjustStock(_previousState: InventoryActionState, formData: FormData): Promise<InventoryActionState> {
  const values = adjustmentSchema.safeParse({ productId: formData.get("productId"), direction: formData.get("direction"), quantity: formData.get("quantity"), reason: formData.get("reason") });
  if (!values.success) return { error: "Check the adjustment details and reason." };
  try { const supabase = await createClient(); const { error } = await supabase.rpc("adjust_stock", { p_product_id: values.data.productId, p_direction: values.data.direction, p_quantity: values.data.quantity, p_reason: values.data.reason }); return error ? { error: error.message } : { success: "Stock adjusted." }; } catch { return { error: "Inventory is not connected yet. Add Supabase settings to .env.local." }; }
}
