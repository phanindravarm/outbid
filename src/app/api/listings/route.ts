import { NextResponse } from "next/server";
import { eq, desc } from "drizzle-orm";
import { db } from "@/db";
import { listings, profiles } from "@/db/schema";
import { getSession } from "@/lib/auth";
import {
  validateListingTitle,
  validateListingDescription,
  validateUrl,
  validateCategory,
} from "@/lib/validation";

// GET /api/listings — list active listings (public)
export async function GET() {
  try {
    const result = await db
      .select({
        id: listings.id,
        title: listings.title,
        url: listings.url,
        description: listings.description,
        category: listings.category,
        status: listings.status,
        createdAt: listings.createdAt,
        ownerName: profiles.displayName,
        ownerType: profiles.userType,
      })
      .from(listings)
      .innerJoin(profiles, eq(listings.userId, profiles.userId))
      .where(eq(listings.status, "ACTIVE"))
      .orderBy(desc(listings.createdAt));

    return NextResponse.json({ listings: result });
  } catch (err) {
    console.error("List listings error:", err);
    return NextResponse.json(
      { error: "Failed to load listings." },
      { status: 500 },
    );
  }
}

// POST /api/listings — create a listing
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
    if (!session.hasProfile) {
      return NextResponse.json(
        { error: "Complete onboarding first." },
        { status: 403 },
      );
    }

    const body = await request.json();
    const { title, url, description, status, category } = body as {
      title?: string;
      url?: string;
      description?: string;
      status?: string;
      category?: string;
    };

    const titleError = validateListingTitle(title ?? "");
    if (titleError) {
      return NextResponse.json({ error: titleError }, { status: 400 });
    }

    const urlError = validateUrl(url ?? "");
    if (urlError) {
      return NextResponse.json({ error: urlError }, { status: 400 });
    }

    const descError = validateListingDescription(description ?? "");
    if (descError) {
      return NextResponse.json({ error: descError }, { status: 400 });
    }

    const categoryError = validateCategory(category);
    if (categoryError) {
      return NextResponse.json({ error: categoryError }, { status: 400 });
    }

    const listingStatus =
      status === "ACTIVE" ? "ACTIVE" : ("DRAFT" as const);

    const [listing] = await db
      .insert(listings)
      .values({
        userId: session.userId,
        title: title!.trim(),
        url: url!.trim(),
        description: description?.trim() || null,
        category: category as "TECH" | "BUSINESS" | "BLOG" | "ECOMMERCE" | "PORTFOLIO" | "COMMUNITY" | "NEWS" | "ENTERTAINMENT",
        status: listingStatus,
      })
      .returning({ id: listings.id });

    return NextResponse.json({ id: listing.id }, { status: 201 });
  } catch (err) {
    console.error("Create listing error:", err);
    return NextResponse.json(
      { error: "Failed to create listing." },
      { status: 500 },
    );
  }
}
