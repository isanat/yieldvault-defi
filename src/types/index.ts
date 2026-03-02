// Vault Types
export interface VaultInfo {
  tvl: number;
  totalShares: number;
  sharePrice: number;
  apy: number;
  apy7d: number;
  apy30d: number;
  totalUsers: number;
  lastHarvest: Date | null;
}

export interface UserVaultInfo {
  address: string;
  shares: number;
  usdValue: number;
  totalDeposited: number;
  totalWithdrawn: number;
  totalEarnings: number;
  pendingCommissions: number;
  referrer: string | null;
}

// Referral Types
export interface ReferralStats {
  totalReferrals: number;
  activeReferrals: number;
  totalReferredVolume: number;
  totalCommissions: number;
  pendingCommissions: number;
  levelBreakdown: LevelStats[];
}

export interface LevelStats {
  level: number;
  count: number;
  volume: number;
  commissionRate: number;
}

export interface ReferralTreeNode {
  address: string;
  level: number;
  totalDeposited: number;
  totalCommissions: number;
  joinedAt: Date;
  children: ReferralTreeNode[];
}

// Transaction Types
export interface DepositParams {
  amount: number;
  referrer?: string;
}

export interface WithdrawParams {
  shares: number;
}

export interface TransactionResult {
  success: boolean;
  txHash?: string;
  error?: string;
  data?: Record<string, unknown>;
}

// Strategy Types
export interface StrategyInfo {
  id: string;
  address: string;
  name: string;
  description: string;
  allocation: number;
  tvl: number;
  apy: number;
  isActive: boolean;
  lastHarvest: Date | null;
}

export interface StrategyAllocation {
  strategyId: string;
  allocation: number;
}

// Config Types
export interface FeeConfig {
  performanceFeeBP: number;
  depositFeeBP: number;
  managementFeeBP: number;
  referralInterestShareBP: number;
}

export interface ReferralRates {
  level1: number;
  level2: number;
  level3: number;
  level4: number;
  level5: number;
}

export interface SystemConfig {
  fees: FeeConfig;
  referralRates: ReferralRates;
  depositsEnabled: boolean;
  withdrawalsEnabled: boolean;
  harvestEnabled: boolean;
}

// API Response Types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Event Types
export interface BlockchainEvent {
  type: 'deposit' | 'withdraw' | 'harvest' | 'commission' | 'referral';
  txHash: string;
  blockNumber: number;
  timestamp: number;
  data: Record<string, unknown>;
}

// Chart Data Types
export interface ChartDataPoint {
  timestamp: number;
  value: number;
}

export interface VaultChartData {
  tvl: ChartDataPoint[];
  sharePrice: ChartDataPoint[];
  apy: ChartDataPoint[];
}

// Admin Types
export interface AdminStats {
  totalUsers: number;
  totalDeposits: number;
  totalWithdrawals: number;
  totalVolume: number;
  totalHarvests: number;
  totalFeesCollected: number;
  avgDepositSize: number;
  activeUsers24h: number;
}
