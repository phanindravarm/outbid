export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { listings, profiles } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { getListingHighestBid, getListingRank } from "@/lib/ranking";
import { MIN_BID_CENTS } from "@/lib/validation";
import { BidForm } from "@/components/ui/bid-form";
import { BidHistory } from "@/components/ui/bid-history";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ListingDetailPage({ params }: PageProps) {
  const { id } = await params;
  const session = await getSession();

  const [listing] = await db
    .select({
      id: listings.id,
      userId: listings.userId,
      title: listings.title,
      url: listings.url,
      description: listings.description,
      category: listings.category,
      status: listings.status,
      createdAt: listings.createdAt,
      updatedAt: listings.updatedAt,
      ownerName: profiles.displayName,
      ownerType: profiles.userType,
    })
    .from(listings)
    .innerJoin(profiles, eq(listings.userId, profiles.userId))
    .where(eq(listings.id, id))
    .limit(1);

  if (!listing) notFound();

  if (listing.status !== "ACTIVE" && listing.userId !== session?.userId) {
    notFound();
  }

  const isOwner = session?.userId === listing.userId;
  const highestBid = await getListingHighestBid(id);
  const rank = await getListingRank(id);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <Link
        href="/listings"
        className="text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
      >
        ← Back to listings
      </Link>

      <div className="mt-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              {rank && (
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-900 text-sm font-bold text-white dark:bg-zinc-100 dark:text-zinc-900">
                  #{rank}
                </span>
              )}
              <h1 className="text-3xl font-bold tracking-tight">
                {listing.title}
              </h1>
            </div>
            {listing.url && (
              <a
                href={listing.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-block text-sm text-blue-600 hover:underline dark:text-blue-400"
              >
                {listing.url} ↗
              </a>
            )}
            <div className="mt-2 flex items-center gap-3 text-sm text-zinc-500">
              {listing.category && (
                <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                  {listing.category.charAt(0) + listing.category.slice(1).toLowerCase()}
                </span>
              )}
              <span>
                {listing.ownerType === "PERSONAL" ? "👤" : "🏢"}{" "}
                {listing.ownerName}
              </span>
              <span>·</span>
              <span>
                Posted {new Date(listing.createdAt).toLocaleDateString()}
              </span>
              {listing.status !== "ACTIVE" && (
                <>
                  <span>·</span>
                  <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs font-medium dark:bg-zinc-800">
                    {listing.status}
                  </span>
                </>
              )}
            </div>
          </div>

          {isOwner && (
            <Link
              href={`/listings/${listing.id}/edit`}
              className="shrink-0 rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
            >
              Edit
            </Link>
          )}
        </div>

        {listing.description && (
          <div className="mt-6 whitespace-pre-wrap text-zinc-700 dark:text-zinc-300">
            {listing.description}
          </div>
        )}

        {/* Bid info + form */}
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          {/* Current bid status */}
          <div className="rounded-xl border border-zinc-200 p-6 dark:border-zinc-800">
            <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
              Highest Bid
            </h2>
            {highestBid ? (
              <>
                <p className="mt-1 text-3xl font-bold">
                  ₹{(highestBid.amount / 100).toFixed(2)}
                </p>
                <p className="mt-1 text-sm text-zinc-500">
                  by {highestBid.bidderName} ·{" "}
                  {new Date(highestBid.createdAt).toLocaleString()}
                </p>
              </>
            ) : (
              <>
                <p className="mt-1 text-3xl font-bold">₹0.00</p>
                <p className="mt-1 text-sm text-zinc-500">No bids yet</p>
              </>
            )}
            {rank && (
              <p className="mt-3 text-sm">
                Current rank: <span className="font-semibold">#{rank}</span>
              </p>
            )}
          </div>

          {/* Bid form (only for owner on active listings) */}
          {listing.status === "ACTIVE" && session && isOwner && (
            <div className="rounded-xl border border-zinc-200 p-6 dark:border-zinc-800">
              <h2 className="mb-4 text-sm font-medium text-zinc-500 dark:text-zinc-400">
                Boost Your Rank
              </h2>
              <BidForm
                listingId={listing.id}
                currentHighestBid={highestBid?.amount ?? null}
                minBidCents={MIN_BID_CENTS}
                userEmail={session.email}
              />
            </div>
          )}
        </div>

        {/* Bid history */}
        <div className="mt-8">
          <h2 className="mb-4 text-lg font-semibold">Bid History</h2>
          <BidHistory listingId={listing.id} />
        </div>
      </div>
    </div>
  );
}
