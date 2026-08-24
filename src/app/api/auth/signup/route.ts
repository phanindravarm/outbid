import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { hashPassword, createSession } from "@/lib/auth";
import { validateEmail, validatePassword } from "@/lib/validation";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for") ?? "unknown";
    const { allowed, retryAfterMs } = checkRateLimit(`signup:${ip}`, 3, 60 * 60 * 1000);
    if (!allowed) {
      return NextResponse.json(
        { error: `Too many signup attempts. Try again in ${Math.ceil(retryAfterMs / 60000)} minutes.` },
        { status: 429 },
      );
    }

    const body = await request.json();
    const { email, password } = body as { email?: string; password?: string };

    const emailError = validateEmail(email ?? "");
    if (emailError) {
      return NextResponse.json({ error: emailError }, { status: 400 });
    }

    const passwordError = validatePassword(password ?? "");
    if (passwordError) {
      return NextResponse.json({ error: passwordError }, { status: 400 });
    }

    const normalizedEmail = email!.trim().toLowerCase();

    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 },
      );
    }

    const passwordHash = await hashPassword(password!);

    const [user] = await db
      .insert(users)
      .values({ email: normalizedEmail, passwordHash })
      .returning({ id: users.id });

    await createSession(user.id);

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (err) {
    console.error("Signup error:", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
