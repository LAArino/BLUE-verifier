/**
 * OID4VP (OpenID for Verifiable Presentations) protocol types.
 *
 * These types are shared between verifier and holder sides of the protocol.
 * Based on OpenID4VP Draft 24+ and the learner-credential-wallet implementation.
 */

// ─── Authorization Request ────────────────────────────────────────────

export type AuthorizationRequest = {
  iss?: string
  client_id: string
  response_type: string
  response_mode: 'direct_post' | 'direct_post.jwt'
  redirect_uri?: string
  response_uri?: string
  scope?: string
  nonce: string
  state: string
  presentation_definition?: PresentationDefinition
  presentation_definition_uri?: string
  dcql_query?: DcqlQuery
  authorization_encrypted_response_alg?: string
  authorization_encrypted_response_enc?: string
  client_metadata?: ClientMetadata
  aud?: string
  exp?: number
  iat?: number
}

// ─── Presentation Definition (Legacy) ─────────────────────────────────

export type PresentationDefinition = {
  id: string
  format?: {
    jwt_vp?: { alg: string[] }
    jwt_vc?: { alg: string[] }
  }
  input_descriptors: InputDescriptor[]
}

export type InputDescriptor = {
  id: string
  name?: string
  purpose?: string
  format?: {
    jwt_vc?: { alg: string[] }
  }
  constraints?: {
    fields?: FieldConstraint[]
  }
}

export type FieldConstraint = {
  path: string[]
  filter?: Record<string, unknown>
}

// ─── DCQL Query (Draft 24+) ──────────────────────────────────────────

export type DcqlQuery = {
  credentials: DcqlCredentialQuery[]
  credential_sets?: DcqlCredentialSet[]
}

export type DcqlCredentialQuery = {
  id: string
  format: string
  claims?: DcqlClaimQuery[]
  meta?: {
    vct_values?: string[]
  }
}

export type DcqlClaimQuery = {
  path: string[]
}

export type DcqlCredentialSet = {
  options: string[][]
}

// ─── Presentation Submission ──────────────────────────────────────────

export type PresentationSubmission = {
  id: string
  definition_id: string
  descriptor_map: DescriptorMapEntry[]
}

export type DescriptorMapEntry = {
  id: string
  path: string
  format: string
  path_nested?: {
    id: string
    format: string
    path: string
  }
}

// ─── Client Metadata ──────────────────────────────────────────────────

export type ClientMetadata = {
  jwks?: {
    keys: Array<{
      kty: string
      x?: string
      y?: string
      crv?: string
      use?: string
      alg?: string
      kid?: string
    }>
  }
  vp_formats_supported?: Record<string, unknown>
  encrypted_response_enc_values_supported?: string[]
}

// ─── OID4VP Session ───────────────────────────────────────────────────

export type OID4VPSessionStatus = 'pending' | 'completed' | 'failed' | 'expired'

export type OID4VPSession = {
  id: string
  status: OID4VPSessionStatus
  authorizationRequest: AuthorizationRequest
  /** Verifier's ephemeral P-256 key pair for JARM decryption */
  encryptionKeyPair?: {
    publicJwk: import('../crypto/es256').P256PublicJwk
    privateJwk: import('../crypto/es256').P256PrivateJwk
  }
  /** Request JWT to serve to wallets */
  requestJwt: string
  /** Received VP token (after wallet response) */
  vpToken?: string
  /** The raw VC JWT/SD-JWT for re-verification (extracted from VP if wrapped) */
  vcToken?: string
  /** Decoded/verified credential from the VP */
  credential?: Record<string, unknown>
  /** Verification result */
  verificationResult?: import('../../types/credential.d').VerifyResponse
  /** Error message if failed */
  error?: string
  /** Creation timestamp */
  createdAt: number
}

// ─── Session creation config ──────────────────────────────────────────

export type CreateSessionConfig = {
  /** Credential types to request (for presentation_definition) */
  credentialTypes?: string[]
  /** VCT values to request (for dcql_query with SD-JWT) */
  vctValues?: string[]
  /** Human-readable type names for JWT-VC matching in DCQL (substring match) */
  typeNames?: string[]
  /** Specific claims to request (for dcql_query) */
  claimPaths?: string[][]
  /** Query mode */
  queryMode: 'presentation_definition' | 'dcql'
  /** Response mode */
  responseMode: 'direct_post' | 'direct_post.jwt'
}
