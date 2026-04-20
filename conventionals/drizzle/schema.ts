import { pgTable, index, varchar, json, jsonb, timestamp, foreignKey, unique, serial, integer, text, boolean, date, uuid, pgEnum } from "drizzle-orm/pg-core"


export const session = pgTable("session", {
	sid: varchar().primaryKey().notNull(),
	sess: json().notNull(),
	expire: timestamp({ precision: 6, mode: 'string' }).notNull(),
}, (table) => [
	index("idx_session_expire").using("btree", table.expire.asc().nullsLast().op("timestamp_ops")),
]);

export const organizers = pgTable("organizers", {
	id: serial().primaryKey().notNull(),
	name: text('name'),
	email: text().notNull(),
	passwordHash: text("password_hash").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	unique("organizers_email_key").on(table.email),
]);

export const events = pgTable("events", {
	id: serial().primaryKey().notNull(),
	organizerId: integer("organizer_id").notNull(),
	name: text().notNull(),
	eventDate: date("event_date"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.organizerId],
			foreignColumns: [organizers.id],
			name: "events_organizer_id_fkey"
		}).onDelete("cascade"),
]);

export const attendees = pgTable("attendees", {
	id: serial().primaryKey().notNull(),
	eventId: integer("event_id").notNull(),
	name: text().notNull(),
	email: text().notNull(),
	badgeType: text("badge_type").default('General').notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	inviteToken: uuid('invite_token').notNull().defaultRandom(),
	inviteUsedAt: timestamp('invite_used_at', { withTimezone: true, mode: 'string' }),
}, (table) => [
	foreignKey({
			columns: [table.eventId],
			foreignColumns: [events.id],
			name: "attendees_event_id_fkey"
		}).onDelete("cascade"),
	unique("attendees_event_id_email_key").on(table.eventId, table.email),
]);

export const badges = pgTable("badges", {
	id: serial().primaryKey().notNull(),
	attendeeId: integer("attendee_id").notNull(),
	token: text().notNull(),
	emailSent: boolean("email_sent").default(false),
	checkedIn: boolean("checked_in").default(false),
	checkedInAt: timestamp("checked_in_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.attendeeId],
			foreignColumns: [attendees.id],
			name: "badges_attendee_id_fkey"
		}).onDelete("cascade"),
	unique("badges_token_key").on(table.token),
]);

export const attendeeAccounts = pgTable('attendee_accounts', {
	id: serial('id').primaryKey(),
	email: varchar('email', { length: 255 }).notNull().unique(),
	passwordHash: varchar('password_hash', { length: 255 }).notNull(),
	name: varchar('name', { length: 255 }).notNull(),
	company: varchar('company', { length: 255 }),
	jobTitle: varchar('job_title', { length: 255 }),
	bio: text('bio'),
	socialLinks: jsonb('social_links').$type<{ linkedin?: string; twitter?: string; website?: string }>(),
	isPublic: boolean('is_public').notNull().default(true),
	createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
})

export const connections = pgTable('connections', {
	id: serial('id').primaryKey(),
	ownerId: integer('owner_id').notNull().references(() => attendeeAccounts.id, { onDelete: 'cascade' }),
	connectedName: varchar('connected_name', { length: 255 }).notNull(),
	contactInfo: jsonb('contact_info').$type<{ email?: string; linkedin?: string; twitter?: string; website?: string }>(),
	notes: text('notes'),
	eventId: integer('event_id').references(() => events.id, { onDelete: 'set null' }),
	createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
	updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
})

export const resetUserTypeEnum = pgEnum('reset_user_type', ['organizer', 'attendee'])

export const passwordResetTokens = pgTable('password_reset_tokens', {
	id: serial('id').primaryKey(),
	userType: resetUserTypeEnum('user_type').notNull(),
	email: text('email').notNull(),
	token: text('token').notNull(),
	expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'string' }).notNull(),
	usedAt: timestamp('used_at', { withTimezone: true, mode: 'string' }),
	createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	unique('password_reset_tokens_token_key').on(table.token),
])

export const notifications = pgTable('notifications', {
	id: serial('id').primaryKey(),
	organizerId: integer('organizer_id').notNull().references(() => organizers.id, { onDelete: 'cascade' }),
	type: text('type').notNull(), // 'checkin' | 'registration' | 'announcement'
	title: text('title').notNull(),
	message: text('message').notNull(),
	read: boolean('read').notNull().default(false),
	createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow(),
})
