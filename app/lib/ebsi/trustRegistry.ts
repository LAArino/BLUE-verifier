/**
 * Trusted Issuer Registry client for DC4EU.
 *
 * Checks if an issuer DID is registered in the EBSI or BLUE Trusted Issuers Registry.
 * Fetches detailed issuer accreditation info from TIR attribute JWTs.
 * Automatically selects the correct registry based on the issuer's DID method.
 *
 * Adapted from learner-credential-wallet for server-side use in Next.js.
 *
 * @see https://api-pilot.ebsi.eu/docs/apis/trusted-issuers-registry/latest
 * @see https://api.blue.rediris.es/trusted-issuers-registry/v5
 */
import { TrustNetworks, EBSIConfig } from './config'
import type { NetworkEntry, NetworkConfig } from './config'
import { decodeJwt } from '../crypto/es256'

export type TrustedIssuerInfo = {
  trusted: boolean
  issuerDid: string
  registryName?: string
  environmentLabel?: string
  attributes?: TrustedIssuerAttribute[]
  networkError?: boolean
}

export type TrustedIssuerAttribute = {
  hash: string
  body: string
  issuerType: string
  tao: string
  rootTao: string
}

export type TrustedIssuerResponse = {
  did: string
  attributes: TrustedIssuerAttribute[]
}

// Cache for trusted issuer lookups (TTL: 48 hours)
const trustCache = new Map<
  string,
  { info: TrustedIssuerInfo; expiry: number }
>()
const CACHE_TTL_MS = 1000 * 60 * 60 * 48

/**
 * Returns the network name and config for a DID based on its method prefix.
 */
function getNetworkForDid(did: string): NetworkEntry {
  const methodPrefix = did.split(':').slice(0, 2).join(':')
  return (
    TrustNetworks[methodPrefix] ?? {
      name: 'EBSI',
      config: EBSIConfig
    }
  )
}

/**
 * Fetches issuer trust info from a single TIR URL.
 */
async function fetchTrustFromUrl(
  url: string,
  issuerDid: string,
  networkName: string,
  label: string,
  environmentLabel?: string
): Promise<TrustedIssuerInfo> {
  const response = await fetch(url, {
    headers: { Accept: 'application/json' }
  })

  if (response.ok) {
    const data = (await response.json()) as TrustedIssuerResponse
    return {
      trusted: true,
      issuerDid,
      registryName: `${networkName} Trusted Issuers Registry (${label})`,
      environmentLabel,
      attributes: data.attributes
    }
  }

  if (response.status === 404) {
    const info: TrustedIssuerInfo = {
      trusted: false,
      issuerDid,
      networkError: false
    }
    ;(info as any).isNotFound = true
    return info
  }

  console.warn(
    `[${networkName}] Trust registry error (${label}): ${response.status} ${response.statusText}`
  )
  return { trusted: false, issuerDid, networkError: true }
}

/**
 * Checks if an issuer DID is registered in the appropriate Trusted Issuers Registry.
 *
 * Implements a retry chain:
 * 1. Primary → OK → trusted; 404 → try alternates; network error → try fallback
 * 2. Fallback (if available) → on network error from primary
 * 3. Alternates (if available) → on 404 from primary/fallback
 */
export async function checkIssuerTrust(
  issuerDid: string
): Promise<TrustedIssuerInfo> {
  // Check cache first
  const cached = trustCache.get(issuerDid)
  if (cached && cached.expiry > Date.now()) {
    return cached.info
  }

  const network = getNetworkForDid(issuerDid)
  const encodedDid = encodeURIComponent(issuerDid)
  let info: TrustedIssuerInfo
  let shouldTryConformance = false

  console.log(`[${network.name}] Checking issuer trust:`, issuerDid)

  const primaryEnvLabel = network.config.label

  // Step 1: Try primary URL
  try {
    const primaryUrl = `${network.config.trustedIssuersRegistryUrl}/issuers/${encodedDid}`
    info = await fetchTrustFromUrl(
      primaryUrl,
      issuerDid,
      network.name,
      'primary',
      primaryEnvLabel
    )

    if (info.trusted) {
      trustCache.set(issuerDid, { info, expiry: Date.now() + CACHE_TTL_MS })
      return info
    }

    if ((info as any).isNotFound) {
      shouldTryConformance = true
    } else {
      const fallbackTirUrl = network.config.fallbackTrustedIssuersRegistryUrl
      if (fallbackTirUrl) {
        console.log(`[${network.name}] Primary TIR error, trying fallback...`)
        try {
          const fallbackUrl = `${fallbackTirUrl}/issuers/${encodedDid}`
          info = await fetchTrustFromUrl(
            fallbackUrl,
            issuerDid,
            network.name,
            'fallback',
            primaryEnvLabel
          )
          if (info.trusted) {
            console.log(`[${network.name}] Issuer trusted via fallback TIR`)
            trustCache.set(issuerDid, {
              info,
              expiry: Date.now() + CACHE_TTL_MS
            })
            return info
          }
          if ((info as any).isNotFound) {
            shouldTryConformance = true
          }
        } catch {
          // Fallback also had network error — fall through
        }
      }
    }
  } catch (err) {
    console.warn(`[${network.name}] Trust registry lookup failed:`, err)
    const fallbackTirUrl = network.config.fallbackTrustedIssuersRegistryUrl
    if (fallbackTirUrl) {
      console.log(`[${network.name}] Primary TIR failed, trying fallback...`)
      try {
        const fallbackUrl = `${fallbackTirUrl}/issuers/${encodedDid}`
        info = await fetchTrustFromUrl(
          fallbackUrl,
          issuerDid,
          network.name,
          'fallback',
          primaryEnvLabel
        )
        if (info.trusted) {
          console.log(`[${network.name}] Issuer trusted via fallback TIR`)
          trustCache.set(issuerDid, {
            info,
            expiry: Date.now() + CACHE_TTL_MS
          })
          return info
        }
        if ((info as any).isNotFound) {
          shouldTryConformance = true
        } else {
          if (cached) {
            console.log(`[${network.name}] Using stale cache for:`, issuerDid)
            return cached.info
          }
          trustCache.set(issuerDid, { info, expiry: Date.now() + CACHE_TTL_MS })
          return info
        }
      } catch {
        if (cached) {
          console.log(`[${network.name}] Using stale cache for:`, issuerDid)
          return cached.info
        }
        info = { trusted: false, issuerDid, networkError: true }
        trustCache.set(issuerDid, { info, expiry: Date.now() + CACHE_TTL_MS })
        return info
      }
    } else {
      if (cached) {
        console.log(`[${network.name}] Using stale cache for:`, issuerDid)
        return cached.info
      }
      info = { trusted: false, issuerDid, networkError: true }
      trustCache.set(issuerDid, { info, expiry: Date.now() + CACHE_TTL_MS })
      return info
    }
  }

  // Step 3: Try alternate environments in order (only on 404)
  if (shouldTryConformance && network.alternateConfigs?.length) {
    for (let i = 0; i < network.alternateConfigs.length; i++) {
      const altConfig = network.alternateConfigs[i]
      const altLabel = `alternate-${i + 1}`
      console.log(
        `[${network.name}] Not found in TIR, trying ${altLabel}: ${altConfig.trustedIssuersRegistryUrl}`
      )
      try {
        const altUrl = `${altConfig.trustedIssuersRegistryUrl}/issuers/${encodedDid}`
        info = await fetchTrustFromUrl(
          altUrl,
          issuerDid,
          network.name,
          altLabel,
          altConfig.label
        )
        if (info.trusted) {
          console.log(`[${network.name}] Issuer trusted via ${altLabel} TIR`)
          trustCache.set(issuerDid, {
            info,
            expiry: Date.now() + CACHE_TTL_MS
          })
          return info
        }
        if ((info as any).isNotFound) {
          continue
        }
        trustCache.set(issuerDid, { info, expiry: Date.now() + CACHE_TTL_MS })
        return info
      } catch {
        info = { trusted: false, issuerDid, networkError: true }
        trustCache.set(issuerDid, { info, expiry: Date.now() + CACHE_TTL_MS })
        return info
      }
    }
    info = { trusted: false, issuerDid, networkError: false }
    trustCache.set(issuerDid, { info, expiry: Date.now() + CACHE_TTL_MS })
    return info
  }

  if (!info!) {
    info = { trusted: false, issuerDid, networkError: false }
  }
  delete (info as any).isNotFound
  trustCache.set(issuerDid, { info, expiry: Date.now() + CACHE_TTL_MS })
  return info
}

/**
 * Clears the trusted issuer cache.
 */
export function clearTrustCache(): void {
  trustCache.clear()
  tirDetailsCache.clear()
}

// ─── TIR Details (attribute decoding) ──────────────────────────────

export type IssuerAccreditationInfo = {
  credentialTypes: string[]
  limitJurisdiction: string | null
  validFrom: string | null
  validUntil: string | null
}

export type IssuerTIRDetails = {
  issuerDid: string
  networkName: string
  environmentLabel: string | null
  trusted: boolean
  issuerName: string | null
  accreditingOrganization: string | null
  accreditingDid: string | null
  accreditations: IssuerAccreditationInfo[]
}

// Cache for TIR details (TTL: 48 hours)
const tirDetailsCache = new Map<
  string,
  { details: IssuerTIRDetails; expiry: number }
>()

type AttributeListResponse = {
  items: Array<{ id: string; href: string }>
  total: number
}

type AttributeDetailResponse = {
  attribute: {
    body: string
    hash: string
    issuerType: string
    tao: string
    rootTao: string
  }
  did: string
}

const GENERIC_TYPES = new Set([
  'VerifiableCredential',
  'VerifiableAttestation',
  'CTRevocable'
])

function extractJurisdictionCode(uri: string | undefined): string | null {
  if (!uri) return null
  const parts = uri.split('/')
  return parts[parts.length - 1] || null
}

/**
 * Fetches detailed issuer information from the TIR by decoding attribute JWTs.
 */
export async function fetchIssuerTIRDetails(
  issuerDid: string
): Promise<IssuerTIRDetails> {
  const cached = tirDetailsCache.get(issuerDid)
  if (cached && cached.expiry > Date.now()) {
    return cached.details
  }

  const network = getNetworkForDid(issuerDid)
  const trustInfo = await checkIssuerTrust(issuerDid)

  const details: IssuerTIRDetails = {
    issuerDid,
    networkName: network.name,
    environmentLabel: trustInfo.environmentLabel ?? null,
    trusted: trustInfo.trusted,
    issuerName: null,
    accreditingOrganization: null,
    accreditingDid: null,
    accreditations: []
  }

  if (!trustInfo.trusted) {
    tirDetailsCache.set(issuerDid, {
      details,
      expiry: Date.now() + CACHE_TTL_MS
    })
    return details
  }

  try {
    const encodedDid = encodeURIComponent(issuerDid)
    let baseUrl = `${network.config.trustedIssuersRegistryUrl}/issuers/${encodedDid}`

    console.log(`[${network.name}] Fetching TIR attributes for:`, issuerDid)

    let attrListResponse: Response | null = null
    const tryFetchAttributes = async (
      tirUrl: string
    ): Promise<Response | null> => {
      const url = `${tirUrl}/issuers/${encodedDid}/attributes`
      return fetch(url, { headers: { Accept: 'application/json' } })
    }

    const tryAlternates = async (): Promise<Response | null> => {
      if (!network.alternateConfigs?.length) return null
      for (const altConfig of network.alternateConfigs) {
        console.log(
          `[${network.name}] Attributes not found, trying alternate: ${altConfig.trustedIssuersRegistryUrl}`
        )
        try {
          const resp = await tryFetchAttributes(
            altConfig.trustedIssuersRegistryUrl
          )
          if (resp && resp.status !== 404) {
            baseUrl = `${altConfig.trustedIssuersRegistryUrl}/issuers/${encodedDid}`
            return resp
          }
        } catch {
          // Alternate network error — try next
        }
      }
      return null
    }

    try {
      attrListResponse = await fetch(`${baseUrl}/attributes`, {
        headers: { Accept: 'application/json' }
      })
      if (attrListResponse.status === 404) {
        const altResp = await tryAlternates()
        if (altResp) attrListResponse = altResp
      }
    } catch {
      const fallbackTirUrl = network.config.fallbackTrustedIssuersRegistryUrl
      if (fallbackTirUrl) {
        baseUrl = `${fallbackTirUrl}/issuers/${encodedDid}`
        console.log(
          `[${network.name}] Primary TIR attributes failed, trying fallback...`
        )
        try {
          attrListResponse = await fetch(`${baseUrl}/attributes`, {
            headers: { Accept: 'application/json' }
          })
          if (attrListResponse.status === 404) {
            const altResp = await tryAlternates()
            if (altResp) attrListResponse = altResp
          }
        } catch {
          attrListResponse = null
        }
      }
    }

    if (!attrListResponse || !attrListResponse.ok) {
      console.warn(
        `[${network.name}] TIR attributes list error:`,
        attrListResponse?.status ?? 'network error'
      )
      tirDetailsCache.set(issuerDid, {
        details,
        expiry: Date.now() + CACHE_TTL_MS
      })
      return details
    }

    const attrList = (await attrListResponse.json()) as AttributeListResponse

    if (attrList.items.length === 0) {
      tirDetailsCache.set(issuerDid, {
        details,
        expiry: Date.now() + CACHE_TTL_MS
      })
      return details
    }

    for (let i = 0; i < attrList.items.length; i++) {
      try {
        const attrId = attrList.items[i].id
        const attrResponse = await fetch(`${baseUrl}/attributes/${attrId}`, {
          headers: { Accept: 'application/json' }
        })

        if (!attrResponse.ok) continue

        const attrData = (await attrResponse.json()) as AttributeDetailResponse
        const jwtBody = attrData.attribute.body

        const { payload } = decodeJwt(jwtBody)
        const vc = (payload as Record<string, unknown>).vc as
          | Record<string, unknown>
          | undefined
        if (!vc) continue

        const credentialSubject = vc.credentialSubject as
          | Record<string, unknown>
          | undefined
        if (!credentialSubject) continue

        if (i === 0) {
          details.issuerName = (credentialSubject.name as string) ?? null
          details.accreditingOrganization = (vc.issuerName as string) ?? null
          details.accreditingDid =
            ((payload as Record<string, unknown>).iss as string) ?? null
        }

        const accreditedFor = credentialSubject.accreditedFor as
          | Array<Record<string, unknown>>
          | undefined
        if (!accreditedFor) continue

        for (const entry of accreditedFor) {
          const allTypes = (entry.types as string[]) ?? []
          const specificTypes = allTypes.filter((t) => !GENERIC_TYPES.has(t))
          if (specificTypes.length === 0) continue

          details.accreditations.push({
            credentialTypes: specificTypes,
            limitJurisdiction: extractJurisdictionCode(
              entry.limitJurisdiction as string | undefined
            ),
            validFrom:
              (vc.validFrom as string) ?? (vc.issuanceDate as string) ?? null,
            validUntil: (vc.expirationDate as string) ?? null
          })
        }
      } catch (attrErr) {
        console.warn(
          `[${network.name}] Failed to decode TIR attribute:`,
          attrErr
        )
      }
    }

    console.log(
      `[${network.name}] TIR details loaded:`,
      details.issuerName,
      `(${details.accreditations.length} accreditations)`
    )
  } catch (err) {
    console.warn(`[${network.name}] TIR details fetch failed:`, err)
  }

  tirDetailsCache.set(issuerDid, {
    details,
    expiry: Date.now() + CACHE_TTL_MS
  })
  return details
}
