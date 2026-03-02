'use client';

import { useState, useEffect, useCallback } from 'react';

interface VaultInfo {
  tvl: number;
  totalShares: number;
  sharePrice: number;
  apy: number;
  apy7d: number;
  apy30d: number;
  totalUsers: number;
  lastHarvest: Date | null;
}

interface UserVaultInfo {
  address: string;
  shares: number;
  usdValue: number;
  totalDeposited: number;
  totalWithdrawn: number;
  totalEarnings: number;
  pendingCommissions: number;
  referrer: string | null;
}

interface VaultChartData {
  tvl: Array<{ timestamp: number; value: number }>;
  sharePrice: Array<{ timestamp: number; value: number }>;
  apy: Array<{ timestamp: number; value: number }>;
}

export function useVault() {
  const [vaultInfo, setVaultInfo] = useState<VaultInfo | null>(null);
  const [chartData, setChartData] = useState<VaultChartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVaultInfo = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/vault?include=chart&days=30');
      
      if (!response.ok) {
        throw new Error('Failed to fetch vault info');
      }
      
      const result = await response.json();
      
      if (result.success) {
        setVaultInfo(result.data.vault);
        setChartData(result.data.chartData);
      } else {
        setError(result.error || 'Failed to load vault data');
      }
    } catch (err) {
      console.error('Vault fetch error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVaultInfo();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchVaultInfo, 30000);
    return () => clearInterval(interval);
  }, [fetchVaultInfo]);

  return {
    vaultInfo,
    chartData,
    loading,
    error,
    refresh: fetchVaultInfo,
  };
}

export function useUserVault(address: string | null) {
  const [userInfo, setUserInfo] = useState<UserVaultInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUserInfo = useCallback(async () => {
    if (!address) {
      setUserInfo(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/user/${address}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch user info');
      }
      
      const result = await response.json();
      
      if (result.success && result.data.vault) {
        setUserInfo(result.data.vault);
      } else {
        setError(result.error || 'Failed to load user data');
      }
    } catch (err) {
      console.error('User vault fetch error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    fetchUserInfo();
  }, [fetchUserInfo]);

  return { userInfo, loading, error, refresh: fetchUserInfo };
}

export default useVault;
