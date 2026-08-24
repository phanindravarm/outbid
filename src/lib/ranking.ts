import { db } from "@/db";
import { bids, listings, profiles } from "@/db/schema";
import { eq, and, desc, sql, max, min } from "drizzle-orm";

/**
 * Ranking rule:
 * - Position determined by highest ACTIVE bid on each listing.
 * - Higher bid = higher position (rank 1 = top).
 * - Tie-breaker: earliest bid timestamp wins (lower rank number).
 * - Only ACTIVE listings with at least one ACTIVE bid are ranked.
 */

export interface RankedListing {
  rank: number;
  listingId: string;
  title: string;
  description: string | null;
  ownerName: string;
  ownerType: string;
  highestBid: number; // cents
  earliestTopBidAt: Date;
}

export async function getRankedListings(): Promise<RankedListing[]> {
  // Subquery: for each active listing, get its highest active bid amount
  // and the earliest timestamp among bids at that amount
  const results = await db
    .select({
      listingId: listings.id,
      title: listings.title,
      description: listings.description,
      ownerName: profiles.displayName,
      ownerType: profiles.userType,
      highestBid: max(bids.amount),
      earliestTopBidAt: min(bids.createdAt),
    })
    .from(listings)
    .innerJoin(profiles, eq(listings.userId, profiles.userId))
    .innerJoin(
      bids,
      and(eq(bids.listingId, listings.id), eq(bids.status, "ACTIVE")),
    )
    .where(eq(listings.status, "ACTIVE"))
    .groupBy(
      listings.id,
      listings.title,
      listings.description,
      profiles.displayName,
      profiles.userType,
    )
    .orderBy(
      desc(max(bids.amount)),
      sql`min(${bids.createdAt}) asc`,
    );

  return results.map((row, idx) => ({
    rank: idx + 1,
    listingId: row.listingId,
    title: row.title,
    description: row.description,
    ownerName: row.ownerName,
    ownerType: row.ownerType,
    highestBid: row.highestBid ?? 0,
    earliestTopBidAt: row.earliestTopBidAt ?? new Date(),
  }));
}

export async function getListingHighestBid(
  listingId: string,
): Promise<{ amount: number; bidderName: string; createdAt: Date } | null> {
  const [result] = await db
    .select({
      amount: bids.amount,
      bidderName: profiles.displayName,
      createdAt: bids.createdAt,
    })
    .from(bids)
    .innerJoin(profiles, eq(bids.userId, profiles.userId))
    .where(and(eq(bids.listingId, listingId), eq(bids.status, "ACTIVE")))
    .orderBy(desc(bids.amount), sql`${bids.createdAt} asc`)
    .limit(1);

  return result ?? null;
}

export async function getListingRank(listingId: string): Promise<number | null> {
  const ranked = await getRankedListings();
  const entry = ranked.find((r) => r.listingId === listingId);
  return entry?.rank ?? null;
}
