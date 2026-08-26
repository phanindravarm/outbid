export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import Link from "next/link";
import { eq, desc } from "drizzle-orm";
import { db } from "@/db";
import { profiles, listings } from "@/db/schema";
import { getSession } from "@/lib/auth";

const LISTING_STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  DRAFT: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
  PAUSED: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  CLOSED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};


export default async function ProfilePage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!session.hasProfile) redirect("/onboarding");

  const [profile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.userId, session.userId))
    .limit(1);

  const myListings = await db
    .select()
    .from(listings)
    .where(eq(listings.userId, session.userId))
    .orderBy(desc(listings.createdAt));

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Profile Info */}
      <div className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
        <div className="mt-4 rounded-xl border border-zinc-200 p-6 dark:border-zinc-800">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-zinc-900 text-xl font-bold text-white dark:bg-zinc-100 dark:text-zinc-900">
              {profile.displayName.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl font-semibold">{profile.displayName}</h2>
              <p className="text-sm text-zinc-500">
                {profile.userType === "PERSONAL" ? "Personal" : "Organization"} · {session.email}
              </p>
            </div>
          </div>
          {profile.bio && (
            <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
              {profile.bio}
            </p>
          )}
          {profile.website && (
            <a
              href={profile.website}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-block text-sm text-blue-600 hover:underline dark:text-blue-400"
            >
              {profile.website} ↗
            </a>
          )}
        </div>
      </div>

      {/* My Listings */}
      <div className="mb-10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">My Listings</h2>
          <Link
            href="/listings/new"
            className="rounded-lg bg-foreground px-4 py-2 text-sm font-semibold text-background transition-colors hover:bg-zinc-700 dark:hover:bg-zinc-300"
          >
            + New listing
          </Link>
        </div>

        {myListings.length === 0 ? (
          <div className="rounded-xl border border-zinc-200 p-8 text-center dark:border-zinc-800">
            <p className="text-zinc-500">
              You haven&apos;t created any listings yet.
            </p>
            <Link
              href="/listings/new"
              className="mt-3 inline-block text-sm font-medium underline"
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
                      className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${LISTING_STATUS_COLORS[listing.status] ?? ""}`}
                    >
                      {listing.status}
                    </span>
                    {listing.category && (
                      <span className="shrink-0 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                        {listing.category.charAt(0) + listing.category.slice(1).toLowerCase()}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-zinc-500">
                    {listing.url && (
                      <span className="mr-2">{listing.url}</span>
                    )}
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

    </div>
  );
}
