# Inventory Reservation Management System (IRMS)

A robust, real-time inventory management system built with **Next.js 16**, **Prisma**, and **Supabase**. It handles concurrent reservations with row-level locking and features an automated stock expiry mechanism using Vercel Cron Jobs.

---

## 📂 Project Structure

```text
irms/
├── app/
│   ├── api/
│   │   ├── cleanup/          # Cron job endpoint for releasing expired stock
│   │   ├── products/         # Catalog fetch with "Lazy Cleanup"
│   │   ├── reservations/     # Reservation creation (Concurrency handled)
│   │   └── warehouses/       # Warehouse data
│   ├── checkout/[id]/        # Real-time countdown & purchase page
│   ├── layout.tsx            # Global layout & UI providers
│   └── page.tsx              # Product catalog dashboard
├── components/
│   ├── checkout/             # Checkout-specific components
│   ├── product/              # Product cards & reservation modals
│   └── ui/                   # Reusable Shadcn UI primitives
├── lib/
│   ├── prisma.ts             # Prisma Client singleton
│   ├── reservation.ts        # Shared reservation & cleanup utilities
│   └── utils.ts              # Tailwind merging & helper functions
├── prisma/
│   ├── schema.prisma         # Database schema (PostgreSQL)
│   └── seed.ts               # Database seeder with mock data
├── vercel.json               # Cron job schedule configuration
└── next.config.ts            # Next.js configuration (HMR & Dev settings)
```

---

## 🚀 Local Setup Guide

### 1. Prerequisites
- Node.js 18+
- A Supabase or PostgreSQL database

### 2. Installation
```bash
git clone https://github.com/MerazMz/irms.git
cd irms
npm install
```

### 3. Environment Variables
Create a `.env` file in the root directory:
```env
DATABASE_URL="postgresql://user:pass@host:5432/db?pgbouncer=true&connection_limit=3"
DIRECT_URL="postgresql://user:pass@host:5432/db"
CRON_SECRET="your_random_secret_here"
```
*Note: Using `pgbouncer=true` is essential for Supabase transaction mode.*

### 4. Database Setup
```bash
npx prisma migrate dev --name init
npx prisma db seed
```

### 5. Running the Project
```bash
npm run dev
```
To access from other devices on your network:
```bash
npx next dev -H 0.0.0.0
```

---

## 🛡️ Handling Concurrent Reservations

The system prevents **Race Conditions** (e.g., two people reserving the last item at the exact same microsecond) using **Pessimistic Row-Level Locking**.

In `app/api/reservations/route.ts`, we use a Prisma transaction with a raw SQL lock:
```sql
SELECT * FROM "Inventory" 
WHERE "productId" = $1 AND "warehouseId" = $2 
FOR UPDATE
```
This ensures that the database "locks" the specific inventory row for one user until their transaction is complete, forcing the second user to wait and see the updated stock level (preventing over-selling).

---

---

## ⚙️ The Expiry Lifecycle

To provide a fair experience, the system implements a **10-minute hold** on all reserved items. This prevents "phantom stock" issues where items are locked indefinitely by inactive users.

1.  **Creation**: When a user initiates a reservation, the system calculates `expiresAt` as `now + 10 minutes`.
2.  **State Transition**: The reservation is created with a `PENDING` status, and the `reservedUnits` in the `Inventory` table is incremented.
3.  **The Countdown**: On the frontend, a real-time timer compares the current time to the `expiresAt` timestamp. 
4.  **Expiry**: If the timer hits zero or the user fails to confirm within the window, the reservation is considered "Expired."
5.  **Release**: Once expired, the status transitions to `RELEASED`, and the `reservedUnits` are decremented, making the stock available to other shoppers immediately.

---

## 🧹 Automatic Cleanup Implementation

The cleanup system is the "engine" that keeps the inventory accurate. It uses a **Triple-Layer** approach to ensure reliability even on free hosting tiers:

### 1. Lazy Cleanup (Just-in-Time)
This is the most critical layer. Instead of waiting for a background worker, the system performs a "mini-cleanup" during every read/write operation:
- **`GET /api/products`**: Before showing the catalog, the system runs `releaseExpiredReservations()`.
- **`POST /api/reservations`**: Before checking if stock is available, it clears out any stale reservations that might be "hogging" the stock.
- **Implementation**:
  ```typescript
  // Finds PENDING reservations where expiresAt < now
  const expired = await prisma.reservation.findMany({
    where: { status: "PENDING", expiresAt: { lt: new Date() } }
  });
  ```

### 2. GitHub Actions (The Pulse)
To maintain data integrity during periods of low traffic, a GitHub Action ([.github/workflows/cleanup.yml](.github/workflows/cleanup.yml)) pings the `/api/cleanup` endpoint every **5 minutes**. This acts as a consistent heartbeat for the system.

### 3. Vercel Cron (The Fallback)
A final fallback is configured in `vercel.json` to run a daily sweep. This ensures that even if external services are down, the database is scrubbed at least once every 24 hours.

### 🔒 Atomic Transactions
All cleanup operations are wrapped in **Prisma Transactions**. This ensures that the inventory increment and the reservation status update happen **atomically**—either both succeed or both fail, preventing "leaked" stock numbers.

---

## 🚀 Idempotency (Bonus Feature)

The `reserve` and `confirm` endpoints are protected against duplicate requests (e.g., double-clicks or network retries) using **Upstash Redis**.

- **Mechanism**: Clients can send a unique `Idempotency-Key` in the request header.
- **Locking**: We use a Redis "NX" lock to handle requests in a `PROCESSING` state, preventing race conditions if two identical requests arrive simultaneously.
- **Persistence**: Successful responses are cached in Redis for **24 hours**. Subsequent requests with the same key will receive the original response instantly without re-executing any business logic (like double-decrementing stock).

---

## ⚖️ Trade-offs & Future Improvements

Given the focus on concurrency and reliability, some trade-offs were made:

1.  **Polling vs. WebSockets**: Currently, the UI refreshes state via `router.refresh()` and "Lazy Cleanup" on page load. In a larger production system, using WebSockets or Server-Sent Events (SSE) would provide even faster real-time stock updates across multiple open tabs.
2.  **Schema Validation**: I chose to focus on the database transaction logic and concurrency over comprehensive schema validation. In a production environment, I would use **Zod** to strictly validate all API inputs and environment variables.
3.  **Soft Deletes**: Currently, released reservations remain in the DB with a `RELEASED` status. For a high-scale system, a background process should eventually archive these records to keep the primary table lean.
4.  **Automated Testing**: While the system was manually tested for concurrency (simulating simultaneous requests), adding a suite of unit tests (Vitest) and E2E tests (Playwright) would be the next step to ensure long-term stability.

---

## 🛠️ Tech Stack
- **Framework**: Next.js 16 (App Router + Turbopack)
- **Database**: PostgreSQL (Supabase)
- **ORM**: Prisma
- **Styling**: Tailwind CSS v4 + Shadcn UI
- **Notifications**: Sonner Toasts
- **Icons**: Lucide React