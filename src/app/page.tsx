export const dynamic = "force-dynamic";

import Link from "next/link";
import { APP_NAME } from "@/lib/constants";
import { getRankedListings } from "@/lib/ranking";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { listings, bids, profiles, siteStats, transactions } from "@/db/schema";
import { eq, desc, and, sql, max } from "drizzle-orm";
import { HomepageBid } from "@/components/ui/homepage-bid";

export default async function Home() {
  const session = await getSession();

  let ranked: Awaited<ReturnType<typeof getRankedListings>> = [];
  let unranked: {
    id: string;
    title: string;
    url: string | null;
    description: string | null;
    createdAt: Date;
    ownerName: string;
    ownerType: string;
  }[] = [];
  let totalVisitors = 0;
  let totalRevenue = 0;
  let userListings: { id: string; title: string; rank: number | null; currentHighestBid: number }[] = [];

  try {
    const [rankedResult, visitorResult, revenueResult] = await Promise.all([
      getRankedListings(),
      db
        .select({ value: siteStats.value })
        .from(siteStats)
        .where(eq(siteStats.key, "total_visitors")),
      db
        .select({
          total: sql<number>`coalesce(sum(${transactions.amount}), 0)`,
        })
        .from(transactions)
        .where(eq(transactions.status, "COMPLETED")),
    ]);

    ranked = rankedResult;
    totalVisitors = visitorResult[0]?.value ?? 0;
    totalRevenue = revenueResult[0]?.total ?? 0;

    const rankedIds = ranked.map((r) => r.listingId);

    if (rankedIds.length > 0) {
      unranked = await db
        .select({
          id: listings.id,
          title: listings.title,
          url: listings.url,
          description: listings.description,
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
          createdAt: listings.createdAt,
          ownerName: profiles.displayName,
          ownerType: profiles.userType,
        })
        .from(listings)
        .innerJoin(profiles, eq(listings.userId, profiles.userId))
        .where(eq(listings.status, "ACTIVE"))
        .orderBy(desc(listings.createdAt));
    }

    // Fetch user's active listings with their current highest bid
    if (session) {
      const myListings = await db
        .select({
          id: listings.id,
          title: listings.title,
          highestBid: max(bids.amount),
        })
        .from(listings)
        .leftJoin(
          bids,
          and(eq(bids.listingId, listings.id), eq(bids.status, "ACTIVE")),
        )
        .where(
          and(
            eq(listings.userId, session.userId),
            eq(listings.status, "ACTIVE"),
          ),
        )
        .groupBy(listings.id, listings.title, listings.createdAt)
        .orderBy(desc(listings.createdAt));

      userListings = myListings.map((l) => ({
        id: l.id,
        title: l.title,
        rank: ranked.find((r) => r.listingId === l.id)?.rank ?? null,
        currentHighestBid: l.highestBid ?? 0,
      }));
    }
  } catch {
    // DB not available
  }

  const hasListings = ranked.length > 0 || unranked.length > 0;

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      {/* Compact Hero */}
      <div className="py-12 text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          {APP_NAME}
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-zinc-600 dark:text-zinc-400">
          List your website and bid to climb the ranks. The highest bidder
          gets the top spot.
        </p>
        {!session && (
          <div className="mt-6 flex items-center justify-center gap-4">
            <Link
              href="/signup"
              className="rounded-full bg-foreground px-6 py-3 text-sm font-semibold text-background transition-colors hover:bg-zinc-700 dark:hover:bg-zinc-300"
            >
              Get Started
            </Link>
            <Link
              href="/login"
              className="rounded-full border border-zinc-300 px-6 py-3 text-sm font-semibold transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
            >
              Log In
            </Link>
          </div>
        )}
      </div>

      {/* CTA + Stats */}
      <div className="mx-auto max-w-2xl space-y-6 pb-4 text-center">
        <HomepageBid
          isLoggedIn={!!session}
          userEmail={session?.email ?? null}
          userListings={userListings}
          topBidAmount={ranked.length > 0 ? ranked[0].highestBid : 0}
          rankedBids={ranked.map((r) => r.highestBid)}
        />

        {(totalVisitors > 0 || totalRevenue > 0) && (
          <p className="text-sm text-zinc-500">
            {totalVisitors.toLocaleString("en-IN")} visitor
            {totalVisitors !== 1 ? "s" : ""} ·{" "}
            ₹{(totalRevenue / 100).toLocaleString("en-IN")} earned
          </p>
        )}
      </div>

      {/* Listings */}
      <div className="py-10">
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
    </div>
  );
}
