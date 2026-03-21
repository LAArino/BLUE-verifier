/**
 * OID4VP session management.
 *
 * Uses an LRU cache to store OID4VP sessions server-side.
 * Sessions are automatically purged after TTL expiry.
 */
import { LRUCache } from 'lru-cache'
import type { OID4VPSession } from './types'

const SESSION_TTL_MS = Number(process.env.OID4VP_SESSION_TTL) || 5 * 60 * 1000 // 5 minutes

declare global {
  var oid4vpSessions: LRUCache<string, OID4VPSession> | undefined
}

export const sessions: LRUCache<string, OID4VPSession> =
  globalThis.oid4vpSessions ||
  new LRUCache<string, OID4VPSession>({
    max: 100,
    ttl: SESSION_TTL_MS,
    ttlAutopurge: true
  })

globalThis.oid4vpSessions = sessions

export function getSession(sessionId: string): OID4VPSession | undefined {
  return sessions.get(sessionId)
}

export function setSession(session: OID4VPSession): void {
  sessions.set(session.id, session)
}

export function deleteSession(sessionId: string): void {
  sessions.delete(sessionId)
}
