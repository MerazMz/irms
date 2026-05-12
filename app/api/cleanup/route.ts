import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";


export async function GET() {
    try{
        const result = await prisma.$transaction(async (tx)=>{
            //store all the expired and pending reservation in array
            const expiredReservations = await tx.reservation.findMany({
                where:{
                    status:"PENDING",
                    expiresAt:{lt : new Date()}
                }
            })
            if(expiredReservations.length===0){
                return {processed:0};
            }
            // iterate over expiredresvation and corresponding to that decrement reservation count
            // and mark as release
            for(const reservation of expiredReservations){
                const inventory = await tx.inventory.findFirst({
                    where:{
                        productId:reservation.productId,
                        warehouseId:reservation.warehouseId
                    }
                })
                if(inventory){
                    await tx.inventory.update({
                        where:{id:inventory.id},
                        data:{
                            reservedUnits:{decrement:reservation.quantity}
                        }
                    })
                }
                await tx.reservation.update({
                    where:{id:reservation.id},
                    data:{status:"RELEASED"}
                })
            }
            return {processed:expiredReservations.length}
        })
        return NextResponse.json({
            success:true,
            released:result.processed
        },{status:200})
    }catch(error){
        console.log(error);
        return NextResponse.json({
            error:"Cleanup Failed"
        },{status:500})
    }
}