import { NextRequest } from 'next/server';
import { VerifiableCredential } from '@/types/credential';
import { verifyCredential } from '@/lib/validate';
import { verifyJwtVcCredential, verifySdJwtCredential } from '@/lib/validate-jwt';
import { isJwtString } from '@/lib/crypto/jwtVc';
import { isSdJwt } from '@/lib/crypto/sdJwt';

/**
 * POST /api/verify
 *
 * Accepts either:
 * - A JSON-LD VC object (existing path via verifier-core)
 * - A wrapper { rawJwt: string } for JWT-VC or SD-JWT verification
 */
export async function POST(request: NextRequest) {
    const body = await request.json();

    // JWT-VC or SD-JWT path
    if (body.rawJwt && typeof body.rawJwt === 'string') {
        const rawToken = body.rawJwt as string;
        let result;
        if (isSdJwt(rawToken)) {
            result = await verifySdJwtCredential(rawToken);
        } else if (isJwtString(rawToken)) {
            result = await verifyJwtVcCredential(rawToken);
        } else {
            return Response.json(
                { error: 'Invalid token format: not a valid JWT or SD-JWT' },
                { status: 400 }
            );
        }
        return Response.json({ result });
    }

    // JSON-LD VC path (existing)
    const credential = body as VerifiableCredential;
    const result = await verifyCredential(credential);
    return Response.json({result})
}
