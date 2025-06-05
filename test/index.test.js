/* global console */

import assert from 'assert'
import { multiaddr } from '@vascosantos/multiaddr'

import { createUri, parseUri, parseQueryString } from '../src/index.js'

describe('creates and parses provider-hinted-uris', () => {
  const cidStr = 'bafybeigdyrztjtvgrql5ozckchz7ykghgq4svlrjvbvsnkcuoqytqh2rhe'
  const maddr = multiaddr('/ip4/1.2.3.4/tcp/1234')

  it('parses subdomain CID correctly', () => {
    const uri = `https://${cidStr}.ipfs.dweb.link`
    const parsed = parseUri(uri)
    assert.deepStrictEqual(parsed.cid.toString(), cidStr)
    assert.deepStrictEqual(parsed.providers, [])
  })

  it('parses path CID correctly', () => {
    const uri = `https://gateway.example.com/ipfs/${cidStr}`
    const parsed = parseUri(uri)
    assert.deepStrictEqual(parsed.cid.toString(), cidStr)
    assert.deepStrictEqual(parsed.providers, [])
  })

  it('parses ipfs:// CID correctly', () => {
    const uri = `ipfs://${cidStr}`
    const parsed = parseUri(uri)
    assert.deepStrictEqual(parsed.cid.toString(), cidStr)
    assert.deepStrictEqual(parsed.providers, [])
  })

  it('parses provider hint with multiple tag markers', () => {
    const base = `https://example.com/ipfs/${cidStr}`
    const url = new URL(base)
    const appendedMultiaddr = `${maddr.toString()}/tag/http/tag/bitswap`
    url.searchParams.append('provider', appendedMultiaddr)
    const parsed = parseUri(url.toString())

    assert.strictEqual(parsed.providers.length, 1)
    assert.strictEqual(
      parsed.providers[0].multiaddr.toString(),
      appendedMultiaddr
    )
    assert.deepStrictEqual(parsed.providers[0].tags, ['http', 'bitswap'])
  })

  it('throws on ambiguous subdomain + path format', () => {
    const uri = `https://${cidStr}.ipfs.dweb.link/ipfs/${cidStr}`
    assert.throws(() => parseUri(uri), /ambiguous/)
  })

  it('creates URI with provider hints (no tags)', () => {
    const base = `https://example.com/ipfs/${cidStr}`
    const uri = createUri({
      base,
      providers: [{ multiaddr: maddr, tags: [] }],
    })

    const parsed = parseUri(uri.toString())
    assert.strictEqual(parsed.cid.toString(), cidStr)
    assert.strictEqual(parsed.providers.length, 1)
    assert.strictEqual(
      parsed.providers[0].multiaddr.toString(),
      maddr.toString()
    )
    assert.deepStrictEqual(parsed.providers[0].tags, [])
  })

  it('creates URI with provider hints (undefined tags)', () => {
    const base = `https://example.com/ipfs/${cidStr}`
    const uri = createUri({
      base,
      providers: [{ multiaddr: maddr }],
    })

    const parsed = parseUri(uri.toString())
    assert.strictEqual(parsed.cid.toString(), cidStr)
    assert.strictEqual(parsed.providers.length, 1)
    assert.strictEqual(
      parsed.providers[0].multiaddr.toString(),
      maddr.toString()
    )
    assert.deepStrictEqual(parsed.providers[0].tags, [])
  })

  it('creates URI with provider hints (with tags)', () => {
    const base = `https://example.com/ipfs/${cidStr}`
    const tags = ['http', 'bitswap']
    const uri = createUri({
      base,
      providers: [{ multiaddr: maddr, tags }],
    })

    const parsed = parseUri(uri.toString())
    assert.strictEqual(parsed.cid.toString(), cidStr)
    assert.strictEqual(parsed.providers.length, 1)
    assert.strictEqual(
      parsed.providers[0].multiaddr.toString(),
      `${maddr.toString()}/tag/http/tag/bitswap`
    )
    assert.deepStrictEqual(parsed.providers[0].tags, tags)
  })

  it('creates URI with multiple provider hints (mixed tags)', () => {
    const base = `https://example.com/ipfs/${cidStr}`
    const providers = [
      { multiaddr: multiaddr('/ip4/1.2.3.4/tcp/1234/ws'), tags: ['bitswap'] },
      { multiaddr: multiaddr('/ip4/5.6.7.8/tcp/443/https'), tags: ['http'] },
      { multiaddr: multiaddr('/dnsaddr/provider.example.com'), tags: [] },
    ]

    const uri = createUri({ base, providers })
    const parsed = parseUri(uri.toString())

    assert.strictEqual(parsed.cid.toString(), cidStr)
    assert.strictEqual(parsed.providers.length, 3)

    assert.strictEqual(
      parsed.providers[0].multiaddr.toString(),
      `${providers[0].multiaddr}/tag/bitswap`
    )
    assert.deepStrictEqual(parsed.providers[0].tags, ['bitswap'])

    assert.strictEqual(
      parsed.providers[1].multiaddr.toString(),
      `${providers[1].multiaddr}/tag/http`
    )
    assert.deepStrictEqual(parsed.providers[1].tags, ['http'])

    assert.strictEqual(
      parsed.providers[2].multiaddr.toString(),
      providers[2].multiaddr.toString()
    )
    assert.deepStrictEqual(parsed.providers[2].tags, [])
  })

  it('parses provider with trailing tag and no protocol', () => {
    const ma = '/ip4/1.2.3.4/tcp/1234/tag'
    const base = `https://example.com/ipfs/${cidStr}`
    const url = new URL(base)
    url.searchParams.append('provider', ma)
    const parsed = parseUri(url.toString())
    assert.strictEqual(parsed.providers.length, 0)
  })

  it('parses tag hint with unknown protocol', () => {
    const ma = '/ip4/1.2.3.4/tcp/1234/tag/magictag'
    const base = `https://example.com/ipfs/${cidStr}`
    const url = new URL(base)
    url.searchParams.append('provider', ma)
    const parsed = parseUri(url.toString())
    assert.strictEqual(parsed.providers.length, 1)
    assert.deepStrictEqual(parsed.providers[0].tags, ['magictag'])
  })

  it('handles multiple provider hints, some invalid', () => {
    const base = `https://example.com/ipfs/${cidStr}`
    const appendedMultiaddr = `${maddr.toString()}/tag/bitswap`
    const url = new URL(base)
    url.searchParams.append('provider', appendedMultiaddr)
    url.searchParams.append('provider', 'bad-ma')
    const appendedMultiaddr2 = '/ip4/5.6.7.8/tcp/4321/https/tag/http'
    url.searchParams.append('provider', appendedMultiaddr2)
    const parsed = parseUri(url.toString())
    assert.strictEqual(parsed.providers.length, 2)
    assert.strictEqual(
      parsed.providers[0].multiaddr.toString(),
      appendedMultiaddr
    )
    assert.deepStrictEqual(parsed.providers[0].tags, ['bitswap'])
    assert.strictEqual(
      parsed.providers[1].multiaddr.toString(),
      appendedMultiaddr2
    )
    assert.deepStrictEqual(parsed.providers[1].tags, ['http'])
  })

  it('ignores invalid multiaddr hints during parsing', () => {
    const base = `https://example.com/ipfs/${cidStr}`
    const url = new URL(base)
    // Add a malformed multiaddr as a provider hint
    url.searchParams.append('provider', '/not/a/real/multiaddr/tag/http')
    const parsed = parseUri(url.toString())
    assert.deepStrictEqual(parsed.cid.toString(), cidStr)
    assert.deepStrictEqual(parsed.providers, [])
  })

  it('ignores empty provider string', () => {
    const base = `https://example.com/ipfs/${cidStr}`
    const url = new URL(base)
    url.searchParams.append('provider', '')
    const parsed = parseUri(url.toString())
    assert.deepStrictEqual(parsed.providers, [])
  })

  it('ignores provider values not starting with "/"', () => {
    const base = `https://example.com/ipfs/${cidStr}`
    const url = new URL(base)
    url.searchParams.append('provider', 'not/a/multiaddr')
    const parsed = parseUri(url.toString())
    assert.deepStrictEqual(parsed.providers, [])
  })

  it('creates URI with a path after CID', () => {
    const base = `https://example.com/ipfs/${cidStr}`
    const path = '/foo/bar.txt'
    const url = createUri({ base, path })
    assert.strictEqual(url.toString(), `${base}${path}`)
  })

  it('parses URI and returns path after CID', () => {
    const uri = `https://gateway.example.com/ipfs/${cidStr}/foo/bar.txt`
    const parsed = parseUri(uri)
    assert.deepStrictEqual(parsed.cid.toString(), cidStr)
    assert.deepStrictEqual(parsed.path, '/foo/bar.txt')
  })

  it('creates URI with path and provider hints', () => {
    const base = `https://example.com/ipfs/${cidStr}`
    const path = '/dir/file.jpg'
    const url = createUri({
      base,
      path,
      providers: [
        {
          multiaddr: maddr,
          tags: ['http', 'bitswap'],
        },
      ],
    })

    const expectedProvider = `${maddr.toString()}/tag/http/tag/bitswap`
    const parsed = parseUri(url.toString())

    assert.strictEqual(parsed.cid.toString(), cidStr)
    assert.strictEqual(parsed.path, path)
    assert.strictEqual(parsed.providers.length, 1)
    assert.strictEqual(
      parsed.providers[0].multiaddr.toString(),
      expectedProvider
    )
    assert.deepStrictEqual(parsed.providers[0].tags, ['http', 'bitswap'])
  })

  it('adds leading slash if path does not start with /', () => {
    const base = `https://example.com/ipfs/${cidStr}`
    const uri = createUri({ base, path: 'foo/bar' })
    assert.strictEqual(
      uri.pathname,
      '/ipfs/bafybeigdyrztjtvgrql5ozckchz7ykghgq4svlrjvbvsnkcuoqytqh2rhe/foo/bar'
    )
  })

  it('falls back to default /ipfs/<cid>/ path when no path is present', () => {
    const base = `https://example.com/ipfs/${cidStr}`
    const uri = createUri({ base })
    assert.strictEqual(
      uri.pathname,
      '/ipfs/bafybeigdyrztjtvgrql5ozckchz7ykghgq4svlrjvbvsnkcuoqytqh2rhe/'
    )
  })

  it('sets default path as / for subdomain CID URLs with no pathname', () => {
    const uri = `https://${cidStr}.ipfs.dweb.link`
    const parsed = parseUri(uri)
    assert.strictEqual(parsed.path, '/')
  })

  it('throws on createUri if CID is not present in base', () => {
    const badBase = 'https://example.com/no/cid/here'
    assert.throws(() => createUri({ base: badBase }), /No CID found/)
  })

  it('throws on createUri with invalid CID', () => {
    const badBase = 'https://gateway.com/ipfs/not-a-cid'
    assert.throws(() => createUri({ base: badBase }), /Invalid CID/)
  })

  it('throws on invalid CID in subdomain', () => {
    const uri = 'https://notacid.ipfs.dweb.link'
    assert.throws(() => parseUri(uri), /Invalid CID/)
  })

  it('throws on invalid CID in ipfs:// scheme', () => {
    const uri = 'ipfs://notacid'
    assert.throws(() => parseUri(uri), /Invalid CID/)
  })

  it('throws on createUri with invalid multiaddr', () => {
    const base = `https://example.com/ipfs/${cidStr}`
    assert.throws(
      () =>
        createUri({
          base,
          /** @ts-expect-error */
          providers: [{ multiaddr: 'not-a-ma', tags: [] }],
        }),
      /multiaddr must be a Multiaddr instance/
    )
  })
})

describe('parseQueryString', () => {
  const maddr = multiaddr('/ip4/1.2.3.4/tcp/1234')

  it('parses single provider hint with multiple tag markers', () => {
    const input = `?provider=${encodeURIComponent(
      `${maddr.toString()}/tag/http/tag/bitswap`
    )}`
    const providers = parseQueryString(input)
    assert.strictEqual(providers.length, 1)
    assert.strictEqual(
      providers[0].multiaddr.toString(),
      `${maddr.toString()}/tag/http/tag/bitswap`
    )
    assert.deepStrictEqual(providers[0].tags, ['http', 'bitswap'])
  })

  it('parses multiple valid provider hints', () => {
    const hints = [
      `${maddr.toString()}/tag/http`,
      '/ip4/5.6.7.8/tcp/4321/https/tag/bitswap',
      '/dnsaddr/provider.example.com',
    ]
    const query = hints
      .map((h) => `provider=${encodeURIComponent(h)}`)
      .join('&')
    const providers = parseQueryString(`?${query}`)

    assert.strictEqual(providers.length, 3)
    assert.strictEqual(providers[0].multiaddr.toString(), hints[0])
    assert.deepStrictEqual(providers[0].tags, ['http'])

    assert.strictEqual(providers[1].multiaddr.toString(), hints[1])
    assert.deepStrictEqual(providers[1].tags, ['bitswap'])

    assert.strictEqual(providers[2].multiaddr.toString(), hints[2])
    assert.deepStrictEqual(providers[2].tags, [])
  })

  it('ignores malformed multiaddrs', () => {
    const valid = `${maddr.toString()}/tag/http`
    const query = `provider=${encodeURIComponent(
      valid
    )}&provider=not-a-ma&provider=/gibber/ish`
    const providers = parseQueryString(`?${query}`)
    assert.strictEqual(providers.length, 1)
    assert.strictEqual(providers[0].multiaddr.toString(), valid)
    assert.deepStrictEqual(providers[0].tags, ['http'])
  })

  it('ignores provider values not starting with "/"', () => {
    const query = 'provider=this_is_wrong&provider=/ip4/1.1.1.1/tcp/4001'
    const providers = parseQueryString(`?${query}`)
    assert.strictEqual(providers.length, 1)
    assert.strictEqual(
      providers[0].multiaddr.toString(),
      '/ip4/1.1.1.1/tcp/4001'
    )
    assert.deepStrictEqual(providers[0].tags, [])
  })

  it('ignores empty provider values', () => {
    const query = 'provider=&provider=/ip4/2.2.2.2/tcp/1234/tag/bitswap'
    const providers = parseQueryString(`?${query}`)
    assert.strictEqual(providers.length, 1)
    assert.strictEqual(
      providers[0].multiaddr.toString(),
      '/ip4/2.2.2.2/tcp/1234/tag/bitswap'
    )
    assert.deepStrictEqual(providers[0].tags, ['bitswap'])
  })

  it('supports unknown tag protocols', () => {
    const input = `?provider=${encodeURIComponent(
      `${maddr.toString()}/tag/magic`
    )}`

    const providers = parseQueryString(input)
    assert.strictEqual(providers.length, 1)
    assert.strictEqual(
      providers[0].multiaddr.toString(),
      `${maddr.toString()}/tag/magic`
    )
    assert.deepStrictEqual(providers[0].tags, ['magic'])
  })

  it('ignores trailing /tag without proto', () => {
    const input = `?provider=${encodeURIComponent(`${maddr.toString()}/tag`)}`
    const providers = parseQueryString(input)
    assert.strictEqual(providers.length, 0)
  })

  it('returns empty array if no provider params', () => {
    assert.deepStrictEqual(parseQueryString('?foo=bar'), [])
    assert.deepStrictEqual(parseQueryString(''), [])
  })

  it('decodes percent-encoded multiaddrs correctly', () => {
    const raw = `${maddr.toString()}/tag/bitswap`
    const encoded = encodeURIComponent(raw)
    const providers = parseQueryString(`?provider=${encoded}`)
    assert.strictEqual(providers.length, 1)
    assert.strictEqual(providers[0].multiaddr.toString(), raw)
    assert.deepStrictEqual(providers[0].tags, ['bitswap'])
  })
})
