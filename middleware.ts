import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Add paths that should be accessible without authentication
const publicPaths = ['/Login', '/Signup', '/']

export function middleware(request: NextRequest) {
  const sessionToken = request.cookies.get('sessionToken')?.value
  const { pathname } = request.nextUrl

  // Allow access to public paths
  if (publicPaths.includes(pathname)) {
    // If user is already logged in and tries to access login/signup, redirect to dashboard
    if (sessionToken && (pathname === '/Login' || pathname === '/Signup')) {
      return NextResponse.redirect(new URL('/Dashboard', request.url))
    }
    return NextResponse.next()
  }

  // Check if user is authenticated
  if (!sessionToken) {
    // Clear any existing session data
    const response = NextResponse.redirect(new URL('/Login', request.url))
    response.cookies.delete('sessionToken')
    return response
  }

  return NextResponse.next()
}

// Configure which paths the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
} 