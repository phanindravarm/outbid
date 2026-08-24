import { NextResponse } from "next/server";
import { eq, desc } from "drizzle-orm";
import { db } from "@/db";
import { bids, profiles } from "@/db/schema";
import { isValidUuid } from "@/lib/validation";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/listings/[id]/bids — bid history for a listing
export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    if (!isValidUuid(id)) {
      return NextResponse.json({ error: "Invalid ID." }, { status: 400 });
    }

    const listingBids = await db
      .select({
        id: bids.id,
        amount: bids.amount,
        status: bids.status,
        createdAt: bids.createdAt,
        bidderName: profiles.displayName,
      })
      .from(bids)
      .innerJoin(profiles, eq(bids.userId, profiles.userId))
      .where(eq(bids.listingId, id))
      .orderBy(desc(bids.amount), desc(bids.createdAt));

    return NextResponse.json({ bids: listingBids });
  } catch (err) {
    console.error("Listing bids error:", err);
    return NextResponse.json(
      { error: "Failed to load bids." },
      { status: 500 },
    );
  }
}
