"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function NewListingPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"DRAFT" | "ACTIVE">("ACTIVE");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, status }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to create listing.");
        return;
      }

      router.refresh();
      router.push(`/listings/${data.id}`);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8">
      <Link
        href="/listings/my"
        className="text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
      >
        ← My listings
      </Link>

      <h1 className="mt-4 text-3xl font-bold tracking-tight">
        Create a listing
      </h1>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="title" className="block text-sm font-medium mb-1.5">
            Title
          </label>
          <input
            id="title"
            type="text"
            required
            minLength={3}
            maxLength={255}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-zinc-400 dark:focus:ring-zinc-400"
            placeholder="What are you listing?"
          />
        </div>

        <div>
          <label
            htmlFor="description"
            className="block text-sm font-medium mb-1.5"
          >
            Description
            <span className="ml-1 text-zinc-400">(optional)</span>
          </label>
          <textarea
            id="description"
            rows={5}
            maxLength={5000}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-zinc-400 dark:focus:ring-zinc-400"
            placeholder="Describe your listing in detail..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">
            Visibility
          </label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="status"
                value="ACTIVE"
                checked={status === "ACTIVE"}
                onChange={() => setStatus("ACTIVE")}
                className="accent-zinc-900 dark:accent-zinc-100"
              />
              Publish immediately
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="status"
                value="DRAFT"
                checked={status === "DRAFT"}
                onChange={() => setStatus("DRAFT")}
                className="accent-zinc-900 dark:accent-zinc-100"
              />
              Save as draft
            </label>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-foreground px-4 py-2.5 text-sm font-semibold text-background transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:hover:bg-zinc-300"
        >
          {loading ? "Creating..." : "Create listing"}
        </button>
      </form>
    </div>
  );
}
