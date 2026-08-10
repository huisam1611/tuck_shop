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
let counterSaleId;
const counterDate = "2099-01-06";
const importedReceiptIds = [];
const importedMovementIds = [];

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

  const initialReceiptId = randomUUID();
  const initialMovementId = randomUUID();
  importedReceiptIds.push(initialReceiptId);
  importedMovementIds.push(initialMovementId);
  const initialStockArgs = {
    p_receipt_id: initialReceiptId,
    p_movement_id: initialMovementId,
    p_product_id: temporaryProductId,
    p_receipt_date: "2099-01-01",
    p_quantity: 2,
    p_unit_cost: 1,
    p_supplier_name: "Local historical import",
    p_created_by: createdUserIds[0],
  };
  const { data: initialImportData, error: initialImportError } = await service.rpc("import_initial_stock", initialStockArgs);
  if (initialImportError) throw new Error(`Initial stock RPC failed: ${initialImportError.message}`);
  assert(rpcRow(initialImportData)?.stock_applied === true, "Initial stock RPC did not apply stock on first run.");
  const { data: retryImportData, error: retryImportError } = await service.rpc("import_initial_stock", initialStockArgs);
  if (retryImportError) throw new Error(`Initial stock retry failed: ${retryImportError.message}`);
  assert(rpcRow(retryImportData)?.stock_applied === false, "Initial stock retry applied stock twice.");
  const { count: receiptCount, error: receiptCountError } = await service
    .from("stock_receipts")
    .select("id", { count: "exact", head: true })
    .eq("id", initialReceiptId);
  if (receiptCountError) throw new Error(`Initial receipt check failed: ${receiptCountError.message}`);
  assert(receiptCount === 1, "Initial stock retry duplicated the receipt.");
  const { count: movementCount, error: movementCountError } = await service
    .from("stock_movements")
    .select("id", { count: "exact", head: true })
    .eq("id", initialMovementId);
  if (movementCountError) throw new Error(`Initial movement check failed: ${movementCountError.message}`);
  assert(movementCount === 1, "Initial stock retry duplicated the movement.");

  const partialReceiptId = randomUUID();
  const partialMovementId = randomUUID();
  importedReceiptIds.push(partialReceiptId);
  importedMovementIds.push(partialMovementId);
  const { error: partialReceiptError } = await service.from("stock_receipts").insert({
    id: partialReceiptId,
    receipt_date: "2099-01-01",
    product_id: temporaryProductId,
    quantity: 1,
    unit_cost: 1,
    supplier_name: "Partial import fixture",
    created_by: createdUserIds[0],
  });
  if (partialReceiptError) throw new Error(`Partial receipt setup failed: ${partialReceiptError.message}`);
  const { data: partialRepairData, error: partialRepairError } = await service.rpc("import_initial_stock", {
    ...initialStockArgs,
    p_receipt_id: partialReceiptId,
    p_movement_id: partialMovementId,
    p_quantity: 1,
    p_supplier_name: "Partial import fixture",
  });
  if (partialRepairError) throw new Error(`Partial receipt repair failed: ${partialRepairError.message}`);
  assert(rpcRow(partialRepairData)?.stock_applied === true, "Partial receipt was not repaired atomically.");

  const { error: authenticatedImportError } = await admin.rpc("import_initial_stock", initialStockArgs);
  assert(Boolean(authenticatedImportError), "Authenticated users can execute the service import RPC.");
  const { error: authenticatedCounterError } = await admin.rpc("reconcile_daily_order_counter", { p_sale_date: counterDate });
  assert(Boolean(authenticatedCounterError), "Authenticated users can execute the counter RPC.");

  const { error: stockInError } = await admin.rpc("stock_in", {
    p_product_id: temporaryProductId,
    p_receipt_date: "2099-01-01",
    p_quantity: 2,
    p_unit_cost: 1,
    p_supplier_name: "Local test",
  });
  if (stockInError) throw new Error(`Stock-in RPC failed: ${stockInError.message}`);

  const { data: beforeSimultaneous, error: beforeSimultaneousError } = await admin
    .from("products")
    .select("current_stock")
    .eq("id", temporaryProductId)
    .single();
  if (beforeSimultaneousError) throw new Error(`Concurrent stock setup failed: ${beforeSimultaneousError.message}`);

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
  const expectedAfterSimultaneous = beforeSimultaneous.current_stock - 2;
  assert(afterSimultaneous.current_stock === expectedAfterSimultaneous, `Concurrent orders changed stock incorrectly (expected ${expectedAfterSimultaneous}, got ${afterSimultaneous.current_stock}).`);

  const { error: oversellStockInError } = await admin.rpc("stock_in", {
    p_product_id: temporaryProductId,
    p_receipt_date: "2099-01-02",
    p_quantity: 1,
    p_unit_cost: 1,
    p_supplier_name: "Local test",
  });
  if (oversellStockInError) throw new Error(`Oversell setup failed: ${oversellStockInError.message}`);

  const { data: beforeOversellSetup, error: beforeOversellSetupError } = await admin
    .from("products")
    .select("current_stock")
    .eq("id", temporaryProductId)
    .single();
  if (beforeOversellSetupError) throw new Error(`Oversell stock setup failed: ${beforeOversellSetupError.message}`);
  const excessStock = beforeOversellSetup.current_stock - 1;
  if (excessStock > 0) {
    const { error: oversellAdjustmentError } = await admin.rpc("adjust_stock", {
      p_product_id: temporaryProductId,
      p_direction: "decrease",
      p_quantity: excessStock,
      p_reason: "Local oversell fixture",
    });
    if (oversellAdjustmentError) throw new Error(`Oversell fixture adjustment failed: ${oversellAdjustmentError.message}`);
  }
  const { data: beforeOversell, error: beforeOversellError } = await admin
    .from("products")
    .select("current_stock")
    .eq("id", temporaryProductId)
    .single();
  if (beforeOversellError) throw new Error(`Oversell stock check failed: ${beforeOversellError.message}`);
  assert(beforeOversell.current_stock === 1, `Oversell fixture was not normalized (got ${beforeOversell.current_stock}).`);

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
  const expectedAfterOversell = beforeOversell.current_stock - 1;
  assert(afterOversell.current_stock === expectedAfterOversell, `Oversell race changed stock incorrectly (expected ${expectedAfterOversell}, got ${afterOversell.current_stock}).`);

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

  counterSaleId = randomUUID();
  const { error: counterSaleError } = await service.from("sales").insert({
    id: counterSaleId,
    client_request_id: randomUUID(),
    sale_date: counterDate,
    daily_order_number: 99,
    payment_method: "cash",
    staff_id: createdUserIds[0],
    grand_total: 0,
    status: "completed",
  });
  if (counterSaleError) throw new Error(`Counter fixture setup failed: ${counterSaleError.message}`);
  const { error: counterSeedError } = await service.from("daily_order_counters").upsert({
    sale_date: counterDate,
    next_order_number: 150,
  });
  if (counterSeedError) throw new Error(`Counter seed failed: ${counterSeedError.message}`);
  const { data: counterData, error: counterError } = await service.rpc("reconcile_daily_order_counter", { p_sale_date: counterDate });
  if (counterError) throw new Error(`Counter reconciliation failed: ${counterError.message}`);
  assert(rpcRow(counterData)?.next_order_number >= 150, "Counter reconciliation lowered an existing counter.");
  const { data: counterAfter, error: counterAfterError } = await service
    .from("daily_order_counters")
    .select("next_order_number")
    .eq("sale_date", counterDate)
    .single();
  if (counterAfterError) throw new Error(`Counter check failed: ${counterAfterError.message}`);
  assert(counterAfter.next_order_number >= 150, "Counter reconciliation did not preserve the larger value.");

  console.log("Local Supabase integration checks passed: RLS, atomicity, retry idempotency, oversell protection, and void safety.");
} finally {
  await removeRows("stock_movements", "reference_id", createdSaleIds);
  await removeRows("sale_items", "sale_id", createdSaleIds);
  await removeRows("sales", "id", createdSaleIds);
  if (counterSaleId) await removeRows("sales", "id", [counterSaleId]);
  await removeRows("daily_order_counters", "sale_date", [counterDate]);
  if (temporaryProductId) {
    await removeRows("stock_movements", "id", importedMovementIds);
    await removeRows("stock_movements", "product_id", [temporaryProductId]);
    await removeRows("stock_receipts", "id", importedReceiptIds);
    await removeRows("stock_receipts", "product_id", [temporaryProductId]);
    await removeRows("sale_items", "product_id", [temporaryProductId]);
    await removeRows("products", "id", [temporaryProductId]);
  }
  for (const userId of createdUserIds) await service.auth.admin.deleteUser(userId);
}
