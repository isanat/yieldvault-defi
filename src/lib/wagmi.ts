import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { polygon, polygonMumbai } from 'wagmi/chains';

export const config = getDefaultConfig({
  appName: 'YieldVault DeFi',
  projectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || 'demo-project-id',
  chains: [
    polygon,
    ...(process.env.NODE_ENV === 'development' ? [polygonMumbai] : []),
  ],
  ssr: true,
});
