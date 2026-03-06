import { redirect } from 'next/navigation'
import { headers } from 'next/headers'

export default async function RootPage() {
  const userId = (await headers()).get('x-clerk-user-id')
  if (userId) {
    redirect('/reports')
  }
  redirect('/sign-in')
}
