import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { sessionOptions, SessionData } from '@/lib/session'
import RegisterForm from './RegisterForm'

export default async function RegisterPage() {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions)

  if (session.organizerId) {
    redirect('/dashboard')
  }

  return <RegisterForm />
}
