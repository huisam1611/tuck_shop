#!/usr/bin/env node

import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';

import { createClient } from '@supabase/supabase-js';

import { generateSales, payloadHash, summarizeGenerated } from './replace-sales-history.mjs';

const url = process.env.SUPABASE_TEST_URL;
const anonKey = process.env.SUPABASE_TEST_ANON_KEY;
const serviceKey = process.env.SUPABASE_TEST_SERVICE_ROLE_KEY;
if (!url || !anonKey || !serviceKey || !['127.0.0.1', 'localhost'].includes(new URL(url).hostname)) {
  throw new Error('Set local SUPABASE_TEST_URL, SUPABASE_TEST_ANON_KEY, and SUPABASE_TEST_SERVICE_ROLE_KEY');
}

function resetLocalDatabase() {
  const cliPath = process.env.SUPABASE_CLI_PATH;
  if (!cliPath && !process.env.npm_execpath) throw new Error('Run this integration check through pnpm verify:sales-replacement');
  const command = cliPath || process.execPath;
  const args = cliPath
    ? ['db', 'reset', '--local']
    : [process.env.npm_execpath, 'dlx', 'supabase@latest', 'db', 'reset'];
  const reset = spawnSync(command, args, {
    cwd: process.cwd(),
    encoding: 'utf8',
  });
  if (reset.status !== 0) throw new Error(`Local Supabase reset failed: ${reset.stderr || reset.stdout}`);
}

resetLocalDatabase();
let cleanupComplete = false;
process.on('exit', () => {
  if (!cleanupComplete) resetLocalDatabase();
});

const authOptions = { auth: { persistSession: false, autoRefreshToken: false } };
const service = createClient(url, serviceKey, authOptions);
const suffix = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;

async function createUser(role) {
  const credentials = { email: `replacement-${role}-${suffix}@example.test`, password: `Test-${crypto.randomUUID()}!` };
  const { data, error } = await service.auth.admin.createUser({ ...credentials, email_confirm: true });
  if (error || !data.user) throw error ?? new Error('Auth user missing');
  const { error: profileError } = await service.from('profiles').insert({ id: data.user.id, name: `Replacement ${role}`, role });
  if (profileError) throw profileError;
  const client = createClient(url, anonKey, authOptions);
  const { error: signInError } = await client.auth.signInWithPassword(credentials);
  if (signInError) throw signInError;
  return { id: data.user.id, client };
}

const admin = await createUser('admin');
const staff = await createUser('staff');
const productRows = Array.from({ length: 57 }, (_, index) => ({
  product_code: `HK-${String(index + 1).padStart(3, '0')}`,
  name: `Replacement HK ${index + 1}`,
  category: 'Test',
  cost_price: 1,
  selling_price: (index % 10) + 1,
  current_stock: index === 0 ? 8 : 0,
  minimum_stock: 0,
  status: 'active',
}));
const { data: products, error: productError } = await service.from('products').insert(productRows).select('id,product_code,name,cost_price,selling_price,current_stock,status');
if (productError) throw productError;

const firstProduct = products.find((product) => product.product_code === 'HK-001');
const oldSaleId = crypto.randomUUID();
const oldSale = await service.from('sales').insert({ id: oldSaleId, client_request_id: crypto.randomUUID(), sale_date: '2025-01-01', daily_order_number: 1, payment_method: 'cash', staff_id: admin.id, grand_total: 2, status: 'completed' });
if (oldSale.error) throw oldSale.error;
const oldItem = await service.from('sale_items').insert({ sale_id: oldSaleId, product_id: firstProduct.id, product_code: 'HK-001', product_name: firstProduct.name, quantity: 2, unit_price: 1, unit_cost: 1, subtotal: 2, cost_total: 2, profit: 0 });
if (oldItem.error) throw oldItem.error;
const oldMovements = await service.from('stock_movements').insert([
  { product_id: firstProduct.id, movement_type: 'stock_in', quantity_change: 10, stock_before: 0, stock_after: 10, reference_type: 'replacement_test_baseline', created_by: admin.id },
  { product_id: firstProduct.id, movement_type: 'sale', quantity_change: -2, stock_before: 10, stock_after: 8, reference_type: 'sale', reference_id: oldSaleId, created_by: admin.id },
]);
if (oldMovements.error) throw oldMovements.error;
const oldCounter = await service.from('daily_order_counters').insert({ sale_date: '2025-01-01', next_order_number: 2 });
if (oldCounter.error) throw oldCounter.error;

const sales = generateSales({ products, staffId: admin.id });
const expected = summarizeGenerated(sales, products);
const expectedHash = payloadHash(sales);
const baselinePreview = await service.rpc('preview_sales_history_replacement');
if (baselinePreview.error) throw baselinePreview.error;
const maintenance = await service.rpc('set_sales_maintenance', { p_enabled: true });
if (maintenance.error) throw maintenance.error;

const beforeMalformed = await service.from('sales').select('id', { count: 'exact', head: true });
const malformed = await service.rpc('replace_sales_history', { p_confirmation: 'DELETE-ALL-SALES', p_start_date: '2026-06-01', p_end_date: '2026-08-12', p_sales: null });
const afterMalformed = await service.from('sales').select('id', { count: 'exact', head: true });
if (!malformed.error || beforeMalformed.count !== afterMalformed.count) throw new Error('Malformed payload did not roll back');

const unauthorized = await staff.client.rpc('replace_sales_history', { p_confirmation: 'DELETE-ALL-SALES', p_start_date: '2026-06-01', p_end_date: '2026-08-12', p_sales: sales });
if (!unauthorized.error) throw new Error('Authenticated staff unexpectedly executed replacement RPC');

const [
  replacement,
  blockedSale,
  blockedVoid,
  blockedCounter,
  blockedProduct,
  blockedStockIn,
  blockedAdjustment,
  blockedImport,
  blockedProfile,
] = await Promise.all([
  service.rpc('replace_sales_history', { p_confirmation: 'DELETE-ALL-SALES', p_start_date: '2026-06-01', p_end_date: '2026-08-12', p_sales: sales }),
  staff.client.rpc('create_sale', { p_client_request_id: crypto.randomUUID(), p_sale_date: '2026-08-13', p_payment_method: 'cash', p_items: [{ product_id: firstProduct.id, quantity: 1 }] }),
  admin.client.rpc('void_sale', { p_sale_id: oldSaleId, p_reason: 'Concurrent maintenance test' }),
  service.from('daily_order_counters').update({ next_order_number: 99 }).eq('sale_date', '2025-01-01'),
  service.from('products').update({ selling_price: 99 }).eq('id', firstProduct.id),
  admin.client.rpc('stock_in', { p_product_id: firstProduct.id, p_receipt_date: '2026-08-13', p_quantity: 1, p_unit_cost: 1, p_supplier_name: 'Blocked test' }),
  admin.client.rpc('adjust_stock', { p_product_id: firstProduct.id, p_direction: 'increase', p_quantity: 1, p_reason: 'Blocked test' }),
  service.rpc('import_initial_stock', {
    p_receipt_id: crypto.randomUUID(),
    p_movement_id: crypto.randomUUID(),
    p_product_id: firstProduct.id,
    p_receipt_date: '2026-08-13',
    p_quantity: 1,
    p_unit_cost: 1,
    p_supplier_name: 'Blocked test',
    p_created_by: admin.id,
  }),
  admin.client.rpc('admin_update_profile', { p_user_id: admin.id, p_name: 'Blocked Admin update', p_role: 'admin', p_is_active: true }),
]);
if (!blockedSale.error || !blockedSale.error.message.includes('maintenance')) throw new Error('POS sale was not blocked by maintenance mode');
if (!blockedVoid.error || !blockedVoid.error.message.includes('maintenance')) throw new Error('Void was not blocked by maintenance mode');
if (!blockedCounter.error || !blockedCounter.error.message.includes('maintenance')) throw new Error('Direct counter write was not blocked by maintenance mode');
if (!blockedProduct.error || !blockedProduct.error.message.includes('maintenance')) throw new Error('Product write was not blocked by maintenance mode');
if (!blockedStockIn.error || !blockedStockIn.error.message.includes('maintenance')) throw new Error('Stock-in RPC was not blocked before product locks');
if (!blockedAdjustment.error || !blockedAdjustment.error.message.includes('maintenance')) throw new Error('Adjustment RPC was not blocked before product locks');
if (!blockedImport.error || !blockedImport.error.message.includes('maintenance')) throw new Error('Initial-stock import was not blocked before product locks');
if (!blockedProfile.error || !blockedProfile.error.message.includes('maintenance')) throw new Error('Profile update was not blocked during replacement');
if (replacement.error) throw replacement.error;
const result = replacement.data;
if (result.insertedSales !== expected.orders || result.insertedItems !== expected.itemLines || Number(result.insertedRevenue) !== expected.revenue || result.payloadHash !== expectedHash) {
  throw new Error('Replacement summary does not match deterministic payload');
}

const { data: movementRows, error: movementError } = await service.from('stock_movements').select('quantity_change,reference_type').eq('product_id', firstProduct.id);
if (movementError) throw movementError;
const ledger = movementRows.reduce((sum, movement) => sum + Number(movement.quantity_change), 0);
if (ledger !== 8 || !movementRows.some((movement) => movement.reference_type === 'history_replacement')) throw new Error('Ledger reconciliation failed');
const preview = await service.rpc('preview_sales_history_replacement');
if (preview.error
    || preview.data.sales !== expected.orders
    || preview.data.items !== expected.itemLines
    || preview.data.counters !== expected.days
    || preview.data.saleMovements !== 0
    || preview.data.payloadHash !== expectedHash
    || preview.data.counterMismatchCount !== 0
    || preview.data.ledgerMismatchCount !== baselinePreview.data.ledgerMismatchCount) throw new Error('Exact persisted post-apply verification failed');

const maintenanceOff = await service.rpc('set_sales_maintenance', { p_enabled: false });
if (maintenanceOff.error) throw maintenanceOff.error;
resetLocalDatabase();
cleanupComplete = true;
console.log(`Local replacement checks passed: rerunnable reset, malformed rollback, permissions, concurrent sales/catalogue maintenance gate, persisted hash, exact counters, and ledger reconciliation (${expected.orders} sales, ${expected.itemLines} items).`);
