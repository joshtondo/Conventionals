import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { redirect, notFound } from 'next/navigation'
import { sessionOptions, SessionData } from '@/lib/session'
import { getEventById } from '@/data/events'
import { getAttendees } from '@/data/badges'
import { getOrganizerById } from '@/data/auth'
import UploadForm from './UploadForm'

export default async function UploadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const eventId = parseInt(id, 10)
  if (isNaN(eventId)) notFound()

  const session = await getIronSession<SessionData>(await cookies(), sessionOptions)
  if (!session.organizerId) redirect('/login')

  const [event, organizer, attendeeList] = await Promise.all([
    getEventById(eventId, session.organizerId),
    getOrganizerById(session.organizerId),
    getAttendees(eventId, session.organizerId),
  ])
  if (!event) notFound()

  return <UploadForm eventId={event.id} eventName={event.name} attendees={attendeeList} userName={organizer?.name ?? ''} />
}
