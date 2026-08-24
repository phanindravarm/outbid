import { NextResponse } from "next/server";
import { eq, and, desc } from "drizzle-orm";
import { db } from "@/db";
import { bids, listings, transactions } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { validateBidAmount, isValidUuid } from "@/lib/validation";
import { createRazorpayOrder } from "@/lib/payment";

// POST /api/bids — validate bid, create Razorpay order, return order ID
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
    if (!session.hasProfile) {
      return NextResponse.json(
        { error: "Complete onboarding first." },
        { status: 403 },
      );
    }

    const body = await request.json();
    const { listingId, amount } = body as {
      listingId?: string;
      amount?: unknown;
    };

    if (!listingId || !isValidUuid(listingId)) {
      return NextResponse.json(
        { error: "Valid listing ID is required." },
        { status: 400 },
      );
    }

    // Validate amount server-side (never trust client)
    const amountError = validateBidAmount(amount);
    if (amountError) {
      return NextResponse.json({ error: amountError }, { status: 400 });
    }
    const bidAmount = Number(amount); // in paise (smallest currency unit)

    // Verify listing exists and is active
    const [listing] = await db
      .select({
        id: listings.id,
        userId: listings.userId,
        status: listings.status,
      })
      .from(listings)
      .where(eq(listings.id, listingId))
      .limit(1);

    if (!listing || listing.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "Listing not found or not accepting bids." },
        { status: 404 },
      );
    }

    // Users cannot bid on their own listings
    if (listing.userId === session.userId) {
      return NextResponse.json(
        { error: "You cannot bid on your own listing." },
        { status: 400 },
      );
    }

    // Check if bid exceeds current highest active bid
    const [currentHighest] = await db
      .select({ amount: bids.amount })
      .from(bids)
      .where(and(eq(bids.listingId, listingId), eq(bids.status, "ACTIVE")))
      .orderBy(desc(bids.amount))
      .limit(1);

    if (currentHighest && bidAmount <= currentHighest.amount) {
      return NextResponse.json(
        {
          error: `Bid must be higher than the current highest bid of ₹${(currentHighest.amount / 100).toFixed(2)}.`,
        },
        { status: 400 },
      );
    }

    // Create bid as PENDING (not ACTIVE until payment verified)
    const [newBid] = await db
      .insert(bids)
      .values({
        userId: session.userId,
        listingId,
        amount: bidAmount,
        status: "PENDING",
      })
      .returning({ id: bids.id });

    // Create PENDING transaction
    const [txn] = await db
      .insert(transactions)
      .values({
        userId: session.userId,
        bidId: newBid.id,
        amount: bidAmount,
        status: "PENDING",
        providerName: "razorpay",
      })
      .returning({ id: transactions.id });

    // Create Razorpay order
    const order = await createRazorpayOrder({
      amountPaise: bidAmount,
      receipt: txn.id,
      notes: {
        bidId: newBid.id,
        listingId,
        userId: session.userId,
        transactionId: txn.id,
      },
    });

    // Store Razorpay order ID on the transaction
    await db
      .update(transactions)
      .set({ providerRef: order.id, status: "PROCESSING" })
      .where(eq(transactions.id, txn.id));

    return NextResponse.json(
      {
        bidId: newBid.id,
        transactionId: txn.id,
        orderId: order.id,
        amount: bidAmount,
        currency: "INR",
        keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      },
      { status: 201 },
    );
  } catch (err) {
    console.error("Place bid error:", err);
    return NextResponse.json(
      { error: "Failed to create bid. Please try again." },
      { status: 500 },
    );
  }
}

// GET /api/bids — get current user's bid history
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const userBids = await db
      .select({
        id: bids.id,
        listingId: bids.listingId,
        listingTitle: listings.title,
        amount: bids.amount,
        status: bids.status,
        createdAt: bids.createdAt,
      })
      .from(bids)
      .innerJoin(listings, eq(bids.listingId, listings.id))
      .where(eq(bids.userId, session.userId))
      .orderBy(desc(bids.createdAt));

    return NextResponse.json({ bids: userBids });
  } catch (err) {
    console.error("Get bids error:", err);
    return NextResponse.json(
      { error: "Failed to load bids." },
      { status: 500 },
    );
  }
}
