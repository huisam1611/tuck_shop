#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const INITIAL_RECEIPT_DATE = '2026-08-10';
const HISTORICAL_YEAR = 2025;
const LEGACY_CODES = new Set(Array.from({ length: 10 }, (_, index) => `P${String(index + 1).padStart(3, '0')}`));

const CATALOGUE = [
  ['750 cool 礦泉水', 96, 208, 2.5],
  ['媽咪面', 40, 95, 2.5],
  ['旺仔QQ糖（藍莓）', 20, 20.8, 1.5],
  ['旺仔QQ糖（桃）', 20, 20.8, 1.5],
  ['旺仔QQ糖（葡萄）', 20, 20.8, 1.5],
  ['25g卡樂B（燒烤）', 30, 128, 4.5],
  ['55g卡樂B（番茄）', 24, 228, 10],
  ['25g卡樂B（熱浪）', 30, 128, 4.5],
  ['30g魷魚絲', 20, 109, 5.5],
  ['袋裝小老闆（原味）', 24, 38, 2],
  ['片裝小老闆（原味）', 60, 100, 2],
  ['片裝小老闆（辣味）', 12, 20, 2],
  ['特濃旺仔牛奶', 36, 74, 3],
  ['250維他奶', 24, 71, 3.5],
  ['250麥精', 24, 71, 3.5],
  ['250蘋果綠茶', 48, 105, 2.5],
  ['300清涼爽', 24, 85, 4],
  ['250地道菊花烏龍', 24, 54, 2.5],
  ['250地道解茶', 24, 54, 2.5],
  ['250地道茉莉綠茶', 24, 54, 2.5],
  ['250檸檬茶', 24, 58, 2.5],
  ['Qoo白提子汁', 48, 144, 3.5],
  ['罐裝荔枝玉露', 24, 104, 4.5],
  ['維達抽紙（綠茶）', 10, 51.8, 5.5],
  ['維達抽紙（爽身粉）', 10, 51.8, 5.5],
  ['啫喱（雜果）', 6, 44, 8],
  ['旺旺小小酥（香蔥雞）', 10, 20, 2.5],
  ['旺旺小小酥（原味）', 10, 20, 2.5],
  ['美味棒（忌廉湯）', 30, 34, 1.5],
  ['奶片', 30, 66, 2.5],
  ['可樂橡皮糖', 30, 28, 1.5],
  ['袋裝動物餅', 40, 87.5, 2.5],
  ['魚仔餅（紫菜）', 20, 80, 4.5],
  ['魚仔餅（燒雞）', 20, 80, 4.5],
  ['熊仔餅（朱古力）', 12, 75, 7],
  ['熊仔餅（士多啤梨）', 6, 37.5, 7],
  ['旺仔小饅頭', 60, 60, 1.5],
  ['黑白配', 12, 46, 4],
  ['旺旺仙貝', 70, 26, 1],
  ['旺旺燒餅', 24, 36, 2],
  ['百力滋（抹茶）', 10, 48, 5],
  ['百力滋（番茄）', 10, 134, 13.5],
  ['百力滋（朱古力曲奇）', 10, 58, 6],
  ['鵪鶉蛋(鹽焗)', 60, 99, 2],
  ['鵪鶉蛋(香辣)', 30, 49.5, 2],
  ['勁辣魷魚絲', 12, 18, 2],
  ['腸仔', 30, 52, 2],
  ['一口芝士條', 48, 34, 1],
  ['蒜香青豆', 20, 18, 1],
  ['脆皮花生', 10, 53, 5.5],
  ['牛角醬油', 5, 70, 14.5],
  ['牛角飯素', 10, 110, 11.5],
  ['甜筒蛋糕', 10, 18.5, 2],
  ['掛裝卡樂B（雜菜）', 8, 22, 3],
  ['辛拉麵', 5, 28, 6],
  ['炒麵王（香辣）', 12, 88, 8],
  ['戒指糖（雜味）', 24, 39, 2],
].map(([name, stock, totalCost, sellingPrice], index) => ({
  code: `HK-${String(index + 1).padStart(3, '0')}`,
  name,
  stock,
  costPrice: roundMoney(totalCost / stock),
  sellingPrice,
  minimumStock: Math.max(1, Math.ceil(stock * 0.2)),
  category: categoryFor(name),
}));

const ALIASES = new Map([
  ['媽咪面', '媽咪面'],
  ['媽咪麵', '媽咪面'],
  ['水', '750 cool 礦泉水'],
  ['礦泉水', '750 cool 礦泉水'],
  ['牛奶片', '奶片'],
  ['旺仔牛奶', '特濃旺仔牛奶'],
  ['旺旺牛奶', '特濃旺仔牛奶'],
  ['旺旺小饅頭', '旺仔小饅頭'],
  ['地道菊花烏龍', '250地道菊花烏龍'],
  ['菊花烏龍', '250地道菊花烏龍'],
  ['地道解茶', '250地道解茶'],
  ['解茶', '250地道解茶'],
  ['地道茉莉綠茶', '250地道茉莉綠茶'],
  ['茉莉綠茶', '250地道茉莉綠茶'],
  ['蘋果綠茶', '250蘋果綠茶'],
  ['清涼爽', '300清涼爽'],
  ['檸檬茶', '250檸檬茶'],
  ['維他奶', '250維他奶'],
  ['維他奶（原味）', '250維他奶'],
  ['麥精', '250麥精'],
  ['啫喱', '啫喱（雜果）'],
  ['啫喱（雜果）', '啫喱（雜果）'],
  ['荔枝玉露', '罐裝荔枝玉露'],
  ['可樂糖', '可樂橡皮糖'],
  ['動物餅', '袋裝動物餅'],
  ['旺旺燒餅', '旺旺燒餅'],
  ['燒餅', '旺旺燒餅'],
  ['美味棒', '美味棒（忌廉湯）'],
  ['芝士條', '一口芝士條'],
  ['青豆', '蒜香青豆'],
  ['牛角燒汁', '牛角醬油'],
  ['炒麵王', '炒麵王（香辣）'],
  ['袋裝小老闆（原味）', '袋裝小老闆（原味）'],
  ['片裝小老闆（原味）', '片裝小老闆（原味）'],
  ['片裝小老闆（辣味）', '片裝小老闆（辣味）'],
  ['魚仔餅（燒烤味）', '魚仔餅（燒雞）'],
  ['魚仔餅（燒烤）', '魚仔餅（燒雞）'],
  ['一口芝士條', '一口芝士條'],
  ['牛角醬油', '牛角醬油'],
]);

const args = process.argv.slice(2);
const apply = args.includes('--apply');
const inputIndex = args.indexOf('--input');
const inputPath = path.resolve(inputIndex >= 0 ? args[inputIndex + 1] : 'historical-sales-2025.tsv');

function loadLocalEnv() {
  const envPath = path.resolve('.env.local');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!match || match[1].startsWith('#') || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
  }
}

loadLocalEnv();

function roundMoney(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function normalizeName(value) {
  return String(value).normalize('NFKC').replace(/[\s()]/g, '');
}

function categoryFor(name) {
  if (/水|奶|茶|汁|可樂|清涼爽|荔枝玉露/.test(name)) return 'Drinks';
  if (/麵|面|炒麵|辛拉|公仔|沙爹/.test(name)) return 'Food';
  if (/紙|洗衣/.test(name)) return 'Household';
  return 'Snacks';
}

function stableUuid(seed) {
  const hash = crypto.createHash('sha256').update(seed).digest('hex');
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-5${hash.slice(13, 16)}-${((parseInt(hash.slice(16, 18), 16) & 0x3f) | 0x80).toString(16).padStart(2, '0')}${hash.slice(18, 20)}-${hash.slice(20, 32)}`;
}

function parseDate(value) {
  const match = String(value).match(/^(\d{1,2})月(\d{1,2})日$/);
  if (!match) throw new Error(`無法解析日期：${value}`);
  return `${HISTORICAL_YEAR}-${String(match[1]).padStart(2, '0')}-${String(match[2]).padStart(2, '0')}`;
}

function parseSalesFile(filePath) {
  const lines = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '').split(/\r?\n/);
  const rows = [];
  const corrections = [];
  let currentDate = null;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line.trim()) continue;
    const cells = line.split('\t');
    if (index === 0 && cells[0].trim().toLowerCase() === 'date') continue;
    if (cells[0].trim().toLowerCase().startsWith('total')) break;
    if (cells.length < 6) throw new Error(`第 ${index + 1} 行欄位不足`);

    if (cells[0].trim()) currentDate = parseDate(cells[0].trim());
    if (!currentDate) throw new Error(`第 ${index + 1} 行沒有日期`);

    const name = cells[1].trim();
    let quantity = Number(cells[2].trim());
    const unitPrice = Number(cells[3].trim());
    let total = Number(cells[4].trim());
    const sourcePayment = cells[5].trim().toLowerCase();
    if (!name || !Number.isFinite(quantity) || !Number.isFinite(unitPrice) || !Number.isFinite(total)) {
      throw new Error(`第 ${index + 1} 行有無效數字或物品名稱`);
    }

    if (currentDate === '2025-01-11' && name === '特濃旺仔牛奶' && quantity === 2.5 && unitPrice === 3) {
      corrections.push({ row: index + 1, item: name, from: 2.5, to: 2, totalFrom: total, totalTo: 6 });
      quantity = 2;
      total = 6;
    }
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new Error(`第 ${index + 1} 行數量不是正整數：${quantity}`);
    }
    if (Math.abs(roundMoney(quantity * unitPrice) - roundMoney(total)) > 0.01) {
      throw new Error(`第 ${index + 1} 行小計不一致：${name}`);
    }

    const paymentMethod = sourcePayment === 'cash'
      ? 'cash'
      : sourcePayment === 'other payment'
        ? 'e_payment'
        : null;
    if (!paymentMethod) throw new Error(`第 ${index + 1} 行付款方式不支援：${sourcePayment}`);
    rows.push({ date: currentDate, name, quantity, unitPrice: roundMoney(unitPrice), total: roundMoney(total), paymentMethod, sourceRow: index + 1 });
  }
  return { rows, corrections };
}

const catalogueByName = new Map(CATALOGUE.map((product) => [normalizeName(product.name), product]));
const aliasByName = new Map(Array.from(ALIASES.entries()).map(([from, to]) => [normalizeName(from), normalizeName(to)]));

function historicalName(name) {
  return `歷史｜${name}`;
}

function resolveProduct(name, unitPrice) {
  const normalized = normalizeName(name);
  if (normalized === normalizeName('卡樂B') || normalized === normalizeName('薯片')) {
    if (unitPrice >= 9.5) return catalogueByName.get(normalizeName('55g卡樂B（番茄）'));
    if (unitPrice >= 4.5) return catalogueByName.get(normalizeName('25g卡樂B（燒烤）'));
  }
  if (normalized === normalizeName('番茄薯片')) return catalogueByName.get(normalizeName('55g卡樂B（番茄）'));
  if (normalized === normalizeName('百力滋') || normalized === normalizeName('百力滋（曲奇）') || normalized === normalizeName('曲奇百力滋')) {
    if (unitPrice >= 12) return catalogueByName.get(normalizeName('百力滋（番茄）'));
    if (unitPrice >= 5.8) return catalogueByName.get(normalizeName('百力滋（朱古力曲奇）'));
    return catalogueByName.get(normalizeName('百力滋（抹茶）'));
  }
  if (normalized === normalizeName('魷魚絲') && unitPrice >= 5) return catalogueByName.get(normalizeName('30g魷魚絲'));

  const direct = catalogueByName.get(normalized);
  if (direct) return direct;
  const alias = aliasByName.get(normalized);
  if (alias) return catalogueByName.get(alias);
  return null;
}

function buildPlan(rows) {
  const historicalProducts = new Map();
  const groups = new Map();
  const mappingCounts = new Map();

  for (const row of rows) {
    const catalogueProduct = resolveProduct(row.name, row.unitPrice);
    const key = catalogueProduct ? `catalog:${catalogueProduct.code}` : `history:${normalizeName(row.name)}`;
    const productName = catalogueProduct?.name ?? historicalName(row.name);
    if (!catalogueProduct && !historicalProducts.has(key)) {
      historicalProducts.set(key, {
        code: `HIST-${crypto.createHash('sha1').update(key).digest('hex').slice(0, 10).toUpperCase()}`,
        name: productName,
        stock: 0,
        costPrice: row.unitPrice,
        sellingPrice: row.unitPrice,
        minimumStock: 0,
        category: 'Historical',
      });
    }
    const mappingLabel = catalogueProduct ? catalogueProduct.name : productName;
    mappingCounts.set(`${row.name} → ${mappingLabel}`, (mappingCounts.get(`${row.name} → ${mappingLabel}`) ?? 0) + row.quantity);

    const groupKey = `${row.date}|${row.paymentMethod}`;
    if (!groups.has(groupKey)) groups.set(groupKey, { date: row.date, paymentMethod: row.paymentMethod, items: new Map(), total: 0 });
    const group = groups.get(groupKey);
    const itemKey = `${key}|${row.unitPrice.toFixed(2)}`;
    const item = group.items.get(itemKey) ?? { key, quantity: 0, unitPrice: row.unitPrice, subtotal: 0 };
    item.quantity += row.quantity;
    item.subtotal = roundMoney(item.subtotal + row.total);
    group.items.set(itemKey, item);
    group.total = roundMoney(group.total + row.total);
  }

  return {
    groups: Array.from(groups.values()).sort((left, right) => `${left.date}|${left.paymentMethod}`.localeCompare(`${right.date}|${right.paymentMethod}`)),
    historicalProducts: Array.from(historicalProducts.values()),
    mappingCounts,
  };
}

function printDryRun(parsed, plan) {
  const sourceTotal = roundMoney(parsed.rows.reduce((sum, row) => sum + row.total, 0));
  const mappedQuantity = Array.from(plan.mappingCounts.values()).reduce((sum, value) => sum + value, 0);
  console.log(JSON.stringify({
    mode: 'dry-run',
    input: inputPath,
    year: HISTORICAL_YEAR,
    rows: parsed.rows.length,
    correctedRows: parsed.corrections,
    sourceTotal,
    activeCatalogueProducts: CATALOGUE.length,
    historicalOnlyProducts: plan.historicalProducts.map(({ code, name, sellingPrice }) => ({ code, name, placeholderSellingPrice: sellingPrice })),
    dailyPaymentGroups: plan.groups.map((group) => ({ date: group.date, paymentMethod: group.paymentMethod, itemLines: group.items.size, total: group.total })),
    mappedQuantity,
    mappings: Object.fromEntries(plan.mappingCounts),
    next: '確認以上預覽後，設定 SUPABASE_SECRET_KEY（或 legacy SUPABASE_SERVICE_ROLE_KEY），再以 --apply 寫入。',
  }, null, 2));
}

async function importToSupabase(plan) {
  // ponytail: deterministic IDs make this one-time REST import retry-safe; use one RPC if all-or-nothing becomes required.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error('--apply 需要 NEXT_PUBLIC_SUPABASE_URL 與 SUPABASE_SECRET_KEY（或 legacy SUPABASE_SERVICE_ROLE_KEY；只在本機環境設定，不要貼到聊天）。');
  }
  const restBase = `${url.replace(/\/$/, '')}/rest/v1/`;
  const request = async (resource, method = 'GET', body = undefined, prefer = 'return=representation') => {
    const response = await fetch(`${restBase}${resource}`, {
      method,
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
        Prefer: prefer,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await response.text();
    if (!response.ok) throw new Error(`${method} ${resource}: ${text || response.statusText}`);
    return text ? JSON.parse(text) : [];
  };
  const select = (resource) => request(resource);
  const insert = (table, row) => request(table, 'POST', row, 'return=minimal');
  const update = (table, filter, row) => request(`${table}?${filter}`, 'PATCH', row, 'return=minimal');
  const existingProducts = await select('products?select=id,product_code,name,status,current_stock,cost_price,selling_price');
  const byCode = new Map(existingProducts.map((product) => [product.product_code.toLowerCase(), product]));
  const byPlanKey = new Map();
  const result = { productsCreated: 0, productsUpdated: 0, stockSeeded: 0, historicalProductsCreated: 0, salesCreated: 0, saleItemsCreated: 0, legacyDeactivated: 0 };
  let adminId = null;

  const findAdmin = async () => {
    if (adminId) return adminId;
    const admins = await select('profiles?select=id&role=eq.admin&is_active=eq.true&limit=1');
    adminId = admins?.[0]?.id ?? null;
    if (!adminId) throw new Error('找不到 active Admin profile。');
    return adminId;
  };

  const upsertProduct = async (product, { seedStock = false, historical = false } = {}) => {
    const existing = byCode.get(product.code.toLowerCase());
    if (!existing) {
      const productId = stableUuid(`product:${product.code}`);
      await insert('products', {
        id: productId,
        product_code: product.code,
        name: product.name,
        category: product.category,
        cost_price: product.costPrice,
        selling_price: product.sellingPrice,
        current_stock: 0,
        minimum_stock: product.minimumStock,
        status: historical ? 'inactive' : 'active',
      });
      const created = { id: productId, ...product, current_stock: 0, status: historical ? 'inactive' : 'active' };
      byCode.set(product.code.toLowerCase(), created);
      result.productsCreated += 1;
      if (historical) result.historicalProductsCreated += 1;
      if (seedStock) await seedInitialStock(created);
      return created;
    }

    await update('products', `id=eq.${encodeURIComponent(existing.id)}`, {
      name: product.name,
      category: product.category,
      cost_price: product.costPrice,
      selling_price: product.sellingPrice,
      minimum_stock: product.minimumStock,
      status: historical ? 'inactive' : 'active',
    });
    const updated = { ...existing, ...product, id: existing.id, status: historical ? 'inactive' : 'active' };
    byCode.set(product.code.toLowerCase(), updated);
    result.productsUpdated += 1;
    if (seedStock) await seedInitialStock(updated);
    return updated;
  };

  const seedInitialStock = async (product) => {
    if (product.stock <= 0 || Number(product.current_stock) > 0) return;
    const receiptId = stableUuid(`initial-receipt:${product.code}:${INITIAL_RECEIPT_DATE}`);
    const movementId = stableUuid(`initial-movement:${product.code}:${INITIAL_RECEIPT_DATE}`);
    const receiptRows = await select(`stock_receipts?select=id&id=eq.${encodeURIComponent(receiptId)}&limit=1`);
    if (!receiptRows.length) {
      const createdBy = await findAdmin();
      await insert('stock_receipts', {
        id: receiptId,
        receipt_date: INITIAL_RECEIPT_DATE,
        product_id: product.id,
        quantity: product.stock,
        unit_cost: product.costPrice,
        supplier_name: 'Initial inventory import',
        created_by: createdBy,
      });
      await insert('stock_movements', {
        id: movementId,
        product_id: product.id,
        movement_type: 'stock_in',
        quantity_change: product.stock,
        stock_before: 0,
        stock_after: product.stock,
        reference_type: 'stock_receipt',
        reference_id: receiptId,
        reason: 'Initial inventory import',
        created_by: createdBy,
      });
      await update('products', `id=eq.${encodeURIComponent(product.id)}`, { current_stock: product.stock });
      result.stockSeeded += 1;
    }
  };

  for (const product of CATALOGUE) {
    const created = await upsertProduct(product, { seedStock: true });
    byPlanKey.set(`catalog:${product.code}`, created);
  }
  for (const product of plan.historicalProducts) {
    const created = await upsertProduct(product, { historical: true });
    byPlanKey.set(`history:${normalizeName(product.name.slice(3))}`, created);
  }

  for (const legacyCode of LEGACY_CODES) {
    const legacy = byCode.get(legacyCode.toLowerCase());
    if (!legacy || legacy.status !== 'active') continue;
    await update('products', `id=eq.${encodeURIComponent(legacy.id)}`, { status: 'inactive' });
    result.legacyDeactivated += 1;
  }

  const staffId = await findAdmin();

  const dates = [...new Set(plan.groups.map((group) => group.date))];
  const existingSales = dates.length
    ? await select(`sales?select=id,sale_date,daily_order_number,client_request_id&sale_date=in.(${dates.join(',')})`)
    : [];
  const usedOrderNumbers = new Map();
  for (const sale of existingSales) {
    if (!usedOrderNumbers.has(sale.sale_date)) usedOrderNumbers.set(sale.sale_date, new Set());
    usedOrderNumbers.get(sale.sale_date).add(Number(sale.daily_order_number));
  }

  for (const group of plan.groups) {
    const importKey = `${group.date}|${group.paymentMethod}`;
    const saleId = stableUuid(`historical-sale:${importKey}`);
    const clientRequestId = stableUuid(`historical-request:${importKey}`);
    const existingSalesForKey = await select(`sales?select=id,grand_total&client_request_id=eq.${encodeURIComponent(clientRequestId)}&limit=1`);
    const existingSale = existingSalesForKey[0];
    let actualSaleId = existingSale?.id;
    if (!actualSaleId) {
      if (!usedOrderNumbers.has(group.date)) usedOrderNumbers.set(group.date, new Set());
      const used = usedOrderNumbers.get(group.date);
      let orderNumber = 1;
      while (used.has(orderNumber)) orderNumber += 1;
      used.add(orderNumber);
      await insert('sales', {
        id: saleId,
        client_request_id: clientRequestId,
        sale_date: group.date,
        daily_order_number: orderNumber,
        payment_method: group.paymentMethod,
        staff_id: staffId,
        grand_total: group.total,
        status: 'completed',
      });
      actualSaleId = saleId;
      result.salesCreated += 1;
    } else if (roundMoney(Number(existingSale.grand_total)) !== group.total) {
      throw new Error(`歷史銷售 ${importKey} 已存在但總額不一致`);
    }

    for (const item of group.items.values()) {
      const product = byPlanKey.get(item.key);
      if (!product) throw new Error(`找不到匯入產品：${item.key}`);
      const unitCost = product.category === 'Historical' ? item.unitPrice : Number(product.costPrice);
      const itemId = stableUuid(`historical-item:${importKey}:${item.key}:${item.unitPrice.toFixed(2)}`);
      const existingItems = await select(`sale_items?select=id&id=eq.${encodeURIComponent(itemId)}&limit=1`);
      if (existingItems.length) continue;
      await insert('sale_items', {
        id: itemId,
        sale_id: actualSaleId,
        product_id: product.id,
        product_code: product.code,
        product_name: product.name,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        unit_cost: roundMoney(unitCost),
        subtotal: item.subtotal,
        cost_total: roundMoney(item.quantity * unitCost),
        profit: roundMoney(item.subtotal - (item.quantity * unitCost)),
      });
      result.saleItemsCreated += 1;
    }
  }
  return result;
}

const parsed = parseSalesFile(inputPath);
const plan = buildPlan(parsed.rows);
if (!apply) {
  printDryRun(parsed, plan);
} else {
  const result = await importToSupabase(plan);
  console.log(JSON.stringify({ mode: 'applied', input: inputPath, ...result }, null, 2));
}
