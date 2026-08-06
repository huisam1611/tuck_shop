import { randomUUID } from "node:crypto";

import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_TEST_URL;
const anonKey = process.env.SUPABASE_TEST_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_TEST_SERVICE_ROLE_KEY;

if (!url || !anonKey || !serviceRoleKey) {
  throw new Error("Set SUPABASE_TEST_URL, SUPABASE_TEST_ANON_KEY, and SUPABASE_TEST_SERVICE_ROLE_KEY first.");
}

const authOptions = { auth: { autoRefreshToken: false, persistSession: false } };
const service = createClient(url, serviceRoleKey, authOptions);
const suffix = `${Date.now()}-${randomUUID().slice(0, 8)}`;
const adminCredentials = { email: `local-admin-${suffix}@example.test`, password: `Admin-${randomUUID()}!` };
const staffCredentials = { email: `local-staff-${suffix}@example.test`, password: `Staff-${randomUUID()}!` };
const createdUserIds = [];
const createdSaleIds = [];
let temporaryProductId;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function rpcRow(data) {
  return Array.isArray(data) ? data[0] : data;
}

async function signIn(credentials) {
  const client = createClient(url, anonKey, authOptions);
  const { data, error } = await client.auth.signInWithPassword(credentials);
  if (error || !data.user) throw new Error(`Sign-in failed: ${error?.message ?? "user missing"}`);
  return client;
}

async function createUser(credentials, name, role) {
  const { data, error } = await service.auth.admin.createUser({
    email: credentials.email,
    password: credentials.password,
    email_confirm: true,
  });
  if (error || !data.user) throw new Error(`Auth setup failed: ${error?.name ?? "AuthError"} ${error?.status ?? ""} ${error?.message ?? "user missing"}`);
  createdUserIds.push(data.user.id);

  const { error: profileError } = await service.from("profiles").insert({ id: data.user.id, name, role });
  if (profileError) throw new Error(`Profile setup failed: ${profileError.message}`);
}

async function removeRows(table, column, values) {
  if (values.length === 0) return;
  const { error } = await service.from(table).delete().in(column, values);
  if (error) throw new Error(`Cleanup failed for ${table}: ${error.message}`);
}

try {
  await createUser(adminCredentials, "Local Admin", "admin");
  await createUser(staffCredentials, "Local Staff", "staff");
  const admin = await signIn(adminCredentials);
  const staff = await signIn(staffCredentials);

  const { data: seededProduct, error: seededProductError } = await admin
    .from("products")
    .select("id,current_stock")
    .eq("product_code", "P001")
    .single();
  if (seededProductError || !seededProduct) throw new Error(`Seed check failed: ${seededProductError?.message ?? "P001 missing"}`);

  const { data: staffProduct, error: staffProductError } = await staff
    .from("staff_products")
    .select("*")
    .eq("id", seededProduct.id)
    .single();
  if (staffProductError || !staffProduct) throw new Error(`Staff product view failed: ${staffProductError?.message ?? "row missing"}`);
  assert(!Object.hasOwn(staffProduct, "cost_price"), "Staff product view exposes cost_price.");
  const { data: hiddenProducts, error: hiddenProductsError } = await staff
    .from("products")
    .select("id,cost_price")
    .eq("id", seededProduct.id);
  assert(!hiddenProductsError && (hiddenProducts?.length ?? 0) === 0, "Staff can read Admin product data.");

  const temporaryCode = `T-${suffix}`.slice(0, 40);
  const { data: createdProductData, error: createProductError } = await admin.rpc("create_product", {
    p_product_code: temporaryCode,
    p_name: "Local Concurrency Product",
    p_category: "Test",
    p_cost_price: 1,
    p_selling_price: 2,
    p_minimum_stock: 0,
  });
  if (createProductError) throw new Error(`Product RPC failed: ${createProductError.message}`);
  const createdProduct = rpcRow(createdProductData);
  temporaryProductId = createdProduct?.id;
  assert(temporaryProductId, "Product RPC did not return a product.");

  const { error: stockInError } = await admin.rpc("stock_in", {
    p_product_id: temporaryProductId,
    p_receipt_date: "2099-01-01",
    p_quantity: 2,
    p_unit_cost: 1,
    p_supplier_name: "Local test",
  });
  if (stockInError) throw new Error(`Stock-in RPC failed: ${stockInError.message}`);

  const concurrentDate = "2099-01-02";
  const simultaneousResults = await Promise.all([
    staff.rpc("create_sale", {
      p_client_request_id: randomUUID(),
      p_sale_date: concurrentDate,
      p_payment_method: "cash",
      p_items: [{ product_id: temporaryProductId, quantity: 1 }],
    }),
    staff.rpc("create_sale", {
      p_client_request_id: randomUUID(),
      p_sale_date: concurrentDate,
      p_payment_method: "e_payment",
      p_items: [{ product_id: temporaryProductId, quantity: 1 }],
    }),
  ]);
  const simultaneousSuccesses = simultaneousResults.filter((result) => !result.error).map((result) => rpcRow(result.data));
  if (simultaneousSuccesses.length !== 2 || simultaneousResults.some((result) => result.error)) {
    const summary = simultaneousResults.map((result) => ({ ok: !result.error, error: result.error?.message ?? null, row: rpcRow(result.data) ?? null }));
    throw new Error(`Concurrent orders did not both succeed: ${JSON.stringify(summary)}`);
  }
  createdSaleIds.push(...simultaneousSuccesses.map((sale) => sale.sale_id));
  assert(new Set(simultaneousSuccesses.map((sale) => sale.daily_order_number)).size === 2, "Concurrent orders received the same daily order number.");

  const { data: afterSimultaneous, error: afterSimultaneousError } = await admin
    .from("products")
    .select("current_stock")
    .eq("id", temporaryProductId)
    .single();
  if (afterSimultaneousError) throw new Error(`Concurrent stock check failed: ${afterSimultaneousError.message}`);
  assert(afterSimultaneous.current_stock === 0, "Concurrent orders changed stock incorrectly.");

  const { error: oversellStockInError } = await admin.rpc("stock_in", {
    p_product_id: temporaryProductId,
    p_receipt_date: "2099-01-02",
    p_quantity: 1,
    p_unit_cost: 1,
    p_supplier_name: "Local test",
  });
  if (oversellStockInError) throw new Error(`Oversell setup failed: ${oversellStockInError.message}`);

  const oversellResults = await Promise.all([
    staff.rpc("create_sale", {
      p_client_request_id: randomUUID(),
      p_sale_date: "2099-01-03",
      p_payment_method: "cash",
      p_items: [{ product_id: temporaryProductId, quantity: 1 }],
    }),
    staff.rpc("create_sale", {
      p_client_request_id: randomUUID(),
      p_sale_date: "2099-01-03",
      p_payment_method: "e_payment",
      p_items: [{ product_id: temporaryProductId, quantity: 1 }],
    }),
  ]);
  const oversellSuccesses = oversellResults.filter((result) => !result.error).map((result) => rpcRow(result.data));
  const oversellFailures = oversellResults.filter((result) => result.error);
  if (oversellSuccesses.length !== 1 || oversellFailures.length !== 1) {
    const summary = oversellResults.map((result) => ({ ok: !result.error, error: result.error?.message ?? null, row: rpcRow(result.data) ?? null }));
    throw new Error(`Oversell race did not resolve to one success and one failure: ${JSON.stringify(summary)}`);
  }
  createdSaleIds.push(oversellSuccesses[0].sale_id);
  const { data: afterOversell, error: afterOversellError } = await admin
    .from("products")
    .select("current_stock")
    .eq("id", temporaryProductId)
    .single();
  if (afterOversellError) throw new Error(`Oversell stock check failed: ${afterOversellError.message}`);
  assert(afterOversell.current_stock === 0, "Oversell race changed stock incorrectly.");

  const retryRequestId = randomUUID();
  const { data: firstSaleData, error: firstSaleError } = await staff.rpc("create_sale", {
    p_client_request_id: retryRequestId,
    p_sale_date: "2099-01-03",
    p_payment_method: "cash",
    p_items: [{ product_id: seededProduct.id, quantity: 1 }],
  });
  if (firstSaleError) throw new Error(`Sale RPC failed: ${firstSaleError.message}`);
  const firstSale = rpcRow(firstSaleData);
  createdSaleIds.push(firstSale.sale_id);
  const { data: retrySaleData, error: retrySaleError } = await staff.rpc("create_sale", {
    p_client_request_id: retryRequestId,
    p_sale_date: "2099-01-03",
    p_payment_method: "cash",
    p_items: [{ product_id: seededProduct.id, quantity: 1 }],
  });
  if (retrySaleError) throw new Error(`Sale retry failed: ${retrySaleError.message}`);
  const retrySale = rpcRow(retrySaleData);
  assert(retrySale.sale_id === firstSale.sale_id, "Retry created a different sale.");

  const { data: staffItems, error: staffItemsError } = await staff
    .from("staff_sale_items")
    .select("*")
    .eq("sale_id", firstSale.sale_id)
    .single();
  if (staffItemsError || !staffItems) throw new Error(`Staff sale item view failed: ${staffItemsError?.message ?? "row missing"}`);
  assert(!Object.hasOwn(staffItems, "unit_cost") && !Object.hasOwn(staffItems, "profit"), "Staff sale item view exposes cost or profit.");

  const { data: adminItems, error: adminItemsError } = await admin
    .from("sale_items")
    .select("unit_cost,profit")
    .eq("sale_id", firstSale.sale_id)
    .single();
  if (adminItemsError || !adminItems) throw new Error(`Admin sale item view failed: ${adminItemsError?.message ?? "row missing"}`);
  assert(adminItems.unit_cost !== undefined && adminItems.profit !== undefined, "Admin sale item cost snapshot is missing.");

  const { data: beforeFailedSale, error: beforeFailedSaleError } = await admin
    .from("products")
    .select("current_stock")
    .eq("id", seededProduct.id)
    .single();
  if (beforeFailedSaleError) throw new Error(`Atomicity setup failed: ${beforeFailedSaleError.message}`);
  const { error: failedSaleError } = await staff.rpc("create_sale", {
    p_client_request_id: randomUUID(),
    p_sale_date: "2099-01-04",
    p_payment_method: "cash",
    p_items: [
      { product_id: seededProduct.id, quantity: 1 },
      { product_id: randomUUID(), quantity: 1 },
    ],
  });
  assert(Boolean(failedSaleError), "Invalid multi-item sale unexpectedly succeeded.");
  const { data: afterFailedSale, error: afterFailedSaleError } = await admin
    .from("products")
    .select("current_stock")
    .eq("id", seededProduct.id)
    .single();
  if (afterFailedSaleError) throw new Error(`Atomicity check failed: ${afterFailedSaleError.message}`);
  assert(afterFailedSale.current_stock === beforeFailedSale.current_stock, "Failed multi-item sale changed stock.");
  const { count: failedSaleCount, error: failedSaleCountError } = await admin
    .from("sales")
    .select("id", { count: "exact", head: true })
    .eq("sale_date", "2099-01-04");
  if (failedSaleCountError) throw new Error(`Atomicity order check failed: ${failedSaleCountError.message}`);
  assert(failedSaleCount === 0, "Failed multi-item sale created an order.");

  const { error: voidError } = await admin.rpc("void_sale", { p_sale_id: firstSale.sale_id, p_reason: "Local integration test" });
  if (voidError) throw new Error(`Void RPC failed: ${voidError.message}`);
  const { data: afterVoid, error: afterVoidError } = await admin
    .from("products")
    .select("current_stock")
    .eq("id", seededProduct.id)
    .single();
  if (afterVoidError) throw new Error(`Void stock check failed: ${afterVoidError.message}`);
  assert(afterVoid.current_stock === seededProduct.current_stock, "Voiding did not restore stock exactly once.");
  const { error: repeatVoidError } = await admin.rpc("void_sale", { p_sale_id: firstSale.sale_id, p_reason: "Local integration test" });
  assert(Boolean(repeatVoidError), "Voiding the same sale twice unexpectedly succeeded.");

  const { error: staffAdminError } = await staff.rpc("stock_in", {
    p_product_id: temporaryProductId,
    p_receipt_date: "2099-01-05",
    p_quantity: 1,
    p_unit_cost: 1,
    p_supplier_name: "Should fail",
  });
  assert(Boolean(staffAdminError), "Staff could execute an Admin inventory operation.");

  console.log("Local Supabase integration checks passed: RLS, atomicity, retry idempotency, oversell protection, and void safety.");
} finally {
  await removeRows("stock_movements", "reference_id", createdSaleIds);
  await removeRows("sale_items", "sale_id", createdSaleIds);
  await removeRows("sales", "id", createdSaleIds);
  if (temporaryProductId) {
    await removeRows("stock_movements", "product_id", [temporaryProductId]);
    await removeRows("stock_receipts", "product_id", [temporaryProductId]);
    await removeRows("products", "id", [temporaryProductId]);
  }
  for (const userId of createdUserIds) await service.auth.admin.deleteUser(userId);
}
