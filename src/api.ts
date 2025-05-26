import { CID } from 'multiformats/cid'
import { Multiaddr } from '@vascosantos/multiaddr'

export interface ProviderHint {
  multiaddr: Multiaddr
}

export type { CID, Multiaddr }
