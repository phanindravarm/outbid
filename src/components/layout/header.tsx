import Link from "next/link";
import { APP_NAME } from "@/lib/constants";
import { getSession } from "@/lib/auth";
import { LogoutButton } from "@/components/ui/logout-button";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function Header() {
  let session: Awaited<ReturnType<typeof getSession>> = null;
  let profileData: { displayName: string; userType: string } | null = null;

  try {
    session = await getSession();
    if (session?.hasProfile) {
      const [profile] = await db
        .select({
          displayName: profiles.displayName,
          userType: profiles.userType,
        })
        .from(profiles)
        .where(eq(profiles.userId, session.userId))
        .limit(1);
      profileData = profile ?? null;
    }
  } catch {
    // DB not available — render public header
  }

  return (
    <header className="border-b border-zinc-200 dark:border-zinc-800">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="text-xl font-bold tracking-tight">
          {APP_NAME}
        </Link>
        <nav className="flex items-center gap-4">
          {session ? (
            <>
              <Link
                href="/profile"
                className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              >
                Profile
              </Link>
              <Link
                href="/listings"
                className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              >
                Browse
              </Link>
              
              <LogoutButton />
            </>
          ) : (
            <>
              <Link
                href="/listings"
                className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              >
                Listings
              </Link>
              <Link
                href="/login"
                className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-zinc-700 dark:hover:bg-zinc-300"
              >
                Sign up
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
