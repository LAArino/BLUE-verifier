/**
 * DID resolver for DC4EU.
 *
 * Resolves did:ebsi, did:blue, did:key, did:jwk, and did:web DIDs.
 * - did:jwk: resolved locally (self-contained)
 * - did:key (P-256): resolved locally by decoding multicodec
 * - did:web: resolved via HTTPS (W3C did:web method specification)
 * - did:ebsi: resolved via EBSI DID Registry API
 * - did:blue: resolved via BLUE DID Registry API
 * - did:key (other): resolved via EBSI DID Registry API (fallback)
 *
 * Adapted from learner-credential-wallet for server-side use in Next.js.
 *
 * @see https://api-pilot.ebsi.eu/docs/apis/did-registry/latest
 * @see https://api.blue.rediris.es/did-registry/v5
 * @see https://w3c-ccg.github.io/did-method-web/
 */
import { TrustNetworks, EBSIConfig } from './config'
import type { NetworkEntry, NetworkConfig } from './config'
import {
  didDocumentFromP256Key,
  base64urlDecode,
  base58btcDecode,
  decompressP256PublicKey,
  base64urlEncode,
  P256PublicJwk
} from '../crypto/es256'

export type DIDDocument = {
  '@context': string | string[]
  id: string
  verificationMethod?: VerificationMethod[]
  authentication?: (string | VerificationMethod)[]
  assertionMethod?: (string | VerificationMethod)[]
  [key: string]: unknown
}

export type VerificationMethod = {
  id: string
  type: string
  controller: string
  publicKeyJwk?: Record<string, string>
  publicKeyMultibase?: string
}

// Simple in-memory cache for resolved DID documents (TTL: 48 hours)
const didCache = new Map<string, { doc: DIDDocument; expiry: number }>()
const CACHE_TTL_MS = 1000 * 60 * 60 * 48

// Multicodec varint for P-256 public key (0x1200)
const P256_MULTICODEC_VARINT = [0x80, 0x24]

/**
 * Resolves a DID to its DID Document.
 */
export async function resolveDid(did: string): Promise<DIDDocument> {
  // Check cache first
  const cached = didCache.get(did)
  if (cached && cached.expiry > Date.now()) {
    return cached.doc
  }

  let doc: DIDDocument

  if (did.startsWith('did:jwk:')) {
    doc = resolveDidJwkLocally(did)
  } else if (did.startsWith('did:key:')) {
    doc = await resolveDidKey(did)
  } else if (did.startsWith('did:web:')) {
    doc = await resolveDidWeb(did)
  } else if (did.startsWith('did:ebsi:') || did.startsWith('did:blue:')) {
    doc = await resolveDidViaRegistry(did)
  } else {
    throw new Error(`Unsupported DID method: ${did.split(':')[1]}`)
  }

  // Cache the result
  didCache.set(did, { doc, expiry: Date.now() + CACHE_TTL_MS })
  return doc
}

/**
 * Resolves a did:jwk DID locally by decoding the JWK from the DID string.
 */
function resolveDidJwkLocally(did: string): DIDDocument {
  const jwkPart = did.replace('did:jwk:', '')
  const decoder = new TextDecoder()
  const jwkJson = decoder.decode(base64urlDecode(jwkPart))
  const jwk = JSON.parse(jwkJson)

  if (jwk.kty === 'EC' && jwk.crv === 'P-256') {
    return didDocumentFromP256Key(jwk as P256PublicJwk) as DIDDocument
  }

  // Generic JWK DID Document for other key types
  const verificationMethodId = `${did}#0`
  return {
    '@context': [
      'https://www.w3.org/ns/did/v1',
      'https://w3id.org/security/suites/jws-2020/v1'
    ],
    id: did,
    verificationMethod: [
      {
        id: verificationMethodId,
        type: 'JsonWebKey2020',
        controller: did,
        publicKeyJwk: jwk
      }
    ],
    authentication: [verificationMethodId],
    assertionMethod: [verificationMethodId]
  }
}

/**
 * Resolves a did:web DID by fetching the DID document over HTTPS.
 */
async function resolveDidWeb(did: string): Promise<DIDDocument> {
  const methodSpecificId = did.slice('did:web:'.length)
  const parts = methodSpecificId.split(':')
  const domain = decodeURIComponent(parts[0])
  const pathSegments = parts.slice(1)

  let url: string
  if (pathSegments.length === 0) {
    url = `https://${domain}/.well-known/did.json`
  } else {
    url = `https://${domain}/${pathSegments.join('/')}/did.json`
  }

  // SSRF protection: block private/reserved IPs and enforce HTTPS
  const { assertSafeUrl } = await import('../url')
  assertSafeUrl(url)

  console.log('[did:web] Resolving:', did, '→', url)

  const response = await fetch(url, {
    headers: { Accept: 'application/did+ld+json, application/json' }
  })

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`[did:web] DID document not found: ${url}`)
    }
    throw new Error(
      `[did:web] Resolution failed: ${response.status} ${response.statusText}`
    )
  }

  const doc = (await response.json()) as DIDDocument

  if (doc.id && doc.id !== did) {
    throw new Error(
      `[did:web] DID document ID mismatch: expected ${did}, got ${doc.id}`
    )
  }

  return doc
}

/**
 * Resolves a did:key DID. Attempts local resolution for P-256 keys,
 * falls back to EBSI API for other key types.
 */
async function resolveDidKey(did: string): Promise<DIDDocument> {
  if (!did.startsWith('did:key:z')) {
    return resolveDidViaRegistry(did)
  }

  const multibaseValue = did.slice('did:key:z'.length)
  try {
    const decoded = base58btcDecode(multibaseValue)

    // Check if it's a P-256 key (multicodec 0x1200, varint [0x80, 0x24])
    if (
      decoded.length >= 2 &&
      decoded[0] === P256_MULTICODEC_VARINT[0] &&
      decoded[1] === P256_MULTICODEC_VARINT[1]
    ) {
      const compressed = decoded.slice(2)
      const uncompressed = decompressP256PublicKey(compressed)
      const x = uncompressed.slice(1, 33)
      const y = uncompressed.slice(33, 65)

      const publicJwk: P256PublicJwk = {
        kty: 'EC',
        crv: 'P-256',
        x: base64urlEncode(x),
        y: base64urlEncode(y)
      }

      return didDocumentFromP256Key(publicJwk) as DIDDocument
    }
  } catch {
    // If local decoding fails, fall through to EBSI API
  }

  return resolveDidViaRegistry(did)
}

/**
 * Returns the network config for a DID based on its method prefix.
 * Falls back to EBSI config for unknown methods.
 */
function getNetworkConfig(did: string): NetworkEntry {
  const methodPrefix = did.split(':').slice(0, 2).join(':')
  return (
    TrustNetworks[methodPrefix] ?? {
      name: 'EBSI',
      config: EBSIConfig
    }
  )
}

/**
 * Fetches a DID document from a single registry URL.
 */
async function fetchDidFromUrl(
  url: string,
  networkName: string,
  label: string
): Promise<DIDDocument> {
  const response = await fetch(url, {
    headers: { Accept: 'application/did+ld+json' }
  })

  if (!response.ok) {
    if (response.status === 404) {
      const err = new Error(
        `[${networkName}] DID not found in ${label}: ${url}`
      )
      ;(err as any).isNotFound = true
      throw err
    }
    throw new Error(
      `[${networkName}] DID resolution failed (${label}): ${response.status} ${response.statusText}`
    )
  }

  return (await response.json()) as DIDDocument
}

/**
 * Resolves a DID via the appropriate DID Registry API (EBSI or BLUE).
 *
 * Implements a retry chain:
 * 1. Primary → OK → done; 404 → try alternates; network error → try fallback
 * 2. Fallback (if available) → OK → done; 404 → try alternates; network error → throw
 * 3. Alternates (if available, on 404) → try each in order
 */
async function resolveDidViaRegistry(did: string): Promise<DIDDocument> {
  const network = getNetworkConfig(did)
  const encodedDid = encodeURIComponent(did)
  const primaryUrl = `${network.config.didRegistryUrl}/identifiers/${encodedDid}`

  console.log(`[${network.name}] Resolving DID:`, did)

  let shouldTryConformance = false

  // Step 1: Try primary URL
  try {
    return await fetchDidFromUrl(primaryUrl, network.name, 'primary')
  } catch (err: any) {
    if (err.isNotFound) {
      shouldTryConformance = true
    } else {
      const fallbackDidUrl = network.config.fallbackDidRegistryUrl
      if (fallbackDidUrl) {
        const fallbackUrl = `${fallbackDidUrl}/identifiers/${encodedDid}`
        console.log(`[${network.name}] Primary failed, trying fallback...`)
        try {
          const doc = await fetchDidFromUrl(
            fallbackUrl,
            network.name,
            'fallback'
          )
          console.log(`[${network.name}] Resolved DID via fallback`)
          return doc
        } catch (fallbackErr: any) {
          if (fallbackErr.isNotFound) {
            shouldTryConformance = true
          } else {
            throw fallbackErr
          }
        }
      } else {
        throw err
      }
    }
  }

  // Step 3: Try alternate environments in order (only on 404)
  if (shouldTryConformance && network.alternateConfigs?.length) {
    for (let i = 0; i < network.alternateConfigs.length; i++) {
      const altConfig = network.alternateConfigs[i]
      const altUrl = `${altConfig.didRegistryUrl}/identifiers/${encodedDid}`
      const altLabel = `alternate-${i + 1}`
      console.log(
        `[${network.name}] Not found, trying ${altLabel}: ${altConfig.didRegistryUrl}`
      )
      try {
        const doc = await fetchDidFromUrl(altUrl, network.name, altLabel)
        console.log(`[${network.name}] Resolved DID via ${altLabel}`)
        return doc
      } catch (altErr: any) {
        if (altErr.isNotFound) {
          continue
        }
        throw altErr
      }
    }
    throw new Error(`[${network.name}] DID not found in any registry: ${did}`)
  }

  throw new Error(`[${network.name}] DID not found in registry: ${did}`)
}

/**
 * Extracts the first P-256 public JWK from a DID Document's verification methods.
 */
export function extractP256PublicJwk(
  didDocument: DIDDocument
): P256PublicJwk | null {
  if (!didDocument.verificationMethod) return null

  for (const vm of didDocument.verificationMethod) {
    const jwk = vm.publicKeyJwk
    if (jwk && jwk.kty === 'EC' && jwk.crv === 'P-256' && jwk.x && jwk.y) {
      return jwk as unknown as P256PublicJwk
    }
  }

  return null
}

/**
 * Clears the DID resolution cache.
 */
export function clearDidCache(): void {
  didCache.clear()
}
