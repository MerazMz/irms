import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import { CheckoutPage } from "@/components/checkout/CheckoutPage"
import { releaseExpiredReservations } from "@/lib/reservation"

export const dynamic = "force-dynamic"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function ReservationCheckoutPage({ params }: PageProps) {
  // Cleanup expired stock first
  await releaseExpiredReservations()

  const { id } = await params

  const reservation = await prisma.reservation.findUnique({
    where: { id },
    include: {
      product: true,
      warehouse: true,
    },
  })

  if (!reservation) {
    notFound()
  }

  // Convert dates to strings for safe serialization to Client Component
  const serializedReservation = {
    ...reservation,
    createdAt: reservation.createdAt.toISOString(),
    expiresAt: reservation.expiresAt.toISOString(),
    updatedAt: reservation.updatedAt.toISOString(),
  }

  return (
    <main className="min-h-screen bg-muted/30 py-12 px-4">
      <div className="mx-auto max-w-2xl">
        <CheckoutPage reservation={serializedReservation as any} />
      </div>
    </main>
  )
}
