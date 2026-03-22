import { lookup } from 'dns/promises'
import ipaddr from 'ipaddr.js'

/**
 * Validates a URL and ensures it does not resolve to a private or internal IP address.
 * This is a critical defense against Server-Side Request Forgery (SSRF).
 */
export async function validateSafeUrl(url: string): Promise<boolean> {
  try {
    const parsedUrl = new URL(url)
    
    // Only allow http and https
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      return false
    }

    const { address } = await lookup(parsedUrl.hostname)
    const addr = ipaddr.parse(address)
    const range = addr.range()

    // Block private, loopback, link-local, and other internal ranges
    const unsafeRanges = [
      'loopback',
      'linkLocal',
      'private',
      'uniqueLocal',
      'unspecified',
      'broadcast',
      'multicast'
    ]

    if (unsafeRanges.includes(range)) {
      console.error(`SSRF Blocked: URL ${url} resolved to unsafe range: ${range} (${address})`)
      return false
    }

    return true
  } catch (err) {
    console.error(`SSRF Filter Error for ${url}:`, err)
    return false
  }
}

export function isUrlSafe(url: string): Promise<boolean> {
  return validateSafeUrl(url)
}
