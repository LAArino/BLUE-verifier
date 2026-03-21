/**
 * SD-JWT (Selective Disclosure JWT) utilities.
 *
 * Implements parsing, disclosure decoding, and claim reconstruction
 * for SD-JWT Verifiable Credentials (vc+sd-jwt format).
 *
 * Adapted from learner-credential-wallet — verifier-side functions only.
 *
 * @see https://www.ietf.org/archive/id/draft-ietf-oauth-selective-disclosure-jwt-08.html
 */
import { sha256 } from '@noble/hashes/sha256'
import { decodeJwt, base64urlDecode, base64urlEncode } from './es256'

// ─── Types ────────────────────────────────────────────────────────────

export type SdJwtParts = {
  issuerJwt: string
  disclosures: string[]
  keyBindingJwt?: string
}

export type DecodedDisclosure = {
  encoded: string
  salt: string
  name?: string
  value: unknown
}

export type SdJwtPayload = {
  vct?: string
  iss?: string
  sub?: string
  iat?: number
  nbf?: number
  exp?: number
  jti?: string
  cnf?: { jwk?: Record<string, unknown> }
  _sd?: string[]
  _sd_alg?: string
  status?: Record<string, unknown>
  [key: string]: unknown
}

// ─── Detection ────────────────────────────────────────────────────────

/**
 * Checks if a string is an SD-JWT (contains `~` separator).
 * SD-JWT format: <issuer-jwt>~<disclosure1>~<disclosure2>~...~[<kb-jwt>]
 */
export function isSdJwt(text: string): boolean {
  return text.includes('~') && text.split('.').length >= 3
}

// ─── Parsing ──────────────────────────────────────────────────────────

/**
 * Parses an SD-JWT string into its components.
 * Format: <issuer-jwt>~<disclosure1>~<disclosure2>~...~[<kb-jwt>]
 */
export function parseSdJwt(sdJwt: string): SdJwtParts {
  const segments = sdJwt.split('~')
  const issuerJwt = segments[0]
  const remaining = segments.slice(1)

  const disclosures: string[] = []
  let keyBindingJwt: string | undefined

  for (let i = 0; i < remaining.length; i++) {
    const segment = remaining[i]
    if (!segment) continue

    const isLast = remaining.slice(i + 1).every((s) => s === '')
    if (isLast && segment.split('.').length === 3) {
      try {
        const { header } = decodeJwt(segment)
        if (header.typ === 'kb+jwt') {
          keyBindingJwt = segment
          continue
        }
      } catch {
        // Not a KB-JWT, treat as disclosure
      }
    }

    disclosures.push(segment)
  }

  return { issuerJwt, disclosures, keyBindingJwt }
}

/**
 * Decodes a single base64url-encoded disclosure.
 * Disclosure format: base64url(JSON([salt, name, value])) for object properties
 *                    base64url(JSON([salt, value])) for array elements
 */
export function decodeDisclosure(encoded: string): DecodedDisclosure {
  const jsonStr = new TextDecoder().decode(base64urlDecode(encoded))
  const arr = JSON.parse(jsonStr)

  if (!Array.isArray(arr) || arr.length < 2) {
    throw new Error(
      `Invalid disclosure format: expected array with 2-3 elements`
    )
  }

  if (arr.length === 2) {
    return { encoded, salt: arr[0], value: arr[1] }
  }

  return { encoded, salt: arr[0], name: arr[1], value: arr[2] }
}

/**
 * Computes the SHA-256 hash of a disclosure for matching against _sd digests.
 */
export function hashDisclosure(encoded: string): string {
  const hash = sha256(new TextEncoder().encode(encoded))
  return base64urlEncode(hash)
}

// ─── Claim reconstruction ─────────────────────────────────────────────

/**
 * Reconstructs the full claim set from the issuer JWT payload and disclosures.
 */
export function reconstructClaims(
  payload: SdJwtPayload,
  disclosures: DecodedDisclosure[]
): Record<string, unknown> {
  const digestMap = new Map<string, DecodedDisclosure>()
  for (const disc of disclosures) {
    const digest = hashDisclosure(disc.encoded)
    digestMap.set(digest, disc)
  }

  return reconstructObject(payload, digestMap)
}

function reconstructObject(
  obj: Record<string, unknown>,
  digestMap: Map<string, DecodedDisclosure>
): Record<string, unknown> {
  const result: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(obj)) {
    if (key === '_sd') {
      const digests = value as string[]
      for (const digest of digests) {
        const disclosure = digestMap.get(digest)
        if (disclosure && disclosure.name !== undefined) {
          result[disclosure.name] = isPlainObject(disclosure.value)
            ? reconstructObject(
                disclosure.value as Record<string, unknown>,
                digestMap
              )
            : disclosure.value
        }
      }
    } else if (key === '_sd_alg') {
      continue
    } else if (Array.isArray(value)) {
      result[key] = reconstructArray(value, digestMap)
    } else if (isPlainObject(value)) {
      result[key] = reconstructObject(
        value as Record<string, unknown>,
        digestMap
      )
    } else {
      result[key] = value
    }
  }

  return result
}

function reconstructArray(
  arr: unknown[],
  digestMap: Map<string, DecodedDisclosure>
): unknown[] {
  const result: unknown[] = []

  for (const element of arr) {
    if (
      isPlainObject(element) &&
      '...' in (element as Record<string, unknown>)
    ) {
      const digest = (element as Record<string, string>)['...']
      const disclosure = digestMap.get(digest)
      if (disclosure) {
        result.push(disclosure.value)
      }
    } else if (isPlainObject(element)) {
      result.push(
        reconstructObject(element as Record<string, unknown>, digestMap)
      )
    } else if (Array.isArray(element)) {
      result.push(reconstructArray(element, digestMap))
    } else {
      result.push(element)
    }
  }

  return result
}

function isPlainObject(value: unknown): boolean {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

// ─── High-level API ───────────────────────────────────────────────────

/**
 * Parses an SD-JWT and returns the fully reconstructed payload
 * with all disclosed claims merged in.
 */
export function decodeSdJwt(sdJwt: string): {
  header: Record<string, unknown>
  payload: SdJwtPayload
  reconstructedClaims: Record<string, unknown>
  disclosures: DecodedDisclosure[]
  keyBindingJwt?: string
} {
  const parts = parseSdJwt(sdJwt)
  const { header, payload } = decodeJwt(parts.issuerJwt)
  const sdPayload = payload as SdJwtPayload

  const decodedDisclosures = parts.disclosures.map(decodeDisclosure)
  const reconstructedClaims = reconstructClaims(sdPayload, decodedDisclosures)

  return {
    header,
    payload: sdPayload,
    reconstructedClaims,
    disclosures: decodedDisclosures,
    keyBindingJwt: parts.keyBindingJwt
  }
}

// ─── VCT to type mapping ─────────────────────────────────────────────

const VCT_TYPE_MAP: Record<string, string> = {
  'eu.europa.ec.eudi.pid.1': 'VerifiablePID',
  'eu.europa.ec.eudi.eduid.1': 'EducationalID',
  'eu.europa.ec.eudi.hepoe.1': 'ProofOfEnrolment',
  'eu.europa.ec.eudi.hed.1': 'HigherEducationDiploma',
  'urn:eu.europa.ec.eudi:pid:1': 'VerifiablePID',
  'urn:eu.europa.ec.eudi.eduid:1': 'EducationalID',
  'urn:eu.europa.ec.eudi:hepoe:1': 'ProofOfEnrolment',
  'urn:eu.europa.ec.eudi:hed:1': 'HigherEducationDiploma'
}

export function vctToTypeName(vct: string): string {
  return VCT_TYPE_MAP[vct] || vct.split('.').pop() || vct
}
