export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import Link from "next/link";
import { eq, desc } from "drizzle-orm";
import { db } from "@/db";
import { listings } from "@/db/schema";
import { getSession } from "@/lib/auth";

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  DRAFT: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
  PAUSED: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  CLOSED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

export default async function MyListingsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!session.hasProfile) redirect("/onboarding");

  const myListings = await db
    .select()
    .from(listings)
    .where(eq(listings.userId, session.userId))
    .orderBy(desc(listings.createdAt));

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Listings</h1>
          <p className="mt-1 text-zinc-600 dark:text-zinc-400">
            Manage your listings
          </p>
        </div>
        <Link
          href="/listings/new"
          className="rounded-lg bg-foreground px-4 py-2.5 text-sm font-semibold text-background transition-colors hover:bg-zinc-700 dark:hover:bg-zinc-300"
        >
          + New listing
        </Link>
      </div>

      {myListings.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 p-12 text-center dark:border-zinc-800">
          <p className="text-zinc-500">
            You haven&apos;t created any listings yet.
          </p>
          <Link
            href="/listings/new"
            className="mt-4 inline-block text-sm font-medium underline"
          >
            Create your first listing
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {myListings.map((listing) => (
            <div
              key={listing.id}
              className="flex items-center justify-between rounded-xl border border-zinc-200 p-5 dark:border-zinc-800"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-3">
                  <Link
                    href={`/listings/${listing.id}`}
                    className="truncate text-lg font-semibold hover:underline"
                  >
                    {listing.title}
                  </Link>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[listing.status] ?? ""}`}
                  >
                    {listing.status}
                  </span>
                </div>
                <p className="mt-1 text-sm text-zinc-500">
                  Created {new Date(listing.createdAt).toLocaleDateString()}
                </p>
              </div>
              <Link
                href={`/listings/${listing.id}/edit`}
                className="ml-4 shrink-0 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
              >
                Edit
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
