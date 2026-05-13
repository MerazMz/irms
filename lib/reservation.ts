import { prisma } from "./prisma"

/**
 * Releases all PENDING reservations that have passed their expiry date.
 * Restores the reserved units back to the inventory.
 */
export async function releaseExpiredReservations() {
  try {
    const now = new Date()
    
    // Find all expired pending reservations
    const expired = await prisma.reservation.findMany({
      where: {
        status: "PENDING",
        expiresAt: { lt: now },
      },
    })

    if (expired.length === 0) return 0

    return await prisma.$transaction(async (tx) => {
      let releasedCount = 0

      for (const res of expired) {
        // Update inventory first
        await tx.inventory.updateMany({
          where: {
            productId: res.productId,
            warehouseId: res.warehouseId,
          },
          data: {
            reservedUnits: { decrement: res.quantity },
          },
        })

        // Mark reservation as released
        await tx.reservation.update({
          where: { id: res.id },
          data: { status: "RELEASED" },
        })
        
        releasedCount++
      }

      return releasedCount
    })
  } catch (error) {
    console.error("[Cleanup] Failed to release expired reservations:", error)
    return 0
  }
}
