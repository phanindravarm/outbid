"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Script from "next/script";

interface UserListing {
  id: string;
  title: string;
  rank: number | null;
  currentHighestBid: number; // paise
}

interface HomepageBidProps {
  isLoggedIn: boolean;
  userEmail: string | null;
  userListings: UserListing[];
  topBidAmount: number;
  rankedBids: number[]; // all ranked bid amounts in descending order (paise)
}

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => {
      open: () => void;
      on: (event: string, callback: () => void) => void;
    };
  }
}

export function HomepageBid({
  isLoggedIn,
  userEmail,
  userListings,
  topBidAmount,
  rankedBids,
}: HomepageBidProps) {
  const router = useRouter();

  if (!isLoggedIn) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-8 dark:border-zinc-800 dark:bg-zinc-900">
        <Link
          href="/signup"
          className="inline-block rounded-full bg-foreground px-8 py-4 text-lg font-bold text-background transition-colors hover:bg-zinc-700 dark:hover:bg-zinc-300"
        >
          Sign up to claim #1
        </Link>
        <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
          Create a listing for your website and bid to rank higher.
        </p>
      </div>
    );
  }

  if (userListings.length === 0) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-8 dark:border-zinc-800 dark:bg-zinc-900">
        <Link
          href="/listings/new"
          className="inline-block rounded-full bg-foreground px-8 py-4 text-lg font-bold text-background transition-colors hover:bg-zinc-700 dark:hover:bg-zinc-300"
        >
          Create a listing first
        </Link>
        <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
          Add your website, then bid to claim the top spot.
        </p>
      </div>
    );
  }

  return (
    <>
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="lazyOnload"
      />
      <InlineBidForm
        userListings={userListings}
        topBidAmount={topBidAmount}
        rankedBids={rankedBids}
        userEmail={userEmail!}
        onSuccess={() => router.refresh()}
      />
    </>
  );
}

function InlineBidForm({
  userListings,
  topBidAmount,
  rankedBids,
  userEmail,
  onSuccess,
}: {
  userListings: UserListing[];
  topBidAmount: number;
  rankedBids: number[];
  userEmail: string;
  onSuccess: () => void;
}) {
  const [selectedListingId, setSelectedListingId] = useState(userListings[0].id);
  const selectedListing = userListings.find((l) => l.id === selectedListingId) ?? userListings[0];

  // Minimum total bid: listing's current highest bid + ₹1, or ₹1 minimum
  const minBid = Math.max(selectedListing.currentHighestBid + 100, 100);
  // Default to enough to claim #1, or minBid if no ranked bids
  const defaultBid = rankedBids.length > 0 ? rankedBids[0] + 100 : minBid;

  const [bidAmountPaise, setBidAmountPaise] = useState(defaultBid);

  // Projected rank based on current bid amount
  const projectedRank =
    bidAmountPaise > 0
      ? rankedBids.filter((bid) => bid >= bidAmountPaise).length + 1
      : rankedBids.length + 1;

  // Extra cost = new total bid - listing's current highest bid
  const extraCost = Math.max(0, bidAmountPaise - selectedListing.currentHighestBid);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");

  function handleDecrease() {
    // Decrease by ₹1 (100 paise), but not below minimum
    setBidAmountPaise((prev) => Math.max(minBid, prev - 100));
  }

  function handleIncrease() {
    // Increase by ₹1 (100 paise)
    setBidAmountPaise((prev) => prev + 100);
  }

  function handleListingChange(listingId: string) {
    setSelectedListingId(listingId);
    const listing = userListings.find((l) => l.id === listingId) ?? userListings[0];
    const newMin = Math.max(listing.currentHighestBid + 100, 100);
    const newDefault = rankedBids.length > 0 ? rankedBids[0] + 100 : newMin;
    setBidAmountPaise(newDefault);
    setError("");
    setSuccess("");
  }

  async function handleSubmit() {
    setError("");
    setSuccess("");

    if (extraCost <= 0) {
      setError("You already hold this rank or higher.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/bids", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId: selectedListing.id, amount: bidAmountPaise }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to create bid.");
        setLoading(false);
        return;
      }

      const options = {
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        name: "OutBid",
        description: "Boost your listing rank",
        order_id: data.orderId,
        prefill: { email: userEmail },
        theme: { color: "#171717" },
        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
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
              setSuccess("Bid placed! Your rank is updating...");
              onSuccess();
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
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-8 dark:border-zinc-800 dark:bg-zinc-900">
      {userListings.length > 1 ? (
        <div className="mb-4">
          <label htmlFor="listing-select" className="mb-1 block text-sm text-zinc-500">
            Bidding for
          </label>
          <select
            id="listing-select"
            value={selectedListingId}
            onChange={(e) => handleListingChange(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm font-semibold outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-zinc-400 dark:focus:ring-zinc-400"
          >
            {userListings.map((l) => (
              <option key={l.id} value={l.id}>
                {l.title}{l.rank ? ` (currently #${l.rank})` : ""}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <p className="mb-4 text-sm text-zinc-500">
          Bidding for{" "}
          <span className="font-semibold text-zinc-900 dark:text-zinc-100">
            {selectedListing.title}
          </span>
          {selectedListing.rank && (
            <span className="ml-2 text-xs">(currently #{selectedListing.rank})</span>
          )}
        </p>
      )}

      {error && (
        <div className="mb-3 rounded-lg bg-red-50 p-2 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-3 rounded-lg bg-green-50 p-2 text-sm text-green-700 dark:bg-green-900/20 dark:text-green-400">
          {success}
        </div>
      )}

      <div className="flex items-center justify-center gap-4">
        <button
          type="button"
          onClick={handleDecrease}
          disabled={loading || bidAmountPaise <= minBid}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-zinc-300 text-lg font-bold transition-colors hover:bg-zinc-200 disabled:opacity-30 dark:border-zinc-700 dark:hover:bg-zinc-800"
          aria-label="Decrease bid by ₹1"
        >
          −
        </button>

        <button
          onClick={handleSubmit}
          disabled={loading || extraCost <= 0}
          className="rounded-full bg-foreground px-8 py-3 text-sm font-bold text-background transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:hover:bg-zinc-300"
        >
          {loading
            ? "Processing..."
            : `Claim #${projectedRank} for ₹${(extraCost / 100).toFixed(0)}`}
        </button>

        <button
          type="button"
          onClick={handleIncrease}
          disabled={loading}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-zinc-300 text-lg font-bold transition-colors hover:bg-zinc-200 disabled:opacity-30 dark:border-zinc-700 dark:hover:bg-zinc-800"
          aria-label="Increase bid by ₹1"
        >
          +
        </button>
      </div>
    </div>
  );
}
