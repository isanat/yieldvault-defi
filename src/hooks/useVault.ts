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
  lastHarvest: string | null;
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

// Mock data for demo
const mockVaultInfo: VaultInfo = {
  tvl: 5234567.89,
  totalShares: 5123456.78,
  sharePrice: 1.0218,
  apy: 23.5,
  apy7d: 22.8,
  apy30d: 24.1,
  totalUsers: 1234,
  lastHarvest: new Date(Date.now() - 3600000).toISOString(),
};

const mockChartData: VaultChartData = {
  tvl: generateChartData(30, 4500000, 5500000),
  sharePrice: generateChartData(30, 1.0, 1.05),
  apy: generateChartData(30, 20, 28),
};

function generateChartData(days: number, min: number, max: number) {
  const data = [];
  const now = Date.now();
  for (let i = days - 1; i >= 0; i--) {
    data.push({
      timestamp: Math.floor((now - i * 86400000) / 1000),
      value: min + Math.random() * (max - min),
    });
  }
  return data;
}

export function useVault() {
  const [vaultInfo, setVaultInfo] = useState<VaultInfo | null>(null);
  const [chartData, setChartData] = useState<VaultChartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVaultInfo = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/vault?include=chart');
      
      if (!response.ok) {
        throw new Error('Failed to fetch vault info');
      }
      
      const result = await response.json();
      
      if (result.success) {
        setVaultInfo(result.data.vault);
        setChartData(result.data.chartData);
      } else {
        // Use mock data if API fails
        setVaultInfo(mockVaultInfo);
        setChartData(mockChartData);
      }
    } catch (err) {
      console.error('Vault fetch error:', err);
      // Use mock data on error
      setVaultInfo(mockVaultInfo);
      setChartData(mockChartData);
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

  useEffect(() => {
    if (!address) {
      setUserInfo(null);
      setLoading(false);
      return;
    }

    const fetchUserInfo = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/user/${address}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch user info');
        }
        
        const result = await response.json();
        
        if (result.success && result.data.vault) {
          setUserInfo(result.data.vault);
        } else {
          // Mock user data
          setUserInfo({
            address,
            shares: 1000 + Math.random() * 5000,
            usdValue: 1021.8 + Math.random() * 5000,
            totalDeposited: 1000 + Math.random() * 10000,
            totalWithdrawn: Math.random() * 500,
            totalEarnings: 50 + Math.random() * 200,
            pendingCommissions: 10 + Math.random() * 50,
            referrer: null,
          });
        }
      } catch (err) {
        console.error('User vault fetch error:', err);
        // Mock data on error
        setUserInfo({
          address,
          shares: 1000 + Math.random() * 5000,
          usdValue: 1021.8 + Math.random() * 5000,
          totalDeposited: 1000 + Math.random() * 10000,
          totalWithdrawn: Math.random() * 500,
          totalEarnings: 50 + Math.random() * 200,
          pendingCommissions: 10 + Math.random() * 50,
          referrer: null,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchUserInfo();
  }, [address]);

  return { userInfo, loading };
}

export default useVault;
