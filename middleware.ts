import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks(.*)',
])

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    const { userId } = await auth()
    if (!userId) return NextResponse.redirect(new URL('/sign-in', req.url))

    const requestHeaders = new Headers(req.headers)
    requestHeaders.delete('x-clerk-user-id') // strip any client-supplied value
    requestHeaders.set('x-clerk-user-id', userId)
    return NextResponse.next({ request: { headers: requestHeaders } })
  }
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
