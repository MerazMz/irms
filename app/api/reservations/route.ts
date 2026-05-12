import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
    // console.log("Reservation API HIT");
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
            // console.log(item);
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

        // const reservation = await prisma.reservation.create({
        //     data: {
        //         productId,
        //         warehouseId,
        //         quantity,
        //         expiresAt,
        //     }
        // // })
        // await prisma.inventory.update({
        //     where: { id: inventory.id, },
        //     data: { reservedUnits: { increment: quantity, } }
        // });
        return NextResponse.json({ messsage: "Reservation created", reservation }, { status: 201 })
    
    }catch(error){
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