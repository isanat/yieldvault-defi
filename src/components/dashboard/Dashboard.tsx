'use client';

/* eslint-disable react-hooks/set-state-in-effect */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAccount, useBalance } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import { useWallet } from '@/contexts/WalletContext';
import { useI18n } from '@/contexts/I18nContext';
import { useUserVault, useVaultActions } from '@/hooks/useVault';
import { useReferral } from '@/hooks/useReferral';
import { formatNumber, formatAddress, generateReferralLink, copyToClipboard } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const USDT_ADDRESS = '0x1E7C689D2da8DCc87bB4E1E4f8650551bd538719' as `0x${string}`;
const VAULT_ADDRESS = '0xEB70c71b57F0c4f740c27e39e58eE4D9d59ebf64' as `0x${string}`;

type PendingTransaction = {
  type: 'deposit' | 'withdraw';
  amount: string;
  referrer?: string;
} | null;

export function Dashboard() {
  const { address, isAmoy } = useWallet();
  const { t, mounted } = useI18n();
  const { userInfo, loading: userLoading, refresh: refreshUserVault } = useUserVault(address);
  const { stats, commissions, claiming, claimCommissions, refresh: refreshReferral } = useReferral(address);
  const { approve, deposit, withdraw, isPending, isConfirming, isSuccess, isError, error: txError, hash } = useVaultActions();
  
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [copied, setCopied] = useState(false);
  const [txStatus, setTxStatus] = useState<string | null>(null);
  const [pendingTx, setPendingTx] = useState<PendingTransaction>(null);
  const [isRecording, setIsRecording] = useState(false);

  // Read USDT balance
  const { data: usdtBalance, refetch: refetchUsdtBalance } = useBalance({
    address,
    token: USDT_ADDRESS,
    query: {
      enabled: !!address && isAmoy,
    },
  });

  // Read allowance
  const { data: allowanceData, refetch: refetchAllowance } = useBalance({
    address,
    token: USDT_ADDRESS,
    query: {
      enabled: !!address,
    },
  });

  const referralLink = generateReferralLink(address || '');

  const text = mounted ? {
    title: t('dashboard.title'),
    connectedTo: t('dashboard.connectedTo'),
    yourBalance: t('dashboard.yourBalance'),
    shares: t('dashboard.shares'),
    totalDeposited: t('dashboard.totalDeposited'),
    totalEarnings: t('dashboard.totalEarnings'),
    pendingCommissions: t('dashboard.pendingCommissions'),
    overview: t('dashboard.overview'),
    deposit: t('dashboard.deposit'),
    withdraw: t('dashboard.withdraw'),
    referral: t('dashboard.referral'),
    sharePriceHistory: t('dashboard.sharePriceHistory'),
    chartPlaceholder: t('dashboard.chartPlaceholder'),
    recentActivity: t('dashboard.recentActivity'),
    noRecentActivity: t('dashboard.noRecentActivity'),
    depositTitle: t('dashboard.depositTitle'),
    depositAmount: t('dashboard.depositAmount'),
    depositFee: t('dashboard.depositFee'),
    receiveShares: t('dashboard.receiveShares'),
    depositButton: t('dashboard.depositButton'),
    withdrawTitle: t('dashboard.withdrawTitle'),
    withdrawAmount: t('dashboard.withdrawAmount'),
    available: t('dashboard.available'),
    withdrawButton: t('dashboard.withdrawButton'),
    yourReferralLink: t('dashboard.yourReferralLink'),
    copy: t('dashboard.copy'),
    copied: t('dashboard.copied'),
    totalReferrals: t('dashboard.totalReferrals'),
    totalReferredVolume: t('dashboard.totalReferredVolume'),
    totalCommissions: t('dashboard.totalCommissions'),
    commissionBreakdown: t('dashboard.commissionBreakdown'),
    referrals: t('dashboard.referrals'),
    active: t('dashboard.active'),
    rate: t('dashboard.rate'),
    availableToClaim: t('dashboard.availableToClaim'),
    claimNow: t('dashboard.claimNow'),
    claiming: t('dashboard.claiming'),
    commission: t('dashboard.commission'),
    level: (l: number) => t('dashboard.level', { level: l }),
    demo: t('common.demo'),
    success: t('common.success'),
  } : {
    title: 'Your Dashboard',
    connectedTo: 'Connected to Polygon Amoy',
    yourBalance: 'Your Balance',
    shares: 'shares',
    totalDeposited: 'Total Deposited',
    totalEarnings: 'Total Earnings',
    pendingCommissions: 'Pending Commissions',
    overview: 'Overview',
    deposit: 'Deposit',
    withdraw: 'Withdraw',
    referral: 'Referral',
    sharePriceHistory: 'Share Price History',
    chartPlaceholder: 'Chart would display here',
    recentActivity: 'Recent Activity',
    noRecentActivity: 'No recent activity',
    depositTitle: 'Deposit USDT',
    depositAmount: 'Amount (USDT)',
    depositFee: 'Deposit fee: 5% (distributed to referral network)',
    receiveShares: 'You will receive yvSHARE tokens representing your stake',
    depositButton: 'Deposit USDT',
    withdrawTitle: 'Withdraw USDT',
    withdrawAmount: 'Amount (USDT)',
    available: 'Available:',
    withdrawButton: 'Withdraw USDT',
    yourReferralLink: 'Your Referral Link',
    copy: 'Copy',
    copied: 'Copied!',
    totalReferrals: 'Total Referrals',
    totalReferredVolume: 'Referred Volume',
    totalCommissions: 'Total Commissions',
    commissionBreakdown: 'Commission Breakdown by Level',
    referrals: 'referrals',
    active: 'active',
    rate: 'rate',
    availableToClaim: 'Available to Claim',
    claimNow: 'Claim Now',
    claiming: 'Claiming...',
    commission: 'Commission',
    level: (l: number) => `Level ${l}`,
    demo: 'Demo',
    success: 'Success',
  };

  // Check if needs approval - use useMemo instead of useEffect
  const needsApproval = useMemo(() => {
    if (!depositAmount || parseFloat(depositAmount) <= 0) return false;
    const currentAllowance = userInfo?.allowance || 0;
    return currentAllowance < parseFloat(depositAmount);
  }, [depositAmount, userInfo?.allowance]);

  // Record transaction to database
  const recordTransaction = useCallback(async (
    type: 'deposit' | 'withdraw',
    txHash: string,
    amount: string,
    referrer?: string
  ) => {
    if (!address) return;
    
    setIsRecording(true);
    setTxStatus('Recording transaction to database...');
    
    try {
      const endpoint = type === 'deposit' ? '/api/deposit' : '/api/withdraw';
      const body = type === 'deposit' 
        ? { 
            address, 
            amount: parseFloat(amount), 
            txHash,
            referrerCode: referrer 
          }
        : { 
            address, 
            shares: parseFloat(amount) / (userInfo?.usdValue || 1) * (userInfo?.shares || 1), // Convert USD to shares
            txHash 
          };
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      
      const result = await response.json();
      
      if (result.success) {
        setTxStatus('Transaction recorded successfully!');
      } else {
        console.error('Failed to record transaction:', result.error);
        setTxStatus(`Warning: Blockchain tx confirmed but database record failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Error recording transaction:', error);
      setTxStatus('Warning: Failed to record to database');
    } finally {
      setIsRecording(false);
    }
  }, [address, userInfo]);

  // Handle transaction success - record to database
  useEffect(() => {
    if (isSuccess && hash && pendingTx) {
      setTxStatus('Transaction confirmed! Recording to database...');
      
      // Record the transaction
      recordTransaction(
        pendingTx.type,
        hash,
        pendingTx.amount,
        pendingTx.referrer
      ).then(() => {
        setDepositAmount('');
        setWithdrawAmount('');
        setPendingTx(null);
        
        // Refresh all data
        refreshUserVault();
        refreshReferral();
        refetchUsdtBalance();
        refetchAllowance();
        
        setTimeout(() => setTxStatus(null), 5000);
      });
    }
  }, [isSuccess, hash, pendingTx, recordTransaction, refreshUserVault, refreshReferral, refetchUsdtBalance, refetchAllowance]);

  // Handle transaction error
  useEffect(() => {
    if (isError && txError) {
      setTxStatus(`Error: ${txError.message || 'Transaction failed'}`);
      setPendingTx(null);
      setTimeout(() => setTxStatus(null), 5000);
    }
  }, [isError, txError]);

  const handleCopyLink = async () => {
    const success = await copyToClipboard(referralLink);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleApprove = async () => {
    if (!depositAmount || parseFloat(depositAmount) <= 0) return;
    
    setTxStatus('Approving USDT...');
    approve(depositAmount);
  };

  const handleDeposit = async () => {
    if (!depositAmount || parseFloat(depositAmount) <= 0) return;
    
    // Check if needs approval first
    if (needsApproval) {
      setTxStatus('Please approve USDT first');
      return;
    }

    setTxStatus('Confirm deposit in your wallet...');
    
    // Get referrer from URL if present
    const urlParams = new URLSearchParams(window.location.search);
    const referrer = urlParams.get('ref') || undefined;
    
    // Set pending transaction for later recording
    setPendingTx({ type: 'deposit', amount: depositAmount, referrer });
    
    deposit(depositAmount, referrer);
  };

  const handleWithdraw = async () => {
    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) return;
    
    setTxStatus('Confirm withdrawal in your wallet...');
    
    // Set pending transaction for later recording
    setPendingTx({ type: 'withdraw', amount: withdrawAmount });
    
    withdraw(withdrawAmount);
  };

  const handleClaim = async () => {
    const result = await claimCommissions();
    if (result.success) {
      setTxStatus(`${text.success}: $${result.amount?.toFixed(2)}`);
      setTimeout(() => setTxStatus(null), 5000);
    }
  };

  // Get USDT balance display
  const usdtBalanceDisplay = usdtBalance 
    ? parseFloat(formatUnits(usdtBalance.value, usdtBalance.decimals)).toLocaleString(undefined, { maximumFractionDigits: 2 })
    : '0';

  if (!address) {
    return null;
  }

  // Show network warning if not on Amoy
  if (!isAmoy) {
    return (
      <section id="dashboard" className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-md mx-auto text-center">
            <Card className="bg-yellow-500/10 border-yellow-500/30">
              <CardContent className="pt-6">
                <div className="text-yellow-400 text-lg font-medium mb-2">
                  Wrong Network
                </div>
                <p className="text-muted-foreground mb-4">
                  Please switch to Polygon Amoy testnet to use the vault.
                </p>
                <Button 
                  onClick={() => {/* Switch network logic */}}
                  className="bg-yellow-500 hover:bg-yellow-600 text-black"
                >
                  Switch to Amoy
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="dashboard" className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8" suppressHydrationWarning>
            <div>
              <h2 className="text-2xl font-bold">{text.title}</h2>
              <p className="text-muted-foreground">{formatAddress(address, 6)}</p>
            </div>
            <div className="flex items-center gap-4">
              {/* USDT Balance */}
              <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500/10 border border-green-500/20">
                <span className="text-green-400 font-semibold">{usdtBalanceDisplay} USDT</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-sm text-muted-foreground">{text.connectedTo}</span>
              </div>
            </div>
          </div>

          {/* Transaction Status */}
          {txStatus && (
            <div className={`mb-6 p-4 rounded-lg ${isSuccess ? 'bg-green-500/10 border border-green-500/20' : isError ? 'bg-red-500/10 border border-red-500/20' : 'bg-blue-500/10 border border-blue-500/20'}`}>
              <div className={`font-medium ${isSuccess ? 'text-green-400' : isError ? 'text-red-400' : 'text-blue-400'}`}>
                {txStatus}
              </div>
              {hash && (
                <a 
                  href={`https://amoy.polygonscan.com/tx/${hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-400 hover:underline"
                >
                  View on PolygonScan →
                </a>
              )}
            </div>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8" suppressHydrationWarning>
            <Card className="bg-card/50 backdrop-blur-sm">
              <CardContent className="pt-6">
                <div className="text-sm text-muted-foreground mb-1">{text.yourBalance}</div>
                <div className="text-2xl font-bold text-purple-400">
                  {userLoading ? '...' : formatNumber(userInfo?.usdValue || 0, { currency: true })}
                </div>
                <div className="text-xs text-muted-foreground">
                  {userLoading ? '...' : formatNumber(userInfo?.shares || 0, { decimals: 2 })} {text.shares}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/50 backdrop-blur-sm">
              <CardContent className="pt-6">
                <div className="text-sm text-muted-foreground mb-1">{text.totalDeposited}</div>
                <div className="text-2xl font-bold">
                  {userLoading ? '...' : formatNumber(userInfo?.totalDeposited || 0, { currency: true })}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/50 backdrop-blur-sm">
              <CardContent className="pt-6">
                <div className="text-sm text-muted-foreground mb-1">{text.totalEarnings}</div>
                <div className="text-2xl font-bold text-green-400">
                  {userLoading ? '...' : formatNumber(userInfo?.totalEarnings || 0, { currency: true })}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/50 backdrop-blur-sm border-yellow-500/30">
              <CardContent className="pt-6">
                <div className="text-sm text-muted-foreground mb-1">{text.pendingCommissions}</div>
                <div className="text-2xl font-bold text-yellow-400">
                  {userLoading ? '...' : formatNumber(stats?.pendingCommissions || 0, { currency: true })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-4 bg-muted" suppressHydrationWarning>
              <TabsTrigger value="overview">{text.overview}</TabsTrigger>
              <TabsTrigger value="deposit">{text.deposit}</TabsTrigger>
              <TabsTrigger value="withdraw">{text.withdraw}</TabsTrigger>
              <TabsTrigger value="referral">{text.referral}</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                {/* Performance Chart Placeholder */}
                <Card className="bg-card/50 backdrop-blur-sm" suppressHydrationWarning>
                  <CardHeader>
                    <CardTitle className="text-lg">{text.sharePriceHistory}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-48 flex items-center justify-center text-muted-foreground">
                      <div className="text-center">
                        <svg className="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                        </svg>
                        <p className="text-sm">{text.chartPlaceholder}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Recent Activity */}
                <Card className="bg-card/50 backdrop-blur-sm" suppressHydrationWarning>
                  <CardHeader>
                    <CardTitle className="text-lg">{text.recentActivity}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {commissions.slice(0, 5).map((c, i) => (
                        <div key={i} className="flex justify-between items-center py-2 border-b border-border last:border-0">
                          <div>
                            <div className="font-medium text-sm capitalize">{c.commissionType} {text.commission}</div>
                            <div className="text-xs text-muted-foreground">{text.level(c.level)}</div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold text-green-400">+${c.amount.toFixed(2)}</div>
                            <div className="text-xs text-muted-foreground capitalize">{c.status}</div>
                          </div>
                        </div>
                      ))}
                      {commissions.length === 0 && (
                        <div className="text-center py-4 text-muted-foreground text-sm">
                          {text.noRecentActivity}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Deposit Tab */}
            <TabsContent value="deposit" suppressHydrationWarning>
              <Card className="bg-card/50 backdrop-blur-sm max-w-md mx-auto">
                <CardHeader>
                  <CardTitle>{text.depositTitle}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* USDT Balance */}
                  <div className="flex justify-between items-center p-3 rounded-lg bg-muted">
                    <span className="text-sm text-muted-foreground">Your USDT Balance:</span>
                    <span className="font-semibold text-green-400">{usdtBalanceDisplay} USDT</span>
                  </div>
                  
                  <div>
                    <Label htmlFor="deposit-amount">{text.depositAmount}</Label>
                    <div className="flex gap-2 mt-1.5">
                      <Input
                        id="deposit-amount"
                        type="number"
                        placeholder="0.00"
                        value={depositAmount}
                        onChange={(e) => setDepositAmount(e.target.value)}
                        className="flex-1"
                      />
                      <Button 
                        variant="outline"
                        onClick={() => setDepositAmount(usdtBalanceDisplay.replace(/,/g, ''))}
                        type="button"
                      >
                        MAX
                      </Button>
                    </div>
                  </div>
                  
                  <div className="text-sm text-muted-foreground">
                    <p>• {text.depositFee}</p>
                    <p>• {text.receiveShares}</p>
                  </div>
                  
                  {/* Approval needed */}
                  {needsApproval && depositAmount && parseFloat(depositAmount) > 0 && (
                    <Button 
                      className="w-full bg-yellow-500 hover:bg-yellow-600 text-black"
                      onClick={handleApprove}
                      disabled={isPending || isConfirming || isRecording}
                    >
                      {isPending || isConfirming ? (
                        <span className="flex items-center gap-2">
                          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          Approving...
                        </span>
                      ) : (
                        '1. Approve USDT First'
                      )}
                    </Button>
                  )}
                  
                  <Button 
                    className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
                    onClick={handleDeposit}
                    disabled={!depositAmount || parseFloat(depositAmount) <= 0 || needsApproval || isPending || isConfirming || isRecording}
                  >
                    {isPending || isConfirming || isRecording ? (
                      <span className="flex items-center gap-2">
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        {isRecording ? 'Recording...' : needsApproval ? 'Approving...' : 'Depositing...'}
                      </span>
                    ) : (
                      text.depositButton
                    )}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Withdraw Tab */}
            <TabsContent value="withdraw" suppressHydrationWarning>
              <Card className="bg-card/50 backdrop-blur-sm max-w-md mx-auto">
                <CardHeader>
                  <CardTitle>{text.withdrawTitle}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Vault Balance */}
                  <div className="flex justify-between items-center p-3 rounded-lg bg-muted">
                    <span className="text-sm text-muted-foreground">Your Vault Balance:</span>
                    <span className="font-semibold text-purple-400">
                      {userLoading ? '...' : formatNumber(userInfo?.usdValue || 0, { currency: true })}
                    </span>
                  </div>
                  
                  <div>
                    <Label htmlFor="withdraw-amount">{text.withdrawAmount}</Label>
                    <div className="flex gap-2 mt-1.5">
                      <Input
                        id="withdraw-amount"
                        type="number"
                        placeholder="0.00"
                        value={withdrawAmount}
                        onChange={(e) => setWithdrawAmount(e.target.value)}
                        className="flex-1"
                      />
                      <Button 
                        variant="outline"
                        onClick={() => setWithdrawAmount(String(userInfo?.usdValue || 0))}
                        type="button"
                      >
                        MAX
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{text.available}</span>
                    <span>{formatNumber(userInfo?.usdValue || 0, { currency: true })}</span>
                  </div>
                  
                  <Button 
                    className="w-full"
                    variant="outline"
                    onClick={handleWithdraw}
                    disabled={!withdrawAmount || parseFloat(withdrawAmount) <= 0 || isPending || isConfirming || isRecording}
                  >
                    {isPending || isConfirming || isRecording ? (
                      <span className="flex items-center gap-2">
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        {isRecording ? 'Recording...' : 'Withdrawing...'}
                      </span>
                    ) : (
                      text.withdrawButton
                    )}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Referral Tab */}
            <TabsContent value="referral" className="space-y-6" suppressHydrationWarning>
              {/* Referral Link */}
              <Card className="bg-card/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle>{text.yourReferralLink}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <Input value={referralLink} readOnly className="bg-muted" />
                    <Button onClick={handleCopyLink}>
                      {copied ? text.copied : text.copy}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Commission Stats */}
              <div className="grid md:grid-cols-3 gap-4">
                <Card className="bg-card/50 backdrop-blur-sm">
                  <CardContent className="pt-6">
                    <div className="text-sm text-muted-foreground mb-1">{text.totalReferrals}</div>
                    <div className="text-2xl font-bold">{stats?.totalReferrals || 0}</div>
                  </CardContent>
                </Card>
                <Card className="bg-card/50 backdrop-blur-sm">
                  <CardContent className="pt-6">
                    <div className="text-sm text-muted-foreground mb-1">{text.totalReferredVolume}</div>
                    <div className="text-2xl font-bold">{formatNumber(stats?.totalReferredVolume || 0, { currency: true, compact: true })}</div>
                  </CardContent>
                </Card>
                <Card className="bg-card/50 backdrop-blur-sm">
                  <CardContent className="pt-6">
                    <div className="text-sm text-muted-foreground mb-1">{text.totalCommissions}</div>
                    <div className="text-2xl font-bold text-green-400">{formatNumber(stats?.totalCommissions || 0, { currency: true })}</div>
                  </CardContent>
                </Card>
              </div>

              {/* Level Breakdown */}
              <Card className="bg-card/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle>{text.commissionBreakdown}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {stats?.levelBreakdown?.map((level) => (
                      <div key={level.level} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center text-sm font-semibold text-purple-400">
                            L{level.level}
                          </div>
                          <div>
                            <div className="font-medium">{level.count} {text.referrals}</div>
                            <div className="text-xs text-muted-foreground">{level.activeCount} {text.active}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">{formatNumber(level.volume, { currency: true, compact: true })}</div>
                          <div className="text-xs text-muted-foreground">{level.commissionRate}% {text.rate}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Claim Button */}
              {stats?.pendingCommissions && stats.pendingCommissions > 0 && (
                <Card className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border-yellow-500/30">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm text-muted-foreground mb-1">{text.availableToClaim}</div>
                        <div className="text-2xl font-bold text-yellow-400">
                          {formatNumber(stats.pendingCommissions, { currency: true })}
                        </div>
                      </div>
                      <Button 
                        onClick={handleClaim}
                        disabled={claiming}
                        className="bg-yellow-500 hover:bg-yellow-600 text-black"
                      >
                        {claiming ? text.claiming : text.claimNow}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </section>
  );
}

export default Dashboard;
