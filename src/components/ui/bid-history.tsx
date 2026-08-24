"use client";

import { useState, useEffect } from "react";

interface BidEntry {
  id: string;
  amount: number;
  status: string;
  createdAt: string;
  bidderName: string;
}

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  OUTBID: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
  PENDING: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  CANCELLED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  WON: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  REFUNDED: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
};

export function BidHistory({ listingId }: { listingId: string }) {
  const [bidList, setBidList] = useState<BidEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/listings/${listingId}/bids`);
        const data = await res.json();
        if (res.ok) setBidList(data.bids);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [listingId]);

  if (loading) {
    return <p className="text-sm text-zinc-500">Loading bid history...</p>;
  }

  if (bidList.length === 0) {
    return <p className="text-sm text-zinc-500">No bids yet.</p>;
  }

  return (
    <div className="space-y-2">
      {bidList.map((bid) => (
        <div
          key={bid.id}
          className="flex items-center justify-between rounded-lg border border-zinc-200 px-4 py-3 dark:border-zinc-800"
        >
          <div className="min-w-0">
            <p className="text-sm font-medium">
              ₹{(bid.amount / 100).toFixed(2)}
            </p>
            <p className="text-xs text-zinc-500">
              {bid.bidderName} · {new Date(bid.createdAt).toLocaleString()}
            </p>
          </div>
          <span
            className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[bid.status] ?? ""}`}
          >
            {bid.status}
          </span>
        </div>
      ))}
    </div>
  );
}
