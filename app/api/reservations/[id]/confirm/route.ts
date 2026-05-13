import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { releaseExpiredReservations } from "@/lib/reservation";
import { 
  getOrLockIdempotency, 
  saveIdempotency, 
  deleteIdempotency 
} from "@/lib/idempotency"

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const idempotencyKey = req.headers.get("idempotency-key");
    const { id } = await params;
    // Namespace includes ID to ensure key uniqueness per resource
    const namespace = `confirm:${id}`;

    try {
        // 1. Idempotency Check
        if (idempotencyKey) {
            const cached = await getOrLockIdempotency(namespace, idempotencyKey);
            if (cached) {
                if (cached.state === "PROCESSING") {
                    return NextResponse.json({ error: "Request already in progress" }, { status: 425 });
                }
                return NextResponse.json(cached.body, { status: cached.status });
            }
        }

        await releaseExpiredReservations();

        // 2. Find the reservation
        const reservation = await prisma.reservation.findUnique({ where: { id } })
        if (!reservation) {
            if (idempotencyKey) await deleteIdempotency(namespace, idempotencyKey);
            return NextResponse.json({ error: "Reservation not found" }, { status: 404 })
        }

        // 3. State checks
        if (reservation.status === "CONFIRMED") {
            const resBody = { error: "Already Confirmed" };
            if (idempotencyKey) await saveIdempotency(namespace, idempotencyKey, 409, resBody);
            return NextResponse.json(resBody, { status: 409 });
        }
        if (reservation.status === "RELEASED") {
            const resBody = { error: "Reservation expired" };
            if (idempotencyKey) await saveIdempotency(namespace, idempotencyKey, 410, resBody);
            return NextResponse.json(resBody, { status: 410 });
        }

        // 4. Expiry check
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
            const resBody = { error: "Reservation expired" };
            if (idempotencyKey) await saveIdempotency(namespace, idempotencyKey, 410, resBody);
            return NextResponse.json(resBody, { status: 410 })
        }

        // 5. Atomic Transaction for Confirmation
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

        const successResponse = { message: "Purchase Confirmed", reservation: updatedReservation };
        
        // 6. Save Idempotency
        if (idempotencyKey) {
            await saveIdempotency(namespace, idempotencyKey, 200, successResponse);
        }

        return NextResponse.json(successResponse, { status: 200 })

    } catch (error) {
        if (idempotencyKey) await deleteIdempotency(namespace, idempotencyKey);
        console.error("[Confirm] Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}