import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { releaseExpiredReservations } from "@/lib/reservation";

//GET /api/products
export async function GET(req: NextRequest) {
    try{
        // Automatically cleanup expired reservations before fetching
        await releaseExpiredReservations();

        const products = await prisma.product.findMany({
            include: {
                inventories: {
                    include: {
                        warehouse: true
                    }
                }
            }
        })
        return NextResponse.json({products}, {status: 200})
    }catch(error){
        return NextResponse.json({error: "Failed to fetch products"}, {status: 500})
    }
}