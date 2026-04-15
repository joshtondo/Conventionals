import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { redirect, notFound } from 'next/navigation'
import { sessionOptions, SessionData } from '@/lib/session'
import { getEventById } from '@/data/events'
import HamburgerDrawer from '@/components/HamburgerDrawer'
import QRScanner from './QRScanner'

export default async function ScanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const eventId = parseInt(id, 10)
  if (isNaN(eventId)) notFound()

  const session = await getIronSession<SessionData>(await cookies(), sessionOptions)
  if (!session.organizerId) redirect('/login')

  const event = await getEventById(eventId, session.organizerId)
  if (!event) notFound()

  return (
    <>
      <HamburgerDrawer variant="organizer" />
      <QRScanner eventId={eventId} eventName={event.name} />
    </>
  )
}
