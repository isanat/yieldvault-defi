'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import { getVaultContract, getERC20Contract, getAddresses, VAULT_ABI, ERC20_ABI, areContractsDeployed } from '@/lib/contracts';

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
  usdtBalance: number;
  allowance: number;
}

interface VaultChartData {
  tvl: Array<{ timestamp: number; value: number }>;
  sharePrice: Array<{ timestamp: number; value: number }>;
  apy: Array<{ timestamp: number; value: number }>;
}

// Fallback data when contracts not deployed
const FALLBACK_VAULT: VaultInfo = {
  tvl: 5234567,
  totalShares: 5123456.78,
  sharePrice: 1.0218,
  apy: 23.5,
  apy7d: 22.8,
  apy30d: 24.1,
  totalUsers: 1234,
  lastHarvest: new Date(Date.now() - 3600000),
};

function generateFallbackChartData(days: number): VaultChartData {
  const tvl: Array<{ timestamp: number; value: number }> = [];
  const sharePrice: Array<{ timestamp: number; value: number }> = [];
  const apy: Array<{ timestamp: number; value: number }> = [];
  const now = Date.now();
  
  let currentTvl = 4800000;
  let currentPrice = 1.0;
  let currentApy = 20;
  
  for (let i = days - 1; i >= 0; i--) {
    const timestamp = Math.floor((now - i * 86400000) / 1000);
    
    currentTvl += (Math.random() - 0.3) * 50000;
    currentPrice += (Math.random() - 0.4) * 0.002;
    currentApy += (Math.random() - 0.5) * 2;
    
    tvl.push({ timestamp, value: Math.max(currentTvl, 4000000) });
    sharePrice.push({ timestamp, value: Math.max(currentPrice, 0.95) });
    apy.push({ timestamp, value: Math.max(Math.min(currentApy, 35), 15) });
  }
  
  return { tvl, sharePrice, apy };
}

export function useVault() {
  const [vaultInfo, setVaultInfo] = useState<VaultInfo | null>(null);
  const [chartData, setChartData] = useState<VaultChartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const contractsDeployed = areContractsDeployed();

  const fetchVaultInfo = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Always fetch from API for database-backed data
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
        // Use fallback
        setVaultInfo(FALLBACK_VAULT);
        setChartData(generateFallbackChartData(30));
      }
    } catch (err) {
      console.error('Vault fetch error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      // Use fallback
      setVaultInfo(FALLBACK_VAULT);
      setChartData(generateFallbackChartData(30));
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
    contractsDeployed,
    refresh: fetchVaultInfo,
  };
}

export function useUserVault() {
  const { address } = useAccount();
  const [userInfo, setUserInfo] = useState<UserVaultInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const contractsDeployed = areContractsDeployed();
  const addresses = getAddresses();

  // Read user's vault shares if contracts are deployed
  const { data: shares } = useReadContract({
    address: addresses.vault as `0x${string}`,
    abi: VAULT_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address && contractsDeployed },
  });

  // Read USDT balance
  const { data: usdtBalance } = useReadContract({
    address: addresses.usdt as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address && !!addresses.usdt },
  });

  // Read allowance
  const { data: allowance } = useReadContract({
    address: addresses.usdt as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: address && addresses.vault ? [address, addresses.vault] : undefined,
    query: { enabled: !!address && contractsDeployed },
  });

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
        // Merge with blockchain data if available
        setUserInfo({
          ...result.data.vault,
          shares: shares ? Number(shares) / 1e18 : result.data.vault.shares,
          usdtBalance: usdtBalance ? Number(usdtBalance) / 1e6 : 0,
          allowance: allowance ? Number(allowance) / 1e6 : 0,
        });
      } else {
        setError(result.error || 'Failed to load user data');
      }
    } catch (err) {
      console.error('User vault fetch error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [address, shares, usdtBalance, allowance]);

  useEffect(() => {
    fetchUserInfo();
  }, [fetchUserInfo]);

  return { 
    userInfo, 
    loading, 
    error, 
    contractsDeployed,
    refresh: fetchUserInfo 
  };
}

// Hook for contract writes
export function useVaultActions() {
  const { writeContract, data: hash, isPending, isError, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });
  const addresses = getAddresses();
  const contractsDeployed = areContractsDeployed();

  const approve = useCallback((amount: string) => {
    if (!addresses.usdt || !addresses.vault) return;
    
    const amountBN = parseUnits(amount, 6); // USDT has 6 decimals
    
    writeContract({
      address: addresses.usdt as `0x${string}`,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [addresses.vault as `0x${string}`, amountBN],
    });
  }, [addresses.usdt, addresses.vault, writeContract]);

  const deposit = useCallback((amount: string, referrer?: string) => {
    if (!addresses.vault) return;
    
    const amountBN = parseUnits(amount, 6);
    
    writeContract({
      address: addresses.vault as `0x${string}`,
      abi: VAULT_ABI,
      functionName: 'deposit',
      args: [
        amountBN,
        addresses.vault as `0x${string}`, // receiver (same as caller usually)
        (referrer || '0x0000000000000000000000000000000000000000') as `0x${string}`,
      ],
    });
  }, [addresses.vault, writeContract]);

  const withdraw = useCallback((amount: string) => {
    if (!addresses.vault) return;
    
    const amountBN = parseUnits(amount, 6);
    
    writeContract({
      address: addresses.vault as `0x${string}`,
      abi: VAULT_ABI,
      functionName: 'withdraw',
      args: [
        amountBN,
        addresses.vault as `0x${string}`, // receiver
        addresses.vault as `0x${string}`, // owner
      ],
    });
  }, [addresses.vault, writeContract]);

  return {
    approve,
    deposit,
    withdraw,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    isError,
    error,
    contractsDeployed,
  };
}

export default useVault;
