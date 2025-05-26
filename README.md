# provider-hinted-uri

> an explorative URI-based format for expressing content-addressed identifiers (such as IPFS CIDs) optionally augmented with one or more provider hints.

## Getting started

- Read [Exploration document](./EXPLORATION.md) to get familiar with problem space and explored format. This MAY evolve into a Spec/[IPIP](https://github.com/ipfs/specs?tab=readme-ov-file#interplanetary-improvement-process-ipip).

---

## 📦 Installation

```bash
npm install provider-hinted-uri
```

---

## 🚀 Usage

### `createUri({ base, path, providers })`

Constructs a URI with optional provider hints and an optional path.

#### Parameters

- `base` (`string`): The base URI which includes the CID, in one of the supported formats:
  - `ipfs://<CID>`
  - `https://<host>/ipfs/<CID>`
  - `https://<CID>.ipfs.<domain>`

- `path` (`string`, optional): Path to append to the CID, e.g., `/foo/bar`. This will be appended to the resolved base form `/ipfs/<CID>`.

- `providers` (`ProviderHint[]`, optional): A list of provider hints, each consisting of a `multiaddr`.

#### Returns

- `URL`: A `URL` instance representing the full URI with provider hints as query parameters.

#### Example

```js
import { multiaddr } from '@multiformats/multiaddr'
import { createUri } from 'provider-hinted-uri'

const uri = createUri({
  base: 'ipfs://bafybeigdyrzt...',
  path: '/dir/file.txt',
  providers: [
    {
      multiaddr: multiaddr('/ip4/1.2.3.4/tcp/1234/https')
    },
    {
      multiaddr: multiaddr('/ip4/1.2.3.4/tcp/8000/ws/p2p/Qm...')
    }
  ]
})

console.log(uri.toString())
// ipfs://bafybeigdyrzt.../dir/file.txt?provider=/ip4/1.2.3.4/tcp/1234/https&provider=/ip4/1.2.3.4/tcp/8000/ws/p2p/Qm...
```

---

### `parseUri(uri)`

Parses a URI and extracts the CID, provider hints, and path.

#### Parameters

- `uri` (`string`): The full URI string to parse.

#### Returns

```ts
{
  cid: CID,
  providers: ProviderHint[],
  path: string
}
```

- `cid`: The parsed CID extracted from the URI.
- `providers`: An array of provider hints, each with:
  - `multiaddr`: A `Multiaddr` instance
- `path`: The normalized path segment of the URI (e.g., `/dir/file.txt`)

#### Example

```js
import { parseUri } from 'provider-hinted-uri'

const parsed = parseUri(
  'ipfs://bafybeigdyrzt.../foo.txt?provider=/ip4/1.2.3.4/tcp/1234'
)

console.log(parsed.cid.toString())       // bafybeigdyrzt...
console.log(parsed.path)                 // /foo.txt
console.log(parsed.providers[0].multiaddr.toString()) // /ip4/1.2.3.4/tcp/1234
```

---

### `parseQueryString(query)`

Parses query parameters (string or `URLSearchParams`) to extract provider hints.

#### Parameters

- `query` (`string | URLSearchParams`): The query string or object to parse.

#### Returns

- `ProviderHint[]`: Array of provider hints with `multiaddr`.

#### Example

```js
import { parseQueryString } from 'provider-hinted-uri'

const providers = parseQueryString('provider=/ip4/1.2.3.4/tcp/1234&provider=/ip4/1.2.3.4/tcp/5678/ws')

console.log(providers[0].multiaddr.toString()) // /ip4/1.2.3.4/tcp/1234
```

---

## Types

### `ProviderHint`

```ts
interface ProviderHint {
  multiaddr: Multiaddr
}
```

- `multiaddr`: A `Multiaddr` instance pointing to the provider.

---

## CID Extraction Rules

The parser supports extracting CIDs from:
- **Subdomain**: `https://<CID>.ipfs.<domain>`
- **Path-based**: `https://<gateway>/ipfs/<CID>`
- **Protocol**: `ipfs://<CID>`

If multiple formats are mixed (e.g., both subdomain and path), the parser throws an error due to ambiguity.

---

## 🧑‍💻 License

Dual-licensed under [MIT + Apache 2.0](license.md)

---

Enjoy more resilient and efficient content addressable data requests! 🎉