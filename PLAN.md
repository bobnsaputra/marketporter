# MarketPorter — Project Plan

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14+ (App Router) |
| Language | TypeScript |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| File Storage | Supabase Storage |
| Real-time | Supabase Realtime |
| Styling | Tailwind CSS |
| Scraping | Next.js API routes + Cheerio / Puppeteer |
| Deployment | Vercel + Supabase Cloud |

---

## Roles

| Role | Description |
|---|---|
| **Operator** | The proxy buyer. Manages all orders, updates statuses, uploads documents, handles purchasing. Full access. |
| **Customer** | Submits product links, views their own orders and statuses. Limited access. |

---

## Data Model

### `customers`

| Column | Type | Notes |
|---|---|---|
| id | uuid (PK) | Supabase Auth user ID |
| full_name | text | |
| email | text | From auth |
| phone | text | nullable |
| notes | text | Operator notes about the customer |
| created_at | timestamptz | |

### `orders`

| Column | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| customer_id | uuid (FK → customers) | |
| order_number | text | Auto-generated, human-readable (e.g. MP-20260306-001) |
| status | enum | `requested`, `confirmed`, `purchased`, `arrived`, `shipped`, `completed`, `cancelled` |
| source_url | text | Original product link |
| source_platform | text | `mercari`, `paypay_flea`, `other` |
| product_title | text | Extracted from link |
| product_price | numeric | Original price in JPY |
| product_image_url | text | Extracted image URL |
| seller_name | text | Extracted seller info |
| seller_url | text | Link to seller profile |
| service_fee | numeric | Proxy buyer's service fee |
| shipping_cost_domestic | numeric | Shipping within Japan |
| shipping_cost_international | numeric | Shipping to customer |
| exchange_rate | numeric | JPY to customer's currency |
| total_price | numeric | Computed total in customer's currency |
| currency | text | Customer's currency code (e.g. IDR, USD) |
| tracking_number | text | Outbound shipment tracking |
| shipping_carrier | text | e.g. EMS, DHL, J&T |
| notes | text | Internal notes |
| customer_notes | text | Notes from the customer |
| purchased_at | timestamptz | When the operator bought the item |
| arrived_at | timestamptz | When the item arrived at operator's location |
| shipped_at | timestamptz | When shipped to customer |
| completed_at | timestamptz | When marked complete |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### `order_status_history`

| Column | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| order_id | uuid (FK → orders) | |
| status | enum | Same enum as orders.status |
| changed_by | uuid (FK → customers) | Who changed it |
| note | text | Optional note for the transition |
| created_at | timestamptz | |

### `order_attachments`

| Column | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| order_id | uuid (FK → orders) | |
| file_path | text | Path in Supabase Storage |
| file_name | text | Original filename |
| file_type | text | MIME type |
| category | enum | `purchase_proof`, `invoice`, `shipping_label`, `product_photo`, `other` |
| uploaded_by | uuid (FK → customers) | |
| created_at | timestamptz | |

### Supabase Storage Buckets

| Bucket | Purpose | Access |
|---|---|---|
| `order-attachments` | Purchase proofs, invoices, shipping labels | Private. Accessed via signed URLs. |
| `product-images` | Cached product images from scraped links | Public read. |

---

## Order Lifecycle & Transitions

```
requested → confirmed → purchased → arrived → shipped → completed
    ↓           ↓           ↓          ↓         ↓
 cancelled   cancelled   (no cancel after purchase — refund flow instead)
```

### Status Rules

| From | Allowed To |
|---|---|
| requested | confirmed, cancelled |
| confirmed | purchased, cancelled |
| purchased | arrived |
| arrived | shipped |
| shipped | completed |

- Only the **operator** can transition statuses.
- Every transition creates a row in `order_status_history`.
- Timestamps (`purchased_at`, `arrived_at`, etc.) are set automatically on transition.

---

## MVP Feature List

A comprehensive checklist of every feature required before the first release.

### Authentication & Authorization

- [ ] Operator login with email and password
- [ ] Customer registration with email and password
- [ ] Password reset flow
- [ ] Role stored in Supabase Auth metadata (`operator` or `customer`)
- [ ] Middleware to protect routes based on role
- [ ] Redirect unauthenticated users to login
- [ ] Redirect customers away from operator pages and vice versa

### Link Scraping

- [ ] API endpoint `POST /api/scrape` accepts a product URL
- [ ] Mercari scraper: extract title, price, image, seller name, seller URL
- [ ] PayPay Flea Market scraper: extract title, price, image, seller name, seller URL
- [ ] Detect platform from URL pattern and route to correct scraper
- [ ] Return structured JSON response with extracted fields
- [ ] Return clear error response if scraping fails or URL is unsupported
- [ ] Server-side only — never expose scraping logic to the browser

### Order Creation (Customer)

- [ ] "New Order" page with a URL input field
- [ ] On URL submit, call scrape API and prefill product details
- [ ] Show extracted product info: title, price, image, seller
- [ ] Allow customer to edit or fill in details manually (fallback if scrape fails)
- [ ] Customer can add a note to the order
- [ ] Submit creates an order with status `requested`
- [ ] Auto-generate a human-readable order number (e.g. MP-20260306-001)
- [ ] Redirect to order detail page after creation

### Order List (Customer)

- [ ] List all orders belonging to the logged-in customer
- [ ] Show order number, product title, product image thumbnail, status, date
- [ ] Sort by most recent first
- [ ] Filter by status
- [ ] Click to open order detail

### Order Detail (Customer)

- [ ] Display product info: title, image, price, source URL, seller
- [ ] Display price breakdown: product price, service fee, domestic shipping, international shipping, exchange rate, total
- [ ] Display current status with visual indicator (stepper or badge)
- [ ] Display status history timeline with timestamps
- [ ] Display attached files (purchase proof, invoice, shipping label) with download links
- [ ] Display tracking number and carrier when shipped
- [ ] Real-time status update via Supabase Realtime (status changes appear without refresh)

### Operator Dashboard

- [ ] Overview page showing order counts by status
- [ ] Quick links to filtered order lists (e.g. "5 Requested" → click to see them)
- [ ] Total orders today / this week / this month

### Order List (Operator)

- [ ] List all orders across all customers
- [ ] Show order number, customer name, product title, status, date, total price
- [ ] Filter by status
- [ ] Filter by customer
- [ ] Search by order number or product title
- [ ] Sort by date (newest first, oldest first)
- [ ] Pagination

### Order Detail (Operator)

- [ ] View all product info and customer info
- [ ] Edit price fields: service fee, domestic shipping, international shipping, exchange rate
- [ ] Auto-compute total price when any price field changes
- [ ] Add/edit operator notes
- [ ] Status transition: buttons to advance order to the next valid status
- [ ] Status transition: option to cancel (only from `requested` or `confirmed`)
- [ ] Add a note when transitioning status
- [ ] Upload files: purchase proof, invoice, shipping label, product photo
- [ ] View and download all attached files
- [ ] Enter tracking number and shipping carrier
- [ ] View full status history timeline

### Customer Management (Operator)

- [ ] List all customers
- [ ] Search by name or email
- [ ] View customer detail: name, email, phone, total orders, notes
- [ ] Add/edit operator notes on a customer
- [ ] Click through to see all orders for a customer

### File Handling

- [ ] Upload files to Supabase Storage (`order-attachments` bucket)
- [ ] Categorize uploads: purchase proof, invoice, shipping label, product photo, other
- [ ] Generate signed URLs for private file access
- [ ] Display image previews for image files
- [ ] Download link for non-image files
- [ ] Delete an attachment (operator only)

### Order Status Workflow

- [ ] Enforce valid transitions: requested → confirmed → purchased → arrived → shipped → completed
- [ ] Allow cancel from `requested` or `confirmed` only
- [ ] Log every transition in `order_status_history` with timestamp and user
- [ ] Auto-set timestamp fields (`purchased_at`, `arrived_at`, `shipped_at`, `completed_at`)
- [ ] Prevent skipping statuses
- [ ] Only the operator can change status

### Database & Security

- [ ] Supabase tables: `customers`, `orders`, `order_status_history`, `order_attachments`
- [ ] Enums: `order_status`, `attachment_category`, `source_platform`
- [ ] Row Level Security: customers can only read their own data
- [ ] Row Level Security: operator can read and write all data
- [ ] Storage policies: only operator can upload/delete; customers can read their order's files
- [ ] Foreign key constraints and cascading deletes where appropriate

### UI & Layout

- [ ] Responsive layout (works on desktop and mobile)
- [ ] Sidebar navigation for operator (Dashboard, Orders, Customers)
- [ ] Simple top nav for customer (My Orders, New Order, Logout)
- [ ] Loading states for async operations
- [ ] Error messages for failed operations
- [ ] Empty states (no orders yet, no results found)
- [ ] Toast notifications for successful actions (order created, status updated, file uploaded)

---

## Features by Phase

### Phase 1 — Core (MVP)

The minimum system to replace chat-based ordering. All items above.

1. **Auth**
   - Operator login (email/password)
   - Customer registration/login
   - Role-based access via Supabase RLS

2. **Order Creation**
   - Customer submits a product URL
   - API route scrapes the page and extracts: title, price, image, seller
   - Order created with status `requested`
   - Fallback: if scraping fails, customer fills in details manually

3. **Order Management (Operator)**
   - Dashboard: list all orders, filter by status, search by customer or order number
   - Order detail page: view product info, update status, add notes
   - Price calculation: set service fee, shipping costs, exchange rate → auto-compute total
   - File uploads: attach purchase proof, invoice, shipping label

4. **Order View (Customer)**
   - List of own orders with status
   - Order detail: see product info, price breakdown, current status, attachments
   - Real-time status updates via Supabase Realtime

5. **Order Status Workflow**
   - Status transition buttons for operator
   - Status history log per order
   - Automatic timestamps

### Phase 2 — Operations

Efficiency tools for the operator managing volume.

6. **Dashboard Analytics**
   - Orders by status (counts)
   - Revenue summary (total fees collected)
   - Orders per customer

7. **Batch Operations**
   - Select multiple orders → update status
   - Bulk export to CSV

8. **Notifications**
   - Email notification to customer on status change
   - Optional: LINE or WhatsApp integration via webhook

9. **Invoice Generation**
   - Auto-generate PDF invoice per order
   - Attach to order record

### Phase 3 — Scale

Features for growing the operation.

10. **Multi-currency Support**
    - Store exchange rates, convert JPY to target currency
    - Historical rate snapshots per order

11. **Customer Portal Enhancements**
    - Customer can add notes/preferences to an order
    - Customer can cancel a `requested` order

12. **Scraper Improvements**
    - Support additional marketplaces (Rakuma, Yahoo Auctions Japan)
    - Headless browser fallback for JS-rendered pages
    - Rate limiting and retry logic

13. **API / Integrations**
    - Public API for programmatic order submission
    - Webhook on status change

---

## Page Structure

```
/                         → Landing / redirect to dashboard
/login                    → Auth page
/register                 → Customer registration

/dashboard                → Operator: all orders overview
/dashboard/orders         → Operator: order list with filters
/dashboard/orders/[id]    → Operator: order detail + management
/dashboard/customers      → Operator: customer list
/dashboard/customers/[id] → Operator: customer detail + order history

/orders                   → Customer: own order list
/orders/new               → Customer: submit a new product link
/orders/[id]              → Customer: order detail + status tracking
```

---

## Supabase Configuration

### Row Level Security (RLS) Policies

| Table | Policy | Rule |
|---|---|---|
| customers | Customers read own row | `auth.uid() = id` |
| customers | Operator reads all | `role = 'operator'` |
| orders | Customers read own orders | `auth.uid() = customer_id` |
| orders | Operator reads/writes all | `role = 'operator'` |
| order_status_history | Same as orders | Follows order access |
| order_attachments | Same as orders | Follows order access |

### Role Detection

Store role in `customers.role` column or in Supabase Auth metadata (`app_metadata.role`). Use `auth.jwt() ->> 'role'` in RLS policies.

---

## Scraper Design

### Supported Platforms (Phase 1)

| Platform | URL Pattern | Method |
|---|---|---|
| Mercari | `mercari.com/jp/items/...` | HTTP fetch + Cheerio |
| PayPay Flea Market | `paypayfleamarket.yahoo.co.jp/item/...` | HTTP fetch + Cheerio |

### Extracted Fields

- Product title
- Price (JPY)
- Primary image URL
- Seller name
- Seller profile URL
- Product condition (if available)
- Product description (if available)

### Scraper API Route

```
POST /api/scrape
Body: { "url": "https://mercari.com/jp/items/..." }
Response: { "title": "...", "price": 3500, "image": "...", "seller": "...", ... }
```

- Runs server-side only (Next.js API route).
- Returns structured data. The frontend uses this to prefill the order form.
- If scraping fails, returns an error and the customer fills in details manually.

---

## File Structure

```
marketporter/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   └── register/page.tsx
│   │   ├── (customer)/
│   │   │   └── orders/
│   │   │       ├── page.tsx
│   │   │       ├── new/page.tsx
│   │   │       └── [id]/page.tsx
│   │   ├── (operator)/
│   │   │   └── dashboard/
│   │   │       ├── page.tsx
│   │   │       ├── orders/
│   │   │       │   ├── page.tsx
│   │   │       │   └── [id]/page.tsx
│   │   │       └── customers/
│   │   │           ├── page.tsx
│   │   │           └── [id]/page.tsx
│   │   ├── api/
│   │   │   └── scrape/route.ts
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── ui/                  # Reusable UI components
│   │   ├── orders/              # Order-specific components
│   │   └── layout/              # Nav, sidebar, header
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts        # Browser client
│   │   │   ├── server.ts        # Server client
│   │   │   └── middleware.ts    # Auth middleware
│   │   ├── scrapers/
│   │   │   ├── mercari.ts
│   │   │   ├── paypay.ts
│   │   │   └── index.ts         # Router: URL → scraper
│   │   └── utils/
│   │       ├── order-number.ts  # Generate order numbers
│   │       └── currency.ts      # Price/currency helpers
│   └── types/
│       └── index.ts             # TypeScript types for DB models
├── supabase/
│   ├── migrations/              # SQL migration files
│   └── seed.sql                 # Test data
├── public/
├── tailwind.config.ts
├── next.config.ts
├── package.json
├── tsconfig.json
└── .env.local                   # SUPABASE_URL, SUPABASE_ANON_KEY
```

---

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...   # Server-side only, for scraper/admin ops
```

---

## Getting Started (Development)

```bash
# 1. Install dependencies
npm install

# 2. Set up Supabase
#    - Create a project at supabase.com
#    - Copy URL and anon key to .env.local
#    - Run migrations: npx supabase db push

# 3. Run dev server
npm run dev
```

---

## Implementation Order

| Step | Task | Depends On |
|---|---|---|
| 1 | Initialize Next.js project + Tailwind + Supabase client | — |
| 2 | Supabase: create tables, enums, RLS policies | — |
| 3 | Auth: login, register, middleware, role check | 1, 2 |
| 4 | Scraper: Mercari + PayPay extractors | 1 |
| 5 | Order creation flow (customer submits link → scrape → create order) | 3, 4 |
| 6 | Operator dashboard: order list + filters | 3 |
| 7 | Operator order detail: status transitions, price calc, file uploads | 6 |
| 8 | Customer order list + detail view | 3 |
| 9 | Real-time status updates | 8 |
| 10 | Polish: error handling, loading states, responsive design | 5–9 |
