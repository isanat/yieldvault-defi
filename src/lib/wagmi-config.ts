import { createConfig, http } from 'wagmi'
import { polygon } from 'wagmi/chains'

export const config = createConfig({
  chains: [polygon],
  transports: {
    [polygon.id]: http('https://polygon.api.onfinality.io/public'),
  },
  ssr: true, // Server-side rendering
})
