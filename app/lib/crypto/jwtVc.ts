/**
 * JWT-VC utilities for DC4EU.
 *
 * Handles decoding, extraction, and detection of JWT-encoded
 * Verifiable Credentials (W3C VC-JWT format).
 *
 * Adapted from learner-credential-wallet for server-side verification.
 */
import { decodeJwt } from './es256'
import { isSdJwt, decodeSdJwt, vctToTypeName } from './sdJwt'

/**
 * Checks if a string is a JWT (three base64url-encoded segments separated by dots).
 */
export function isJwtString(text: string): boolean {
  const parts = text.trim().split('.')
  if (parts.length !== 3) return false

  const base64urlRegex = /^[A-Za-z0-9_-]+$/
  return parts.every((part) => part.length > 0 && base64urlRegex.test(part))
}

/**
 * JWT-VC payload structure.
 * @see https://www.w3.org/TR/vc-data-model/#jwt-encoding
 */
export type JwtVcPayload = {
  iss?: string
  sub?: string
  jti?: string
  iat?: number
  nbf?: number
  exp?: number
  vc?: Record<string, unknown>
  vp?: Record<string, unknown>
  aud?: string | string[]
  nonce?: string
  [key: string]: unknown
}

/**
 * Decodes a JWT-VC without verifying the signature.
 */
export function decodeJwtVc(jwt: string): {
  header: Record<string, unknown>
  payload: JwtVcPayload
} {
  const { header, payload } = decodeJwt(jwt)
  return { header, payload: payload as JwtVcPayload }
}

/**
 * Extracts a W3C Verifiable Credential object from a JWT-VC.
 *
 * The VC is reconstructed from the JWT claims:
 * - `vc` claim contains the credential body (@context, type, credentialSubject, etc.)
 * - `iss` maps to `issuer`
 * - `sub` maps to `credentialSubject.id`
 * - `jti` maps to `id`
 * - `nbf` maps to `issuanceDate`
 * - `exp` maps to `expirationDate`
 */
export function extractVcFromJwt(jwt: string): Record<string, unknown> {
  const { payload } = decodeJwtVc(jwt)

  if (!payload.vc) {
    throw new Error('JWT does not contain a "vc" claim')
  }

  const vc = payload.vc as Record<string, unknown>

  const credential: Record<string, unknown> = {
    '@context': vc['@context'] || ['https://www.w3.org/2018/credentials/v1'],
    type: vc.type || ['VerifiableCredential'],
    ...vc
  }

  if (payload.jti && !credential.id) {
    credential.id = payload.jti
  }

  if (payload.iss) {
    if (!credential.issuer) {
      credential.issuer = payload.iss
    } else if (
      typeof credential.issuer === 'object' &&
      credential.issuer !== null
    ) {
      const issuerObj = credential.issuer as Record<string, unknown>
      if (!issuerObj.id) {
        issuerObj.id = payload.iss
      }
    }
  }

  if (payload.sub) {
    const credentialSubject = (credential.credentialSubject || {}) as Record<
      string,
      unknown
    >
    if (!credentialSubject.id) {
      credentialSubject.id = payload.sub
    }
    credential.credentialSubject = credentialSubject
  }

  if (payload.nbf && !credential.issuanceDate) {
    credential.issuanceDate = new Date(payload.nbf * 1000).toISOString()
  }

  if (payload.iat && !credential.issuanceDate) {
    credential.issuanceDate = new Date(payload.iat * 1000).toISOString()
  }

  if (payload.exp && !credential.expirationDate) {
    credential.expirationDate = new Date(payload.exp * 1000).toISOString()
  }

  return credential
}

/**
 * Extracts a W3C-compatible Verifiable Credential object from an SD-JWT VC.
 *
 * SD-JWT VCs use `vct` instead of `type[]` and selective disclosures
 * instead of a flat `vc` claim. This function reconstructs all disclosed
 * claims and maps them to the W3C VC structure for display compatibility.
 */
export function extractVcFromSdJwt(sdJwtString: string): Record<string, unknown> {
  const { payload, reconstructedClaims } = decodeSdJwt(sdJwtString)

  const typeName = payload.vct
    ? vctToTypeName(payload.vct)
    : 'VerifiableCredential'
  const types = ['VerifiableCredential']
  if (typeName !== 'VerifiableCredential') {
    types.push(typeName)
  }

  const excludeKeys = new Set([
    'iss',
    'sub',
    'iat',
    'nbf',
    'exp',
    'jti',
    'vct',
    'cnf',
    '_sd',
    '_sd_alg',
    'status',
    'aud',
    'nonce',
    'state'
  ])
  const credentialSubject: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(reconstructedClaims)) {
    if (!excludeKeys.has(key)) {
      credentialSubject[key] = value
    }
  }

  if (payload.sub) {
    credentialSubject.id = payload.sub
  }

  const credential: Record<string, unknown> = {
    '@context': ['https://www.w3.org/2018/credentials/v1'],
    type: types,
    credentialSubject
  }

  if (payload.vct) {
    credential.vct = payload.vct
  }

  if (payload.jti) {
    credential.id = payload.jti
  }
  if (payload.iss) {
    credential.issuer = payload.iss
  }
  if (payload.nbf) {
    credential.issuanceDate = new Date(payload.nbf * 1000).toISOString()
  } else if (payload.iat) {
    credential.issuanceDate = new Date(payload.iat * 1000).toISOString()
  }
  if (payload.exp) {
    credential.expirationDate = new Date(payload.exp * 1000).toISOString()
  }

  return credential
}

/**
 * Extracts a VC from either a JWT-VC or SD-JWT VC string.
 * Automatically detects the format.
 */
export function extractVcAuto(token: string): Record<string, unknown> {
  if (isSdJwt(token)) {
    return extractVcFromSdJwt(token)
  }
  return extractVcFromJwt(token)
}

/**
 * Checks if a JWT contains a Verifiable Credential (has a `vc` claim).
 */
export function isJwtVc(jwt: string): boolean {
  try {
    const { payload } = decodeJwtVc(jwt)
    return payload.vc !== undefined
  } catch {
    return false
  }
}

/**
 * Checks if a JWT contains a Verifiable Presentation (has a `vp` claim).
 */
export function isJwtVp(jwt: string): boolean {
  try {
    const { payload } = decodeJwtVc(jwt)
    return payload.vp !== undefined
  } catch {
    return false
  }
}
