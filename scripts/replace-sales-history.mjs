#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

const DEFAULT_START = '2026-06-01';
const DEFAULT_END = '2026-08-12';
const DEFAULT_SEED = 'tuck-shop-2026-sales-v1';
const CONFIRMATION = 'DELETE-ALL-SALES';
const MAINTENANCE_CONFIRMATIONS = {
  on: 'ENABLE-SALES-MAINTENANCE',
  off: 'DISABLE-SALES-MAINTENANCE',
};

function stableUuid(value) {
  const hash = crypto.createHash('sha256').update(value).digest('hex');
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-5${hash.slice(13, 16)}-${((parseInt(hash.slice(16, 18), 16) & 0x3f) | 0x80).toString(16).padStart(2, '0')}${hash.slice(18, 20)}-${hash.slice(20, 32)}`;
}

function seedNumber(value) {
  let hash = 2166136261;
  for (const character of value) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
  return hash >>> 0;
}

function randomFor(seed) {
  let state = seedNumber(seed);
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function assertDate(value, label) {
  const parsed = new Date(`${value}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)
      || Number.isNaN(parsed.getTime())
      || parsed.toISOString().slice(0, 10) !== value) {
    throw new Error(`${label} must be YYYY-MM-DD`);
  }
  return value;
}

function parseArgs(args) {
  const valueAfter = (flag, fallback) => {
    const index = args.indexOf(flag);
    if (index < 0) return fallback;
    if (!args[index + 1] || args[index + 1].startsWith('--')) throw new Error(`${flag} requires a value`);
    return args[index + 1];
  };
  const start = assertDate(valueAfter('--start', DEFAULT_START), '--start');
  const end = assertDate(valueAfter('--end', DEFAULT_END), '--end');
  if (start > end) throw new Error('--start must not be after --end');
  if (start !== DEFAULT_START || end !== DEFAULT_END) throw new Error(`Date range must be ${DEFAULT_START} through ${DEFAULT_END}`);
  const requestedModes = [
    ['apply', '--apply'],
    ['status', '--status'],
    ['maintenance-on', '--maintenance-on'],
    ['maintenance-off', '--maintenance-off'],
  ].filter(([, flag]) => args.includes(flag));
  if (requestedModes.length > 1) throw new Error('Choose only one of --apply, --status, --maintenance-on, or --maintenance-off');
  const mode = requestedModes[0]?.[0] ?? 'dry-run';
  const confirmation = valueAfter('--confirm', '');
  if (['apply', 'maintenance-on', 'maintenance-off'].includes(mode) && !confirmation) {
    throw new Error(`${requestedModes[0][1]} requires a target-specific --confirm value shown by --status`);
  }
  return {
    start,
    end,
    seed: valueAfter('--seed', DEFAULT_SEED),
    staffId: valueAfter('--staff-id', ''),
    backupManifest: valueAfter('--backup-manifest', ''),
    mode,
    apply: mode === 'apply',
    confirmation,
  };
}

function targetFromUrl(url) {
  const hostname = new URL(url).hostname;
  if (hostname === '127.0.0.1' || hostname === 'localhost') return 'local';
  if (hostname.endsWith('.supabase.co')) return hostname.slice(0, -'.supabase.co'.length);
  throw new Error(`Unsupported Supabase target hostname: ${hostname}`);
}

function confirmationForTarget(target) {
  return `${CONFIRMATION}:${target}`;
}

function maintenanceConfirmationForTarget(target, enabled) {
  return `${MAINTENANCE_CONFIRMATIONS[enabled ? 'on' : 'off']}:${target}`;
}

function readCopyTable(sql, table) {
  const escapedTable = table.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const header = new RegExp(`COPY "public"\\."${escapedTable}" \\(([\\s\\S]*?)\\) FROM stdin;\\r?\\n`, 'm').exec(sql);
  if (!header) throw new Error(`Backup data.sql is missing public.${table}`);
  const dataStart = header.index + header[0].length;
  const terminator = /^\\\.\r?$/m.exec(sql.slice(dataStart));
  if (!terminator) throw new Error(`Backup data.sql has an unterminated public.${table} COPY block`);
  const body = sql.slice(dataStart, dataStart + terminator.index).replace(/\r?\n$/, '');
  const columns = [...header[1].matchAll(/"([^"]+)"/g)].map((entry) => entry[1]);
  const rows = body ? body.split(/\r?\n/).map((line) => line.split('\t')) : [];
  return { columns, rows };
}

function validateBackupDataCounts(sql, expectedCounts) {
  const sales = readCopyTable(sql, 'sales');
  const items = readCopyTable(sql, 'sale_items');
  const movements = readCopyTable(sql, 'stock_movements');
  const counters = readCopyTable(sql, 'daily_order_counters');
  const saleIdIndex = sales.columns.indexOf('id');
  const movementReferenceTypeIndex = movements.columns.indexOf('reference_type');
  const movementReferenceIdIndex = movements.columns.indexOf('reference_id');
  if ([saleIdIndex, movementReferenceTypeIndex, movementReferenceIdIndex].includes(-1)) {
    throw new Error('Backup data.sql has unexpected sales or stock_movements columns');
  }
  const saleIds = new Set(sales.rows.map((row) => row[saleIdIndex]));
  const actual = {
    sales: sales.rows.length,
    items: items.rows.length,
    saleMovements: movements.rows.filter((row) => row[movementReferenceTypeIndex] === 'sale' && saleIds.has(row[movementReferenceIdIndex])).length,
    counters: counters.rows.length,
  };
  if (Object.keys(actual).some((key) => actual[key] !== Number(expectedCounts[key]))) {
    throw new Error(`Backup data.sql row counts do not match the frozen database: ${JSON.stringify(actual)}`);
  }

  const columnValue = (table, row, column) => {
    const index = table.columns.indexOf(column);
    if (index < 0) throw new Error(`Backup data.sql is missing ${column}`);
    return row[index] === '\\N' ? '' : row[index];
  };
  const canonicalHash = (lines) => crypto.createHash('sha256').update(lines.join('\n')).digest('hex');
  const itemsBySale = Map.groupBy(items.rows, (row) => columnValue(items, row, 'sale_id'));
  const salesPayloadHash = canonicalHash([...sales.rows]
    .sort((left, right) => columnValue(sales, left, 'sale_date').localeCompare(columnValue(sales, right, 'sale_date'))
      || Number(columnValue(sales, left, 'daily_order_number')) - Number(columnValue(sales, right, 'daily_order_number')))
    .map((row) => {
      const itemText = [...(itemsBySale.get(columnValue(sales, row, 'id')) ?? [])]
        .sort((left, right) => columnValue(items, left, 'product_id').localeCompare(columnValue(items, right, 'product_id'))
          || columnValue(items, left, 'id').localeCompare(columnValue(items, right, 'id')))
        .map((item) => `${columnValue(items, item, 'product_id')}:${columnValue(items, item, 'quantity')}`)
        .join(',');
      return [
        columnValue(sales, row, 'sale_date'),
        columnValue(sales, row, 'daily_order_number'),
        columnValue(sales, row, 'client_request_id'),
        columnValue(sales, row, 'payment_method'),
        columnValue(sales, row, 'staff_id'),
        itemText,
      ].join('|');
    }));
  const movementFields = ['id', 'product_id', 'movement_type', 'quantity_change', 'stock_before', 'stock_after', 'reference_type', 'reference_id', 'created_by'];
  const saleMovementHash = canonicalHash(movements.rows
    .filter((row) => row[movementReferenceTypeIndex] === 'sale' && saleIds.has(row[movementReferenceIdIndex]))
    .sort((left, right) => columnValue(movements, left, 'id').localeCompare(columnValue(movements, right, 'id')))
    .map((row) => movementFields.map((field) => columnValue(movements, row, field)).join('|')));
  const counterHash = canonicalHash([...counters.rows]
    .sort((left, right) => columnValue(counters, left, 'sale_date').localeCompare(columnValue(counters, right, 'sale_date')))
    .map((row) => `${columnValue(counters, row, 'sale_date')}|${columnValue(counters, row, 'next_order_number')}`));
  const hashes = { payloadHash: salesPayloadHash, saleMovementHash, counterHash };
  for (const [key, value] of Object.entries(hashes)) {
    if (value !== expectedCounts[key]) {
      throw new Error(`Backup data.sql ${key} ${value} does not match frozen database ${expectedCounts[key]}`);
    }
  }
}

function validateBackupManifest(filePath, target, expectedCounts, maintenanceUpdatedAt, now = Date.now()) {
  if (target === 'local') return;
  if (!filePath) throw new Error('Production apply requires --backup-manifest created after sales maintenance was enabled');
  const manifestPath = path.resolve(filePath);
  const contents = fs.readFileSync(manifestPath, 'utf8');
  const created = contents.match(/^Created:\s*(.+)$/m)?.[1];
  const projectRef = contents.match(/^Project ref:\s*(\S+)$/m)?.[1];
  const frozenAt = contents.match(/^Maintenance updated at:\s*(.+)$/m)?.[1];
  if (!created || projectRef !== target || !frozenAt) {
    throw new Error('Backup manifest must include matching Created, Project ref, and Maintenance updated at values');
  }
  const createdAt = Date.parse(created);
  const maintenanceAt = Date.parse(maintenanceUpdatedAt);
  const manifestMaintenanceAt = Date.parse(frozenAt);
  const age = now - createdAt;
  if (!Number.isFinite(age) || age < 0 || age > 24 * 60 * 60 * 1000) throw new Error('Production backup must be less than 24 hours old');
  if (!Number.isFinite(maintenanceAt)
      || manifestMaintenanceAt !== maintenanceAt
      || createdAt < maintenanceAt) {
    throw new Error('Production backup must be created after the current maintenance window started');
  }

  const countLabels = {
    sales: 'Sales count',
    items: 'Sale items count',
    saleMovements: 'Sale movements count',
    counters: 'Daily counters count',
  };
  for (const [key, label] of Object.entries(countLabels)) {
    const value = contents.match(new RegExp(`^${label}:\\s*(\\d+)$`, 'm'))?.[1];
    if (value === undefined || Number(value) !== Number(expectedCounts[key])) {
      throw new Error(`Backup manifest ${label} does not match the frozen database`);
    }
  }

  const hashLabels = {
    payloadHash: 'Sales payload hash',
    saleMovementHash: 'Sale movements hash',
    counterHash: 'Daily counters hash',
  };
  for (const [key, label] of Object.entries(hashLabels)) {
    const value = contents.match(new RegExp(`^${label}:\\s*([a-f0-9]{64})$`, 'im'))?.[1]?.toLowerCase();
    if (!value || value !== expectedCounts[key]) throw new Error(`Backup manifest ${label} does not match the frozen database`);
  }

  const artifacts = new Map([...contents.matchAll(/^SHA256\s+([a-f0-9]{64})\s+(.+)$/gim)]
    .map((match) => [path.basename(match[2].trim()).toLowerCase(), { expectedHash: match[1].toLowerCase(), relativePath: match[2].trim() }]));
  let dataSql;
  for (const required of ['roles.sql', 'schema.sql', 'data.sql']) {
    const artifact = artifacts.get(required);
    if (!artifact) throw new Error(`Backup manifest is missing SHA256 evidence for ${required}`);
    const artifactPath = path.resolve(path.dirname(manifestPath), artifact.relativePath);
    const bytes = fs.readFileSync(artifactPath);
    if (bytes.length === 0) throw new Error(`Backup artifact ${required} is empty`);
    const actualHash = crypto.createHash('sha256').update(bytes).digest('hex');
    if (actualHash !== artifact.expectedHash) throw new Error(`Backup artifact ${required} failed SHA256 verification`);
    if (required === 'data.sql') dataSql = bytes.toString('utf8');
  }
  validateBackupDataCounts(dataSql, expectedCounts);
}

function datesBetween(start, end) {
  const dates = [];
  for (let current = new Date(`${start}T00:00:00Z`); current <= new Date(`${end}T00:00:00Z`); current.setUTCDate(current.getUTCDate() + 1)) {
    dates.push(current.toISOString().slice(0, 10));
  }
  return dates;
}

function validateProducts(products) {
  const expected = new Set(Array.from({ length: 57 }, (_, index) => `HK-${String(index + 1).padStart(3, '0')}`));
  const usable = products.filter((product) => product.status === 'active' && expected.has(product.product_code));
  if (usable.length !== 57 || new Set(usable.map((product) => product.product_code)).size !== 57) {
    throw new Error('Expected exactly 57 active products HK-001 through HK-057');
  }
  return [...usable].sort((left, right) => left.product_code.localeCompare(right.product_code));
}

function generateSales({ products, staffId, start = DEFAULT_START, end = DEFAULT_END, seed = DEFAULT_SEED }) {
  const catalogue = validateProducts(products);
  if (!staffId) throw new Error('A staff ID is required');
  const random = randomFor(`${seed}:${start}:${end}`);
  const sales = [];
  for (const date of datesBetween(start, end)) {
    const day = new Date(`${date}T00:00:00Z`).getUTCDay();
    const weekend = day === 0 || day === 6;
    const orderCount = weekend ? 1 + Math.floor(random() * 2) : 4 + Math.floor(random() * 3);
    for (let order = 1; order <= orderCount; order += 1) {
      const itemCount = 1 + Math.floor(random() * 3);
      const selected = new Set();
      while (selected.size < itemCount) selected.add(Math.floor(random() * catalogue.length));
      sales.push({
        client_request_id: stableUuid(`synthetic-sale:${seed}:${date}:${order}`),
        sale_date: date,
        daily_order_number: order,
        payment_method: random() < 0.6 ? 'cash' : 'e_payment',
        staff_id: staffId,
        items: [...selected].map((index) => ({ product_id: catalogue[index].id, quantity: 1 + Math.floor(random() * 3) })),
      });
    }
  }
  return sales;
}

function summarizeGenerated(sales, products) {
  const byId = new Map(products.map((product) => [product.id, product]));
  let itemLines = 0;
  let units = 0;
  let revenueCents = 0;
  const payments = { cash: 0, e_payment: 0 };
  const productIds = new Set();
  for (const sale of sales) {
    payments[sale.payment_method] += 1;
    for (const item of sale.items) {
      const product = byId.get(item.product_id);
      if (!product) throw new Error(`Unknown product ${item.product_id}`);
      itemLines += 1;
      units += item.quantity;
      productIds.add(item.product_id);
      revenueCents += Math.round(Number(product.selling_price) * 100) * item.quantity;
    }
  }
  return {
    startDate: sales[0]?.sale_date,
    endDate: sales.at(-1)?.sale_date,
    days: new Set(sales.map((sale) => sale.sale_date)).size,
    orders: sales.length,
    itemLines,
    units,
    revenue: revenueCents / 100,
    payments,
    productsUsed: productIds.size,
  };
}

function payloadHash(sales) {
  const canonical = [...sales]
    .sort((left, right) => left.sale_date.localeCompare(right.sale_date) || left.daily_order_number - right.daily_order_number)
    .map((sale) => {
      const items = [...sale.items].sort((left, right) => left.product_id.localeCompare(right.product_id))
        .map((item) => `${item.product_id}:${item.quantity}`).join(',');
      return [sale.sale_date, sale.daily_order_number, sale.client_request_id, sale.payment_method, sale.staff_id, items].join('|');
    }).join('\n');
  return crypto.createHash('sha256').update(canonical).digest('hex');
}

function loadLocalEnv() {
  const envPath = path.resolve('.env.local');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
  }
}

function createRestClient(url, key) {
  const base = `${url.replace(/\/$/, '')}/rest/v1/`;
  return async (resource, { method = 'GET', body } = {}) => {
    const response = await fetch(`${base}${resource}`, {
      method,
      headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await response.text();
    if (!response.ok) throw new Error(`${method} ${resource}: ${text || response.statusText}`);
    return text ? JSON.parse(text) : [];
  };
}

function selectStaff(profiles, requestedId) {
  if (requestedId) {
    const profile = profiles.find((entry) => entry.id === requestedId && entry.is_active);
    if (!profile) throw new Error('Requested staff profile is not active');
    return profile.id;
  }
  const admins = profiles.filter((entry) => entry.role === 'admin' && entry.is_active);
  if (admins.length !== 1) throw new Error('Use --staff-id unless exactly one active Admin exists');
  return admins[0].id;
}

async function loadContext(request, staffId) {
  const [products, profiles, deleting] = await Promise.all([
    request('products?select=id,product_code,name,selling_price,cost_price,current_stock,status&order=product_code'),
    request('profiles?select=id,role,is_active'),
    request('rpc/preview_sales_history_replacement', { method: 'POST', body: {} }),
  ]);
  return {
    products: validateProducts(products),
    staffId: selectStaff(profiles, staffId),
    deleting,
  };
}

async function loadMaintenanceStatus(request) {
  return request('rpc/preview_sales_history_replacement', { method: 'POST', body: {} });
}

async function setMaintenance(request, target, enabled) {
  let rpcError;
  try {
    await request('rpc/set_sales_maintenance', { method: 'POST', body: { p_enabled: enabled } });
  } catch (error) {
    rpcError = error;
  }
  let status;
  try {
    status = await loadMaintenanceStatus(request);
  } catch (statusError) {
    throw new Error(`Maintenance request result is unknown and status could not be read. Stop sales manually before continuing. RPC: ${rpcError ?? 'no response'}; status: ${statusError}`);
  }
  if (status.maintenanceEnabled !== enabled) {
    throw new Error(`Maintenance is ${status.maintenanceEnabled ? 'enabled' : 'disabled'}, not ${enabled ? 'enabled' : 'disabled'}. Re-run --status before continuing.${rpcError ? ` RPC error: ${rpcError}` : ''}`);
  }
  return {
    ...status,
    recovery: enabled
      ? `pnpm replace:sales-history --maintenance-off --confirm ${maintenanceConfirmationForTarget(target, false)}`
      : null,
  };
}

async function verifyApplied(request, expected, expectedSummary, expectedHash, ledgerMismatchBefore, result) {
  const preview = await loadMaintenanceStatus(request);
  if (result.insertedSales !== expected.length
      || result.insertedItems !== expectedSummary.itemLines
      || result.payloadHash !== expectedHash
      || result.ledgerConsistent !== true
      || preview.sales !== expected.length
      || preview.items !== expectedSummary.itemLines
      || preview.counters !== expectedSummary.days
      || preview.saleMovements !== 0
      || preview.payloadHash !== expectedHash
      || preview.counterMismatchCount !== 0
      || preview.ledgerMismatchCount !== ledgerMismatchBefore
      || preview.maintenanceEnabled !== true) throw new Error('Persisted sales verification does not match the generated payload or frozen baseline');
  return {
    sales: preview.sales,
    items: preview.items,
    counters: preview.counters,
    saleMovements: preview.saleMovements,
    counterMismatchCount: preview.counterMismatchCount,
    payloadHash: preview.payloadHash,
    ledgerMismatchCount: preview.ledgerMismatchCount,
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  loadLocalEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_TEST_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_TEST_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY (or local SUPABASE_TEST_* equivalents)');
  const target = targetFromUrl(url);
  const requiredConfirmation = confirmationForTarget(target);
  const request = createRestClient(url, key);

  if (options.mode === 'status') {
    const status = await loadMaintenanceStatus(request);
    console.log(JSON.stringify({
      mode: 'status',
      target,
      status,
      commands: {
        enable: `pnpm replace:sales-history --maintenance-on --confirm ${maintenanceConfirmationForTarget(target, true)}`,
        disable: `pnpm replace:sales-history --maintenance-off --confirm ${maintenanceConfirmationForTarget(target, false)}`,
      },
    }, null, 2));
    return;
  }

  if (options.mode === 'maintenance-on' || options.mode === 'maintenance-off') {
    const enabled = options.mode === 'maintenance-on';
    const expectedConfirmation = maintenanceConfirmationForTarget(target, enabled);
    if (options.confirmation !== expectedConfirmation) throw new Error(`${options.mode} requires --confirm ${expectedConfirmation}`);
    const status = await setMaintenance(request, target, enabled);
    console.log(JSON.stringify({ mode: options.mode, target, status }, null, 2));
    return;
  }

  if (options.apply && options.confirmation !== requiredConfirmation) throw new Error(`--apply requires --confirm ${requiredConfirmation}`);
  const context = await loadContext(request, options.staffId);
  const sales = generateSales({ products: context.products, staffId: context.staffId, start: options.start, end: options.end, seed: options.seed });
  const summary = summarizeGenerated(sales, context.products);
  const expectedHash = payloadHash(sales);
  if (!options.apply) {
    console.log(JSON.stringify({
      mode: 'dry-run',
      target,
      seed: options.seed,
      deleting: context.deleting,
      creating: summary,
      payloadHash: expectedHash,
      next: [
        `pnpm replace:sales-history --maintenance-on --confirm ${maintenanceConfirmationForTarget(target, true)}`,
        ...(target === 'local' ? [] : ['Create roles.sql, schema.sql, data.sql, and manifest.txt after maintenance is enabled']),
        `pnpm replace:sales-history --apply --confirm ${requiredConfirmation}${target === 'local' ? '' : ' --backup-manifest <path>'}`,
      ],
    }, null, 2));
    return;
  }

  if (!context.deleting.maintenanceEnabled) {
    throw new Error(`Sales maintenance must already be enabled. Run: pnpm replace:sales-history --maintenance-on --confirm ${maintenanceConfirmationForTarget(target, true)}`);
  }
  validateBackupManifest(options.backupManifest, target, context.deleting, context.deleting.maintenanceUpdatedAt);
  try {
    const result = await request('rpc/replace_sales_history', { method: 'POST', body: { p_confirmation: CONFIRMATION, p_start_date: options.start, p_end_date: options.end, p_sales: sales } });
    const verified = await verifyApplied(request, sales, summary, expectedHash, context.deleting.ledgerMismatchCount, result);
    console.log(JSON.stringify({
      mode: 'applied',
      target,
      seed: options.seed,
      result,
      verified,
      creating: summary,
      next: `pnpm replace:sales-history --maintenance-off --confirm ${maintenanceConfirmationForTarget(target, false)}`,
    }, null, 2));
  } catch (error) {
    let statusMessage = 'maintenance status could not be read; keep POS stopped';
    try {
      const status = await loadMaintenanceStatus(request);
      statusMessage = `maintenance is currently ${status.maintenanceEnabled ? 'enabled' : 'disabled'}`;
    } catch {}
    throw new Error(`Replacement failed; ${statusMessage}. Recovery: pnpm replace:sales-history --status. ${error instanceof Error ? error.message : error}`);
  }
}

const isMain = process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
if (isMain) await main();

export { CONFIRMATION, confirmationForTarget, datesBetween, generateSales, maintenanceConfirmationForTarget, parseArgs, payloadHash, selectStaff, stableUuid, summarizeGenerated, targetFromUrl, validateBackupManifest, validateProducts };
