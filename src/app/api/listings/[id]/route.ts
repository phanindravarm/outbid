import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { listings, profiles } from "@/db/schema";
import { getSession } from "@/lib/auth";
import {
  validateListingTitle,
  validateListingDescription,
  isValidUuid,
} from "@/lib/validation";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/listings/[id] — get a single listing (public for active, owner for any)
export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    if (!isValidUuid(id)) {
      return NextResponse.json({ error: "Invalid ID." }, { status: 400 });
    }
    const session = await getSession();

    const [listing] = await db
      .select({
        id: listings.id,
        userId: listings.userId,
        title: listings.title,
        description: listings.description,
        status: listings.status,
        createdAt: listings.createdAt,
        updatedAt: listings.updatedAt,
        ownerName: profiles.displayName,
        ownerType: profiles.userType,
      })
      .from(listings)
      .innerJoin(profiles, eq(listings.userId, profiles.userId))
      .where(eq(listings.id, id))
      .limit(1);

    if (!listing) {
      return NextResponse.json(
        { error: "Listing not found." },
        { status: 404 },
      );
    }

    // Non-active listings are only visible to their owner
    if (listing.status !== "ACTIVE" && listing.userId !== session?.userId) {
      return NextResponse.json(
        { error: "Listing not found." },
        { status: 404 },
      );
    }

    return NextResponse.json({ listing });
  } catch (err) {
    console.error("Get listing error:", err);
    return NextResponse.json(
      { error: "Failed to load listing." },
      { status: 500 },
    );
  }
}

// PATCH /api/listings/[id] — update a listing (owner only)
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    if (!isValidUuid(id)) {
      return NextResponse.json({ error: "Invalid ID." }, { status: 400 });
    }
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    // Ownership check
    const [existing] = await db
      .select({ userId: listings.userId, status: listings.status })
      .from(listings)
      .where(eq(listings.id, id))
      .limit(1);

    if (!existing || existing.userId !== session.userId) {
      return NextResponse.json(
        { error: "Listing not found." },
        { status: 404 },
      );
    }

    const body = await request.json();
    const { title, description, status } = body as {
      title?: string;
      description?: string;
      status?: string;
    };

    const updates: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (title !== undefined) {
      const titleError = validateListingTitle(title);
      if (titleError) {
        return NextResponse.json({ error: titleError }, { status: 400 });
      }
      updates.title = title.trim();
    }

    if (description !== undefined) {
      const descError = validateListingDescription(description);
      if (descError) {
        return NextResponse.json({ error: descError }, { status: 400 });
      }
      updates.description = description.trim() || null;
    }

    if (status !== undefined) {
      const validStatuses = ["DRAFT", "ACTIVE", "PAUSED", "CLOSED"];
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          { error: "Invalid status." },
          { status: 400 },
        );
      }
      updates.status = status;
    }

    await db
      .update(listings)
      .set(updates)
      .where(and(eq(listings.id, id), eq(listings.userId, session.userId)));

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Update listing error:", err);
    return NextResponse.json(
      { error: "Failed to update listing." },
      { status: 500 },
    );
  }
}

// DELETE /api/listings/[id] — deactivate a listing (owner only, sets status to CLOSED)
export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    if (!isValidUuid(id)) {
      return NextResponse.json({ error: "Invalid ID." }, { status: 400 });
    }
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const [existing] = await db
      .select({ userId: listings.userId })
      .from(listings)
      .where(eq(listings.id, id))
      .limit(1);

    if (!existing || existing.userId !== session.userId) {
      return NextResponse.json(
        { error: "Listing not found." },
        { status: 404 },
      );
    }

    await db
      .update(listings)
      .set({ status: "CLOSED", updatedAt: new Date() })
      .where(and(eq(listings.id, id), eq(listings.userId, session.userId)));

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Delete listing error:", err);
    return NextResponse.json(
      { error: "Failed to delete listing." },
      { status: 500 },
    );
  }
}
