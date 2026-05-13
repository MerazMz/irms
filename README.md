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

## ⏲️ Expiry Mechanism & Background Workers

Reservations are valid for **10 minutes**. To ensure stock is released accurately on a free tier, the system uses a robust **Triple-Layer Cleanup** strategy:

### 1. Lazy Cleanup (Real-Time Guard) - *Primary*
To bypass server delays, the cleanup utility is triggered **on every relevant user interaction**. This ensures that even if no background worker has run, the user always sees fresh, accurate stock:
- **Product Catalog**: Refreshes stock whenever a user views the dashboard.
- **Checkout Page**: Verifies expiry the moment a user lands on the purchase page.
- **New Reservations**: Clears expired locks before checking availability for a new request.

### 2. GitHub Actions (Frequent Worker) - *Secondary*
Since Vercel Hobby accounts limit cron jobs to once per day, we use **GitHub Actions** as a high-frequency background worker:
- **Schedule**: Set to run every **5 minutes** (see `.github/workflows/cleanup.yml`).
- **Function**: Automatically pings the `/api/cleanup` endpoint to sweep the database even when there is no user traffic.

### 3. Vercel Cron (Daily Sweep) - *Fallback*
A standard Vercel Cron job is configured in `vercel.json` to run once every 24 hours as a final fallback to comply with Hobby tier restrictions.

---

## 🛠️ Tech Stack
- **Framework**: Next.js 16 (App Router + Turbopack)
- **Database**: PostgreSQL (Supabase)
- **ORM**: Prisma
- **Styling**: Tailwind CSS v4 + Shadcn UI
- **Notifications**: Sonner Toasts
- **Icons**: Lucide React