"use client";
import * as React from "react";

import { Product } from "@/types/product";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import {
  Package,
  ShoppingCart,
} from "lucide-react";


import { ReservationModal } from "./ReservationModal";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({
  product,
}: ProductCardProps) {
  const [showModal, setShowModal] = React.useState(false);

  const totalStock =
    product.inventories?.reduce(
      (acc, inv) =>
        acc +
        (inv.totalUnits -
          inv.reservedUnits),
      0
    ) ?? 0;

  const stockLabel =
    totalStock === 0
      ? "Out of Stock"
      : totalStock < 10
      ? "Low Stock"
      : "In Stock";

  return (
    <>
      <Card className="flex h-full flex-col rounded-2xl border border-border/60 transition hover:shadow-md">

        {/* Header */}
        <CardHeader className="space-y-3">

          <div className="flex items-start justify-between gap-4">

            <div className="min-w-0 flex-1">
              <CardTitle className="truncate text-lg font-semibold">
                {product.name}
              </CardTitle>

              <CardDescription className="mt-1 line-clamp-2 min-h-[40px] text-sm">
                {product.description ||
                  "No description available"}
              </CardDescription>
            </div>

            <div className="shrink-0 text-right">
              <p className="text-lg font-bold" suppressHydrationWarning>
                ₹
                {product.price.toLocaleString()}
              </p>
            </div>
          </div>

          {/* Stock Status */}
          <div className="flex items-center justify-between">

            <Badge
              variant={
                totalStock === 0
                  ? "destructive"
                  : "secondary"
              }
              className="rounded-md"
            >
              {stockLabel}
            </Badge>

            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Package className="size-4" />
              <span>
                {totalStock} available
              </span>
            </div>
          </div>
        </CardHeader>

        {/* Content */}
        <CardContent className="flex-1">

          <div className="flex flex-wrap gap-2">

            {product.inventories
              ?.slice(0, 3)
              .map((inventory) => {
                const available =
                  inventory.totalUnits -
                  inventory.reservedUnits;

                return (
                  <Badge
                    key={inventory.id}
                    variant="outline"
                    className="font-normal"
                  >
                    {
                      inventory
                        .warehouse
                        .city
                    }

                    {" • "}

                    {available}
                  </Badge>
                );
              })}

            {(product.inventories
              ?.length ?? 0) >
              3 && (
              <Badge
                variant="outline"
              >
                +
                {(product
                  .inventories
                  ?.length ?? 0) -
                  3}{" "}
                more
              </Badge>
            )}
          </div>
        </CardContent>

        {/* Footer */}
        <CardFooter className="pt-2">
          <Button
            className="w-full cursor-pointer hover:text-green-500 hover:scale-[1.02] hover:shadow-md transition-all duration-100"
            disabled={totalStock === 0}
            onClick={() => setShowModal(true)}
          >
            <ShoppingCart className="mr-2 size-4 text-green-500" />
            Reserve Product
          </Button>
        </CardFooter>
      </Card>

      <ReservationModal
        product={product}
        open={showModal}
        onOpenChange={setShowModal}
      />
    </>
  );
}