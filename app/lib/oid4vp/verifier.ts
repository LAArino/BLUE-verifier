/**
 * OID4VP Verifier — server-side logic.
 *
 * Generates authorization requests, builds request JWTs,
 * processes wallet responses (direct_post and JARM),
 * and verifies presented VP tokens.
 */
import { v4 as uuidv4 } from 'uuid'
import {
  generateP256KeyPair,
  signJwt,
  decodeJwt,
  verifyJwt,
  P256PublicJwk
} from '../crypto/es256'
import { decryptJwe } from '../crypto/jwe'
import { extractVcAuto } from '../crypto/jwtVc'
import { isSdJwt } from '../crypto/sdJwt'
import { verifyJwtVcCredential, verifySdJwtCredential } from '../validate-jwt'
import { setSession } from './sessions'
import type {
  AuthorizationRequest,
  OID4VPSession,
  CreateSessionConfig,
  PresentationDefinition,
  DcqlQuery
} from './types'

/**
 * Creates a new OID4VP session with an authorization request.
 *
 * @param config - Session configuration (credential types, query mode, etc.)
 * @param baseUrl - The deployment URL (e.g. https://verifierplus.org)
 * @returns The created session
 */
export function createOID4VPSession(
  config: CreateSessionConfig,
  baseUrl: string
): OID4VPSession {
  const sessionId = uuidv4()
  const nonce = uuidv4()
  const state = uuidv4()
  const verifierDid = process.env.OID4VP_VERIFIER_DID || `${baseUrl}`

  // Build query based on mode
  let presentationDefinition: PresentationDefinition | undefined
  let dcqlQuery: DcqlQuery | undefined

  if (config.queryMode === 'dcql' && config.vctValues?.length) {
    dcqlQuery = buildDcqlQuery(config.vctValues, config.claimPaths, config.typeNames)
  } else {
    presentationDefinition = buildPresentationDefinition(
      config.credentialTypes || ['VerifiableCredential']
    )
  }

  // Generate encryption key pair for JARM
  let encryptionKeyPair: OID4VPSession['encryptionKeyPair']
  const useJarm = config.responseMode === 'direct_post.jwt'

  if (useJarm) {
    encryptionKeyPair = generateP256KeyPair()
  }

  // Build authorization request
  const authRequest: AuthorizationRequest = {
    iss: verifierDid,
    client_id: verifierDid,
    response_type: 'vp_token',
    response_mode: config.responseMode,
    response_uri: `${baseUrl}/api/oid4vp/response`,
    nonce,
    state,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 300 // 5 min
  }

  if (presentationDefinition) {
    authRequest.presentation_definition = presentationDefinition
  }
  if (dcqlQuery) {
    authRequest.dcql_query = dcqlQuery
  }

  if (useJarm && encryptionKeyPair) {
    authRequest.authorization_encrypted_response_alg = 'ECDH-ES'
    authRequest.authorization_encrypted_response_enc = 'A128GCM'
    authRequest.client_metadata = {
      jwks: {
        keys: [
          {
            kty: 'EC',
            crv: 'P-256',
            x: encryptionKeyPair.publicJwk.x,
            y: encryptionKeyPair.publicJwk.y,
            use: 'enc',
            alg: 'ECDH-ES',
            kid: `${sessionId}-enc`
          }
        ]
      }
    }
  }

  // Sign the authorization request as a JWT
  const signingKeyPair = generateP256KeyPair()
  const requestJwt = signJwt(
    authRequest as unknown as Record<string, unknown>,
    signingKeyPair.privateJwk,
    { typ: 'oauth-authz-req+jwt', kid: `${sessionId}-sig` }
  )

  const session: OID4VPSession = {
    id: sessionId,
    status: 'pending',
    authorizationRequest: authRequest,
    encryptionKeyPair,
    requestJwt,
    createdAt: Date.now()
  }

  setSession(session)
  return session
}

/**
 * Builds the openid4vp:// URI that wallets scan from a QR code.
 */
export function buildOID4VPUri(sessionId: string, baseUrl: string): string {
  const requestUri = `${baseUrl}/api/oid4vp/request/${sessionId}`
  return `openid4vp://authorize?request_uri=${encodeURIComponent(requestUri)}&client_id=${encodeURIComponent(baseUrl)}`
}

/**
 * Processes a wallet's direct_post response.
 * Handles both plain (direct_post) and encrypted (direct_post.jwt / JARM) responses.
 */
export async function processOID4VPResponse(
  session: OID4VPSession,
  formData: {
    vp_token?: string
    presentation_submission?: string
    state?: string
    response?: string // JARM encrypted response
  }
): Promise<OID4VPSession> {
  try {
    // Validate state
    if (formData.state && formData.state !== session.authorizationRequest.state) {
      session.status = 'failed'
      session.error = 'State mismatch'
      setSession(session)
      return session
    }

    let vpToken: string | undefined
    let presentationState: string | undefined

    // Handle JARM encrypted response
    if (formData.response && session.encryptionKeyPair) {
      const decrypted = decryptJwe(formData.response, session.encryptionKeyPair.privateJwk)
      const parsed = JSON.parse(decrypted)
      vpToken = parsed.vp_token
      presentationState = parsed.state
    } else {
      vpToken = formData.vp_token
      presentationState = formData.state
    }

    if (!vpToken) {
      session.status = 'failed'
      session.error = 'No vp_token in response'
      setSession(session)
      return session
    }

    // Validate state from decrypted payload if available
    if (presentationState && presentationState !== session.authorizationRequest.state) {
      session.status = 'failed'
      session.error = 'State mismatch in decrypted response'
      setSession(session)
      return session
    }

    session.vpToken = vpToken

    // Verify the VP token and extract credential
    const result = await verifyVpToken(vpToken, session.authorizationRequest.nonce)
    session.credential = result.credential
    session.vcToken = result.vcToken
    session.verificationResult = result.verificationResult
    session.status = 'completed'
  } catch (err) {
    console.error('[OID4VP] Response processing failed:', err)
    session.status = 'failed'
    session.error = err instanceof Error ? err.message : 'Processing failed'
  }

  setSession(session)
  return session
}

/**
 * Verifies a VP token and extracts the credential.
 *
 * Handles three formats:
 * 1. SD-JWT presentation (DCQL path) — vpToken is the SD-JWT with disclosures + KB-JWT
 * 2. Raw VC JWT (DCQL + jwt_vc_json) — vpToken is the VC JWT directly (no VP wrapper)
 * 3. VP JWT (legacy presentation_definition) — vpToken is a VP JWT containing embedded VC JWTs
 */
async function verifyVpToken(
  vpToken: string,
  expectedNonce: string
): Promise<{
  credential: Record<string, unknown>
  verificationResult: import('../../types/credential.d').VerifyResponse
  vcToken: string
}> {
  // Case 1: SD-JWT presentation — vpToken IS the VC token
  if (isSdJwt(vpToken)) {
    const credential = extractVcAuto(vpToken)
    const verificationResult = await verifySdJwtCredential(vpToken)
    return { credential, verificationResult, vcToken: vpToken }
  }

  // Decode JWT to determine if it's a VP (has `vp` claim) or a raw VC (has `vc` claim)
  const { payload } = decodeJwt(vpToken)

  // Case 2: Raw VC JWT (DCQL + jwt_vc_json — wallet sends VC JWT directly as vp_token)
  if (payload.vc && !payload.vp) {
    const credential = extractVcAuto(vpToken)
    const verificationResult = await verifyJwtVcCredential(vpToken)
    // Nonce validation is done at session/state level, not in the VC JWT
    return { credential, verificationResult, vcToken: vpToken }
  }

  // Case 3: VP JWT — extract embedded VC
  // Validate nonce (VP JWT should contain the nonce)
  if (payload.nonce && payload.nonce !== expectedNonce) {
    throw new Error(`Nonce mismatch: expected ${expectedNonce}, got ${payload.nonce}`)
  }

  const vp = payload.vp as Record<string, unknown> | undefined
  if (!vp) {
    throw new Error('JWT does not contain a vp or vc claim')
  }

  const verifiableCredential = vp.verifiableCredential as string | string[] | undefined
  if (!verifiableCredential) {
    throw new Error('VP does not contain verifiableCredential')
  }

  const vcToken = Array.isArray(verifiableCredential)
    ? verifiableCredential[0]
    : verifiableCredential

  if (typeof vcToken !== 'string') {
    throw new Error('Embedded VC is not a JWT string')
  }

  // Verify the embedded VC
  const credential = extractVcAuto(vcToken)
  let verificationResult

  if (isSdJwt(vcToken)) {
    verificationResult = await verifySdJwtCredential(vcToken)
  } else {
    verificationResult = await verifyJwtVcCredential(vcToken)
  }

  // Verify VP JWT signature (holder's key)
  const holderDid = payload.iss as string | undefined
  if (holderDid?.startsWith('did:')) {
    try {
      const { resolveDid, extractP256PublicJwk } = await import('../ebsi/didResolver')
      const didDocument = await resolveDid(holderDid)
      const holderKey = extractP256PublicJwk(didDocument)
      if (holderKey) {
        verifyJwt(vpToken, holderKey)
      }
    } catch (err) {
      console.warn('[OID4VP] VP JWT holder signature verification failed:', err)
    }
  }

  return { credential, verificationResult, vcToken }
}

// ─── Query builders ───────────────────────────────────────────────────

function buildPresentationDefinition(
  credentialTypes: string[]
): PresentationDefinition {
  return {
    id: uuidv4(),
    format: {
      jwt_vp: { alg: ['ES256'] },
      jwt_vc: { alg: ['ES256'] }
    },
    input_descriptors: [
      {
        id: 'credential_0',
        name: 'Requested Credential',
        format: {
          jwt_vc: { alg: ['ES256'] }
        },
        constraints: {
          fields: [
            {
              path: ['$.vc.type', '$.type'],
              filter: {
                type: 'array',
                contains: {
                  type: 'string',
                  enum: credentialTypes
                }
              }
            }
          ]
        }
      }
    ]
  }
}

function buildDcqlQuery(
  vctValues: string[],
  claimPaths?: string[][],
  typeNames?: string[]
): DcqlQuery {
  const claims = claimPaths?.map((path) => ({ path }))
  // For jwt_vc_json, the wallet matches vct_values as substring against credential.type[].
  // We include both VCT URIs and human-readable type names for broad matching.
  const jwtVcMatchValues = [
    ...vctValues,
    ...(typeNames || [])
  ]
  return {
    credentials: [
      {
        id: 'credential_sd_jwt',
        format: 'vc+sd-jwt',
        meta: { vct_values: vctValues },
        claims
      },
      {
        id: 'credential_dc_sd_jwt',
        format: 'dc+sd-jwt',
        meta: { vct_values: vctValues },
        claims
      },
      {
        id: 'credential_jwt_vc',
        format: 'jwt_vc_json',
        meta: { vct_values: jwtVcMatchValues.length > 0 ? jwtVcMatchValues : undefined },
        claims
      }
    ]
  }
}
