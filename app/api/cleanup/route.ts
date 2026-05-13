import { NextResponse, NextRequest } from "next/server"
import { releaseExpiredReservations } from "@/lib/reservation"

/**
 * Vercel Cron Job entry point.
 * Hits every minute to release expired reservations.
 */
export async function GET(req: NextRequest) {
  // Check for authorization (Vercel Cron sends a Bearer token)
  const authHeader = req.headers.get("authorization")
  
  // In development, we skip the secret check so you can test it manually
  if (process.env.NODE_ENV === "production") {
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
  }

  try {
    const releasedCount = await releaseExpiredReservations()
    
    return NextResponse.json({
      success: true,
      released: releasedCount,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error("[Cron] Cleanup failed:", error)
    return NextResponse.json({ error: "Cleanup failed" }, { status: 500 })
  }
}