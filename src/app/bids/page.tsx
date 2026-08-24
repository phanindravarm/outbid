export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import Link from "next/link";
import { eq, desc } from "drizzle-orm";
import { db } from "@/db";
import { bids, listings } from "@/db/schema";
import { getSession } from "@/lib/auth";

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  OUTBID: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
  PENDING: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  CANCELLED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  WON: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  REFUNDED: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
};

export default async function MyBidsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!session.hasProfile) redirect("/onboarding");

  const myBids = await db
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

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">My Bids</h1>
        <p className="mt-1 text-zinc-600 dark:text-zinc-400">
          Track all your bids across listings
        </p>
      </div>

      {myBids.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 p-12 text-center dark:border-zinc-800">
          <p className="text-zinc-500">You haven&apos;t placed any bids yet.</p>
          <Link
            href="/listings"
            className="mt-4 inline-block text-sm font-medium underline"
          >
            Browse listings
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {myBids.map((bid) => (
            <div
              key={bid.id}
              className="flex items-center justify-between rounded-xl border border-zinc-200 p-5 dark:border-zinc-800"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-3">
                  <Link
                    href={`/listings/${bid.listingId}`}
                    className="truncate text-lg font-semibold hover:underline"
                  >
                    {bid.listingTitle}
                  </Link>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[bid.status] ?? ""}`}
                  >
                    {bid.status}
                  </span>
                </div>
                <p className="mt-1 text-sm text-zinc-500">
                  {new Date(bid.createdAt).toLocaleString()}
                </p>
              </div>
              <p className="ml-4 shrink-0 text-lg font-bold">
                ₹{(bid.amount / 100).toFixed(2)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
