import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { releaseExpiredReservations } from "@/lib/reservation";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        await releaseExpiredReservations();
        const { id } = await params;

        // 1. Find the reservation
        const reservation = await prisma.reservation.findUnique({ where: { id } })
        if (!reservation) {
            return NextResponse.json({ error: "Reservation not found" }, { status: 404 })
        }

        // 2. State checks
        if (reservation.status === "CONFIRMED") {
            return NextResponse.json({ error: "Already Confirmed" }, { status: 409 });
        }
        if (reservation.status === "RELEASED") {
            return NextResponse.json({ error: "Reservation expired" }, { status: 410 });
        }

        // 3. Expiry check
        if (new Date() > reservation.expiresAt) {
            await prisma.$transaction(async (tx) => {
                const inventory = await tx.inventory.findFirst({
                    where: { productId: reservation.productId, warehouseId: reservation.warehouseId }
                })
                if (inventory) {
                    await tx.inventory.update({
                        where: { id: inventory.id },
                        data: { reservedUnits: { decrement: reservation.quantity } }
                    })
                }
                await tx.reservation.update({
                    where: { id: reservation.id },
                    data: { status: "RELEASED" }
                })
            })
            return NextResponse.json({ error: "Reservation expired" }, { status: 410 })
        }

        // 4. Atomic Transaction for Confirmation
        const updatedReservation = await prisma.$transaction(async (tx) => {
            const inventory = await tx.inventory.findFirst({
                where: { productId: reservation.productId, warehouseId: reservation.warehouseId }
            })

            if (!inventory) throw new Error("Inventory not found");

            // Decrement both total and reserved units
            await tx.inventory.update({
                where: { id: inventory.id },
                data: {
                    totalUnits: { decrement: reservation.quantity },
                    reservedUnits: { decrement: reservation.quantity }
                }
            })

            return await tx.reservation.update({
                where: { id },
                data: { status: "CONFIRMED" }
            })
        })

        return NextResponse.json({ message: "Purchase Confirmed", reservation: updatedReservation }, { status: 200 })

    } catch (error) {
        console.error("[Confirm] Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}