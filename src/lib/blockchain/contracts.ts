// V3 Contract Addresses - Polygon Mainnet (Deployed March 2025)
export const V3_CONTRACTS = {
  vault: '0x0E8F1358e12BB30C59124B5c4288F50ddBB75bff',
  config: '0xa4A47b3485f6764E3e94562fA4a42DF929a63Be1',
  referral: '0x7a572e317621f356aF2d5d651533FB30b51f51f5',
  feeDistributor: '0xf1B69c2814E08b587Fa448eCce97aaEc5e8773Fd',
  localStrategyManager: '0x801E1057BA35FB085021d72570AFf26A23332127',
  strategyController: '0x1a321f28A6f0851c566589E0303dd883a082A9F6',
  aaveLoopStrategy: '0xd8E97004c1E8EfbbFbEd3d234807b000E12ED5B3',
  stableLpStrategy: '0x5dAFd27f43b15f3a0839bEf885edB7709705cd44',
  usdt: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
  // Owner of all contracts
  owner: '0x80e65E0B160d752121cc62646dA69808846ED63b',
} as const

// V2 Contract Addresses - Polygon Mainnet (Legacy)
export const V2_CONTRACTS = {
  vault: '0xFB6fdf95A7bD09e88185fD6125955839F86407d8',
  config: '0xD9CeddA57637e2fDe359Decd8bEF656f289119b6',
  referral: '0xB93c15Fa6D66195AB83e0debEF6F866522ae17C3',
  feeDistributor: '0xB118df859cBBA75606Cd1649060331b46Be95c4',
  timelock: '0xC5193F2aE97671A5aaA6B0Ed18cFb02F7861FC4D',
  aaveStrategy: '0xE43D00F9C88D57a3922d1c74ae0cfd7161bc4F44',
  quickswapStrategy: '0x1a0567Ff82Ae268529cF23c0E66391E300ed00B4',
  usdt: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
} as const

// Use V3 as default
export const CONTRACTS = V3_CONTRACTS

// Strategy configuration
export const STRATEGY_CONFIG = {
  aaveLoop: {
    address: '0xd8E97004c1E8EfbbFbEd3d234807b000E12ED5B3',
    name: 'Aave V3 Loop Strategy',
    description: 'Estratégia de lending com alavancagem no Aave V3',
    risk: 'Médio',
    expectedApy: '8-15%',
    allocation: 5000, // 50%
  },
  stableLp: {
    address: '0x5dAFd27f43b15f3a0839bEf885edB7709705cd44',
    name: 'Stable LP + Lending Strategy',
    description: 'LP de stablecoins no QuickSwap V3 + lending no Aave',
    risk: 'Médio-Baixo',
    expectedApy: '12-25%',
    allocation: 5000, // 50%
  },
} as const

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

// Aave V3 Addresses on Polygon
export const AAVE_V3_POLYGON = {
  pool: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
  dataProvider: '0x69FA688f1Dc47d4B5d8029D5a35FB7a548310654',
  oracle: '0xb023e699F5a33916Ea823A16485e259257cA8Bd1',
} as const

// QuickSwap V3 Addresses on Polygon
export const QUICKSWAP_V3_POLYGON = {
  positionManager: '0x8EF88e4c6cdAc15B562477E81289BBE046336506',
  factory: '0x5757371414417b8C6CAad45bAeF941aBc7d3Ab32',
  quoter: '0x99a58382a75538668316e7a5dd6d2a604f18d013',
} as const

// Token Addresses on Polygon
export const TOKENS_POLYGON = {
  USDT: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
  USDC: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
  WMATIC: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270',
  WETH: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619',
} as const

export type ContractAddress = keyof typeof V3_CONTRACTS
