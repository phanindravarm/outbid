import { NextResponse } from "next/server";
import { eq, and, sql } from "drizzle-orm";
import { db } from "@/db";
import { bids, transactions } from "@/db/schema";
import { verifyWebhookSignature } from "@/lib/payment";

// POST /api/webhooks/razorpay — handle Razorpay webhook events
export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-razorpay-signature") ?? "";

    // Verify webhook signature
    const isValid = verifyWebhookSignature({ body: rawBody, signature });
    if (!isValid) {
      console.error("Razorpay webhook: invalid signature");
      return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
    }

    const event = JSON.parse(rawBody);
    const eventType = event.event as string;

    if (eventType === "payment.captured") {
      const payment = event.payload?.payment?.entity;
      if (!payment) return NextResponse.json({ ok: true });

      const orderId = payment.order_id as string;
      const paymentId = payment.id as string;

      // Find the transaction by Razorpay order ID
      const [txn] = await db
        .select({
          id: transactions.id,
          bidId: transactions.bidId,
          status: transactions.status,
        })
        .from(transactions)
        .where(eq(transactions.providerRef, orderId))
        .limit(1);

      if (!txn || !txn.bidId) {
        return NextResponse.json({ ok: true }); // already processed or no match
      }

      // Only process if not already completed
      if (txn.status === "COMPLETED") {
        return NextResponse.json({ ok: true });
      }

      // Get the bid
      const [bid] = await db
        .select({ id: bids.id, listingId: bids.listingId, status: bids.status })
        .from(bids)
        .where(eq(bids.id, txn.bidId))
        .limit(1);

      if (!bid) return NextResponse.json({ ok: true });

      // Mark previous active bids on this listing as OUTBID
      if (bid.status === "PENDING") {
        await db
          .update(bids)
          .set({ status: "OUTBID", updatedAt: new Date() })
          .where(
            and(
              eq(bids.listingId, bid.listingId),
              eq(bids.status, "ACTIVE"),
            ),
          );

        await db
          .update(bids)
          .set({ status: "ACTIVE", updatedAt: new Date() })
          .where(eq(bids.id, bid.id));
      }

      // Update transaction
      await db
        .update(transactions)
        .set({
          status: "COMPLETED",
          providerRef: `${orderId}|${paymentId}`,
          updatedAt: new Date(),
        })
        .where(eq(transactions.id, txn.id));
    }

    if (eventType === "payment.failed") {
      const payment = event.payload?.payment?.entity;
      if (!payment) return NextResponse.json({ ok: true });

      const orderId = payment.order_id as string;

      const [txn] = await db
        .select({ id: transactions.id, bidId: transactions.bidId })
        .from(transactions)
        .where(eq(transactions.providerRef, orderId))
        .limit(1);

      if (txn) {
        await db
          .update(transactions)
          .set({ status: "FAILED", updatedAt: new Date() })
          .where(eq(transactions.id, txn.id));

        if (txn.bidId) {
          await db
            .update(bids)
            .set({ status: "CANCELLED", updatedAt: new Date() })
            .where(eq(bids.id, txn.bidId));
        }
      }
    }

    if (eventType === "refund.created" || eventType === "refund.processed") {
      const refund = event.payload?.refund?.entity;
      if (!refund) return NextResponse.json({ ok: true });

      const refundPaymentId = refund.payment_id as string;

      // Find transaction by providerRef containing this payment ID (query in DB, not in memory)
      const [txn] = await db
        .select({ id: transactions.id, bidId: transactions.bidId })
        .from(transactions)
        .where(
          and(
            eq(transactions.status, "COMPLETED"),
            sql`${transactions.providerRef} LIKE ${'%' + refundPaymentId + '%'}`,
          ),
        )
        .limit(1);

      if (txn) {
        await db
          .update(transactions)
          .set({ status: "REFUNDED", updatedAt: new Date() })
          .where(eq(transactions.id, txn.id));

        if (txn.bidId) {
          await db
            .update(bids)
            .set({ status: "REFUNDED", updatedAt: new Date() })
            .where(eq(bids.id, txn.bidId));
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Razorpay webhook error:", err);
    return NextResponse.json({ ok: true }); // return 200 to prevent retries
  }
}
