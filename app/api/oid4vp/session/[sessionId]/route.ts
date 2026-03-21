import { NextRequest } from 'next/server'
import { getSession } from '@/lib/oid4vp/sessions'

/**
 * GET /api/oid4vp/session/[sessionId]
 * Polls the session status. Returns the verification result when completed.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params
  const session = getSession(sessionId)

  if (!session) {
    return Response.json(
      { error: 'Session not found or expired' },
      { status: 404 }
    )
  }

  const response: Record<string, unknown> = {
    sessionId: session.id,
    status: session.status
  }

  if (session.status === 'completed') {
    response.credential = session.credential
    response.verificationResult = session.verificationResult
    response.vcToken = session.vcToken
  }

  if (session.status === 'failed') {
    response.error = session.error
  }

  return Response.json(response)
}
