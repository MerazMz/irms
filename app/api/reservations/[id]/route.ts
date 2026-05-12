import {prisma} from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest,{params}: {params: Promise<{id: string}>}){
    try{
        const {id} = await params;
        const reservation = await prisma.reservation.findUnique({
            where:{id},
            include:{product:true, warehouse:true}
        })

        if(!reservation){
            return NextResponse.json({error:"Reservation not found"},{status:404})
        }
        return NextResponse.json({"reservation":reservation},{status:200})

    }catch(error){
        return NextResponse.json({error:"Internal Server Error"},{status:500});
    }
}