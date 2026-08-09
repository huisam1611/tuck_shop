import { z } from "zod";

export const saleSchema = z.object({
  saleDate: z.string().date(),
  paymentMethod: z.enum(["cash", "e_payment"]),
  items: z.array(z.object({ product_id: z.string().uuid(), quantity: z.number().int().positive() })).min(1),
  clientRequestId: z.string().uuid().optional(),
});

export const voidSaleSchema = z.object({ saleId: z.string().uuid(), reason: z.string().trim().min(1).max(240) });

export const productSchema = z.object({
  productCode: z.string().trim().min(1).max(40),
  name: z.string().trim().min(1).max(120),
  category: z.string().trim().min(1).max(80),
  costPrice: z.coerce.number().min(0),
  sellingPrice: z.coerce.number().min(0),
  minimumStock: z.coerce.number().int().min(0),
});

export const updateProductSchema = productSchema.extend({
  productId: z.string().uuid(),
  status: z.enum(["active", "inactive"]),
});

export const stockInSchema = z.object({ productId: z.string().uuid(), receiptDate: z.string().date(), quantity: z.coerce.number().int().positive(), unitCost: z.coerce.number().min(0), supplierName: z.string().trim().max(160) });

export const adjustmentSchema = z.object({ productId: z.string().uuid(), direction: z.enum(["increase", "decrease"]), quantity: z.coerce.number().int().positive(), reason: z.string().trim().min(1).max(240) });
