import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Clean previous data
  await prisma.inventory.deleteMany();
  await prisma.reservation.deleteMany();
  await prisma.product.deleteMany();
  await prisma.warehouse.deleteMany();

  // -----------------------
  // Warehouses
  // -----------------------
  const warehouses = await prisma.$transaction([
    prisma.warehouse.create({
      data: {
        name: "Delhi Warehouse",
        city: "Delhi",
      },
    }),
    prisma.warehouse.create({
      data: {
        name: "Mumbai Warehouse",
        city: "Mumbai",
      },
    }),
    prisma.warehouse.create({
      data: {
        name: "Bangalore Warehouse",
        city: "Bangalore",
      },
    }),
    prisma.warehouse.create({
      data: {
        name: "Hyderabad Warehouse",
        city: "Hyderabad",
      },
    }),
  ]);

  const [delhi, mumbai, bangalore, hyderabad] =
    warehouses;

  // -----------------------
  // Products
  // -----------------------
  const products = await prisma.$transaction([
    prisma.product.create({
      data: {
        name: "PlayStation 5",
        description:
          "Sony gaming console",
        price: 54999,
      },
    }),

    prisma.product.create({
      data: {
        name: "Xbox Series X",
        description:
          "Microsoft gaming console",
        price: 52999,
      },
    }),

    prisma.product.create({
      data: {
        name: "iPhone 16 Pro",
        description:
          "Apple flagship smartphone",
        price: 139999,
      },
    }),

    prisma.product.create({
      data: {
        name: "Samsung Galaxy S25 Ultra",
        description:
          "Samsung premium smartphone",
        price: 129999,
      },
    }),

    prisma.product.create({
      data: {
        name: "MacBook Air M4",
        description:
          "Apple lightweight laptop",
        price: 119999,
      },
    }),

    prisma.product.create({
      data: {
        name: "Dell XPS 15",
        description:
          "Premium Windows laptop",
        price: 159999,
      },
    }),

    prisma.product.create({
      data: {
        name: "AirPods Pro 2",
        description:
          "Apple wireless earbuds",
        price: 24999,
      },
    }),

    prisma.product.create({
      data: {
        name: "Sony WH-1000XM5",
        description:
          "Noise cancelling headphones",
        price: 29999,
      },
    }),

    prisma.product.create({
      data: {
        name: "Apple Watch Ultra 2",
        description:
          "Premium smartwatch",
        price: 89999,
      },
    }),

    prisma.product.create({
      data: {
        name: "iPad Pro M4",
        description:
          "Apple professional tablet",
        price: 99999,
      },
    }),
  ]);

  // -----------------------
  // Inventory
  // -----------------------
  const inventoryData = [
    // PS5
    {
      productId: products[0].id,
      warehouseId: delhi.id,
      totalUnits: 5,
    },
    {
      productId: products[0].id,
      warehouseId: mumbai.id,
      totalUnits: 2,
    },
    {
      productId: products[0].id,
      warehouseId: bangalore.id,
      totalUnits: 1,
    },

    // Xbox
    {
      productId: products[1].id,
      warehouseId: delhi.id,
      totalUnits: 4,
    },
    {
      productId: products[1].id,
      warehouseId: hyderabad.id,
      totalUnits: 2,
    },

    // iPhone
    {
      productId: products[2].id,
      warehouseId: delhi.id,
      totalUnits: 8,
    },
    {
      productId: products[2].id,
      warehouseId: mumbai.id,
      totalUnits: 3,
    },

    // Samsung
    {
      productId: products[3].id,
      warehouseId: bangalore.id,
      totalUnits: 6,
    },

    // MacBook
    {
      productId: products[4].id,
      warehouseId: delhi.id,
      totalUnits: 4,
    },
    {
      productId: products[4].id,
      warehouseId: mumbai.id,
      totalUnits: 2,
    },

    // Dell
    {
      productId: products[5].id,
      warehouseId: hyderabad.id,
      totalUnits: 3,
    },

    // AirPods
    {
      productId: products[6].id,
      warehouseId: delhi.id,
      totalUnits: 15,
    },

    // Sony Headphones
    {
      productId: products[7].id,
      warehouseId: bangalore.id,
      totalUnits: 7,
    },

    // Apple Watch
    {
      productId: products[8].id,
      warehouseId: mumbai.id,
      totalUnits: 5,
    },

    // iPad
    {
      productId: products[9].id,
      warehouseId: delhi.id,
      totalUnits: 6,
    },
  ];

  await prisma.inventory.createMany({
    data: inventoryData,
  });

  console.log("Database seeded successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });