"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { UserType } from "@/types";

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<"type" | "profile">("type");
  const [userType, setUserType] = useState<UserType | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [website, setWebsite] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleTypeSelect(type: UserType) {
    setUserType(type);
    setStep("profile");
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userType, displayName, bio, website }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        return;
      }

      router.refresh();
      router.push("/dashboard");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (step === "type") {
    return (
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg space-y-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold tracking-tight">
              Welcome to OutBid
            </h1>
            <p className="mt-2 text-zinc-600 dark:text-zinc-400">
              How will you be using OutBid?
            </p>
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <button
              onClick={() => handleTypeSelect("PERSONAL")}
              className="flex flex-col items-center gap-3 rounded-xl border-2 border-zinc-200 p-6 text-center transition-colors hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:border-zinc-500 dark:hover:bg-zinc-900"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 text-2xl dark:bg-zinc-800">
                👤
              </div>
              <div>
                <h2 className="text-lg font-semibold">Personal</h2>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                  For individuals creating and bidding on listings
                </p>
              </div>
            </button>

            <button
              onClick={() => handleTypeSelect("ORGANIZATION")}
              className="flex flex-col items-center gap-3 rounded-xl border-2 border-zinc-200 p-6 text-center transition-colors hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:border-zinc-500 dark:hover:bg-zinc-900"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 text-2xl dark:bg-zinc-800">
                🏢
              </div>
              <div>
                <h2 className="text-lg font-semibold">Organization</h2>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                  For businesses and teams managing listings together
                </p>
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-8">
        <div>
          <button
            onClick={() => {
              setStep("type");
              setError("");
            }}
            className="text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
          >
            ← Back
          </button>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">
            {userType === "PERSONAL"
              ? "Set up your profile"
              : "Set up your organization"}
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            {userType === "PERSONAL"
              ? "Tell us a bit about yourself."
              : "Tell us about your organization."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </div>
          )}

          <div>
            <label
              htmlFor="displayName"
              className="block text-sm font-medium mb-1.5"
            >
              {userType === "PERSONAL" ? "Display name" : "Organization name"}
            </label>
            <input
              id="displayName"
              type="text"
              required
              minLength={2}
              maxLength={255}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-zinc-400 dark:focus:ring-zinc-400"
              placeholder={
                userType === "PERSONAL" ? "John Doe" : "Acme Inc."
              }
            />
          </div>

          <div>
            <label htmlFor="bio" className="block text-sm font-medium mb-1.5">
              {userType === "PERSONAL" ? "Bio" : "Description"}
              <span className="ml-1 text-zinc-400">(optional)</span>
            </label>
            <textarea
              id="bio"
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-zinc-400 dark:focus:ring-zinc-400"
              placeholder={
                userType === "PERSONAL"
                  ? "A short bio about yourself..."
                  : "What does your organization do?"
              }
            />
          </div>

          <div>
            <label
              htmlFor="website"
              className="block text-sm font-medium mb-1.5"
            >
              Website
              <span className="ml-1 text-zinc-400">(optional)</span>
            </label>
            <input
              id="website"
              type="url"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-zinc-400 dark:focus:ring-zinc-400"
              placeholder="https://example.com"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-foreground px-4 py-2.5 text-sm font-semibold text-background transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:hover:bg-zinc-300"
          >
            {loading ? "Saving..." : "Complete setup"}
          </button>
        </form>
      </div>
    </div>
  );
}
