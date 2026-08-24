import { NextResponse } from "next/server";
import { getRankedListings } from "@/lib/ranking";

// GET /api/rankings — server-computed ranked listings
export async function GET() {
  try {
    const ranked = await getRankedListings();
    return NextResponse.json({ rankings: ranked });
  } catch (err) {
    console.error("Rankings error:", err);
    return NextResponse.json(
      { error: "Failed to load rankings." },
      { status: 500 },
    );
  }
}
