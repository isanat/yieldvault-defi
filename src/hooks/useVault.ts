'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useBalance } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import { getAddresses, VAULT_ABI, ERC20_ABI, areContractsDeployed } from '@/lib/contracts';

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
        setVaultInfo(FALLBACK_VAULT);
        setChartData(generateFallbackChartData(30));
      }
    } catch (err) {
      console.error('Vault fetch error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setVaultInfo(FALLBACK_VAULT);
      setChartData(generateFallbackChartData(30));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVaultInfo();
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
  const addresses = getAddresses();
  const contractsDeployed = areContractsDeployed();

  // Read user's vault shares
  const { data: shares, refetch: refetchShares } = useReadContract({
    address: addresses.vault as `0x${string}`,
    abi: VAULT_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address && contractsDeployed },
  });

  // Read USDT balance from blockchain
  const { data: usdtBalance, refetch: refetchUsdtBalance } = useReadContract({
    address: addresses.usdt as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address && !!addresses.usdt },
  });

  // Read allowance from blockchain - THIS IS CRITICAL
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: addresses.usdt as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: address && addresses.vault ? [address, addresses.vault] : undefined,
    query: { enabled: !!address && contractsDeployed },
  });

  // Debug logging
  useEffect(() => {
    console.log('useUserVault - Blockchain reads:', {
      address,
      shares: shares ? formatUnits(shares as bigint, 18) : '0',
      usdtBalance: usdtBalance ? formatUnits(usdtBalance as bigint, 6) : '0',
      allowance: allowance ? formatUnits(allowance as bigint, 6) : '0',
    });
  }, [address, shares, usdtBalance, allowance]);

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
        // Merge with blockchain data
        const blockchainAllowance = allowance ? Number(formatUnits(allowance as bigint, 6)) : 0;
        const blockchainShares = shares ? Number(formatUnits(shares as bigint, 18)) : 0;
        const blockchainUsdtBalance = usdtBalance ? Number(formatUnits(usdtBalance as bigint, 6)) : 0;
        
        console.log('Setting userInfo with allowance:', blockchainAllowance);
        
        setUserInfo({
          ...result.data.vault,
          shares: blockchainShares || result.data.vault.shares,
          usdtBalance: blockchainUsdtBalance,
          allowance: blockchainAllowance,
        });
      } else {
        setError(result.error || 'Failed to load user data');
        // Still set user info with blockchain data
        const blockchainAllowance = allowance ? Number(formatUnits(allowance as bigint, 6)) : 0;
        const blockchainShares = shares ? Number(formatUnits(shares as bigint, 18)) : 0;
        const blockchainUsdtBalance = usdtBalance ? Number(formatUnits(usdtBalance as bigint, 6)) : 0;
        
        setUserInfo({
          address: address.toLowerCase(),
          shares: blockchainShares,
          usdValue: 0,
          totalDeposited: 0,
          totalWithdrawn: 0,
          totalEarnings: 0,
          pendingCommissions: 0,
          referrer: null,
          usdtBalance: blockchainUsdtBalance,
          allowance: blockchainAllowance,
        });
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

  const refresh = useCallback(async () => {
    await Promise.all([
      refetchShares(),
      refetchUsdtBalance(),
      refetchAllowance(),
    ]);
    await fetchUserInfo();
  }, [refetchShares, refetchUsdtBalance, refetchAllowance, fetchUserInfo]);

  return { 
    userInfo, 
    loading, 
    error, 
    contractsDeployed,
    refresh,
    // Expose blockchain data directly
    blockchainData: {
      shares: shares ? Number(formatUnits(shares as bigint, 18)) : 0,
      usdtBalance: usdtBalance ? Number(formatUnits(usdtBalance as bigint, 6)) : 0,
      allowance: allowance ? Number(formatUnits(allowance as bigint, 6)) : 0,
    },
    refetchAllowance,
  };
}

// Separate hook for vault actions with individual transaction tracking
export function useVaultActions() {
  const addresses = getAddresses();
  const contractsDeployed = areContractsDeployed();
  
  // Approve transaction
  const { 
    writeContract: writeApprove, 
    data: approveHash, 
    isPending: isApprovePending, 
    isError: isApproveError, 
    error: approveError 
  } = useWriteContract();
  
  const { isLoading: isApproveConfirming, isSuccess: isApproveSuccess } = 
    useWaitForTransactionReceipt({ hash: approveHash });

  // Deposit transaction
  const { 
    writeContract: writeDeposit, 
    data: depositHash, 
    isPending: isDepositPending, 
    isError: isDepositError, 
    error: depositError 
  } = useWriteContract();
  
  const { isLoading: isDepositConfirming, isSuccess: isDepositSuccess } = 
    useWaitForTransactionReceipt({ hash: depositHash });

  // Withdraw transaction
  const { 
    writeContract: writeWithdraw, 
    data: withdrawHash, 
    isPending: isWithdrawPending, 
    isError: isWithdrawError, 
    error: withdrawError 
  } = useWriteContract();
  
  const { isLoading: isWithdrawConfirming, isSuccess: isWithdrawSuccess } = 
    useWaitForTransactionReceipt({ hash: withdrawHash });

  // Approve USDT for vault
  const approve = useCallback((amount: string) => {
    if (!addresses.usdt || !addresses.vault) {
      console.error('Missing contract addresses');
      return;
    }
    
    const amountBN = parseUnits(amount, 6);
    console.log('Approving USDT:', { 
      usdt: addresses.usdt, 
      vault: addresses.vault, 
      amount: amount,
      amountBN: amountBN.toString()
    });
    
    writeApprove({
      address: addresses.usdt as `0x${string}`,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [addresses.vault as `0x${string}`, amountBN],
    });
  }, [addresses.usdt, addresses.vault, writeApprove]);

  // Approve max uint256
  const approveMax = useCallback(() => {
    if (!addresses.usdt || !addresses.vault) {
      console.error('Missing contract addresses');
      return;
    }
    
    // Max uint256
    const maxAmount = '115792089237316195423570985008687907853269984665640564039457584007913129639935';
    
    console.log('Approving max USDT');
    
    writeApprove({
      address: addresses.usdt as `0x${string}`,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [addresses.vault as `0x${string}`, BigInt(maxAmount)],
    });
  }, [addresses.usdt, addresses.vault, writeApprove]);

  // Deposit to vault
  const deposit = useCallback((amount: string, referrer?: string) => {
    if (!addresses.vault) {
      console.error('Missing vault address');
      return;
    }
    
    const amountBN = parseUnits(amount, 6);
    const referrerAddress = (referrer || '0x0000000000000000000000000000000000000000') as `0x${string}`;
    
    console.log('Depositing to vault:', {
      vault: addresses.vault,
      amount: amount,
      amountBN: amountBN.toString(),
      referrer: referrerAddress
    });
    
    writeDeposit({
      address: addresses.vault as `0x${string}`,
      abi: VAULT_ABI,
      functionName: 'deposit',
      args: [
        amountBN,
        addresses.vault as `0x${string}`, // receiver
        referrerAddress,
      ],
    });
  }, [addresses.vault, writeDeposit]);

  // Withdraw from vault
  const withdraw = useCallback((amount: string, userAddress: string) => {
    if (!addresses.vault) {
      console.error('Missing vault address');
      return;
    }
    
    const amountBN = parseUnits(amount, 6);
    
    console.log('Withdrawing from vault:', {
      vault: addresses.vault,
      amount: amount,
      amountBN: amountBN.toString(),
      user: userAddress
    });
    
    writeWithdraw({
      address: addresses.vault as `0x${string}`,
      abi: VAULT_ABI,
      functionName: 'withdraw',
      args: [
        amountBN,
        userAddress as `0x${string}`, // receiver - should be user
        userAddress as `0x${string}`, // owner - should be user
      ],
    });
  }, [addresses.vault, writeWithdraw]);

  return {
    // Actions
    approve,
    approveMax,
    deposit,
    withdraw,
    
    // Approve state
    approveHash,
    isApprovePending,
    isApproveConfirming,
    isApproveSuccess,
    isApproveError,
    approveError,
    
    // Deposit state
    depositHash,
    isDepositPending,
    isDepositConfirming,
    isDepositSuccess,
    isDepositError,
    depositError,
    
    // Withdraw state
    withdrawHash,
    isWithdrawPending,
    isWithdrawConfirming,
    isWithdrawSuccess,
    isWithdrawError,
    withdrawError,
    
    contractsDeployed,
  };
}

export default useVault;
