import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

//GET /api/products
export async function GET(req: NextRequest) {
    try{
        const products = await prisma.product.findMany()
        return NextResponse.json({products}, {status: 200})
    }catch(error){
        return NextResponse.json({error: "Failed to fetch products"}, {status: 500})
    }
}