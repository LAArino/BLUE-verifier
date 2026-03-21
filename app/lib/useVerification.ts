'use client'
import { useCallback, useEffect, useRef, useState } from 'react';
import { VerifiableCredential, VerifyResponse } from '../types/credential.d';
import { VerificationContextType } from './verificationContext';

export const useVerification = (credential?: VerifiableCredential, rawJwt?: string) => {
  const [verificationResult, setVerificationResult] = useState<VerifyResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [timerExpired, setTimerExpired] = useState(false);
  const timeout = useRef<number>(0);

  const issuerName = typeof credential?.issuer === 'string' ? credential?.issuer : credential?.issuer?.name;

  const verifyCredential = useCallback(async () => {
    if (credential === undefined) {
      return;
    }
    setLoading(true);
    setTimerExpired(false);

    // artificial delay for UI purposes
    timeout.current = window.setTimeout(() => {
      setTimerExpired(true);
    }, 1000);

    // For JWT-VC/SD-JWT, send the raw token; for JSON-LD, send the credential object
    const body = rawJwt
      ? JSON.stringify({ rawJwt })
      : JSON.stringify(credential);

    const res = await fetch('/api/verify', {
      method: 'POST',
      body
    });

    const { result } = await res.json();
    setVerificationResult(result);
    setLoading(false);
  }, [credential, rawJwt]);

  useEffect(() => {
    verifyCredential()
    return () => {
      window.clearTimeout(timeout.current);
    }
  }, [verifyCredential]);

  return { loading: loading || !timerExpired, verificationResult, verifyCredential, issuerName } as VerificationContextType
}
