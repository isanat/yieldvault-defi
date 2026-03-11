// V3 Contract Addresses - Polygon Mainnet (Deployed March 2025)
export const V3_CONTRACTS = {
  vault: '0x6565D903E231F8B15283d2a33fe736498DC4b7E6',
  config: '0xc7Ab7cE286906B21410201322EdC34faD144a661',
  referral: '0xe09b20b36165fFa9203ca4757bE56562265fD9fd',
  feeDistributor: '0x55D151794bA83cFF8b76452f7A7451f4C4C8cd08',
  localStrategyManager: '0xC12f26E8fC654e49cCe589B37EfEB07c23cbC97b',
  usdt: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
  // Owner of all contracts
  owner: '0xc7284fEc59a599C49889DD8532b4de7Db81b0340',
} as const

// V2 Contract Addresses - Polygon Mainnet (Legacy)
export const V2_CONTRACTS = {
  vault: '0xFB6fdf95A7bD09e88185fD6125955839F86407d8',
  config: '0xD9CeddA57637e2fDe359Decd8bEF656f289119b6',
  referral: '0xB93c15Fa6D66195AB83e0debEF6F866522ae17C3',
  feeDistributor: '0xB118df859c6BBA75606Cd1649060331b46Be95c4',
  timelock: '0xC5193F2aE97671A5aaA6B0Ed18cFb02F7861FC4D',
  aaveStrategy: '0xE43D00F9C88D57a3922d1c74ae0cfd7161bc4F44',
  quickswapStrategy: '0x1a0567Ff82Ae268529cF23c0E66391E300ed00B4',
  usdt: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
} as const

// Use V3 as default
export const CONTRACTS = V3_CONTRACTS

// Polygon Mainnet config
export const POLYGON_CHAIN = {
  id: 137,
  name: 'Polygon Mainnet',
  network: 'polygon',
  nativeCurrency: {
    name: 'MATIC',
    symbol: 'MATIC',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ['https://polygon.api.onfinality.io/public'],
    },
    public: {
      http: ['https://polygon-rpc.com'],
    },
  },
  blockExplorers: {
    default: {
      name: 'PolygonScan',
      url: 'https://polygonscan.com',
    },
  },
} as const

export type ContractAddress = keyof typeof V3_CONTRACTS
