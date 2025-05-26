import * as API from './api.js'

import { multiaddr, isMultiaddr } from '@multiformats/multiaddr'
import { CID } from 'multiformats/cid'

/**
 * Create a provider-hinted URI for a given base URL and providers.
 * Follows format rules defined in the proposal.
 *
 * @param {Object} opts
 * @param {string} opts.base - Base URI (must contain CID in valid position).
 * @param {API.ProviderHint[]} [opts.providers] - Optional provider hints.
 * @param {string} [opts.path] - Optional path to append to the URI.
 * @returns {URL} URI
 */
export function createUri({ base, path, providers = [] }) {
  const url = new URL(base)

  // Extracts the CID from the base URL for verification
  // and the path to append.
  const { cid, path: basePath } = extractComponents(base)

  // reconstruct full path including /ipfs/CID if needed
  if (path) {
    const cleanPath = path.startsWith('/') ? path : `/${path}`
    url.pathname = `/ipfs/${cid}${cleanPath}`
  } else {
    url.pathname = basePath
  }

  for (const provider of providers) {
    if (!isMultiaddr(provider.multiaddr)) {
      throw new Error('Provider multiaddr must be a Multiaddr instance')
    }

    const baseParts = provider.multiaddr.toString().split('/')
    const hintParts = [...baseParts]

    const hint = '/' + hintParts.filter(Boolean).join('/')
    url.searchParams.append('provider', hint)
  }

  return url
}

/**
 * Parse a provider-hinted URI into a CID and structured provider hints,
 * preserving the full multiaddr including `/retrieval/<proto>` segments.
 *
 * @param {string} uri
 * @returns {{ cid: API.CID, providers: API.ProviderHint[], path: string, protocol: string }}
 */
export function parseUri(uri) {
  const url = new URL(uri)
  const { cid, normalizedPath: path, protocol } = extractComponents(uri)
  const providers = parseQueryString(url.searchParams)

  return {
    cid,
    providers,
    path,
    protocol,
  }
}

/**
 * Parse provider hints from a query string or URLSearchParams.
 *
 * @param {string | URLSearchParams} query
 * @returns {API.ProviderHint[]}
 */
export function parseQueryString(query) {
  const searchParams =
    typeof query === 'string' ? new URLSearchParams(query) : query

  /** @type {API.ProviderHint[]} */
  const providers = []

  for (const val of searchParams.getAll('provider')) {
    if (!val.startsWith('/')) continue

    try {
      const m = multiaddr(val)
      providers.push({ multiaddr: m })
    } catch {
      // Skip malformed multiaddrs
      continue
    }
  }

  return providers
}

/**
 * Extracts and parses the CID from a base URI using rules from the proposal:
 * - Multi-dotted subdomain form (e.g., CID.ipfs.dweb.link)
 * - Path-based (e.g., https://gateway.com/ipfs/CID)
 * - ipfs://CID
 *
 * @param {string} base
 * @returns {{ cid: API.CID, path: string, normalizedPath: string, protocol: string }}
 * @throws {Error} if no valid CID is found or if format is ambiguous
 */
function extractComponents(base) {
  const url = new URL(base)

  // Rule 1: Subdomain-based CID
  const hostParts = url.hostname.split('.')
  if (hostParts.length >= 3 && hostParts[1] === 'ipfs') {
    const subdomainCid = hostParts[0]

    if (url.pathname.includes('/ipfs/')) {
      throw new Error('CID appears in both subdomain and path — ambiguous')
    }

    try {
      const cid = CID.parse(subdomainCid)
      const path = url.pathname
      return { cid, path, normalizedPath: path, protocol: 'ipfs' }
    } catch {
      throw new Error('Invalid CID in subdomain')
    }
  }

  // Rule 2: Path-based /ipfs/<cid>/...
  const match = url.pathname.match(/^\/ipfs\/([^/]+)(\/.*)?$/)
  if (match) {
    try {
      const cid = CID.parse(match[1])
      const normalizedPath = match[2] ?? '/'
      const path = `/ipfs/${cid}${normalizedPath}`
      return { cid, path, normalizedPath, protocol: 'ipfs' }
    } catch {
      throw new Error('Invalid CID in path')
    }
  }

  // Rule 3: ipfs://<cid>/...
  if (url.protocol === 'ipfs:') {
    try {
      const cid = CID.parse(url.hostname)
      const normalizedPath = url.pathname || '/'
      const path = normalizedPath
      return { cid, path, normalizedPath, protocol: 'ipfs' }
    } catch {
      throw new Error('Invalid CID in ipfs:// URL')
    }
  }

  throw new Error('No CID found in base URL')
}
