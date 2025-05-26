import { CID } from 'multiformats/cid'
import { Multiaddr } from '@vascosantos/multiaddr'

export interface ProviderHint {
  multiaddr: Multiaddr
  protos?: string[]
}

export type { CID, Multiaddr }
