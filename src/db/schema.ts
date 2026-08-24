import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  integer,
  pgEnum,
  index,
  uniqueIndex,
  boolean,
} from "drizzle-orm/pg-core";

// ─── Enums ───────────────────────────────────────────────────────────────────

export const userTypeEnum = pgEnum("user_type", [
  "PERSONAL",
  "ORGANIZATION",
]);

export const listingStatusEnum = pgEnum("listing_status", [
  "DRAFT",
  "ACTIVE",
  "PAUSED",
  "CLOSED",
]);

export const bidStatusEnum = pgEnum("bid_status", [
  "PENDING",
  "ACTIVE",
  "OUTBID",
  "WON",
  "CANCELLED",
  "REFUNDED",
]);

export const transactionStatusEnum = pgEnum("transaction_status", [
  "PENDING",
  "PROCESSING",
  "COMPLETED",
  "FAILED",
  "REFUNDED",
]);

// ─── Users ───────────────────────────────────────────────────────────────────

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: varchar("email", { length: 255 }).notNull(),
    passwordHash: varchar("password_hash", { length: 255 }).notNull(),
    emailVerified: boolean("email_verified").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [uniqueIndex("users_email_idx").on(table.email)],
);

// ─── Profiles ────────────────────────────────────────────────────────────────

export const profiles = pgTable(
  "profiles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    userType: userTypeEnum("user_type").notNull(),
    displayName: varchar("display_name", { length: 255 }).notNull(),
    bio: text("bio"),
    avatarUrl: varchar("avatar_url", { length: 512 }),
    website: varchar("website", { length: 512 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [uniqueIndex("profiles_user_id_idx").on(table.userId)],
);

// ─── Listings ────────────────────────────────────────────────────────────────

export const listings = pgTable(
  "listings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),
    status: listingStatusEnum("status").default("DRAFT").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("listings_user_id_idx").on(table.userId),
    index("listings_status_idx").on(table.status),
  ],
);

// ─── Bids ────────────────────────────────────────────────────────────────────

export const bids = pgTable(
  "bids",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    listingId: uuid("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    amount: integer("amount").notNull(), // stored in cents
    status: bidStatusEnum("status").default("PENDING").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("bids_user_id_idx").on(table.userId),
    index("bids_listing_id_idx").on(table.listingId),
    index("bids_status_idx").on(table.status),
    index("bids_amount_idx").on(table.amount),
  ],
);

// ─── Transactions ────────────────────────────────────────────────────────────

export const transactions = pgTable(
  "transactions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    bidId: uuid("bid_id").references(() => bids.id, {
      onDelete: "set null",
    }),
    amount: integer("amount").notNull(), // stored in cents
    status: transactionStatusEnum("status").default("PENDING").notNull(),
    providerRef: varchar("provider_ref", { length: 255 }),
    providerName: varchar("provider_name", { length: 100 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("transactions_user_id_idx").on(table.userId),
    index("transactions_bid_id_idx").on(table.bidId),
    index("transactions_status_idx").on(table.status),
    index("transactions_provider_ref_idx").on(table.providerRef),
  ],
);

// ─── Sessions ────────────────────────────────────────────────────────────────

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    token: varchar("token", { length: 255 }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("sessions_token_idx").on(table.token),
    index("sessions_user_id_idx").on(table.userId),
    index("sessions_expires_at_idx").on(table.expiresAt),
  ],
);
