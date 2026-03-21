import isURL from 'validator/lib/isURL'
export function isValidHttpUrl (value: string | undefined): boolean {
  if (!value || typeof value !== 'string') return false
  const trimmed = value.trim()
  if (trimmed.length === 0) return false

  const baseOptions = {
    require_protocol: true,
    require_host: true,
    allow_underscores: false,
    allow_trailing_dot: false,
    allow_protocol_relative_urls: false
  }

  // Allow any http/https on localhost/127.0.0.1 for dev
  const isLocal = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/i.test(trimmed)
  if (isLocal) {
    return isURL(trimmed, { ...baseOptions, protocols: ['http','https'] })
  }

  // Public hosts must be https
  return isURL(trimmed, { ...baseOptions, protocols: ['https'], require_tld: true })
}

// ─── SSRF protection ──────────────────────────────────────────────────

const PRIVATE_IP_PATTERNS = [
  /^10\./,                          // 10.0.0.0/8
  /^172\.(1[6-9]|2\d|3[01])\./,    // 172.16.0.0/12
  /^192\.168\./,                    // 192.168.0.0/16
  /^127\./,                         // 127.0.0.0/8 (loopback)
  /^0\./,                           // 0.0.0.0/8
  /^169\.254\./,                    // 169.254.0.0/16 (link-local / cloud metadata)
  /^::1$/,                          // IPv6 loopback
  /^fc00:/i,                        // IPv6 unique local
  /^fe80:/i,                        // IPv6 link-local
  /^\[::1\]$/,                      // IPv6 loopback bracketed
]

/**
 * Checks if a hostname looks like a private/reserved IP address.
 */
function isPrivateHost(hostname: string): boolean {
  return PRIVATE_IP_PATTERNS.some(pattern => pattern.test(hostname))
}

/**
 * Validates a URL for server-side fetching (SSRF protection).
 * Enforces HTTPS and blocks private/reserved IP ranges.
 * Throws if the URL is not safe.
 */
export function assertSafeUrl(url: string): void {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    throw new Error(`Invalid URL: ${url}`)
  }

  if (parsed.protocol !== 'https:') {
    throw new Error(`URL must use HTTPS: ${url}`)
  }

  if (isPrivateHost(parsed.hostname)) {
    throw new Error(`URL points to a private/reserved address: ${parsed.hostname}`)
  }

  // Block numeric-only hostnames (bare IPs without TLD)
  if (/^\d+\.\d+\.\d+\.\d+$/.test(parsed.hostname)) {
    throw new Error(`URL must use a domain name, not a bare IP: ${parsed.hostname}`)
  }
}
