import { NextRequest } from 'next/server'
import { createOID4VPSession, buildOID4VPUri } from '@/lib/oid4vp/verifier'
import type { CreateSessionConfig } from '@/lib/oid4vp/types'

/**
 * POST /api/oid4vp/session
 * Creates a new OID4VP session and returns the QR code URI.
 */
export async function POST(request: NextRequest) {
  const body = await request.json() as CreateSessionConfig

  const baseUrl = process.env.NEXT_PUBLIC_EXCHANGE_SERVER_URL
    || `${request.nextUrl.protocol}//${request.nextUrl.host}`

  const session = createOID4VPSession(body, baseUrl)
  const uri = buildOID4VPUri(session.id, baseUrl)

  return Response.json({
    sessionId: session.id,
    uri,
    status: session.status
  })
}
