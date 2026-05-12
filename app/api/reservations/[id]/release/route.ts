import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string; }>; }) {
    try {
        const {id} = await params;
        const result = await prisma.$transaction( async (tx) => {
                // Find reservation
                const reservation =
                    await tx.reservation.findUnique({where: {id}});
                    // Not found
                    if (!reservation) {
                        throw new Error("Reservation not found");
                    }
                    // Already released
                    if (reservation.status ==="RELEASED") {
                        throw new Error("Reservation already released");
                    }
                    // Already confirmed
                    if (reservation.status ==="CONFIRMED") {
                        throw new Error("Cannot release confirmed reservation");
                    }
                    // Find inventory
                    const inventory = await tx.inventory.findFirst({
                            where: {
                                productId:
                                    reservation.productId,
                                warehouseId:
                                    reservation.warehouseId,
                            },
                        });
                    // Restore stock
                    if (inventory) {
                        await tx.inventory.update({
                            where: {id:inventory.id},
                            data: {
                                reservedUnits: {decrement:reservation.quantity},
                            },
                        });
                    }
                    // Mark released
                    const updatedReservation = await tx.reservation.update({
                            where: {id:reservation.id,},
                            data: {status: "RELEASED"},
                        });

                    return updatedReservation;
                }
            );
        return NextResponse.json(
            {message:"Reservation released",reservation:result},
            {status: 200,}
        );

    } catch (error) {
        if (error instanceof Error) {
            if (error.message ==="Reservation not found") {
                return NextResponse.json(
                    {error:error.message},
                    {status: 404}
                );
            }
            if (error.message === "Reservation already released") {
                return NextResponse.json(
                    {error:error.message},
                    {status: 409,}
                );
            }

            if (error.message ==="Cannot release confirmed reservation") {
                return NextResponse.json(
                    {error:error.message},
                    {status: 409,}
                );
            }
        }
        // console.error(error);
        return NextResponse.json(
            {error:"Internal Server Error",},
            {status: 500,}
        );
    }
}