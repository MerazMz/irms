"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Product } from "@/types/product"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { ShoppingCart, Package, MapPin, Loader2 } from "lucide-react"

interface ReservationModalProps {
  product: Product
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ReservationModal({
  product,
  open,
  onOpenChange,
}: ReservationModalProps) {
  const router = useRouter()
  // Filter warehouses that actually have stock
  const availableInventories = product.inventories.filter(
    (inv) => inv.totalUnits - inv.reservedUnits > 0
  )

  const [selectedWarehouseId, setSelectedWarehouseId] = React.useState<string>(() => {
    return availableInventories.length === 1 ? availableInventories[0].warehouse.id : ""
  })
  const [quantity, setQuantity] = React.useState<number>(1)
  const [isLoading, setIsLoading] = React.useState(false)
  const [idempotencyKey, setIdempotencyKey] = React.useState<string>("")

  // Generate a new idempotency key whenever the modal is opened
  React.useEffect(() => {
    if (open) {
      setIdempotencyKey(crypto.randomUUID())
    }
  }, [open])

  const selectedInventory = availableInventories.find(
    (inv) => inv.warehouse.id === selectedWarehouseId
  )
  const maxAvailable = selectedInventory
    ? selectedInventory.totalUnits - selectedInventory.reservedUnits
    : 0

  const handleReserve = async () => {
    if (!selectedWarehouseId) {
      toast.error("Please select a warehouse")
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch("/api/reservations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify({
          productId: product.id,
          warehouseId: selectedWarehouseId,
          quantity,
        }),
      })

      if (!response.ok) {
        let errorMessage = "Failed to create reservation"
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorMessage
        } catch (e) {
          errorMessage = `Server Error (${response.status})`
        }
        throw new Error(errorMessage)
      }

      const data = await response.json()

      toast.success("Reservation successful!", {
        description: `Reserved ${quantity} unit(s) of ${product.name}. Redirecting to checkout...`,
      })
      onOpenChange(false)
      
      // Redirect to the checkout page
      router.push(`/checkout/${data.reservation.id}`)
    } catch (error) {
      toast.error("Reservation failed", {
        description: error instanceof Error ? error.message : "Something went wrong",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="size-5 text-primary" />
            Confirm Reservation
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to reserve this product? This will hold the stock for 10 minutes.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          {/* Product Summary */}
          <div className="flex items-center gap-4 rounded-lg border bg-muted p-3">
            <div className="flex size-10 items-center justify-center rounded-md bg-muted">
              <Package className="size-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{product.name}</p>
              <p className="text-xs text-muted-foreground font-medium">
                ₹{product.price.toLocaleString()}
              </p>
            </div>
          </div>

          {/* Warehouse Selection */}
          <div className="grid gap-2">
            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2">
              <MapPin className="size-3.5" />
              Select Warehouse
            </label>
            <Select
              value={selectedWarehouseId}
              onValueChange={setSelectedWarehouseId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose a location..." />
              </SelectTrigger>
              <SelectContent position="popper">
                {availableInventories.map((inv) => (
                  <SelectItem key={inv.warehouse.id} value={inv.warehouse.id}>
                    {inv.warehouse.name} ({inv.warehouse.city}) — {inv.totalUnits - inv.reservedUnits} in stock
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Quantity Selection */}
          <div className="grid gap-2">
            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2">
              <Package className="size-3.5" />
              Quantity
            </label>
            <div className="flex items-center gap-3">
              <Input
                type="number"
                min={1}
                max={maxAvailable}
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                className="w-full"
              />
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                Max: {maxAvailable}
              </span>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            No, Cancel
          </Button>
          <Button onClick={handleReserve} disabled={isLoading || !selectedWarehouseId} className="hover:text-green-500 hover:text-green-400 transition-colors duration-100 hover:outline-white hover:outline-1">
            {isLoading ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Reserving...
              </>
            ) : (
              "Confirm & Reserve"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
