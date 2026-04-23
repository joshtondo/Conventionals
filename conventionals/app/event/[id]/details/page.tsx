import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { sessionOptions, SessionData } from '@/lib/session'
import { getEventById } from '@/data/events'
import HamburgerDrawer from '@/components/HamburgerDrawer'
import { getOrganizerById } from '@/data/auth'
import EventDetailsForm from './EventDetailsForm'

export default async function EventDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const eventId = parseInt(id, 10)
  if (isNaN(eventId)) notFound()

  const session = await getIronSession<SessionData>(await cookies(), sessionOptions)
  if (!session.organizerId) redirect('/login')

  const [event, organizer] = await Promise.all([
    getEventById(eventId, session.organizerId),
    getOrganizerById(session.organizerId),
  ])

  if (!event) notFound()

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      <HamburgerDrawer variant="organizer" pageTitle="Event Details" userName={organizer?.name ?? ''} />
      <main style={{ padding: '20px 16px 48px', paddingTop: '72px', maxWidth: '600px', margin: '0 auto' }}>

        <Link
          href="/dashboard/schedule"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '13px',
            fontWeight: 600,
            color: '#475569',
            textDecoration: 'none',
            marginBottom: '20px',
          }}
        >
          ← Back to Schedule
        </Link>

        <div style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
        }}>
          <div style={{
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '0.06em',
            textTransform: 'uppercase' as const,
            color: '#9ca3af',
            marginBottom: '4px',
          }}>
            Edit Event
          </div>
          <h1 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: '0 0 24px', lineHeight: 1.25 }}>
            {event.name}
          </h1>

          <EventDetailsForm
            eventId={eventId}
            initial={{
              name: event.name,
              eventDate: event.eventDate ?? null,
              description: event.description ?? null,
              location: event.location ?? null,
              startTime: event.startTime ?? null,
              endTime: event.endTime ?? null,
              website: event.website ?? null,
            }}
          />
        </div>

        {/* Action links */}
        <div style={{ display: 'flex', gap: '10px', marginTop: '16px', flexWrap: 'wrap' }}>
          <Link href={`/event/${eventId}/upload`} style={{
            fontSize: '13px', fontWeight: 600, color: '#6366f1', textDecoration: 'none',
            background: '#ede9fe', border: '1px solid #c4b5fd', borderRadius: '20px', padding: '8px 16px',
          }}>
            Manage Attendees →
          </Link>
          <Link href={`/event/${eventId}/scan`} style={{
            fontSize: '13px', fontWeight: 600, color: '#059669', textDecoration: 'none',
            background: '#d1fae5', border: '1px solid #6ee7b7', borderRadius: '20px', padding: '8px 16px',
          }}>
            📷 Scan Check-In
          </Link>
        </div>
      </main>
    </div>
  )
}
