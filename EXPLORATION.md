# 🔎 Exploration: Provider-Hinted URIs for Content-Addressable Systems

## Abstract

This document explores the concept of a URI-based format for expressing content-addressed identifiers (CIDs) optionally augmented with one or more provider hints. This format aims to support a simple, unopinionated, transport-agnostic scheme to simplify data retrieval in content-addressable systems by introducing a clear, extensible, and broadly compatible URI format.

## Background

Content-addressable systems, such as IPFS and Iroh, allow data to be identified by the hash of its contents (CID), enabling verifiable, immutable references. However, retrieving content typically relies on side content discovery systems (e.g. DHT, IPNI), even when a client MAY know one (or more) provider of the bytes. A provider in this context is any node, peer, gateway, or service that can serve content identified by a CID.

Existing solutions (e.g., magnet URIs, RASL, [webrtc hints](https://github.com/ipfs-shipyard/ipfs-share-files/pull/206)) propose alternative ideas where provider hints are encoded next to the content identifier. This document aims to explore this space in more detail, focusing particularly on ergonomics, extensibility, and ease of adoption.

## Requirements, Goals, and Non-Goals

This section defines the core motivations and constraints guiding the design of a URI format suitable for provider-hinted content addressing. It is worth noting that while the document focus on IPFS examples, the format design aims to be agnostic of IPFS.

### Goals

| Goal                              | Description                                                                                                                                                                     |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Low-effort adoption**           | Enable systems like IPFS (e.g., Kubo, Helia), gateways, etc., to adopt the format with minimal changes. Or even no changes by relying on current discovery systems.             |
| **Extensible hint system**        | Support encoding multiple transport hints (e.g., HTTP, TCP), while extensible to support intermediary hops (e.g. IPNI, RASL), priorities/fallbacks, etc.                        |
| **Preserve base compatibility**   | Maintain compatibility with existing URI forms such as `ipfs://CID/...` and HTTP gateway URLs.                                                                                  |
| **Ergonomic for CLI and sharing** | Should be human-editable, URL-query-based, no strict URL-encoding beyond what browsers or CLIs already handle. Easy to copy/paste, share, or edit by hand.                      |
| **Publisher-driven**              | Allow publishers to encode as much transport/discovery information as they want, with no requirement for intermediary systems. They can disappear, yet the link remains useful. |
| **Fallback resilience**           | URI should encode enough to allow clients to attempt various fallbacks or resolve via discovery (e.g., DHT, IPNI).                                                              |
| **Self-descriptive**              | May support optional encoding of content types to enable clients to understand how to interpret the content after verification.                                                 |
| **Protocol-agnostic**             | Must not be tied to HTTP-only systems. Other transport protocols, like the ones supported by libp2p, must be possible to use if encoded as hints.                               |
| **Forward-compatible**            | Format should support future expansions: new hint types, encodings, content representations, etc.                                                                               |

### Non-Goals

| Non-Goal                                            | Reason                                                                                                                             |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| **Replace existing `ipfs://` or HTTP gateway URLs** | This format builds upon and extends them; not a replacement.                                                                       |
| **Strictly define a resolution order**              | Clients may choose how and in what order to try hints or fallback strategies.                                                      |
| **Mandate use of a centralized service**            | While some hints may include centralized endpoints (e.g., HTTP URLs), the URI format should support fully decentralized retrieval. |
| **Guarantee live access**                           | A hint may point to an offline, censored or throttled node. The client may use other hints or its own discovery logic.             |
| **Act as a trust layer**                            | These URIs do not manage identity or trust directly—verification remains based on CID integrity.                                   |

### Requirements

| Requirement                              | Reasoning                                                                                                                                           |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| **CID as core address**                  | Content addressing should always resolve to a CID. Provider hints decorate, not replace, this.                                                      |
| **Multi-hint support**                   | Support multiple hints per URI, enabling clients to try multiple fetch paths if one fails.                                                          |
| **Hinted provider must be optional**     | Clients without support for hints must still be able to resolve using traditional discovery (DHT, IPNI, etc.), if the publisher set it up.          |
| **No required translation step**         | Links should not require dynamic translation (e.g., via an origin-based redirector). Links are self-contained.                                      |
| **Minimal client assumptions**           | Clients may safely ignore unknown hints and still function. This ensures progressive enhancement.                                                   |
| **Composable with Gateway URLs**         | Hints should not break Gateway-based access patterns. For example, users should be able to use URLs like `https://gw.io/ipfs/CID?provider=http...`. |
| **Multiaddr-based hint syntax**          | For transport-agnosticism, hints should leverage multiaddr representation.                                                                          |
| **No third-party resolution dependency** | Links should work standalone—resolution should not depend on reaching a third-party registry or lookup service.                                     |
| **No strict encoding rules**             | Except for standard URI syntax, do not require opaque encodings. Hints should be human-readable when possible.                                      |

## 🎨 URI Design

This section defines a URI format for expressing a content identifier (CID) along with optional provider hints that **guide clients** on how/where to fetch the associated content. The format is intended to be directly compatible with HTTP based systems (e.g. IPFS Gateway URLs) and `ipfs://` scheme URIs, while preserving flexibility and extensibility to also be compatible with other systems or upgrades.

Please note that the current format is not intended to fully specify all identified use cases or requirements. But focus on leaving the door open to more in depth specifications for specific cases.

### 📐 Format

The proposed URI format introduces a new optional query parameter `provider`, which may appear one or more times. Each `provider` value represents a content provider hint and is composed by a `multiaddr` string, or an `HTTP URL string`. The `provider` parameter is optional, and clients MAY ignore it.

The base format is:

```sh!
[ipfs://<CID> | https://<gateway>/ipfs/<CID> | https://<CID>.ipfs.<gateway> ]?[provider=<multiaddr1>&provider=<multiaddr22>&provider=<http-url-string>...]
```

#### Query Parameter: `provider`

- Name: `provider`
- Type: URI Query Parameter (repeating allowed)
- Value: Either a Multiaddr string (`?provider=multiaddr`) or HTTP URL string (`?provider=http-url`) that can be transformed to Multiaddr.
- Interpretation: An optional hint for how to locate and fetch the content identified by the CID
- When using a `multiaddr`, the address MAY include application-level private tuples to express supported fetching protocols (e.g. `/ip4/.../p2p/qmfoo/tag/bitswap-v1.2.0/tag/tgw-v1`). This enables clients to have non-interactive lookups and avoid unnecessary connection overhead—such as protocol negotiation or probing. It is recommended for low-latency, trustless content fetching.
- Alternatively, a `HTTP URL String` may be used to simplify usage, especially for content providers without protocol specific infrastructure or multiaddr knowledge. While this approach is easy to adopt, it trades off flexibility:
  - Only HTTP(S) is supported as the transport layer.
  - Protocols available to fetch data cannot be specified explicitly.
  - It is implicitly assumed that the server responds with raw bytes hashed using SHA-256, for verification purposes against the CID provided.

### Retrieval Protocol Code Registry (Informative)

The next table includes informative protocol codes. They are not specified nor agreed on at the time of writing.

| Protocol Code | Description                                       |
| ------------- | ------------------------------------------------- |
| tgw-v1          | Trustless IPFS Gateway v1 (raw blocks and CAR)    |
| tgw-v1-raw | Trustless IPFS Gateway v1 for serving raw blocks  |
| tgw-v1-car | Trustless IPFS Gateway v1 for serving CAR files   |
| octets      | Static server serving bytes hashed with sha256    |
| rasl          | Content-addressed resources hosted in RASL server |
| bitswap-v1.2.0       | IPFS Bitswap protocol                             |

### 🧠 Parsing

The CID is the core of a Provider-Hinted URI. Clients MUST extract the CID before evaluating any hints. The format is designed to be compatible with current IPFS like URIs, while explicitly defining how to locate the CID and interpret `provider` query parameters.

#### CID Extraction Rules

To ensure consistent parsing, clients MUST extract the CID using the following precedence rules:

**1. Multi-dotted Origin Format**

If the CID is encoded as a subdomain label (e.g., `https://<CID>.ipfs.<gateway>`):

- The CID MUST be the left-most label.
- The label immediately following MUST be `ipfs`.
- Any path MUST NOT also include a CID.

**Example:**  
✅ `https://bafy...ipfs.dweb.link`  
❌ `https://bafy...ipfs.dweb.link/ipfs/bafybogus` (ambiguous; reject)

**2. Path-Based Format**

If the CID is encoded in the path (e.g., `https://<gateway>/ipfs/<CID>`):

- The path MUST match the pattern `/ipfs/<CID>`, where `<CID>` is a valid content identifier.

**Example:**  
✅ `https://gateway.io/ipfs/bafy...`  
❌ `https://gateway.io/bafy...` (no `/ipfs/` marker)

**3. ipfs:// Scheme Format**

- The CID MUST immediately follow the scheme delimiter: `ipfs://<CID>`.
- Additional path/query components MAY follow.

**Example:**  
✅ `ipfs://bafy...`

**4. Conflict Resolution**

If a CID is present in both a multi-dotted origin and in the path (even if they match), the URI MUST be rejected as ambiguous.

---

#### Query Parsing (`provider` Parameters)

Once a CID has been successfully extracted, clients MAY parse `provider` parameters from the query string. Each `provider` value represents a provider hint, encoded as either a Multiaddr string (`?provider=multiaddr`) or HTTP URL string (`?provider=http-url`) that can be transformed to Multiaddr

**1. Parsing Rules**

- The `provider` query parameter MAY appear multiple times.
- If the provider value starts with a `/` it MUST be parsed as a `multiaddr`. Otherwise, it should be parsed as a `http(s)` like URL and, therefore transformable to `multiaddr` behind the scenes. When this is the case, the `octets` protocol is expected.
- Clients MUST split each `provider` multiaddr by its components, so that they can look at encoded tags for supported protocol codes.
- If no supported protocols are present, treat the entire value as a multiaddr with no specific protocol.
- Each `provider` parameter MUST be treated as an independent, optional provider hint.
- Clients MAY ignore hints with unknown protocol codes.

**2. Evaluate hints**

- Clients MAY:
  - Ignore all `provider` parameters (if unsupported).
  - Ignore unknown or unsupported protocols in a `provider` value (progressive enhancement).
  - Attempt to figure out what protocol to use in case protocol is omitted. They can either inspect the multiaddr and infer IPFS trustless gateway is used, or rely on extra hops like libp2p identify protocol.
  - Evaluate hints in order of appearance (left-to-right).
  - Evaluate hints in parallel.
  - Apply their own prioritization or fallback strategies. If all hints fail, clients SHOULD fall back to default discovery strategies (e.g., DHT/IPNI), if available. Or even rely on discovery strategies in parallel.

Note that the `multiaddr` string should point to the `origin` server where given CID is provided, and not include the actual CID in the Hint multiaddr as a subdomain/path.

---

#### Example Parsing Flows

**Input URI:**
`https://bafy....ipfs.dweb.link/ipfs/bafy...?provider=/dns/hash-stream-like-server.io/tcp/443/https/tag/tgw-v1`
→ **REJECT** (CID appears in both hostname and path)

**Input URI:**
`https://dweb.link/ipfs/bafy...?provider=/dns/hash-stream-like-server.io/tcp/443/https/tag/tgw-v1&provider=/ip4/192.0.2.1/tcp/4001/ws/tag/bitswap-v1.2.0`

→ Extract CID: `bafy...`
→ Parse `provider` params:

1. `/dns/hash-stream-like-server.io/tcp/443/https` using `tgw-v1`
2. `/ip4/192.0.2.1/tcp/4001/ws` using `bitswap-v1.2.0`
   → Attempt connections via hints or fall back to default resolution.

**Input URI:**
`https://dweb.link/ipfs/bafy...?provider=/dns/hash-stream-like-server.io/tcp/443/https/tag/tgw-v1/tag/bitswap-v1.2.0`

→ Extract CID: `bafy...`
→ Parse `provider` params:

1. `/dns/hash-stream-like-server.io/tcp/443/https` using `tgw-v1` or `bitswap-v1.2.0`
   → Attempt connections via hints or fall back to default resolution.

**Input URI:**
`https://bafy....ipfs.dweb.link?provider=/dns/hash-stream-like-server.io/tcp/443/https`

→ Extract CID: `bafy...`
→ Parse `provider` params:

1. `/dns/hash-stream-like-server.io/tcp/443/https` using `tgw-v1` (while not explicit, client MAY infer it by http like multiaddr)

**Input URI:**
`ipfs://bafk...?provider=https://foo.bar/example-framework.js`

→ Extract CID: `bafk...`
→ Parse `provider` params:

1. After verifying it is not a multiaddr, parse it as a URL and transform it to a valid multiaddr with `octets` 
2. `/dns/foo.bar/tcp/443/https/http-path/example-framework.js` using `octets`
   → Attempt connections via hints or fall back to default resolution.

### Client Behavior and potential Server Roles

In addition to guiding client-side resolution, provider hints can be interpreted by servers under certain circumstances. The semantics of hint placement influence visibility and use:

- If the `provider` parameter is included in the **query** (`?...`), it MAY be communicated to the server depending on the client parsing the parameter.
- If the `provider` is encoded as a **fragment** (`#...`), it is only accessible to the client (browsers do not send fragments to the server).

This distinction allows URI publishers to tailor behavior:

- **Client-only mode:** Use a fragment (`#provider=...`) to ensure the server remains unaware of hint data. This is useful for privacy-preserving client apps or when hints are intended to guide only the client.
- **Server-assisted mode:** Use query parameters (`?provider=...`) to allow the server to parse and act on provider hints. This may enable proxy behavior, similar to existing IPFS gateways like `ipfs.io` or `dweb.link`.

Publishers of such URIs should consider the **security profile** and **trust assumptions** of their environment when deciding how to encode hints.

This flexibility supports a spectrum of use cases—from fully local client-side fetch strategies to cooperative client-server resolution pipelines.

### Characteristics

| Property           | Notes                                                                                         |
| ------------------ | --------------------------------------------------------------------------------------------- |
| **Human-editable** | Uses readable multiaddrs; Fits cleanly into URLs using standard encoding rules.               |
| **CLI-compatible** | Easily passable in CLI tools without excessive escaping.                                      |
| **Order-agnostic** | Clients MAY decide the order of trying hints or do it in parallel.                            |
| **Extensible**     | Additional `provider` parameters can be added freely, and unknown ones can be safely skipped. |
| **Multi-protocol** | Multiaddrs support TCP, HTTP, QUIC, and other protocols—extensible by design.                 |

### Optional: Error Handling Guidelines

| Scenario                                              | Client Behavior                             |
| ----------------------------------------------------- | ------------------------------------------- |
| Invalid CID format                                    | Reject URI                                  |
| No CID found                                          | Reject URI                                  |
| Invalid `provider` value                              | Log/ignore and proceed with remaining hints |
| Unknown protocols in multiaddr                        | Ignore that hint                            |
| CID + `provider` parse correctly but connection fails | Try next hint or fallback resolution        |

## Examples

### Compatible with Gateway URL

```
https://example.gateway.io/ipfs/bafy...?
  provider=/dns/my-hash-stream-server.com/tcp/443/https
 &provider=/ip4/98.10.2.1/tcp/8000/ws/tag/tgw-v1
```

### Compatible with `ipfs://` URI

```!
ipfs://bafy...?
  provider=/dns/my-hash-stream-server.com/tcp/443/https/tag/tgw-v1
```

These providers hints can be evaluated by clients in any order (sequentially or in parallel), or ignored entirely if unsupported.

## Use cases

The proposed **Provider-Hinted URI** format aims to enable "non interactive" content-addressable retrieval by enabling smart clients to fetch bytes directly from specified providers. This allows for reduced latency, lower load on discovery systems, and improved resiliency. Below are key use cases where this format brings immediate benefits.

### 1. IPFS Content Provider

In systems like IPFS, clients typically rely on third party discovery systems (e.g., DHT, IPNI) to locate providers for a CID. While such decentralized systems provide robustness and fault tolerance, this comes at a cost. Namely sprawling complexity for record publishers and significant latency for clients. Moreover, they may themselves become a bottleneck to serve data if they are facing production problems.

Using **Provider-Hinted URIs** clients have an option to reach content without relying on discovery systems, while still being able to rely on such systems as a fallback:

```sh!
ipfs://bafy...?
  provider=/dns/my-hash-stream-server.com/tcp/443/https
  &provider=/dns/w3s.link/tcp/443/https
```

A smart client MAY try these providers directly using HTTP (e.g., Trustless Gateway Spec), verifying content against the CID. The client can fetch the content behind the CID `bafy...` directly from the host `my-hash-stream-server.com` or `w3s.link` using the IPFS protocol.

If the providers are offline or fail, the client can fall back to discovery systems.

### 2. Skipping Multi-hop discovery

IPFS and libp2p networks support a wide range of protocols. Nodes can decide which protocols and transports they support based on preference or running environment. This flexibility brings a lot of power to the network. Multiaddrs commonly include the transport information but do not include the underlying protocols supported to serve content. As a result, the two sides must negotiate shared protocols post-connection. This leads to unnecessary round trips or failed connections when no common protocol exists. On the Trustless IPFS Gateway side of things, clients MAY probe a gateway to figure out its support by performing extra HTTP requests to some well-defined HTTP routes.

Clients can avoid protocol negotiation and probing with **Provider-Hinted URIs**, while still using them as fallback.

In the following URI example, a smart client MAY attempt to fetch directly the content behind the CID `bafy...` from the host `my-hash-stream-server.com` or `w3s.link` using the IPFS protocol via HTTP. The encoded information for `my-hash-stream-server.com` hints it supports fetching with protocol `tgw-v1`, while `w3s.link` hints it only supports the `tgw-v1-raw` protocol. Depending on the request, the client MAY decide which provider fits better or try both.

```sh!
ipfs://bafy...?
  provider=/dns/my-hash-stream-server.com/tcp/443/https/tag/tgw-v1
  &provider=/dns/w3s.link/tcp/443/https/tag/tgw-v1-raw
```

Providers MAY have only non-HTTP transports to retrieve data. In the next URI example, a smart client MAY attempt to fetch the content behind the CID `bafy...` from the host `my-hash-stream-other-server.com` using the IPFS protocol via WS transport. However, clients can quickly determine compatibility before dialing by checking the embedded tags.

```sh!
ipfs://bafy...
  ?provider=/dns/my-hash-stream-other-server.com/tcp/443/ws/p2p/QmNode/tag/bitswap-v1.2.0/tag/graphsync
```

Similarly, RASL enables encoding of providers indirectly via hosted resources in `https://${host}/.well-known/rasl/${cid}`. The big advantage of RASL in this context is that one can change the record to point to somewhere else, without requiring content publishers to update all their references for the content. However, it comes at the cost of requiring interactivity with this extra hop, and depending on it to be reachable.

Next follows a URI example relying on RASL to fetch some bytes behind a CID. A smart client CAN construct the URL for the resource hosted on the RASL server by extracting the host `my-rasl-server.com` from the provider multiaddr and fetching the resource as `https://my-rasl-server.com/.well-known/rasl/bafy...`

```sh!
ipfs://bafy...
  ?provider=/dns/my-rasl-server.com/tcp/443/https/tag/rasl
```

Alternatively, one can encode the HTTP path in the multiaddr instead of relying on the smart client to know how to interpret RASL requests:

```sh!
ipfs://bafy...
  ?provider=/dns/my-rasl-server.com/tcp/443/https/http-path/.well-known%2Frasl%2Fbafy...
```

In the `rasl` case, the hop to the rasl server is still required. However, the ergonomics around updating providers MAY be desirable for some content publishers.

### 3. Pre-seeding & Edge Caching

In CDN or edge cache environments, Provider-Hinted URIs allow pre-seeding of content at strategic locations. Edge nodes can advertise themselves using provider hints, enabling locality-aware clients to fetch content faster.

Example:

```sh!
ipfs://bafy...
  ?provider=/dns/cache-berlin.example.com/tcp/443/https
```

This benefits latency-sensitive apps like video streaming or web app loading.

### 4. Subresource Integrity for Static Servers

[Subresource Integrity (SRI)](https://developer.mozilla.org/en-US/docs/Web/Security/Subresource_Integrity) is a widely used standard on the web. It is a security feature that enables browsers to verify that resources they fetch are what they expect. It looks like:

```html!
<script
  src="https://example.com/example-framework.js"
  integrity="sha384-oqVuAfXRKap7fdgcCY5uykM6+R9GqQ8K/uxy9rx7HNQlGYl1kPzQho1wx4JwY8wC"
  crossorigin="anonymous"></script>
```

The `Provider-Hinted URIs` can perform this out of the box by encoding the CID together with the location of the resource in any static server (nginx like) as follows:

```sh!
ipfs://bafk...
  ?provider=https://foo.bar/example-framework.js
  &provider=/dns/example.com/tcp/443/https/http-path/example-framework.js/tag/octets
```

A smart client can parse the hint, obtaining the host `example.com`, the path `example-framework.js`, and the tag protocol `octets`. With this, the client can create the resource URL `https://example.com/example-framework.js`, fetch the resource, hash the bytes with `sha256`, and verify that the bytes match the requested CID.

Similarly, package managers and builds (e.g., NPM, Docker) could store and resolve content-addressed URIs enhanced with provider hints in order to guarantee verifiability in a similar way as described here.

## Inspiration Sources

- **Magnet URIs** (BitTorrent): flexible metadata + providers hints.
- **RASL**: Rich, semantic locator abstraction for IPFS.
- **IPFS Paths and Multiaddrs**: Encapsulation of identifiers and providers.
- **URIs and IRIs**: Established practices for extensible, parseable identifiers.

## Potential Next Steps

This document provides a foundational format but leaves room for future refinements. Next steps may include:

- Validation of this exploration with an implementation.
- Tooling to generate and validate provider-hinted URIs.

## 📎 Appendix

### Human-Friendly URI Format

```txt!
https://dweb.link/ipfs/bafy...?provider=/dns/my-hash-stream-server/tcp/443/https/tag/tgw-v1
```

- Easy to paste into a browser.
- Copy/paste-friendly.
- Readable and editable.

#### 🌐 Browser Behavior

If you paste this URI into a browser:

```txt!
ipfs://bafy...?provider=/dns/my-hash-stream-server/tcp/443/https/tag/tgw-v1
```

- The browser encodes unsafe characters like `/` and `:`.
- Internally it becomes:

```txt!
ipfs://bafy...?provider=%2Fdns%2Fmy-hash-stream-server%2Ftcp%2F443%2Fhttps%3Atag%2Ftgw-v1
```

✅ This is expected and does not affect usability.

#### 🧪 JavaScript (Browser or Node.js)

```js!
const url = new URL("https://dweb.link/ipfs/bafy...?provider=/dns/my-hash-stream-server/tcp/443/https/tag/tgw-v1");
const hints = url.searchParams.getAll("provider");
for (const hint of hints) {
  console.log("Multiaddr:", hint);  // "/dns/my-hash-stream-server/tcp/443/https/tag/tgw-v1"
}
```

- ✅ URLSearchParams handles decoding for you.
- ✅ No need to deal with %2F, %3A, etc.
- ✅ Safe and ergonomic for all developers.

#### 💻 CLI Usage

```sh!
curl "https://dweb.link/ipfs/bafy...?provider=/dns/my-hash-stream-server/tcp/443/https/tag/tgw-v1"
```

- ✅ Use quotes (`"..."` or `'...'`) if your shell interprets special characters.
- ✅ No need for manual escaping or encoding.

Works great in:

- `curl`
- `wget`
- Kubo CLI
- Custom CLI tools

#### 🧼 Summary of Ergonomics

| Context             | Works with copy/paste? | Needs escaping? | Auto-decodes? | Easy to parse? |
| ------------------- | ---------------------- | --------------- | ------------- | -------------- |
| Browser address bar | ✅ Yes                 | ❌ No           | ✅ Yes        | ✅ Yes         |
| JS with URL API     | ✅ Yes                 | ❌ No           | ✅ Yes        | ✅ Yes         |
| CLI tools           | ✅ Yes (quoted)        | ❌ No           | ✅ Yes        | ✅ Yes         |

### URI Flow Resolution

```
[ User clicks URI ]
      ↓
[ Client parses CID ]
      ↓
[ Any provider hints? ] — Yes → Try hints in order (e.g., /dns/gw.io/...)
      ↓
    No ↓             ↓
[ Use fallback discovery: DHT/IPNI/... ]
```

### Real-World Resolution Examples

| Use Case                                      | URI                                                                                                                                                         |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ✅ **Basic IPFS URI with no hints**           | `ipfs://bafy...`                                                                                                                                            |
| ✅ **Gateway-compatible form with HTTP hint** | `https://dweb.link/ipfs/bafy...?provider=/dns/my-hash-stream-server.com/tcp/443/https/tag/tgw-v1`                                                      |
| ✅ **Multiple hints (HTTP + libp2p)**         | `ipfs://bafy...?provider=/dns/my-hash-stream-server.com/tcp/443/https/tag/tgw-v1 &provider=/dns/peer.ipfs.io/tcp/4001/p2p/QmPeerID/tag/bitswap-v1.2.0` |
| ❌ **Unsupported client**                     | Client ignores `provider` param and uses default discovery (e.g., DHT/IPNI)                                                                                 |

### Usage & Adoption

This format is designed for gradual and low-effort adoption. Systems like IPFS nodes (e.g., Kubo), browser clients (e.g., Helia), and gateways can:

- Parse and extract the CID from the URI as usual.
- Optionally inspect and interpret `provider` query parameters if present.
- Ignore unknown parameters to maintain compatibility.
- Use multiaddr libraries to parse and attempt hinted connections.
- Fall back to DHT/IPNI or existing discovery methods if hints fail.

Clients MAY evaluate hints sequentially or in parallel and MAY prioritize based on local heuristics.

### CLI Friendly Usage

This format is designed to be easily usable in CLI pipelines and automation flows. For example:

```sh!
curl-like "https://dweb.link/ipfs/bafy...?provider=/dns/my-hash-stream-server.com/tcp/443/https/tag/tgw-v1" | <verifier> | <consumer-app>
```

Assuming curl at some point would adopt content addressable verifiable client, it could look like:

```sh!
curl "https://dweb.link/ipfs/bafy...?provider=/dns/my-hash-stream-server.com/tcp/443/https/tag/tgw-v1" | <verifier> | <consumer-app>
```

---
