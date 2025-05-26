import { CID } from 'multiformats/cid'
import { Multiaddr } from '@multiformats/multiaddr'

export interface ProviderHint {
  multiaddr: Multiaddr
}

export type { CID, Multiaddr }
