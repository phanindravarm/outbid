export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { profiles, listings, bids } from "@/db/schema";
import { eq, and, count } from "drizzle-orm";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!session.hasProfile) redirect("/onboarding");

  const [profile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.userId, session.userId))
    .limit(1);

  const [listingStats] = await db
    .select({ total: count() })
    .from(listings)
    .where(eq(listings.userId, session.userId));

  const [activeStats] = await db
    .select({ total: count() })
    .from(listings)
    .where(
      and(
        eq(listings.userId, session.userId),
        eq(listings.status, "ACTIVE"),
      ),
    );

  const [bidStats] = await db
    .select({ total: count() })
    .from(bids)
    .where(
      and(eq(bids.userId, session.userId), eq(bids.status, "ACTIVE")),
    );

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-zinc-600 dark:text-zinc-400">
            Welcome back, {profile.displayName}
          </p>
        </div>
        <Link
          href="/listings/new"
          className="rounded-lg bg-foreground px-4 py-2.5 text-sm font-semibold text-background transition-colors hover:bg-zinc-700 dark:hover:bg-zinc-300"
        >
          + New listing
        </Link>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border border-zinc-200 p-6 dark:border-zinc-800">
          <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            Account Type
          </h2>
          <p className="mt-1 text-2xl font-semibold">
            {profile.userType === "PERSONAL" ? "Personal" : "Organization"}
          </p>
        </div>

        <Link
          href="/listings/my"
          className="rounded-xl border border-zinc-200 p-6 transition-colors hover:border-zinc-400 dark:border-zinc-800 dark:hover:border-zinc-600"
        >
          <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            My Listings
          </h2>
          <p className="mt-1 text-2xl font-semibold">{listingStats.total}</p>
          <p className="mt-1 text-sm text-zinc-500">
            {activeStats.total} active
          </p>
        </Link>

        <Link
          href="/bids"
          className="rounded-xl border border-zinc-200 p-6 transition-colors hover:border-zinc-400 dark:border-zinc-800 dark:hover:border-zinc-600"
        >
          <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            Active Bids
          </h2>
          <p className="mt-1 text-2xl font-semibold">{bidStats.total}</p>
          <p className="mt-1 text-sm text-zinc-500">View bid history</p>
        </Link>
      </div>
    </div>
  );
}
