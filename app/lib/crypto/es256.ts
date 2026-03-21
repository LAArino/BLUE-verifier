/**
 * ES256 (P-256 / secp256r1) cryptographic operations for DC4EU.
 *
 * Uses @noble/curves for pure-JS P-256 operations.
 * Provides key generation, JWT signing/verification, JWK import/export,
 * and did:key (P-256) utilities.
 *
 * Adapted from learner-credential-wallet for server-side use in Next.js.
 */
import { p256 } from '@noble/curves/p256'
import { sha256 } from '@noble/hashes/sha256'

// ─── Base64url utilities ───────────────────────────────────────────────

export function base64urlEncode(data: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < data.length; i++) {
    binary += String.fromCharCode(data[i])
  }
  const base64 = btoa(binary)
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function base64urlDecode(str: string): Uint8Array {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/')
  while (base64.length % 4 !== 0) {
    base64 += '='
  }
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

function base64urlEncodeString(str: string): string {
  const encoder = new TextEncoder()
  return base64urlEncode(encoder.encode(str))
}

// ─── Base58btc encoding (for did:key multibase) ────────────────────────

const BASE58_ALPHABET =
  '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'

export function base58btcEncode(data: Uint8Array): string {
  let zeros = 0
  for (let i = 0; i < data.length && data[i] === 0; i++) {
    zeros++
  }

  const size = Math.ceil(data.length * 1.38) + 1
  const b58 = new Uint8Array(size)
  let length = 0

  for (let i = zeros; i < data.length; i++) {
    let carry = data[i]
    let j = 0
    for (let k = size - 1; k >= 0 && (carry !== 0 || j < length); k--, j++) {
      carry += 256 * b58[k]
      b58[k] = carry % 58
      carry = Math.floor(carry / 58)
    }
    length = j
  }

  let start = size - length
  while (start < size && b58[start] === 0) {
    start++
  }

  let result = '1'.repeat(zeros)
  for (let i = start; i < size; i++) {
    result += BASE58_ALPHABET[b58[i]]
  }
  return result
}

export function base58btcDecode(str: string): Uint8Array {
  let zeros = 0
  for (let i = 0; i < str.length && str[i] === '1'; i++) {
    zeros++
  }

  const size = Math.ceil(str.length * 0.733) + 1
  const b256 = new Uint8Array(size)
  let length = 0

  for (let i = zeros; i < str.length; i++) {
    const charIndex = BASE58_ALPHABET.indexOf(str[i])
    if (charIndex === -1) {
      throw new Error(`Invalid base58 character: ${str[i]}`)
    }
    let carry = charIndex
    let j = 0
    for (let k = size - 1; k >= 0 && (carry !== 0 || j < length); k--, j++) {
      carry += 58 * b256[k]
      b256[k] = carry % 256
      carry = Math.floor(carry / 256)
    }
    length = j
  }

  let start = size - length
  while (start < size && b256[start] === 0) {
    start++
  }

  const result = new Uint8Array(zeros + (size - start))
  for (let i = start; i < size; i++) {
    result[zeros + (i - start)] = b256[i]
  }
  return result
}

// ─── JWK types ─────────────────────────────────────────────────────────

export type P256PublicJwk = {
  kty: 'EC'
  crv: 'P-256'
  x: string
  y: string
}

export type P256PrivateJwk = P256PublicJwk & {
  d: string
}

export type P256KeyPair = {
  publicJwk: P256PublicJwk
  privateJwk: P256PrivateJwk
}

// ─── Key generation ────────────────────────────────────────────────────

export function generateP256KeyPair(): P256KeyPair {
  const privateKeyBytes = p256.utils.randomPrivateKey()
  const publicKeyBytes = p256.getPublicKey(privateKeyBytes, false)

  const x = publicKeyBytes.slice(1, 33)
  const y = publicKeyBytes.slice(33, 65)

  const publicJwk: P256PublicJwk = {
    kty: 'EC',
    crv: 'P-256',
    x: base64urlEncode(x),
    y: base64urlEncode(y)
  }

  const privateJwk: P256PrivateJwk = {
    ...publicJwk,
    d: base64urlEncode(privateKeyBytes)
  }

  return { publicJwk, privateJwk }
}

// ─── JWK import/export ─────────────────────────────────────────────────

export function privateKeyFromJwk(jwk: P256PrivateJwk): Uint8Array {
  return base64urlDecode(jwk.d)
}

export function publicKeyFromJwk(jwk: P256PublicJwk): Uint8Array {
  const x = base64urlDecode(jwk.x)
  const y = base64urlDecode(jwk.y)
  const uncompressed = new Uint8Array(65)
  uncompressed[0] = 0x04
  uncompressed.set(x, 1)
  uncompressed.set(y, 33)
  return uncompressed
}

// ─── P-256 key compression ────────────────────────────────────────────

export function compressP256PublicKey(uncompressed: Uint8Array): Uint8Array {
  if (uncompressed.length !== 65 || uncompressed[0] !== 0x04) {
    throw new Error('Expected 65-byte uncompressed P-256 public key')
  }
  const x = uncompressed.slice(1, 33)
  const y = uncompressed.slice(33, 65)
  const prefix = y[31] % 2 === 0 ? 0x02 : 0x03
  const compressed = new Uint8Array(33)
  compressed[0] = prefix
  compressed.set(x, 1)
  return compressed
}

export function decompressP256PublicKey(compressed: Uint8Array): Uint8Array {
  if (
    compressed.length !== 33 ||
    (compressed[0] !== 0x02 && compressed[0] !== 0x03)
  ) {
    throw new Error('Expected 33-byte compressed P-256 public key')
  }
  const point = p256.ProjectivePoint.fromHex(compressed)
  return point.toRawBytes(false)
}

export function compressedKeyFromJwk(jwk: P256PublicJwk): Uint8Array {
  return compressP256PublicKey(publicKeyFromJwk(jwk))
}

// ─── Raw signing/verification ──────────────────────────────────────────

export function signES256(
  data: Uint8Array,
  privateKey: Uint8Array
): Uint8Array {
  const hash = sha256(data)
  const sig = p256.sign(hash, privateKey, { lowS: true })
  return sig.toCompactRawBytes()
}

export function verifyES256(
  signature: Uint8Array,
  data: Uint8Array,
  publicKey: Uint8Array
): boolean {
  const hash = sha256(data)
  return p256.verify(signature, hash, publicKey)
}

// ─── JWT operations ────────────────────────────────────────────────────

export type JwtHeader = {
  alg: 'ES256'
  typ?: string
  kid?: string
  jwk?: P256PublicJwk
  [key: string]: unknown
}

export function signJwt(
  payload: Record<string, unknown>,
  privateJwk: P256PrivateJwk,
  extraHeaders?: Partial<JwtHeader>
): string {
  const header: JwtHeader = {
    alg: 'ES256',
    typ: 'JWT',
    ...extraHeaders
  }

  const headerB64 = base64urlEncodeString(JSON.stringify(header))
  const payloadB64 = base64urlEncodeString(JSON.stringify(payload))
  const signingInput = `${headerB64}.${payloadB64}`

  const encoder = new TextEncoder()
  const signingInputBytes = encoder.encode(signingInput)
  const privateKey = privateKeyFromJwk(privateJwk)
  const signature = signES256(signingInputBytes, privateKey)

  return `${signingInput}.${base64urlEncode(signature)}`
}

export function decodeJwt(jwt: string): {
  header: JwtHeader
  payload: Record<string, unknown>
  signature: string
} {
  const parts = jwt.split('.')
  if (parts.length !== 3) {
    throw new Error('Invalid JWT: expected 3 parts separated by dots')
  }

  const decoder = new TextDecoder()
  const header = JSON.parse(decoder.decode(base64urlDecode(parts[0])))
  const payload = JSON.parse(decoder.decode(base64urlDecode(parts[1])))

  return { header, payload, signature: parts[2] }
}

export function verifyJwt(
  jwt: string,
  publicJwk: P256PublicJwk
): { header: JwtHeader; payload: Record<string, unknown> } {
  const parts = jwt.split('.')
  if (parts.length !== 3) {
    throw new Error('Invalid JWT: expected 3 parts separated by dots')
  }

  const signingInput = `${parts[0]}.${parts[1]}`
  const encoder = new TextEncoder()
  const signingInputBytes = encoder.encode(signingInput)
  const signatureBytes = base64urlDecode(parts[2])
  const publicKey = publicKeyFromJwk(publicJwk)

  const valid = verifyES256(signatureBytes, signingInputBytes, publicKey)
  if (!valid) {
    throw new Error('Invalid JWT signature')
  }

  const decoder = new TextDecoder()
  const header = JSON.parse(decoder.decode(base64urlDecode(parts[0])))
  const payload = JSON.parse(decoder.decode(base64urlDecode(parts[1])))

  return { header, payload }
}

// ─── did:key P-256 utilities ───────────────────────────────────────────

// Multicodec for P-256 public key: 0x1200
// Varint encoding of 0x1200: [0x80, 0x24]
const P256_MULTICODEC_VARINT = new Uint8Array([0x80, 0x24])

export function didJwkFromPublicKey(publicJwk: P256PublicJwk): string {
  const jwkJson = JSON.stringify({
    kty: publicJwk.kty,
    crv: publicJwk.crv,
    x: publicJwk.x,
    y: publicJwk.y
  })
  const encoder = new TextEncoder()
  return `did:jwk:${base64urlEncode(encoder.encode(jwkJson))}`
}

export function didKeyFromPublicKey(publicJwk: P256PublicJwk): string {
  const compressed = compressedKeyFromJwk(publicJwk)

  const multicodecKey = new Uint8Array(
    P256_MULTICODEC_VARINT.length + compressed.length
  )
  multicodecKey.set(P256_MULTICODEC_VARINT)
  multicodecKey.set(compressed, P256_MULTICODEC_VARINT.length)

  return `did:key:z${base58btcEncode(multicodecKey)}`
}

// Multicodec for jwk_jcs-pub: 0xeb51
// Varint encoding of 0xeb51 (60241): [0xD1, 0xD6, 0x03]
const JWK_JCS_PUB_MULTICODEC_VARINT = new Uint8Array([0xd1, 0xd6, 0x03])

export function didKeyEbsiFromPublicKey(publicJwk: P256PublicJwk): string {
  const jcsJwk = `{"crv":"${publicJwk.crv}","kty":"${publicJwk.kty}","x":"${publicJwk.x}","y":"${publicJwk.y}"}`

  const encoder = new TextEncoder()
  const jwkBytes = encoder.encode(jcsJwk)

  const multicodecKey = new Uint8Array(
    JWK_JCS_PUB_MULTICODEC_VARINT.length + jwkBytes.length
  )
  multicodecKey.set(JWK_JCS_PUB_MULTICODEC_VARINT)
  multicodecKey.set(jwkBytes, JWK_JCS_PUB_MULTICODEC_VARINT.length)

  return `did:key:z${base58btcEncode(multicodecKey)}`
}

export function publicJwkFromDidKeyEbsi(did: string): P256PublicJwk {
  if (!did.startsWith('did:key:z')) {
    throw new Error('Expected did:key with multibase base58btc prefix (z)')
  }

  const multibaseValue = did.slice('did:key:z'.length)
  const decoded = base58btcDecode(multibaseValue)

  if (
    decoded.length < 3 ||
    decoded[0] !== JWK_JCS_PUB_MULTICODEC_VARINT[0] ||
    decoded[1] !== JWK_JCS_PUB_MULTICODEC_VARINT[1] ||
    decoded[2] !== JWK_JCS_PUB_MULTICODEC_VARINT[2]
  ) {
    throw new Error(
      'Not an EBSI did:key (expected multicodec 0xeb51 jwk_jcs-pub)'
    )
  }

  const jwkBytes = decoded.slice(JWK_JCS_PUB_MULTICODEC_VARINT.length)
  const decoder = new TextDecoder()
  const jwk = JSON.parse(decoder.decode(jwkBytes))

  return {
    kty: jwk.kty,
    crv: jwk.crv,
    x: jwk.x,
    y: jwk.y
  }
}

export function publicJwkFromDidKey(did: string): P256PublicJwk {
  if (!did.startsWith('did:key:z')) {
    throw new Error('Expected did:key with multibase base58btc prefix (z)')
  }

  const multibaseValue = did.slice('did:key:z'.length)
  const decoded = base58btcDecode(multibaseValue)

  if (
    decoded.length < 2 ||
    decoded[0] !== P256_MULTICODEC_VARINT[0] ||
    decoded[1] !== P256_MULTICODEC_VARINT[1]
  ) {
    throw new Error('Not a P-256 did:key (expected multicodec 0x1200)')
  }

  const compressed = decoded.slice(P256_MULTICODEC_VARINT.length)
  const uncompressed = decompressP256PublicKey(compressed)

  const x = uncompressed.slice(1, 33)
  const y = uncompressed.slice(33, 65)

  return {
    kty: 'EC',
    crv: 'P-256',
    x: base64urlEncode(x),
    y: base64urlEncode(y)
  }
}

export function didDocumentFromP256Key(
  publicJwk: P256PublicJwk
): Record<string, unknown> {
  const did = didKeyFromPublicKey(publicJwk)
  const verificationMethodId = `${did}#${did.split(':')[2]}`

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
        publicKeyJwk: {
          kty: publicJwk.kty,
          crv: publicJwk.crv,
          x: publicJwk.x,
          y: publicJwk.y
        }
      }
    ],
    authentication: [verificationMethodId],
    assertionMethod: [verificationMethodId],
    capabilityInvocation: [verificationMethodId],
    capabilityDelegation: [verificationMethodId]
  }
}
