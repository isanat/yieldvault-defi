import { createPublicClient, http, fallback } from 'viem'
import { polygon } from 'viem/chains'
import { POLYGON_CHAIN } from './contracts'

// Alternative RPC URLs for Polygon Mainnet
export const RPC_URLS = [
  'https://polygon.api.onfinality.io/public', // OnFinality (reliable)
  'https://polygon-mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161', // Public Infura
  'https://polygon-bor.publicnode.com', // Public node
  'https://polygon-rpc.com', // Official (may have rate limits)
  'https://rpc-mainnet.matic.quiknode.pro', // QuickNode public
  'https://matic-mainnet.chainstacklabs.com', // Chainstack
]

// Create a public client for reading blockchain data with fallback RPCs
export const publicClient = createPublicClient({
  chain: polygon,
  transport: fallback(
    RPC_URLS.map(url => http(url, {
      retryCount: 3,
      retryDelay: 1000,
    })),
    {
      rank: true, // Rank by latency
      retryCount: 3,
    }
  ),
})

export default publicClient
