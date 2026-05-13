import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"
import { releaseExpiredReservations } from "@/lib/reservation"
import { 
  getOrLockIdempotency, 
  saveIdempotency, 
  deleteIdempotency 
} from "@/lib/idempotency"

export async function POST(req: NextRequest) {
    const idempotencyKey = req.headers.get("idempotency-key");
    const namespace = "reserve";

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

        // Cleanup expired reservations before checking stock
        await releaseExpiredReservations();

        const body = await req.json(); //fetch the request body
        const { productId, warehouseId, quantity } = body; //destructure it 

        //validation on incomplete request
        if (!productId || !warehouseId || !quantity) {
            if (idempotencyKey) await deleteIdempotency(namespace, idempotencyKey);
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        if (quantity <= 0) {
            if (idempotencyKey) await deleteIdempotency(namespace, idempotencyKey);
            return NextResponse.json({ error: "Quantity must be greater than 0" }, { status: 400 });
        }

        const inventory = await prisma.inventory.findFirst({
            where: { productId, warehouseId },
        })
        if (!inventory) {
            if (idempotencyKey) await deleteIdempotency(namespace, idempotencyKey);
            return NextResponse.json({ error: "Inventory not found" }, { status: 404 });
        }
        // formula = available = total-reserve
        const availableStock = inventory.totalUnits - inventory.reservedUnits;

        if (availableStock < quantity) {
            if (idempotencyKey) await deleteIdempotency(namespace, idempotencyKey);
            return NextResponse.json({ error: "Insufficient Stock" }, { status: 409 });
        }

        const reservation = await prisma.$transaction(async(tx)=>{
            const inventory = await tx.$queryRaw<any[]>`
            SELECT * FROM "Inventory" WHERE "productId"=${productId}
            AND "warehouseId"=${warehouseId} FOR UPDATE
            `;
            if(inventory.length===0){
                throw new Error("Inventory not found");
            }
            const item = inventory[0];
            const availableStock = item.totalUnits-item.reservedUnits;
            
            if(availableStock<quantity){
                throw new Error("Insufficient Stock");
            }
            const expiresAt = new Date(Date.now() + 10 * 60 * 1000);//for 10 min
            const reservation = await tx.reservation.create({
                data:{
                    productId,
                    warehouseId,
                    quantity,
                    expiresAt
                }
            })
            await tx.inventory.update({
                where:{id:item.id},
                data:{reservedUnits:{increment:quantity}}
            })
            return reservation;
        })

        const successResponse = { message: "Reservation created", reservation };
        
        // 2. Save Idempotency
        if (idempotencyKey) {
            await saveIdempotency(namespace, idempotencyKey, 201, successResponse);
        }

        return NextResponse.json(successResponse, { status: 201 })
    
    } catch(error){
        // 3. Handle Error & Release Lock
        if (idempotencyKey) await deleteIdempotency(namespace, idempotencyKey);

        if(error instanceof Error){
            if(error.message=="Inventory not found"){
                return NextResponse.json({error:error.message},{status:404})
            }
            if(error.message=="Insufficient Stock"){
                return NextResponse.json({error:error.message},{status:409})
            }
        }
        return NextResponse.json({error:"Internal server error"},{status:500})
    }
}

export async function GET(req:NextRequest) {
    const reservation = await prisma.reservation.findMany();
    if(reservation.length===0){
        return NextResponse.json({error:"No Reservation exits"},{status:404})
    }
    return NextResponse.json({reservation},{status:200})
}