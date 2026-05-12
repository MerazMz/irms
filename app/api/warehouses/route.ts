import {prisma} from "@/lib/prisma"
import { NextRequest,NextResponse } from "next/server"


export async function GET(req:NextRequest){
    try{
        const warehouse = await prisma.warehouse.findMany();
        return NextResponse.json({"warehouse":warehouse},{status:200});
    }catch(err){
        return NextResponse.json({"error":"Failed to fetch warehouse"},{status:500})
    }
}