"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import {
  ShoppingCart,
  Package,
  MapPin,
  Clock,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  Loader2,
} from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

interface Reservation {
  id: string
  productId: string
  warehouseId: string
  quantity: number
  expiresAt: string
  status: "PENDING" | "CONFIRMED" | "RELEASED"
  product: {
    name: string
    price: number
    description?: string
  }
  warehouse: {
    name: string
    city: string
  }
}

interface CheckoutPageProps {
  reservation: Reservation
}

export function CheckoutPage({ reservation: initialReservation }: CheckoutPageProps) {
  const router = useRouter()
  const [reservation, setReservation] = React.useState(initialReservation)
  const [timeLeft, setTimeLeft] = React.useState<string>("")
  const [isExpired, setIsExpired] = React.useState(false)
  const [isProcessing, setIsProcessing] = React.useState(false)

  // Generate a stable idempotency key for this confirmation attempt
  const idempotencyKey = React.useMemo(() => crypto.randomUUID(), [initialReservation.id])

  // Countdown timer logic
  React.useEffect(() => {
    if (reservation.status !== "PENDING") return

    const timer = setInterval(() => {
      const now = new Date().getTime()
      const expiry = new Date(reservation.expiresAt).getTime()
      const diff = expiry - now

      if (diff <= 0) {
        setTimeLeft("00:00")
        setIsExpired(true)
        setReservation(prev => ({ ...prev, status: "RELEASED" }))
        clearInterval(timer)
        return
      }

      const minutes = Math.floor(diff / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)
      setTimeLeft(
        `${minutes.toString().padStart(2, "0")}:${seconds
          .toString()
          .padStart(2, "0")}`
      )
    }, 1000)

    return () => clearInterval(timer)
  }, [reservation.expiresAt, reservation.status])

  const handleAction = async (action: "confirm" | "release") => {
    setIsProcessing(true)
    const endpoint = `/api/reservations/${reservation.id}/${action}`

    try {
      const response = await fetch(endpoint, { 
        method: "POST",
        headers: action === "confirm" ? { "Idempotency-Key": idempotencyKey } : {}
      })
      const data = await response.json()

      if (!response.ok) {
        // Handle specific error codes
        if (response.status === 409) {
          toast.error("Action Conflict", { description: data.error })
        } else if (response.status === 410) {
          setIsExpired(true)
          setReservation(prev => ({ ...prev, status: "RELEASED" }))
          toast.error("Reservation Expired", { description: "This stock has already been released." })
        } else {
          throw new Error(data.error || "Failed to process request")
        }
        return
      }

      // Success state
      if (action === "confirm") {
        setReservation(prev => ({ ...prev, status: "CONFIRMED" }))
        toast.success("Purchase Successful!", { description: "Your product has been secured." })
      } else {
        setReservation(prev => ({ ...prev, status: "RELEASED" }))
        toast.info("Reservation Cancelled", { description: "The stock has been returned to inventory." })
        setTimeout(() => router.push("/"), 2000)
      }
    } catch (error) {
      toast.error("Error", {
        description: error instanceof Error ? error.message : "Something went wrong",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Back Link */}
      <Link
        href="/"
        className="flex w-fit items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="size-4" />
        Back to Products
      </Link>

      <Card className="overflow-hidden border-2 shadow-xl">
        <CardHeader className={cn(
          "border-b transition-colors duration-500",
          reservation.status === "CONFIRMED" ? "bg-green-50/50 dark:bg-green-950/20" : 
          reservation.status === "RELEASED" ? "bg-red-50/50 dark:bg-red-950/20" : 
          "bg-primary/5"
        )}>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-2xl flex items-center gap-2">
                <ShoppingCart className="size-6" />
                Checkout
              </CardTitle>
              <CardDescription>
                Order ID: {reservation.id.slice(0, 8)}
              </CardDescription>
            </div>
            <Badge 
              variant={
                reservation.status === "CONFIRMED" ? "default" : 
                reservation.status === "RELEASED" ? "destructive" : 
                "secondary"
              }
              className="px-4 py-1 text-sm font-medium"
            >
              {reservation.status}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-8 space-y-8">
          {/* Status Alert */}
          {reservation.status === "PENDING" && !isExpired && (
            <div className="flex items-center gap-4 p-4 rounded-xl border-2 border-amber-200 bg-amber-50 text-amber-900 dark:bg-amber-950/30 dark:border-amber-900/50 dark:text-amber-200">
              <Clock className="size-8 animate-pulse shrink-0" />
              <div>
                <p className="font-bold">Reservation Expiry</p>
                <p className="text-sm opacity-90">Please confirm your purchase within <span className="font-mono font-bold text-lg">{timeLeft}</span></p>
              </div>
            </div>
          )}

          {reservation.status === "RELEASED" && (
            <div className="flex items-center gap-4 p-4 rounded-xl border-2 border-red-200 bg-red-50 text-red-900 dark:bg-red-950/30 dark:border-red-900/50 dark:text-red-200">
              <AlertCircle className="size-8 shrink-0" />
              <div>
                <p className="font-bold">Reservation Unavailable</p>
                <p className="text-sm opacity-90">This reservation has expired or was cancelled. Stock has been released.</p>
              </div>
            </div>
          )}

          {reservation.status === "CONFIRMED" && (
            <div className="flex items-center gap-4 p-4 rounded-xl border-2 border-green-200 bg-green-50 text-green-900 dark:bg-green-950/30 dark:border-green-900/50 dark:text-green-200">
              <CheckCircle2 className="size-8 shrink-0" />
              <div>
                <p className="font-bold">Purchase Confirmed!</p>
                <p className="text-sm opacity-90">Your items are secured and ready for fulfillment.</p>
              </div>
            </div>
          )}

          {/* Product Info */}
          <div className="grid sm:grid-cols-2 gap-8 pt-4">
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Product Details</h3>
              <div className="space-y-1">
                <p className="text-xl font-bold">{reservation.product.name}</p>
                <p className="text-muted-foreground text-sm line-clamp-2">{reservation.product.description}</p>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Package className="size-4 text-primary" />
                <span className="font-medium">{reservation.quantity} unit(s) reserved</span>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Location</h3>
              <div className="space-y-1">
                <p className="text-lg font-semibold">{reservation.warehouse.name}</p>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="size-4" />
                  <span>{reservation.warehouse.city}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="pt-6 border-t">
            <div className="flex justify-between items-center text-xl font-bold">
              <span>Total Price</span>
              <span className="text-primary text-2xl">₹{(reservation.product.price * reservation.quantity).toLocaleString()}</span>
            </div>
          </div>
        </CardContent>

        <CardFooter className="bg-muted/50 p-8 flex flex-col sm:flex-row gap-4 border-t">
          {reservation.status === "PENDING" && (
            <>
              <Button 
                variant="outline" 
                className="w-full sm:w-1/3" 
                onClick={() => handleAction("release")}
                disabled={isProcessing}
              >
                {isProcessing ? <Loader2 className="size-4 animate-spin" /> : "Cancel Reservation"}
              </Button>
              <Button 
                className="w-full sm:flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-lg h-12 shadow-lg shadow-primary/20 transition-all hover:scale-[1.02]" 
                onClick={() => handleAction("confirm")}
                disabled={isProcessing || isExpired}
              >
                {isProcessing ? <Loader2 className="size-4 animate-spin mr-2" /> : <CheckCircle2 className="size-5 mr-2" />}
                Confirm Purchase
              </Button>
            </>
          )}

          {reservation.status !== "PENDING" && (
            <Button asChild className="w-full py-6 text-lg font-bold">
              <Link href="/">
                <ArrowLeft className="mr-2 size-5" />
                Return to Shop
              </Link>
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  )
}
