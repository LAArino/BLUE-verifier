# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Verifier Plus is a Next.js 15 application for verifying and displaying W3C Verifiable Credentials (VCs). It supports VC Data Model v1/v2, Open Badges 3.0, and VPQR format. It also provides online credential storage with public link sharing via MongoDB. Live at https://verifierplus.org.

## Commands

```bash
npm run dev          # Dev server with Turbopack (http://localhost:3000)
npm run build        # Production build (standalone output)
npm start            # Production server
npm run test         # Playwright tests (DesktopChrome + API projects)
```

Run tests against a specific URL:
```bash
PLAYWRIGHT_TEST_URL=https://stage.verifierplus.org npm run test
```

Run a single test file:
```bash
npx playwright test tests/api.spec.ts --project=API
npx playwright test tests/credential.spec.ts --project=DesktopChrome
```

## Architecture

**Next.js App Router** with `app/` directory. Standalone output mode for Docker deployment.

### Key Directories
- `app/components/` — React UI components (each in its own folder with `.tsx` + `.module.css`)
- `app/lib/` — Shared utilities (verification, database, decoding, registry)
- `app/api/` — API route handlers
- `app/types/` — TypeScript type definitions (credential.d.ts, presentation.d.ts)
- `tests/` — Playwright E2E tests with visual regression snapshots

### API Routes
- `POST /api/verify` — Verify a credential
- `POST /api/credentials` — Store a credential (requires signed VP with holder DID)
- `GET /api/credentials/[publicCredentialId]` — Retrieve stored credential
- `DELETE /api/credentials/[publicCredentialId]` — Unshare credential (soft delete)
- `POST /api/proxy` — CORS proxy for fetching external VCs
- `GET /api/exchanges/[txId]` — Verifiable Presentation Request exchange
- `GET /api/healthz` — Health check

### Verification Flow
1. User provides input (paste JSON, URL via `/#verify?vc=<url>`, QR scan, or file upload)
2. `lib/decode.ts` parses input → `lib/verifiableObject.ts` extracts VC/VP
3. `api/verify` calls `@digitalcredentials/verifier-core` for cryptographic checks
4. `lib/useVerification.ts` hook + `verificationContext.ts` manage UI state
5. Results displayed via `CredentialVerification`, `VerificationCard`, `ResultLog` components

### State Management
React Context API (`verificationContext.ts`) for verification state. URL hash-based client-side routing (`#verify`, `#/`).

### Database
MongoDB with LRU-cached connection pool (`lib/database.ts`). Credentials stored with UUID, soft-deleted via `shared: false` flag.

## Path Aliases

Use `@/` prefix for imports: `@/components/*`, `@/lib/*`, `@/types/*`, `@/css/*`.

## Styling

CSS Modules (`.module.css`) per component + Bootstrap + Tailwind CSS 4. Dark mode via `.darkmode` class. CSS custom properties for theming (`--primary`, `--text`, etc.) defined in `globals.css`.

## Environment Variables

See `.env.example`. MongoDB connection (`DB_USER`, `DB_PASS`, `DB_HOST`, `DB_NAME`, `DB_COLLECTION`), deployment URL, and exchange server URL. Required for credential storage features.

## Testing

Playwright with three projects: DesktopChrome, MobileChrome, API. Visual regression snapshots stored in `tests/*.spec.ts-snapshots/`. Test IDs defined in `app/lib/testIds.ts`. Retries: 2 for UI, 0 for API.

## Key Dependencies

- `@digitalcredentials/verifier-core` — Core VC verification logic
- `@digitalcredentials/issuer-registry-client` — Known issuer registry lookups
- `@digitalcredentials/vpqr` — QR code presentation format
- `@digitalcredentials/security-document-loader` — JSON-LD context resolution
- `credential-handler-polyfill` — CHAPI protocol support (loaded on page load)

## Notes

- Only one credential at a time is supported; multiple VCs in a VP use only the first
- Credential storage requires DID authentication (holder field in VP)
- Node.js 20 required (see Dockerfile)
