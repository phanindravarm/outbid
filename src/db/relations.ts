import { relations } from "drizzle-orm";
import {
  users,
  profiles,
  listings,
  bids,
  transactions,
  sessions,
} from "./schema";

export const usersRelations = relations(users, ({ one, many }) => ({
  profile: one(profiles, {
    fields: [users.id],
    references: [profiles.userId],
  }),
  listings: many(listings),
  bids: many(bids),
  transactions: many(transactions),
  sessions: many(sessions),
}));

export const profilesRelations = relations(profiles, ({ one }) => ({
  user: one(users, {
    fields: [profiles.userId],
    references: [users.id],
  }),
}));

export const listingsRelations = relations(listings, ({ one, many }) => ({
  user: one(users, {
    fields: [listings.userId],
    references: [users.id],
  }),
  bids: many(bids),
}));

export const bidsRelations = relations(bids, ({ one, many }) => ({
  user: one(users, {
    fields: [bids.userId],
    references: [users.id],
  }),
  listing: one(listings, {
    fields: [bids.listingId],
    references: [listings.id],
  }),
  transactions: many(transactions),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  user: one(users, {
    fields: [transactions.userId],
    references: [users.id],
  }),
  bid: one(bids, {
    fields: [transactions.bidId],
    references: [bids.id],
  }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));
