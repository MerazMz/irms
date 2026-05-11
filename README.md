# Inventory Reservation Management System

## Project folder structure 
irms/
│
├── app/
│   │
│   ├── api/
│   │   │
│   │   ├── products/
│   │   │   └── route.ts
│   │   │
│   │   ├── warehouses/
│   │   │   └── route.ts
│   │   │
│   │   └── reservations/
│   │       │
│   │       ├── route.ts
│   │       │
│   │       └── [id]/
│   │           │
│   │           ├── route.ts
│   │           │
│   │           ├── confirm/
│   │           │   └── route.ts
│   │           │
│   │           └── release/
│   │               └── route.ts
│   │
│   ├── checkout/
│   │   └── [id]/
│   │       └── page.tsx
│   │
│   ├── layout.tsx
│   ├── globals.css
│   └── page.tsx
│
├── components/
│   │
│   ├── ProductCard.tsx
│   ├── WarehouseStock.tsx
│   ├── ReservationTimer.tsx
│   ├── ConfirmButton.tsx
│   ├── CancelButton.tsx
│   └── ErrorMessage.tsx
│
├── lib/
│   │
│   ├── prisma.ts
│   ├── reservation.ts
│   ├── inventory.ts
│   ├── expiry.ts
│   └── validations.ts
│
├── prisma/
│   │
│   ├── schema.prisma
│   └── seed.ts
│
├── types/
│   └── reservation.ts
│
├── utils/
│   ├── calculateAvailableStock.ts
│   └── formatTime.ts
│
├── public/
│
├── .env
├── .gitignore
├── next.config.ts
├── package.json
├── tsconfig.json
└── README.md