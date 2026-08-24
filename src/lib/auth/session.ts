import { cookies } from "next/headers";
import { randomBytes } from "crypto";
import { eq, and, gt } from "drizzle-orm";
import { db } from "@/db";
import { sessions, users, profiles } from "@/db/schema";

const SESSION_COOKIE = "outbid_session";
const SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function generateToken(): string {
  return randomBytes(32).toString("hex");
}

export async function createSession(userId: string): Promise<string> {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_MS);

  await db.insert(sessions).values({ userId, token, expiresAt });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_MS / 1000,
  });

  return token;
}

export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const result = await db
    .select({
      sessionId: sessions.id,
      userId: users.id,
      email: users.email,
      hasProfile: profiles.id,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .leftJoin(profiles, eq(users.id, profiles.userId))
    .where(and(eq(sessions.token, token), gt(sessions.expiresAt, new Date())))
    .limit(1);

  if (result.length === 0) return null;

  const row = result[0];
  return {
    sessionId: row.sessionId,
    userId: row.userId,
    email: row.email,
    hasProfile: row.hasProfile !== null,
  };
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (token) {
    await db.delete(sessions).where(eq(sessions.token, token));
    cookieStore.delete(SESSION_COOKIE);
  }
}
