import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { validateDisplayName, validateUrl } from "@/lib/validation";
import type { UserType } from "@/types";

interface OnboardingBody {
  userType?: string;
  displayName?: string;
  bio?: string;
  website?: string;
}

const VALID_USER_TYPES: UserType[] = ["PERSONAL", "ORGANIZATION"];

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    if (session.hasProfile) {
      return NextResponse.json(
        { error: "Onboarding already completed." },
        { status: 400 },
      );
    }

    const body = (await request.json()) as OnboardingBody;
    const { userType, displayName, bio, website } = body;

    if (!userType || !VALID_USER_TYPES.includes(userType as UserType)) {
      return NextResponse.json(
        { error: "Please select Personal or Organization." },
        { status: 400 },
      );
    }

    const nameError = validateDisplayName(displayName ?? "");
    if (nameError) {
      return NextResponse.json({ error: nameError }, { status: 400 });
    }

    if (website) {
      const urlError = validateUrl(website);
      if (urlError) {
        return NextResponse.json({ error: urlError }, { status: 400 });
      }
    }

    // Check for existing profile (race condition guard)
    const existing = await db
      .select({ id: profiles.id })
      .from(profiles)
      .where(eq(profiles.userId, session.userId))
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json(
        { error: "Onboarding already completed." },
        { status: 400 },
      );
    }

    await db.insert(profiles).values({
      userId: session.userId,
      userType: userType as UserType,
      displayName: displayName!.trim(),
      bio: bio?.trim() || null,
      website: website?.trim() || null,
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
