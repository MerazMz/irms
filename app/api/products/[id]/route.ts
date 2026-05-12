import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest,{params}: {params: Promise<{id: string}>}) {
  try {
    const { id } = await params;

    const product = await prisma.product.findUnique({
        where: { id },

        include: {
          inventories: {
            include: {
              warehouse: true,
            },
          },
        },
      });

    if (!product) {
      return NextResponse.json(
        {
          error:
            "Product not found",
        },
        {
          status: 404,
        }
      );
    }

    return NextResponse.json(
      product,
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error:
          "Failed to fetch product",
      },
      {
        status: 500,
      }
    );
  }
}