import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Simplified middleware for Next.js
 *
 * Tenant validation is handled client-side through Convex queries.
 * This middleware can be extended later for server-side checks if needed.
 */
export async function middleware(request: NextRequest) {
  // Currently pass-through - Convex handles tenant validation client-side
  return NextResponse.next();
}

/**
 * Middleware config - specify which routes to run middleware on
 */
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
};
