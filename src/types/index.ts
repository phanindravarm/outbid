import type { InferSelectModel, InferInsertModel } from "drizzle-orm";
import type {
  users,
  profiles,
  listings,
  bids,
  transactions,
} from "@/db/schema";

// ─── Enum types ──────────────────────────────────────────────────────────────

export type UserType = "PERSONAL" | "ORGANIZATION";
export type ListingStatus = "DRAFT" | "ACTIVE" | "PAUSED" | "CLOSED";
export type BidStatus =
  | "PENDING"
  | "ACTIVE"
  | "OUTBID"
  | "WON"
  | "CANCELLED"
  | "REFUNDED";
export type TransactionStatus =
  | "PENDING"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED"
  | "REFUNDED";

// ─── Select types (rows from DB) ────────────────────────────────────────────

export type User = InferSelectModel<typeof users>;
export type Profile = InferSelectModel<typeof profiles>;
export type Listing = InferSelectModel<typeof listings>;
export type Bid = InferSelectModel<typeof bids>;
export type Transaction = InferSelectModel<typeof transactions>;

// ─── Insert types (for creating rows) ───────────────────────────────────────

export type NewUser = InferInsertModel<typeof users>;
export type NewProfile = InferInsertModel<typeof profiles>;
export type NewListing = InferInsertModel<typeof listings>;
export type NewBid = InferInsertModel<typeof bids>;
export type NewTransaction = InferInsertModel<typeof transactions>;
