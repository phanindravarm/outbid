import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { bids, transactions } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { verifyPaymentSignature } from "@/lib/payment";

// POST /api/bids/verify — verify Razorpay payment after checkout
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = await request.json();
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      bidId,
    } = body as {
      razorpay_order_id?: string;
      razorpay_payment_id?: string;
      razorpay_signature?: string;
      bidId?: string;
    };

    if (
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature ||
      !bidId
    ) {
      return NextResponse.json(
        { error: "Missing payment verification data." },
        { status: 400 },
      );
    }

    // Verify Razorpay signature first (no DB needed)
    const isValid = verifyPaymentSignature({
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature,
    });

    if (!isValid) {
      // Mark as failed outside transaction — this is safe since it's a terminal state
      await db
        .update(bids)
        .set({ status: "CANCELLED", updatedAt: new Date() })
        .where(and(eq(bids.id, bidId), eq(bids.userId, session.userId)));
      await db
        .update(transactions)
        .set({ status: "FAILED", updatedAt: new Date() })
        .where(
          and(eq(transactions.bidId, bidId), eq(transactions.userId, session.userId)),
        );

      return NextResponse.json(
        { error: "Payment verification failed." },
        { status: 400 },
      );
    }

    // Wrap the activation in a transaction to prevent race conditions
    await db.transaction(async (tx) => {
      // Verify the bid belongs to this user and is PENDING
      const [bid] = await tx
        .select({
          id: bids.id,
          userId: bids.userId,
          listingId: bids.listingId,
          amount: bids.amount,
          status: bids.status,
        })
        .from(bids)
        .where(and(eq(bids.id, bidId), eq(bids.userId, session.userId)))
        .limit(1);

      if (!bid) {
        throw new Error("BID_NOT_FOUND");
      }
      if (bid.status !== "PENDING") {
        throw new Error("BID_ALREADY_PROCESSED");
      }

      // Verify the transaction matches
      const [txn] = await tx
        .select({ id: transactions.id, providerRef: transactions.providerRef })
        .from(transactions)
        .where(
          and(
            eq(transactions.bidId, bidId),
            eq(transactions.userId, session.userId),
          ),
        )
        .limit(1);

      if (!txn || txn.providerRef !== razorpay_order_id) {
        throw new Error("TRANSACTION_MISMATCH");
      }

      // Mark previous active bids on this listing as OUTBID
      await tx
        .update(bids)
        .set({ status: "OUTBID", updatedAt: new Date() })
        .where(
          and(eq(bids.listingId, bid.listingId), eq(bids.status, "ACTIVE")),
        );

      // Mark this bid as ACTIVE
      await tx
        .update(bids)
        .set({ status: "ACTIVE", updatedAt: new Date() })
        .where(eq(bids.id, bidId));

      // Mark transaction as COMPLETED
      await tx
        .update(transactions)
        .set({
          status: "COMPLETED",
          providerRef: `${razorpay_order_id}|${razorpay_payment_id}`,
          updatedAt: new Date(),
        })
        .where(eq(transactions.id, txn.id));
    });

    return NextResponse.json({ success: true, bidId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "";

    if (message === "BID_NOT_FOUND") {
      return NextResponse.json({ error: "Bid not found." }, { status: 404 });
    }
    if (message === "BID_ALREADY_PROCESSED") {
      return NextResponse.json(
        { error: "Bid has already been processed." },
        { status: 400 },
      );
    }
    if (message === "TRANSACTION_MISMATCH") {
      return NextResponse.json(
        { error: "Transaction mismatch." },
        { status: 400 },
      );
    }

    console.error("Verify payment error:", message);
    return NextResponse.json(
      { error: "Payment verification failed." },
      { status: 500 },
    );
  }
}
