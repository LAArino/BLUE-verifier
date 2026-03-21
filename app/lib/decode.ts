import { fromQrCode } from '@digitalcredentials/vpqr';
import { securityLoader } from '@digitalcredentials/security-document-loader';
import type { VerifiableCredential } from '../types/credential.d';
import { VerifiableObject, extractCredentialsFrom } from './verifiableObject';
import { isJwtString, extractVcAuto } from './crypto/jwtVc';
import { isSdJwt } from './crypto/sdJwt';

const documentLoader = securityLoader().build();
const vpqrPattern = /^VP1-[A-Z|0-9]+/;

/**
 * Result of decoding a credential input.
 * For JWT/SD-JWT, includes the raw token for server-side signature verification.
 */
export type DecodedCredentialResult = {
  credentials: VerifiableCredential[];
  rawJwt?: string;
}

export async function credentialsFromQrText(text: string): Promise<DecodedCredentialResult | null> {

  let url;
  try {
    url = new URL(text);
  } catch (e) {
    // wasn't a url, so just continue on
  }

  try {
    if (url?.protocol === "http:" || url?.protocol === "https:") {
      const json = await getJSONFromURL(url.toString())
      const credentials = extractCredentialsFrom(json)
      return credentials ? { credentials } : null;
    }
  } catch (e) {
    return null;
  }

  // Check for SD-JWT (must check before JWT since SD-JWT also contains dots)
  if (isSdJwt(text)) {
    try {
      const vc = extractVcAuto(text) as unknown as VerifiableCredential;
      return { credentials: [vc], rawJwt: text };
    } catch {
      return null;
    }
  }

  // Check for JWT-VC
  if (isJwtString(text)) {
    try {
      const vc = extractVcAuto(text) as unknown as VerifiableCredential;
      return { credentials: [vc], rawJwt: text };
    } catch {
      return null;
    }
  }

  try {
    const { vp }: { vp: VerifiableObject } = await fromQrCode({ text, documentLoader });
    const vc = extractCredentialsFrom(vp);
    return vc ? { credentials: vc } : null;

  } catch (error) {
    return null;
  }

}

export function isVpqr(text: string): boolean {
  return vpqrPattern.test(text);
}

async function getJSONFromURL(url: string) {
  try {
    // Proxy the request through our backend to avoid CORS
    const response = await fetch('/api/proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching URL:', error);
    return "";
  }
}