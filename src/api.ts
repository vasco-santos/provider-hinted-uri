import { CID } from 'multiformats/cid'
import { Multiaddr } from '@vascosantos/multiaddr'

export interface ProviderHint {
  multiaddr: Multiaddr
  tags?: string[]
}

export type { CID, Multiaddr }
