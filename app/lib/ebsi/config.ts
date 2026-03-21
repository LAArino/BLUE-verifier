/**
 * EBSI/BLUE trust network configuration for DC4EU.
 *
 * Defines DID Registry and Trusted Issuers Registry endpoints
 * for EBSI (EU) and BLUE (RedIRIS/Spain) trust networks.
 * Supports env var overrides for deployment flexibility.
 *
 * Extracted from learner-credential-wallet app.config.js.
 */

export type NetworkConfig = {
  didRegistryUrl: string
  trustedIssuersRegistryUrl: string
  trustedSchemasRegistryUrl: string
  fallbackDidRegistryUrl?: string
  fallbackTrustedIssuersRegistryUrl?: string
  label?: string
}

export type NetworkEntry = {
  name: string
  config: NetworkConfig
  alternateConfigs?: NetworkConfig[]
}

// ─── EBSI (European Blockchain Services Infrastructure) ───────────────

export const EBSIConfig: NetworkConfig = {
  didRegistryUrl:
    process.env.EBSI_DID_REGISTRY_URL ||
    'https://api-pilot.ebsi.eu/did-registry/v5',
  trustedIssuersRegistryUrl:
    process.env.EBSI_TIR_URL ||
    'https://api-pilot.ebsi.eu/trusted-issuers-registry/v5',
  trustedSchemasRegistryUrl:
    'https://api-pilot.ebsi.eu/trusted-schemas-registry/v3',
  fallbackDidRegistryUrl:
    'https://api-pilot.ebsi.rediris.es/did-registry/v5',
  fallbackTrustedIssuersRegistryUrl:
    'https://api-pilot.ebsi.rediris.es/trusted-issuers-registry/v5'
}

export const EBSIConformanceConfig: NetworkConfig = {
  didRegistryUrl: 'https://api-conformance.ebsi.eu/did-registry/v5',
  trustedIssuersRegistryUrl:
    'https://api-conformance.ebsi.eu/trusted-issuers-registry/v5',
  trustedSchemasRegistryUrl:
    'https://api-conformance.ebsi.eu/trusted-schemas-registry/v3'
}

// ─── BLUE (RedIRIS academic trust network, Spain) ─────────────────────

export const BLUEConfig: NetworkConfig = {
  didRegistryUrl:
    process.env.BLUE_DID_REGISTRY_URL ||
    'https://api.blue.rediris.es/did-registry/v5',
  trustedIssuersRegistryUrl:
    process.env.BLUE_TIR_URL ||
    'https://api.blue.rediris.es/trusted-issuers-registry/v5',
  trustedSchemasRegistryUrl:
    'https://api.blue.rediris.es/trusted-schemas-registry/v3'
}

export const BLUEPreConfig: NetworkConfig = {
  didRegistryUrl: 'https://api-pre.blue.rediris.es/did-registry/v5',
  trustedIssuersRegistryUrl:
    'https://api-pre.blue.rediris.es/trusted-issuers-registry/v5',
  trustedSchemasRegistryUrl:
    'https://api-pre.blue.rediris.es/trusted-schemas-registry/v3'
}

export const BLUEDesConfig: NetworkConfig = {
  didRegistryUrl: 'https://api-des.blue.rediris.es/did-registry/v5',
  trustedIssuersRegistryUrl:
    'https://api-des.blue.rediris.es/trusted-issuers-registry/v5',
  trustedSchemasRegistryUrl:
    'https://api-des.blue.rediris.es/trusted-schemas-registry/v3'
}

// ─── Trust network routing ────────────────────────────────────────────

/**
 * Maps DID methods to their trust network configuration.
 * did:ebsi → EBSI network (with RedIRIS backup + conformance fallback)
 * did:blue → BLUE network (PROD → PRE → DES fallback chain on 404)
 */
export const TrustNetworks: Record<string, NetworkEntry> = {
  'did:ebsi': {
    name: 'EBSI',
    config: { ...EBSIConfig, label: 'Pilot' },
    alternateConfigs: [{ ...EBSIConformanceConfig, label: 'Conformance' }]
  },
  'did:blue': {
    name: 'BLUE',
    config: { ...BLUEConfig, label: 'PROD' },
    alternateConfigs: [
      { ...BLUEPreConfig, label: 'PRE' },
      { ...BLUEDesConfig, label: 'DES' }
    ]
  }
}
