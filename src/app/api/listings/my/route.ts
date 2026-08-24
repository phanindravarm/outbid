import { NextResponse } from "next/server";
import { eq, desc } from "drizzle-orm";
import { db } from "@/db";
import { listings } from "@/db/schema";
import { getSession } from "@/lib/auth";

// GET /api/listings/my — get current user's listings
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const result = await db
      .select()
      .from(listings)
      .where(eq(listings.userId, session.userId))
      .orderBy(desc(listings.createdAt));

    return NextResponse.json({ listings: result });
  } catch (err) {
    console.error("My listings error:", err);
    return NextResponse.json(
      { error: "Failed to load listings." },
      { status: 500 },
    );
  }
}
