import { createConfig, http } from 'wagmi'
import { polygon } from 'wagmi/chains'
import { injected } from 'wagmi/connectors'

export const config = createConfig({
  chains: [polygon],
  connectors: [
    injected({
      target: 'metaMask',
    }),
  ],
  transports: {
    [polygon.id]: http('https://polygon.api.onfinality.io/public'),
  },
  ssr: true, // Server-side rendering
})
