import { relations } from "drizzle-orm/relations";
import { attendees, badges, organizers, events } from "./schema";

export const badgesRelations = relations(badges, ({one}) => ({
	attendee: one(attendees, {
		fields: [badges.attendeeId],
		references: [attendees.id]
	}),
}));

export const attendeesRelations = relations(attendees, ({one, many}) => ({
	badges: many(badges),
	event: one(events, {
		fields: [attendees.eventId],
		references: [events.id]
	}),
}));

export const eventsRelations = relations(events, ({one, many}) => ({
	organizer: one(organizers, {
		fields: [events.organizerId],
		references: [organizers.id]
	}),
	attendees: many(attendees),
}));

export const organizersRelations = relations(organizers, ({many}) => ({
	events: many(events),
}));