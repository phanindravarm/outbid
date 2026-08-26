export const dynamic = "force-dynamic";

import Link from "next/link";
import { getRankedListings } from "@/lib/ranking";
import { db } from "@/db";
import { listings, profiles } from "@/db/schema";
import { eq, desc, and, sql } from "drizzle-orm";

export default async function PublicListingsPage() {
  let ranked: Awaited<ReturnType<typeof getRankedListings>> = [];
  let unranked: {
    id: string;
    title: string;
    url: string | null;
    description: string | null;
    category: string | null;
    createdAt: Date;
    ownerName: string;
    ownerType: string;
  }[] = [];

  try {
    ranked = await getRankedListings();

    const rankedIds = ranked.map((r) => r.listingId);

    // Get active listings that have no active bids (unranked)
    if (rankedIds.length > 0) {
      unranked = await db
        .select({
          id: listings.id,
          title: listings.title,
          url: listings.url,
          description: listings.description,
          category: listings.category,
          createdAt: listings.createdAt,
          ownerName: profiles.displayName,
          ownerType: profiles.userType,
        })
        .from(listings)
        .innerJoin(profiles, eq(listings.userId, profiles.userId))
        .where(
          and(
            eq(listings.status, "ACTIVE"),
            sql`${listings.id} NOT IN (${sql.join(
              rankedIds.map((id) => sql`${id}`),
              sql`, `,
            )})`,
          ),
        )
        .orderBy(desc(listings.createdAt));
    } else {
      unranked = await db
        .select({
          id: listings.id,
          title: listings.title,
          url: listings.url,
          description: listings.description,
          category: listings.category,
          createdAt: listings.createdAt,
          ownerName: profiles.displayName,
          ownerType: profiles.userType,
        })
        .from(listings)
        .innerJoin(profiles, eq(listings.userId, profiles.userId))
        .where(eq(listings.status, "ACTIVE"))
        .orderBy(desc(listings.createdAt));
    }
  } catch {
    // DB not available
  }

  const hasListings = ranked.length > 0 || unranked.length > 0;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Listings</h1>
          <p className="mt-1 text-zinc-600 dark:text-zinc-400">
            Browse all active listings, ranked by highest bid
          </p>
        </div>
      </div>

      {!hasListings ? (
        <div className="rounded-xl border border-zinc-200 p-12 text-center dark:border-zinc-800">
          <p className="text-zinc-500">No active listings yet.</p>
        </div>
      ) : (
        <div className="space-y-10">
          {/* Ranked listings */}
          {ranked.length > 0 && (
            <div>
              <h2 className="mb-4 text-lg font-semibold">
                Ranked Listings
              </h2>
              <div className="space-y-3">
                {ranked.map((item) => (
                  <Link
                    key={item.listingId}
                    href={`/listings/${item.listingId}`}
                    className="group flex items-center gap-4 rounded-xl border border-zinc-200 p-5 transition-colors hover:border-zinc-400 dark:border-zinc-800 dark:hover:border-zinc-600"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-sm font-bold text-white dark:bg-zinc-100 dark:text-zinc-900">
                      #{item.rank}
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-lg font-semibold group-hover:underline">
                        {item.title}
                      </h3>
                      {item.url && (
                        <span className="mt-0.5 inline-block text-xs text-blue-600 dark:text-blue-400">
                          {item.url} ↗
                        </span>
                      )}
                      {item.description && (
                        <p className="mt-1 line-clamp-1 text-sm text-zinc-600 dark:text-zinc-400">
                          {item.description}
                        </p>
                      )}
                      <div className="mt-1 flex items-center gap-2 text-xs text-zinc-500">
                        {item.category && (
                          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                            {item.category.charAt(0) + item.category.slice(1).toLowerCase()}
                          </span>
                        )}
                        <span>
                          {item.ownerType === "PERSONAL" ? "👤" : "🏢"}{" "}
                          {item.ownerName}
                        </span>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-lg font-bold">
                        ₹{(item.highestBid / 100).toFixed(2)}
                      </p>
                      <p className="text-xs text-zinc-500">highest bid</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Unranked listings */}
          {unranked.length > 0 && (
            <div>
              <h2 className="mb-4 text-lg font-semibold">
                {ranked.length > 0 ? "Other Listings" : "All Listings"}
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {unranked.map((listing) => (
                  <Link
                    key={listing.id}
                    href={`/listings/${listing.id}`}
                    className="group rounded-xl border border-zinc-200 p-6 transition-colors hover:border-zinc-400 dark:border-zinc-800 dark:hover:border-zinc-600"
                  >
                    <h3 className="text-lg font-semibold group-hover:underline">
                      {listing.title}
                    </h3>
                    {listing.url && (
                      <span className="mt-0.5 inline-block text-xs text-blue-600 dark:text-blue-400">
                        {listing.url} ↗
                      </span>
                    )}
                    {listing.description && (
                      <p className="mt-2 line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400">
                        {listing.description}
                      </p>
                    )}
                    <div className="mt-4 flex items-center gap-2 text-xs text-zinc-500">
                      <span>
                        {listing.ownerType === "PERSONAL" ? "👤" : "🏢"}{" "}
                        {listing.ownerName}
                      </span>
                      <span>·</span>
                      <span>
                        {new Date(listing.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
