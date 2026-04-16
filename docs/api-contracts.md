# Conventionals — API Contracts

All routes are under `conventionals/app/api/`. All responses are JSON.

**Auth guards:**
- `withAuth` → requires `session.organizerId` (organizer session)
- `withAttendeeAuth` → requires `session.attendeeAccountId` (attendee session)
- Unguarded routes are public or handle their own auth logic

---

## Organizer Auth

### `POST /api/auth/register`
Create a new organizer account and set session.

**Request body:**
```json
{ "name": "string", "email": "string", "password": "string (8–1024 chars)" }
```
**Responses:**
- `200` `{ success: true }` — created and logged in
- `400` Missing/invalid fields or password length
- `409` Email already exists

---

### `POST /api/auth/login`
Log in as an organizer.

**Request body:**
```json
{ "email": "string", "password": "string" }
```
**Responses:**
- `200` `{ success: true }` — session set
- `400` Missing fields
- `401` Invalid credentials

---

### `POST /api/auth/logout`
Destroy organizer session.

**Responses:**
- `200` `{ success: true }`

---

### `GET /api/auth/me`
🔒 `withAuth` — return current organizer session info.

**Responses:**
- `200` `{ organizerId: number }`
- `401` Not authenticated

---

## Events (Organizer)

### `GET /api/events`
🔒 `withAuth` — list all events for the current organizer.

**Responses:**
- `200` `Array<{ id, name, eventDate, createdAt }>`

---

### `POST /api/events`
🔒 `withAuth` — create a new event.

**Request body:**
```json
{ "name": "string", "date": "YYYY-MM-DD | null" }
```
**Responses:**
- `201` `{ id, name, eventDate, createdAt }`
- `400` Missing name

---

### `DELETE /api/events/[id]`
🔒 `withAuth` — delete an event (cascades to attendees and badges).

**Responses:**
- `200` `{ success: true }`
- `400` Invalid ID
- `404` Event not found or not owned by caller

---

## Attendees / CSV Upload (Organizer)

### `POST /api/events/[id]/attendees`
🔒 `withAuth` — add one attendee (JSON) or bulk-import (CSV).

**Content-Type: `application/json`**
```json
{ "name": "string", "email": "string" }
```
- `201` `{ attendee, badge, qrDataUrl, emailSent }`
- `400` Missing fields or invalid event ID
- `404` Event not found
- `409` Attendee already registered

**Content-Type: `multipart/form-data`** (CSV upload, field name: `csv`)
- CSV must have `name` and `email` columns (case-insensitive)
- `200` `{ added: number, skipped: number }` — duplicates and bad rows are silently skipped
- Vercel `maxDuration = 60`

---

## Badges (Public + Organizer)

### `GET /api/badges/[token]`
Public — fetch badge info for display on the badge page.

**Responses:**
- `200` `{ name: string, eventName: string, token: string }`
- `404` Token not found

---

### `POST /api/badges/[token]/checkin`
Public — check in a badge by token (idempotent-ish).

**Responses:**
- `200` `{ checkedIn: true }` or `{ alreadyCheckedIn: true }`
- `404` Token not found

---

### `POST /api/badges/[token]/resend`
🔒 `withAuth` — resend badge email for a token.

**Responses:**
- `200` `{ success: true }`
- `404` Token not found or not owned by caller's events

---

## Attendee Auth

### `POST /api/attendee/auth/signup`
Create an attendee account via invite token.

**Request body:**
```json
{ "token": "uuid string", "password": "string (8–1024 chars)" }
```
**Responses:**
- `200` `{ success: true }` — account created and session set
- `400` Missing token/password, invalid password length, or token already used/invalid

---

### `POST /api/attendee/auth/login`
Log in as an attendee.

**Request body:**
```json
{ "email": "string", "password": "string" }
```
**Responses:**
- `200` `{ success: true }` — session set
- `400` Missing fields
- `401` Invalid credentials

---

### `POST /api/attendee/auth/logout`
Destroy attendee session.

**Responses:**
- `200` `{ success: true }`

---

## Attendee Profile

### `PATCH /api/attendee/profile`
🔒 `withAttendeeAuth` — update the current attendee's profile.

**Request body** (all fields optional):
```json
{
  "name": "string",
  "company": "string | null",
  "jobTitle": "string | null",
  "bio": "string | null",
  "socialLinks": { "linkedin": "string", "twitter": "string", "website": "string" },
  "isPublic": true
}
```
**Responses:**
- `200` `{ success: true }`
- `400` Name is empty string

---

## Attendee Connections

### `POST /api/attendee/connections`
🔒 `withAttendeeAuth` — save a new connection.

**Request body:**
```json
{
  "connectedName": "string",
  "contactInfo": { "email?": "string", "linkedin?": "string", "twitter?": "string", "website?": "string" },
  "eventId": "number | null"
}
```
**Responses:**
- `201` `{ id: number }`
- `400` Missing connectedName
- `409` Already connected (same name + event)

---

### `PATCH /api/attendee/connections/[id]`
🔒 `withAttendeeAuth` — update notes on a connection.

**Request body:**
```json
{ "notes": "string | null" }
```
**Responses:**
- `200` `{ success: true }`
- `400` Invalid id or notes type
- `404` Connection not found or not owned by caller
