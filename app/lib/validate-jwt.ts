/**
 * JWT-VC and SD-JWT verification for DC4EU credentials.
 *
 * Verifies JWT-VC and SD-JWT credentials using:
 * - ES256 signature verification via @noble/curves
 * - DID resolution (did:ebsi, did:blue, did:key, did:jwk, did:web) for issuer public key
 * - EBSI/BLUE Trusted Issuers Registry for issuer trust
 * - Standard JWT expiry checks
 *
 * Returns the same log format as @digitalcredentials/verifier-core
 * so it integrates with the existing verification UI.
 *
 * Adapted from learner-credential-wallet for server-side verification.
 */
import { decodeJwt, verifyJwt, P256PublicJwk } from './crypto/es256'
import { decodeJwtVc } from './crypto/jwtVc'
import { parseSdJwt, decodeSdJwt } from './crypto/sdJwt'
import { resolveDid, extractP256PublicJwk } from './ebsi/didResolver'
import { checkIssuerTrust, fetchIssuerTIRDetails } from './ebsi/trustRegistry'
import type { IssuerTIRDetails } from '../types/credential.d'
import type { ResultLog, VerifyResponse } from './validate'

/**
 * Verifies a JWT-VC credential.
 *
 * Checks:
 * 1. supported_format — is it a valid JWT-VC?
 * 2. valid_signature — ES256 signature with issuer's public key
 * 3. registered_issuer — issuer in EBSI/BLUE Trusted Issuers Registry
 * 4. revocation_status — (always passes for now)
 * 5. expiration — JWT exp claim
 */
export async function verifyJwtVcCredential(
  rawJwt: string
): Promise<VerifyResponse> {
  const log: ResultLog[] = []

  // 1. Check format
  let issuerDid: string | undefined
  let exp: number | undefined
  try {
    const { payload } = decodeJwtVc(rawJwt)
    if (!payload.vc) {
      throw new Error('JWT does not contain a vc claim')
    }
    issuerDid = payload.iss
    exp = payload.exp
    log.push({ id: 'supported_format', valid: true })
  } catch (err) {
    log.push({
      id: 'supported_format',
      valid: false,
      error: err instanceof Error ? err.message : 'Invalid JWT-VC format'
    })
    return buildResponse(log)
  }

  // 2. Verify signature
  if (!issuerDid) {
    log.push({
      id: 'valid_signature',
      valid: false,
      error: 'No issuer (iss) claim in JWT'
    })
  } else {
    try {
      const didDocument = await resolveDid(issuerDid)
      const publicJwk = extractP256PublicJwk(didDocument)

      if (!publicJwk) {
        log.push({
          id: 'valid_signature',
          valid: false,
          error: 'No P-256 public key found in issuer DID document'
        })
      } else {
        verifyJwt(rawJwt, publicJwk)
        log.push({ id: 'valid_signature', valid: true })
      }
    } catch (err) {
      console.warn('[JWT-VC verify] Signature verification failed:', err)
      log.push({
        id: 'valid_signature',
        valid: false,
        error:
          err instanceof Error ? err.message : 'Signature verification failed'
      })
    }
  }

  // 3. Check issuer trust registry and fetch TIR details
  let tirDetails: IssuerTIRDetails | undefined
  if (issuerDid) {
    if (issuerDid.startsWith('did:web:')) {
      const sigValid = log.find((l) => l.id === 'valid_signature')
      log.push({ id: 'registered_issuer', valid: sigValid?.valid ?? false })
    } else {
      try {
        const trustInfo = await checkIssuerTrust(issuerDid)
        log.push({
          id: 'registered_issuer',
          valid: trustInfo.trusted
        })
        // Fetch detailed TIR info for display
        if (trustInfo.trusted) {
          try {
            tirDetails = await fetchIssuerTIRDetails(issuerDid)
          } catch (err) {
            console.warn('[JWT-VC verify] TIR details fetch failed:', err)
          }
        }
      } catch (err) {
        console.warn('[JWT-VC verify] Trust registry check failed:', err)
        log.push({ id: 'registered_issuer', valid: false })
      }
    }
  } else {
    log.push({ id: 'registered_issuer', valid: false })
  }

  // 4. Revocation status (not implemented yet — pass by default)
  log.push({ id: 'revocation_status', valid: true })

  // 5. Expiration check
  if (exp) {
    const now = Math.floor(Date.now() / 1000)
    log.push({ id: 'expiration', valid: exp > now })
  } else {
    log.push({ id: 'expiration', valid: true })
  }

  return buildResponse(log, tirDetails)
}

/**
 * Verifies an SD-JWT VC credential.
 *
 * Checks:
 * 1. supported_format — is it a valid SD-JWT?
 * 2. valid_signature — ES256 signature on the issuer JWT
 * 3. registered_issuer — issuer in EBSI/BLUE Trusted Issuers Registry
 * 4. revocation_status — (always passes for now)
 * 5. expiration — JWT exp claim
 */
export async function verifySdJwtCredential(
  rawSdJwt: string
): Promise<VerifyResponse> {
  const log: ResultLog[] = []

  // 1. Check format
  let issuerDid: string | undefined
  let exp: number | undefined
  let issuerJwt: string
  try {
    const parts = parseSdJwt(rawSdJwt)
    issuerJwt = parts.issuerJwt
    const { payload } = decodeSdJwt(rawSdJwt)
    if (!payload.vct && !payload.iss) {
      throw new Error('SD-JWT does not contain vct or iss claim')
    }
    issuerDid = payload.iss
    exp = payload.exp
    log.push({ id: 'supported_format', valid: true })
  } catch (err) {
    log.push({
      id: 'supported_format',
      valid: false,
      error: err instanceof Error ? err.message : 'Invalid SD-JWT format'
    })
    return buildResponse(log)
  }

  // 2. Verify signature (on the issuer JWT part only)
  if (!issuerDid) {
    log.push({
      id: 'valid_signature',
      valid: false,
      error: 'No issuer (iss) claim in SD-JWT'
    })
  } else {
    try {
      let publicJwk: P256PublicJwk | null = null

      if (issuerDid.startsWith('did:')) {
        const didDocument = await resolveDid(issuerDid)
        publicJwk = extractP256PublicJwk(didDocument)
      } else if (issuerDid.startsWith('http')) {
        publicJwk = await fetchIssuerPublicKey(issuerDid, issuerJwt!)
      }

      if (!publicJwk) {
        log.push({
          id: 'valid_signature',
          valid: false,
          error: 'No P-256 public key found for issuer'
        })
      } else {
        verifyJwt(issuerJwt!, publicJwk)
        log.push({ id: 'valid_signature', valid: true })
      }
    } catch (err) {
      console.warn('[SD-JWT verify] Signature verification failed:', err)
      log.push({
        id: 'valid_signature',
        valid: false,
        error:
          err instanceof Error ? err.message : 'Signature verification failed'
      })
    }
  }

  // 3. Check issuer trust registry and fetch TIR details
  let tirDetails: IssuerTIRDetails | undefined
  if (issuerDid) {
    if (issuerDid.startsWith('did:web:') || !issuerDid.startsWith('did:')) {
      const sigValid = log.find((l) => l.id === 'valid_signature')
      log.push({ id: 'registered_issuer', valid: sigValid?.valid ?? false })
    } else {
      try {
        const trustInfo = await checkIssuerTrust(issuerDid)
        log.push({
          id: 'registered_issuer',
          valid: trustInfo.trusted
        })
        // Fetch detailed TIR info for display
        if (trustInfo.trusted) {
          try {
            tirDetails = await fetchIssuerTIRDetails(issuerDid)
          } catch (err) {
            console.warn('[SD-JWT verify] TIR details fetch failed:', err)
          }
        }
      } catch (err) {
        console.warn('[SD-JWT verify] Trust registry check failed:', err)
        log.push({ id: 'registered_issuer', valid: false })
      }
    }
  } else {
    log.push({ id: 'registered_issuer', valid: false })
  }

  // 4. Revocation status (not implemented yet)
  log.push({ id: 'revocation_status', valid: true })

  // 5. Expiration check
  if (exp) {
    const now = Math.floor(Date.now() / 1000)
    log.push({ id: 'expiration', valid: exp > now })
  } else {
    log.push({ id: 'expiration', valid: true })
  }

  return buildResponse(log, tirDetails)
}

/**
 * Fetches the issuer's public key from their JWKS endpoint.
 * For URL-based issuers (common in SD-JWT VC).
 */
async function fetchIssuerPublicKey(
  issuerUrl: string,
  jwt: string
): Promise<P256PublicJwk | null> {
  // SSRF protection: enforce HTTPS and block private IPs
  const { assertSafeUrl } = await import('./url')
  try {
    assertSafeUrl(issuerUrl)
  } catch (err) {
    console.warn('[SD-JWT verify] Issuer URL rejected:', err)
    return null
  }

  const { header } = decodeJwt(jwt)
  const kid = header.kid as string | undefined

  const jwksUrls = [`${issuerUrl}/jwks`, `${issuerUrl}/.well-known/jwks.json`]

  for (const jwksUrl of jwksUrls) {
    try {
      console.log('[SD-JWT verify] Fetching JWKS from:', jwksUrl)
      const response = await fetch(jwksUrl)
      if (!response.ok) continue

      const jwks = await response.json()
      const keys = jwks.keys as Array<Record<string, unknown>>
      if (!keys?.length) continue

      for (const key of keys) {
        if (key.kty === 'EC' && key.crv === 'P-256') {
          if (!kid || key.kid === kid) {
            return {
              kty: 'EC',
              crv: 'P-256',
              x: key.x as string,
              y: key.y as string
            } as P256PublicJwk
          }
        }
      }
    } catch (err) {
      console.warn('[SD-JWT verify] JWKS fetch failed:', jwksUrl, err)
    }
  }

  return null
}

function buildResponse(log: ResultLog[], tirDetails?: IssuerTIRDetails): VerifyResponse {
  const verified = log.every((entry) => entry.valid)
  const response: VerifyResponse = {
    verified,
    results: [
      {
        verified,
        log,
        credential: {} as any,
        error: undefined as any
      }
    ]
  }
  if (tirDetails) {
    response.tirDetails = tirDetails
  }
  return response
}
