import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { sessionOptions, SessionData } from '@/lib/session'
import LoginForm from './LoginForm'

export default async function LoginPage() {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions)

  if (session.organizerId) {
    redirect('/dashboard')
  }

  return <LoginForm />
}
