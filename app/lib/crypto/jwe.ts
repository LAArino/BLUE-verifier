/**
 * JWE (JSON Web Encryption) with ECDH-ES + A128GCM.
 *
 * Provides both encryption (for building JARM requests if needed)
 * and decryption (for processing JARM responses from wallets).
 *
 * Implements:
 * - ECDH-ES key agreement with P-256 (RFC 7518 §4.6)
 * - Concat KDF key derivation (RFC 7518 §4.6.2)
 * - AES-128-GCM authenticated encryption (RFC 7518 §5.1)
 *
 * Adapted from learner-credential-wallet.
 */
import { p256 } from '@noble/curves/p256'
import { sha256 } from '@noble/hashes/sha256'
import { gcm } from '@noble/ciphers/aes'
import {
  base64urlEncode,
  base64urlDecode,
  generateP256KeyPair,
  publicKeyFromJwk,
  privateKeyFromJwk,
  P256PublicJwk,
  P256PrivateJwk
} from './es256'

// ─── JWE Encryption ───────────────────────────────────────────────────

/**
 * Encrypts a plaintext string as a JWE compact serialization using ECDH-ES + A128GCM.
 */
export function encryptJwe(
  plaintext: string,
  recipientPublicJwk: P256PublicJwk,
  recipientKid?: string
): string {
  // 1. Generate ephemeral P-256 key pair
  const ephemeral = generateP256KeyPair()

  // 2. ECDH key agreement: Z = x-coordinate of shared point
  const recipientPubBytes = publicKeyFromJwk(recipientPublicJwk)
  const ephemeralPrivBytes = privateKeyFromJwk(ephemeral.privateJwk)
  const sharedSecret = p256.getSharedSecret(ephemeralPrivBytes, recipientPubBytes)
  const Z = sharedSecret.slice(1, 33) // x-coordinate only

  // 3. Build JWE protected header
  const header: Record<string, unknown> = {
    alg: 'ECDH-ES',
    enc: 'A128GCM',
    epk: {
      kty: 'EC',
      crv: 'P-256',
      x: ephemeral.publicJwk.x,
      y: ephemeral.publicJwk.y
    }
  }
  if (recipientKid) {
    header.kid = recipientKid
  }
  const headerB64 = base64urlEncode(
    new TextEncoder().encode(JSON.stringify(header))
  )

  // 4. Derive CEK via Concat KDF
  const cek = concatKdf(Z, 'A128GCM', 128)

  // 5. Generate random 96-bit IV
  const iv = new Uint8Array(12)
  crypto.getRandomValues(iv)

  // 6. Encrypt with AES-128-GCM
  const aad = new TextEncoder().encode(headerB64)
  const plaintextBytes = new TextEncoder().encode(plaintext)
  const cipher = gcm(cek, iv, aad)
  const sealed = cipher.encrypt(plaintextBytes)
  const ciphertext = sealed.slice(0, sealed.length - 16)
  const tag = sealed.slice(sealed.length - 16)

  // 7. JWE compact serialization (encrypted key is empty for ECDH-ES direct)
  return `${headerB64}..${base64urlEncode(iv)}.${base64urlEncode(ciphertext)}.${base64urlEncode(tag)}`
}

// ─── JWE Decryption ───────────────────────────────────────────────────

/**
 * Decrypts a JWE compact serialization using the recipient's P-256 private key.
 */
export function decryptJwe(
  jwe: string,
  privateJwk: P256PrivateJwk
): string {
  // 1. Parse JWE compact format
  const parts = jwe.split('.')
  if (parts.length !== 5) {
    throw new Error('Invalid JWE: expected 5 parts separated by dots')
  }
  const [headerB64, , ivB64, ciphertextB64, tagB64] = parts

  // 2. Decode header
  const headerJson = new TextDecoder().decode(base64urlDecode(headerB64))
  const header = JSON.parse(headerJson)

  if (header.alg !== 'ECDH-ES') {
    throw new Error(`Unsupported JWE algorithm: ${header.alg}`)
  }
  if (header.enc !== 'A128GCM') {
    throw new Error(`Unsupported JWE encryption: ${header.enc}`)
  }

  // 3. Extract ephemeral public key from header
  const epk = header.epk as P256PublicJwk
  if (!epk || epk.kty !== 'EC' || epk.crv !== 'P-256') {
    throw new Error('Invalid or missing ephemeral public key in JWE header')
  }

  // 4. ECDH key agreement with recipient's private key + ephemeral public key
  const recipientPrivBytes = privateKeyFromJwk(privateJwk)
  const epkPubBytes = publicKeyFromJwk(epk)
  const sharedSecret = p256.getSharedSecret(recipientPrivBytes, epkPubBytes)
  const Z = sharedSecret.slice(1, 33) // x-coordinate only

  // 5. Derive CEK using same Concat KDF
  const cek = concatKdf(Z, header.enc, 128)

  // 6. Decode IV, ciphertext, tag
  const iv = base64urlDecode(ivB64)
  const ciphertext = base64urlDecode(ciphertextB64)
  const tag = base64urlDecode(tagB64)

  // 7. Decrypt with AES-128-GCM
  const aad = new TextEncoder().encode(headerB64)
  const sealed = new Uint8Array(ciphertext.length + tag.length)
  sealed.set(ciphertext)
  sealed.set(tag, ciphertext.length)

  const cipher = gcm(cek, iv, aad)
  const plaintext = cipher.decrypt(sealed)

  return new TextDecoder().decode(plaintext)
}

// ─── Concat KDF (RFC 7518 §4.6.2) ────────────────────────────────────

/**
 * Derives a key using the Concat KDF as specified in RFC 7518 §4.6.2.
 */
function concatKdf(
  sharedSecret: Uint8Array,
  algorithm: string,
  keyLengthBits: number,
  apu: Uint8Array = new Uint8Array(0),
  apv: Uint8Array = new Uint8Array(0)
): Uint8Array {
  const algBytes = new TextEncoder().encode(algorithm)

  const otherInfo = concatBytes(
    uint32BE(algBytes.length),
    algBytes,
    uint32BE(apu.length),
    apu,
    uint32BE(apv.length),
    apv,
    uint32BE(keyLengthBits)
  )

  const hashInput = concatBytes(
    uint32BE(1), // round number
    sharedSecret,
    otherInfo
  )

  const hash = sha256(hashInput)
  return hash.slice(0, keyLengthBits / 8)
}

// ─── Helpers ──────────────────────────────────────────────────────────

function uint32BE(value: number): Uint8Array {
  const buf = new Uint8Array(4)
  buf[0] = (value >>> 24) & 0xff
  buf[1] = (value >>> 16) & 0xff
  buf[2] = (value >>> 8) & 0xff
  buf[3] = value & 0xff
  return buf
}

function concatBytes(...arrays: Uint8Array[]): Uint8Array {
  const totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0)
  const result = new Uint8Array(totalLength)
  let offset = 0
  for (const arr of arrays) {
    result.set(arr, offset)
    offset += arr.length
  }
  return result
}
