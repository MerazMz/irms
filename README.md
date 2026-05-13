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

## ⏲️ Expiry Mechanism & Vercel Cron

Reservations are valid for **10 minutes**. Stock is released automatically using a dual-approach:

### 1. Active Cleanup (Cron Job)
Configured in `vercel.json`, Vercel hits the `/api/cleanup` endpoint every minute. This endpoint identifies all `PENDING` reservations where `expiresAt < now` and restores the `reservedUnits` back to `totalUnits`.

### 2. Lazy Cleanup (Just-in-Time)
To ensure the UI is always accurate even between cron cycles, the cleanup utility is called during:
- **Product Fetching**: Refreshes stock before the catalog is displayed.
- **New Reservations**: Clears expired stock before checking availability.

### Security
The `/api/cleanup` route is protected. In production, it requires a `Bearer ${CRON_SECRET}` header, which Vercel Cron sends automatically.

---

## 🛠️ Tech Stack
- **Framework**: Next.js 16 (App Router + Turbopack)
- **Database**: PostgreSQL (Supabase)
- **ORM**: Prisma
- **Styling**: Tailwind CSS v4 + Shadcn UI
- **Notifications**: Sonner Toasts
- **Icons**: Lucide React