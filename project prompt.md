# Tuck Shop Sales & Inventory Management System

## 1. Product Goal

Build a production-ready web application for one school tuck shop to:

- record completed sales without processing payments;
- maintain accurate inventory;
- monitor revenue, cost, and profit;
- generate operational reports; and
- export professional Excel workbooks.

The application must be simple enough for non-technical staff, responsive on desktop, laptop, and iPhone, and safe for multiple staff members to use at the same time.

## 2. Scope and Assumptions

### Version 1 (Required)

- Email/password authentication
- Admin and Staff role-based access
- Product management
- Sales recording and order voiding
- Stock-in and stock adjustment
- Inventory movement history
- Dashboard summary
- Filterable reports
- Multi-worksheet `.xlsx` export
- Responsive UI, validation, loading states, and error handling
- Supabase Row Level Security (RLS)

### Later Versions (Not Required for V1)

- Dark mode
- Automated email or push notifications
- Barcode scanning
- Partial returns and refunds
- Purchase orders and supplier management
- Multiple shops or branches
- Invoice or receipt upload
- Payment gateway integration

### Business Assumptions

- The system serves a single tuck shop.
- Currency is Hong Kong Dollar (`HKD`), displayed as `HK$0.00`.
- Business timezone defaults to `Asia/Hong_Kong` and is configurable through an environment variable.
- Product quantities are whole units only.
- Negative inventory is not allowed.
- Low stock means `current_stock <= minimum_stock`.
- Completed sales cannot be edited or deleted. Incorrect sales must be voided and entered again.
- V1 does not support partial returns or refunds.

## 3. Technology Stack

### Frontend

- Next.js using the App Router
- React
- TypeScript with strict mode
- Tailwind CSS
- shadcn/ui
- React Hook Form and Zod for form validation

### Backend

- Supabase Auth
- Supabase PostgreSQL
- Supabase Row Level Security
- PostgreSQL functions/RPC for atomic sales and stock operations

### Reporting and Deployment

- ExcelJS for `.xlsx` generation
- Vercel for the Next.js application
- Supabase for authentication and database hosting

## 4. User Roles and Permissions

### Admin

- View all dashboard metrics, including revenue, cost, and profit
- Create, edit, activate, and deactivate products
- Permanently delete a product only if it has no related sales or stock movements
- Record stock-in and stock adjustments
- View all inventory history
- Record and void sales
- View all reports and export Excel workbooks
- Create, activate, deactivate, and change the role of users

### Staff

- Record sales
- View active products and selling prices
- View current stock and low-stock status
- View a limited dashboard without cost or profit information
- View their own recent orders
- Cannot manage users, products, stock, reports, costs, or profit
- Cannot void a completed sale

### User Management Rules

- User profiles are linked one-to-one with `auth.users`.
- Deactivated users cannot access the application.
- Users referenced by sales cannot be permanently deleted.
- The system must always retain at least one active Admin.
- The first Admin is created through a secure seed or deployment procedure.

## 5. Authentication

The login page contains:

- Email
- Password
- Sign-in button
- Clear invalid-credential and inactive-account messages

Protected pages must verify the authenticated user and role on the server. UI hiding alone is not sufficient authorization.

## 6. Dashboard

### Admin Dashboard

- Today's revenue
- Today's number of valid orders
- Current month's revenue
- Current month's profit
- Top 10 best-selling products for the current month
- Low-stock product count and list
- Monthly revenue trend for the selected year

### Staff Dashboard

- Today's number of orders recorded by the current Staff member
- Active product count
- Low-stock product count and list
- Quick action to record a sale

Voided orders must be excluded from revenue, profit, order counts, and best-selling calculations.

## 7. Product Management

Each product contains:

- System ID
- Unique product code, such as `P001`
- Product name
- Category
- Current cost price
- Current selling price
- Current stock
- Minimum stock level
- Status: `active` or `inactive`
- Created and updated timestamps

### Rules

- Product code is required, unique, and case-insensitive.
- Product name and category are required.
- Cost price and selling price must be zero or greater.
- Minimum stock must be a whole number zero or greater.
- Current stock cannot be edited directly from the product form.
- Stock changes only through stock-in, sale, sale void, or adjustment operations.
- Inactive products remain visible in historical reports but cannot be added to new sales.
- Products with related records must be deactivated instead of deleted.

## 8. Sales Module

This module records a sale only. It does not process cash or electronic payments.

### Sale Header

- Sale date in local business time, displayed as `YYYY-MM-DD`
- Daily order number
- Client request ID generated once when the order form is submitted
- Payment method: `cash` or `e_payment`
- Staff member derived from the authenticated user
- Grand total calculated by the system
- Status: `completed` or `voided`
- Created timestamp

### Sale Items

Each order must contain at least one item. Each item stores a historical snapshot of:

- Product ID
- Product code
- Product name
- Quantity
- Unit selling price at the time of sale
- Unit cost at the time of sale
- Subtotal
- Cost total
- Profit

Calculations:

- `subtotal = quantity × unit_selling_price`
- `cost_total = quantity × unit_cost`
- `profit = subtotal - cost_total`
- `grand_total = sum of all item subtotals`

All monetary calculations must use decimal values and be recalculated on the server. Client calculations are for display only.

### Daily Order Number

- The number starts at `001` each local business date.
- It increments sequentially within that date.
- `(sale_date, daily_order_number)` must be unique.
- The database generates the number safely to prevent duplicates during concurrent sales.
- The displayed order reference is `YYYY-MM-DD-001`.

### Saving a Sale

A single PostgreSQL transaction/RPC must:

1. Validate the authenticated and active Staff/Admin user.
2. Validate that all products are active and quantities are positive.
3. Lock and verify sufficient stock for every item.
4. Generate the daily order number.
5. Create the sale and sale items using server-side price and cost snapshots.
6. Deduct inventory and create stock movement records.

If any operation fails, the entire transaction must roll back. Overselling and negative inventory are prohibited.

`create_sale` must be idempotent. Retrying with the same client request ID returns the already-created sale instead of creating or deducting inventory a second time.

### Voiding a Sale

- Admin only.
- A void reason is required.
- A voided sale remains in the database for audit purposes.
- Voiding restores the sold quantities through stock movement records.
- A sale can be voided only once.
- Save `voided_at`, `voided_by`, and `void_reason`.
- Voided sales are clearly labelled and excluded from normal totals.

## 9. Inventory Module

### Inventory List

Display:

- Product code
- Product name
- Current stock
- Minimum stock
- Stock status: `in_stock`, `low_stock`, or `out_of_stock`
- Current cost price
- Inventory value

Definitions:

- `out_of_stock`: current stock is `0`
- `low_stock`: current stock is greater than `0` and less than or equal to minimum stock
- `in_stock`: current stock is greater than minimum stock
- `inventory_value = current_stock × current_cost_price`

### Stock-In

Record:

- Local business date
- Product
- Quantity received
- Unit cost
- Supplier name (optional)
- Created by
- Created timestamp

Stock-in must atomically increase inventory, update the product's current cost price to the supplied unit cost, and create a stock movement. V1 uses the latest unit cost rather than weighted-average costing.

### Stock Adjustment

Record:

- Product
- Direction: increase or decrease
- Quantity
- Required reason
- Created by
- Created timestamp

An adjustment cannot reduce stock below zero.

### Stock Movement History

Every inventory change stores:

- Product
- Movement type: `stock_in`, `sale`, `sale_void`, `adjustment_in`, or `adjustment_out`
- Signed quantity change
- Stock before
- Stock after
- Reference type and reference ID
- Reason or note
- Performed by
- Created timestamp

Movement history is immutable and cannot be edited or deleted through the UI.

## 10. Reports

### Required Reports

- Daily sales
- Monthly sales
- Monthly profit
- Inventory
- Best-selling products
- Low-stock products

### Filters

- Specific date
- Date range
- Month and year
- Product
- Category
- Payment method
- Staff member
- Sale status where applicable

### Financial Definitions

- `revenue = sum of valid sale item subtotals`
- `cost = sum of valid sale item cost totals`
- `profit = revenue - cost`
- `margin_percentage = (profit / revenue) × 100`
- When revenue is zero, margin is displayed as `0.00%`.

Financial reports use the historical price and cost snapshots saved in `sale_items`, never the product's current prices.

## 11. Excel Export

Export one `.xlsx` workbook using the active report filters. The filename format is:

`tuck-shop-report_YYYY-MM-DD_HHmm.xlsx`

### Worksheet 1: Sales Report

Columns:

- Sale Date
- Order Number
- Product Code
- Product
- Quantity
- Unit Price
- Subtotal
- Payment Method
- Staff
- Sale Status

Summary:

- Total valid orders
- Cash total
- E-payment total
- Grand total revenue

### Worksheet 2: Inventory Report

Columns:

- Product Code
- Product
- Category
- Current Stock
- Cost Price
- Selling Price
- Inventory Value
- Minimum Stock
- Stock Status

Summary:

- Total inventory value

### Worksheet 3: Monthly Profit Report

Columns:

- Month
- Revenue
- Cost
- Profit
- Margin %

Summary:

- Annual revenue
- Annual cost
- Annual profit

### Excel Styling

- Dark blue header background
- White bold centred header text
- Alternating white and light-grey body rows
- `HK$0.00` currency format
- `0.00%` percentage format
- Green, bold, larger summary rows
- Automatic readable column widths with sensible maximum widths
- Freeze the first row
- Filters on the header row
- Excel table formatting for each data section
- Dates stored as Excel dates, not plain text

## 12. Global Search

Search across:

- Product code and product name
- Displayed order reference
- Sale date
- Staff name

Requirements:

- Debounce search input.
- Paginate results.
- Group results by Products and Sales.
- Staff only see records allowed by their permissions.

## 13. Database Model

All primary keys use UUID unless otherwise noted. All timestamps use `timestamptz`.

### `profiles`

- `id uuid primary key references auth.users(id)`
- `name text not null`
- `role text not null check (role in ('admin', 'staff'))`
- `is_active boolean not null default true`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

### `products`

- `id uuid primary key`
- `product_code text not null unique`
- `name text not null`
- `category text not null`
- `cost_price numeric(12,2) not null check (cost_price >= 0)`
- `selling_price numeric(12,2) not null check (selling_price >= 0)`
- `current_stock integer not null default 0 check (current_stock >= 0)`
- `minimum_stock integer not null default 0 check (minimum_stock >= 0)`
- `status text not null check (status in ('active', 'inactive'))`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

### `sales`

- `id uuid primary key`
- `client_request_id uuid not null unique`
- `sale_date date not null`
- `daily_order_number integer not null check (daily_order_number > 0)`
- `payment_method text not null check (payment_method in ('cash', 'e_payment'))`
- `staff_id uuid not null references profiles(id)`
- `grand_total numeric(12,2) not null check (grand_total >= 0)`
- `status text not null default 'completed' check (status in ('completed', 'voided'))`
- `voided_at timestamptz null`
- `voided_by uuid null references profiles(id)`
- `void_reason text null`
- `created_at timestamptz not null default now()`
- Unique constraint on `(sale_date, daily_order_number)`

### `sale_items`

- `id uuid primary key`
- `sale_id uuid not null references sales(id)`
- `product_id uuid not null references products(id)`
- `product_code text not null`
- `product_name text not null`
- `quantity integer not null check (quantity > 0)`
- `unit_price numeric(12,2) not null check (unit_price >= 0)`
- `unit_cost numeric(12,2) not null check (unit_cost >= 0)`
- `subtotal numeric(12,2) not null check (subtotal >= 0)`
- `cost_total numeric(12,2) not null check (cost_total >= 0)`
- `profit numeric(12,2) not null`
- `created_at timestamptz not null default now()`

### `stock_receipts`

- `id uuid primary key`
- `receipt_date date not null`
- `product_id uuid not null references products(id)`
- `quantity integer not null check (quantity > 0)`
- `unit_cost numeric(12,2) not null check (unit_cost >= 0)`
- `supplier_name text null`
- `created_by uuid not null references profiles(id)`
- `created_at timestamptz not null default now()`

### `stock_movements`

- `id uuid primary key`
- `product_id uuid not null references products(id)`
- `movement_type text not null`
- `quantity_change integer not null check (quantity_change <> 0)`
- `stock_before integer not null check (stock_before >= 0)`
- `stock_after integer not null check (stock_after >= 0)`
- `reference_type text not null`
- `reference_id uuid null`
- `reason text null`
- `created_by uuid not null references profiles(id)`
- `created_at timestamptz not null default now()`

Add indexes for product codes/names, sale dates, staff IDs, sale references, movement dates, and foreign keys used by reports.

## 14. Row Level Security

RLS must be enabled on every application table.

- Active Admins may read all application data.
- Active Staff may read active products and permitted inventory fields.
- Staff may read their own sales; Admins may read all sales.
- Direct client inserts/updates to sales, sale items, product stock, stock receipts, and stock movements are denied.
- Sales and inventory mutations occur only through security-definer PostgreSQL functions with explicit authentication and role checks.
- Only Admins may manage products, inventory, reports, and user profiles.
- Sensitive fields such as product cost and profit must not be exposed to Staff through views, RPC responses, or API payloads.

## 15. Sample Data

A development-only seed command creates these products once:

- P001 Potato Chips
- P002 Chocolate Bar
- P003 Coca-Cola Can
- P004 Mineral Water
- P005 Orange Juice
- P006 Instant Noodles
- P007 Biscuit Pack
- P008 Chewing Gum
- P009 Ice Cream Cup
- P010 Sandwich

Use realistic HKD cost prices, selling prices, stock quantities, categories, and minimum-stock levels. Seed data must never run automatically in production.

## 16. UI and Accessibility

- Modern, minimal visual design
- Responsive navigation and forms
- Dashboard cards with rounded corners and soft shadows
- Clean typography and consistent spacing
- Responsive tables that become cards or horizontally scroll on narrow screens
- Keyboard-accessible forms and dialogs
- Visible focus states
- Semantic labels and accessible colour contrast
- Toast notifications for success and non-blocking errors
- Confirmation dialogs for voiding, deactivation, and destructive actions
- Loading skeletons and empty states
- Clear recovery messages for errors

## 17. Engineering Requirements

- Use TypeScript throughout with strict compiler settings.
- Organize code by feature with reusable UI and domain components.
- Prefer Server Components for data display and Client Components only where interaction requires them.
- Use Server Actions or Route Handlers for application operations as appropriate.
- Validate every external input with Zod and enforce the same rules in PostgreSQL constraints.
- Never trust prices, totals, roles, or Staff IDs received from the browser.
- Keep Supabase service-role credentials server-only and use them only when required.
- Add structured error handling without exposing internal database details.
- Add unit tests for calculations and validation.
- Add integration tests for sale creation, concurrent stock checks, stock-in, adjustment, voiding, and RLS.
- Add end-to-end tests for the main Admin and Staff workflows.
- Document environment variables, local setup, migrations, seeding, testing, deployment, and first-Admin creation.

## 18. V1 Acceptance Criteria

V1 is complete when:

1. Admin and Staff can sign in and only access permitted functions and data.
2. Admin can manage products without corrupting historical records.
3. Staff can save a multi-item sale and inventory is deducted exactly once.
4. Concurrent sales cannot create duplicate daily order numbers or negative stock.
5. Admin can stock in, adjust stock, and view an immutable movement history.
6. Admin can void a sale and inventory is restored exactly once.
7. Dashboard and reports exclude voided sales and use historical sale-item costs.
8. Date, month, year, product, payment, and Staff filters return correct results.
9. The Excel workbook contains all three correctly styled worksheets and respects active filters.
10. The application passes automated tests, works on desktop and iPhone widths, and deploys successfully to Vercel with Supabase RLS enabled.
