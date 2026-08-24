import Link from "next/link";
import { APP_NAME } from "@/lib/constants";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-24 text-center">
      <h1 className="text-5xl font-bold tracking-tight sm:text-6xl">
        {APP_NAME}
      </h1>
      <p className="mt-6 max-w-xl text-lg leading-8 text-zinc-600 dark:text-zinc-400">
        Create listings and place bids to climb the ranks. The highest bidder
        gets the top spot.
      </p>
      <div className="mt-10 flex items-center gap-4">
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
    </div>
  );
}
