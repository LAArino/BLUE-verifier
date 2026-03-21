import { NextRequest } from 'next/server'
import { getSession } from '@/lib/oid4vp/sessions'
import { processOID4VPResponse } from '@/lib/oid4vp/verifier'

/**
 * POST /api/oid4vp/response
 * Receives the wallet's direct_post or direct_post.jwt (JARM) response.
 *
 * Body is form-encoded:
 * - Plain: vp_token, presentation_submission, state
 * - JARM: response (JWE string)
 */
export async function POST(request: NextRequest) {
  let formData: Record<string, string> = {}

  const contentType = request.headers.get('content-type') || ''
  if (contentType.includes('application/x-www-form-urlencoded')) {
    const urlParams = new URLSearchParams(await request.text())
    for (const [key, value] of urlParams.entries()) {
      formData[key] = value
    }
  } else if (contentType.includes('application/json')) {
    formData = await request.json()
  } else {
    // Try form-encoded as default
    try {
      const urlParams = new URLSearchParams(await request.text())
      for (const [key, value] of urlParams.entries()) {
        formData[key] = value
      }
    } catch {
      return Response.json({ error: 'Unsupported content type' }, { status: 400 })
    }
  }

  // Find the session by state
  const state = formData.state
  let sessionId: string | undefined

  // For JARM, we can't read state without decrypting.
  // Try to find session from the response_uri path or iterate sessions.
  if (!state && formData.response) {
    // JARM response — we need to find the session.
    // The wallet sends to response_uri which is the same for all sessions.
    // We need to try each pending session's encryption key.
    const { sessions } = await import('@/lib/oid4vp/sessions')
    for (const [id, session] of sessions.entries()) {
      if (session.status === 'pending' && session.encryptionKeyPair) {
        try {
          const { decryptJwe } = await import('@/lib/crypto/jwe')
          const decrypted = JSON.parse(
            decryptJwe(formData.response, session.encryptionKeyPair.privateJwk)
          )
          if (decrypted.state === session.authorizationRequest.state) {
            sessionId = id
            break
          }
        } catch {
          // Wrong key, try next session
        }
      }
    }
  } else if (state) {
    // Find session by state
    const { sessions } = await import('@/lib/oid4vp/sessions')
    for (const [id, session] of sessions.entries()) {
      if (session.authorizationRequest.state === state) {
        sessionId = id
        break
      }
    }
  }

  if (!sessionId) {
    return Response.json({ error: 'Session not found for state' }, { status: 404 })
  }

  const session = getSession(sessionId)
  if (!session) {
    return Response.json({ error: 'Session expired' }, { status: 404 })
  }

  if (session.status !== 'pending') {
    return Response.json({ error: 'Session already processed' }, { status: 409 })
  }

  await processOID4VPResponse(session, formData)

  // Return success to the wallet
  return Response.json({ status: 'ok' })
}
