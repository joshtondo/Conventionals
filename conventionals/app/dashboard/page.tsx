import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { sessionOptions, SessionData } from '@/lib/session'
import { getEvents } from '@/data/events'
import { getDashboardStats, getRecentAttendees } from '@/data/badges'
import { getOrganizerById } from '@/data/auth'
import DashboardClient from './DashboardClient'

export default async function DashboardPage() {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions)

  if (!session.organizerId) {
    redirect('/login')
  }

  const [eventList, statsList, organizer, recentAttendees] = await Promise.all([
    getEvents(session.organizerId),
    getDashboardStats(session.organizerId),
    getOrganizerById(session.organizerId),
    getRecentAttendees(session.organizerId),
  ])

  const stats = Object.fromEntries(
    statsList.map(s => [s.eventId, { total: s.total, checkedIn: s.checkedIn, emailsSent: s.emailsSent }])
  ) as Record<number, { total: number; checkedIn: number; emailsSent: number }>

  return <DashboardClient events={eventList} stats={stats} userName={organizer?.name ?? ''} recentAttendees={recentAttendees} />
}
