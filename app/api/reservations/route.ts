import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
    try {
        const body = await req.json(); //fetch the request body
        const { productId, warehouseId, quantity } = body; //destructure it 

        //validation on incomplete request
        if (!productId || !warehouseId || !quantity) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        if (quantity <= 0) {
            return NextResponse.json({ error: "Quantity must be greater than 0" }, { status: 400 });
        }

        const inventory = await prisma.inventory.findFirst({
            where: { productId, warehouseId },
        })
        if (!inventory) {
            return NextResponse.json({ error: "Inventory not found" }, { status: 404 });
        }
        // formula = available = total-reserve
        const availableStock = inventory.totalUnits - inventory.reservedUnits;

        if (availableStock < quantity) {
            return NextResponse.json({ error: "Insufficient Stock" }, { status: 409 });
        }

        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);//for 10 min

        const reservation = await prisma.reservation.create({
            data: {
                productId,
                warehouseId,
                quantity,
                expiresAt,
            }
        })
        await prisma.inventory.update({
            where: { id: inventory.id, },
            data: { reservedUnits: { increment: quantity, } }
        });
        return NextResponse.json({ messsage: "Reservation created", reservation }, { status: 201 })
    
    }catch(error){
        console.log(error);
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