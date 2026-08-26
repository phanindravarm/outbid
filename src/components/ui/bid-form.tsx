"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Script from "next/script";

interface BidFormProps {
  listingId: string;
  currentHighestBid: number | null; // paise
  minBidCents: number;
  userEmail: string;
}

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => {
      open: () => void;
      on: (event: string, callback: () => void) => void;
    };
  }
}

export function BidForm({
  listingId,
  currentHighestBid,
  minBidCents,
  userEmail,
}: BidFormProps) {
  const router = useRouter();
  const minRequired = currentHighestBid
    ? currentHighestBid + 100 // at least ₹1 more than current highest
    : minBidCents;

  const [amountRupees, setAmountRupees] = useState(
    (minRequired / 100).toFixed(2),
  );
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    const rupees = parseFloat(amountRupees);
    if (isNaN(rupees) || rupees <= 0) {
      setError("Enter a valid amount.");
      return;
    }

    const paise = Math.round(rupees * 100);
    if (paise < minRequired) {
      setError(`Minimum bid is ₹${(minRequired / 100).toFixed(2)}.`);
      return;
    }

    setLoading(true);
    try {
      // Step 1: Create bid + Razorpay order on server
      const res = await fetch("/api/bids", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId, amount: paise }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to create bid.");
        setLoading(false);
        return;
      }

      // Step 2: Open Razorpay Checkout
      const options = {
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        name: "OutBid",
        description: `Boost your listing rank`,
        order_id: data.orderId,
        prefill: {
          email: userEmail,
        },
        theme: {
          color: "#171717",
        },
        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          // Step 3: Verify payment on server
          try {
            const verifyRes = await fetch("/api/bids/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                bidId: data.bidId,
              }),
            });
            const verifyData = await verifyRes.json();

            if (!verifyRes.ok) {
              setError(verifyData.error || "Payment verification failed.");
            } else {
              setSuccess(
                `Bid of ₹${(paise / 100).toFixed(2)} placed successfully!`,
              );
              router.refresh();
            }
          } catch {
            setError("Payment verification failed. Please contact support.");
          }
          setLoading(false);
        },
        modal: {
          ondismiss: () => {
            setError("Payment was cancelled.");
            setLoading(false);
          },
        },
      };

      if (typeof window.Razorpay === "undefined") {
        setError("Payment system is loading. Please try again.");
        setLoading(false);
        return;
      }

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", () => {
        setError("Payment failed. Please try again.");
        setLoading(false);
      });
      rzp.open();
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <>
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="lazyOnload"
      />
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-lg bg-green-50 p-3 text-sm text-green-700 dark:bg-green-900/20 dark:text-green-400">
            {success}
          </div>
        )}

        <div>
          <label
            htmlFor="bid-amount"
            className="block text-sm font-medium mb-1.5"
          >
            Your bid (INR)
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-500">
              ₹
            </span>
            <input
              id="bid-amount"
              type="number"
              step="0.01"
              min={(minRequired / 100).toFixed(2)}
              required
              value={amountRupees}
              onChange={(e) => setAmountRupees(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 pl-7 pr-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-zinc-400 dark:focus:ring-zinc-400"
            />
          </div>
          <p className="mt-1 text-xs text-zinc-500">
            Minimum: ₹{(minRequired / 100).toFixed(2)}
            {currentHighestBid
              ? ` (current highest: ₹${(currentHighestBid / 100).toFixed(2)})`
              : ""}
          </p>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-foreground px-4 py-2.5 text-sm font-semibold text-background transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:hover:bg-zinc-300"
        >
          {loading ? "Processing..." : "Boost & pay"}
        </button>

        <p className="text-center text-xs text-zinc-400">
          Secured by Razorpay. You will be charged upon successful bid.
        </p>
      </form>
    </>
  );
}
