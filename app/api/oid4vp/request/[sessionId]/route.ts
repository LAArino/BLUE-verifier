import { NextRequest } from 'next/server'
import { getSession } from '@/lib/oid4vp/sessions'

/**
 * GET /api/oid4vp/request/[sessionId]
 * Serves the authorization request JWT to wallets.
 * This is the endpoint that wallets fetch via request_uri.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params
  const session = getSession(sessionId)

  if (!session) {
    return new Response('Session not found or expired', { status: 404 })
  }

  // Return the request JWT with appropriate content type
  return new Response(session.requestJwt, {
    headers: {
      'Content-Type': 'application/oauth-authz-req+jwt'
    }
  })
}
