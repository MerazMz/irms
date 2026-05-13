import { prisma } from "@/lib/prisma";
import { NextRequest,NextResponse } from "next/server";
import { releaseExpiredReservations } from "@/lib/reservation";

export async function POST(req:NextRequest, {params}:{params: Promise<{id:string}>} ){
    try{
        await releaseExpiredReservations();
        const {id} = await params;
        //find the reservation
        const reservation = await prisma.reservation.findUnique({where:{id}})
        if(!reservation){
            return NextResponse.json({error:"Reservation not found"},{status:404})
        }

        //agar already confirmed hai to skip
        if(reservation.status==="CONFIRMED"){
            return NextResponse.json({error:"Already Confirmed"},{status:409});
        }
        if(reservation.status=="RELEASED"){
            return NextResponse.json({error:"Reservation expired"},{status:410});
        }

        //expiry check
        if(new Date() > reservation.expiresAt){
            //if expired then first release the stock
            const inventory = await prisma.inventory.findFirst({
                where:{
                    productId:reservation.productId,
                    warehouseId:reservation.warehouseId
                }
            })


            if(inventory){
                await prisma.inventory.update({
                    where: {id:inventory.id},
                    data:{
                        reservedUnits: {decrement: reservation.quantity}
                    }
                })
            }

            await prisma.reservation.update({
                where:{id:reservation.id},
                data:{status:"RELEASED"}
            })
            return NextResponse.json({error:"Reservation expired"},{status:410})

        }

        //valid purchase
        const inventory = await prisma.inventory.findFirst({
            where:{productId:reservation.productId, warehouseId:reservation.warehouseId}
        })
        if(inventory){
            await prisma.inventory.update({
                where:{id:inventory.id},
                data:{
                    totalUnits:{decrement:reservation.quantity},
                    reservedUnits:{decrement:reservation.quantity}
                }
            })
        }
        const updatedReservation = await prisma.reservation.update({
            where: {id},
            data:{status:"CONFIRMED"}
        })
        return NextResponse.json({message:"Purchase Confirmed", reservation: updatedReservation},{status:200})

    }catch(error){
        // console.log(error);
        return NextResponse.json({error:"Internal Server Error"},{status:500})
    }
}