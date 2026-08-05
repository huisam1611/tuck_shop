import { createClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/env";

export type Product = {
  id: string;
  product_code: string;
  name: string;
  category: string;
  selling_price: number;
  cost_price?: number;
  current_stock: number;
  minimum_stock: number;
  status: "active" | "inactive";
};

export const demoProducts: Product[] = [
  { id: "demo-001", product_code: "P001", name: "Potato Chips", category: "Snacks", cost_price: 1.2, selling_price: 2, current_stock: 40, minimum_stock: 10, status: "active" },
  { id: "demo-002", product_code: "P002", name: "Chocolate Bar", category: "Snacks", cost_price: 1.3, selling_price: 2, current_stock: 35, minimum_stock: 10, status: "active" },
  { id: "demo-003", product_code: "P003", name: "Coca-Cola Can", category: "Drinks", cost_price: 1.5, selling_price: 2, current_stock: 30, minimum_stock: 10, status: "active" },
  { id: "demo-004", product_code: "P004", name: "Mineral Water", category: "Drinks", cost_price: 0.6, selling_price: 1, current_stock: 50, minimum_stock: 15, status: "active" },
  { id: "demo-005", product_code: "P005", name: "Orange Juice", category: "Drinks", cost_price: 1.4, selling_price: 2.5, current_stock: 18, minimum_stock: 8, status: "active" },
  { id: "demo-006", product_code: "P006", name: "Instant Noodles", category: "Food", cost_price: 1.1, selling_price: 2, current_stock: 25, minimum_stock: 8, status: "active" },
  { id: "demo-007", product_code: "P007", name: "Biscuit Pack", category: "Snacks", cost_price: 1, selling_price: 1.8, current_stock: 32, minimum_stock: 10, status: "active" },
  { id: "demo-008", product_code: "P008", name: "Chewing Gum", category: "Snacks", cost_price: 0.4, selling_price: 0.8, current_stock: 45, minimum_stock: 12, status: "active" },
  { id: "demo-009", product_code: "P009", name: "Ice Cream Cup", category: "Frozen", cost_price: 1.5, selling_price: 2.5, current_stock: 12, minimum_stock: 6, status: "active" },
  { id: "demo-010", product_code: "P010", name: "Sandwich", category: "Food", cost_price: 2.2, selling_price: 3.5, current_stock: 10, minimum_stock: 5, status: "active" },
];

export async function listProducts(): Promise<Product[]> {
  if (!hasSupabaseEnv()) return demoProducts;

  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return [];

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", authData.user.id).maybeSingle();
  const source = profile?.role === "admin" ? "products" : "staff_products";
  const { data, error } = await supabase.from(source).select("*").order("name");
  if (error) throw new Error("Unable to load products.");
  return (data ?? []) as Product[];
}
