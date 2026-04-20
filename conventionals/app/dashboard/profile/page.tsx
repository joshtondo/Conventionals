import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { sessionOptions, SessionData } from '@/lib/session'
import { getOrganizerById } from '@/data/auth'
import HamburgerDrawer from '@/components/HamburgerDrawer'
import OrganizerProfileForm from './OrganizerProfileForm'

export default async function OrganizerProfilePage() {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions)
  if (!session.organizerId) redirect('/login')

  const organizer = await getOrganizerById(session.organizerId)
  if (!organizer) redirect('/login')

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      <HamburgerDrawer variant="organizer" pageTitle="Profile" userName={organizer.name ?? ''} />
      <main style={{ padding: '20px 16px 40px', paddingTop: '72px', maxWidth: '520px', margin: '0 auto' }}>
        <OrganizerProfileForm name={organizer.name ?? ''} email={organizer.email} />
      </main>
    </div>
  )
}
