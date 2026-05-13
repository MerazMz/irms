import { ProductCard } from "@/components/product/ProductCard";
import { prisma } from "@/lib/prisma";
import { releaseExpiredReservations } from "@/lib/reservation";

export const dynamic = "force-dynamic";

export default async function Home() {
  // Automatically release expired stock whenever the page is loaded
  await releaseExpiredReservations();

  const products = await prisma.product.findMany({
    include: {
      inventories: {
        include: {
          warehouse: true
        }
      }
    }
  });

  return (
    <main className="min-h-screen bg-background p-8 md:p-24">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="space-y-2">
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground">Product Catalog</h1>
          <p className="text-muted-foreground text-lg">Real-time inventory data directly from our warehouses.</p>
        </div>
        
        {products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed rounded-xl bg-muted/20">
            <p className="text-muted-foreground">No products found in the database.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {products.map((product) => (
              <ProductCard key={product.id} product={product as any} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}