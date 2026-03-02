'use client';

import { useState } from 'react';
import { useWallet } from '@/contexts/WalletContext';
import { useI18n } from '@/contexts/I18nContext';
import { useUserVault } from '@/hooks/useVault';
import { useReferral } from '@/hooks/useReferral';
import { formatNumber, formatAddress, generateReferralLink, copyToClipboard } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function Dashboard() {
  const { address } = useWallet();
  const { t, mounted } = useI18n();
  const { userInfo, loading: userLoading } = useUserVault(address);
  const { stats, commissions, claiming, claimCommissions } = useReferral(address);
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [copied, setCopied] = useState(false);

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
    connectedTo: 'Connected to Polygon',
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

  const handleCopyLink = async () => {
    const success = await copyToClipboard(referralLink);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDeposit = async () => {
    console.log('Depositing:', depositAmount);
    alert(`${text.depositButton} ${depositAmount} USDT! (${text.demo})`);
    setDepositAmount('');
  };

  const handleWithdraw = async () => {
    console.log('Withdrawing:', withdrawAmount);
    alert(`${text.withdrawButton} ${withdrawAmount} USDT! (${text.demo})`);
    setWithdrawAmount('');
  };

  const handleClaim = async () => {
    const result = await claimCommissions();
    if (result.success) {
      alert(`${text.success}: $${result.amount?.toFixed(2)}`);
    }
  };

  if (!address) {
    return null;
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
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-sm text-muted-foreground">{text.connectedTo}</span>
            </div>
          </div>

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
                  <div>
                    <Label htmlFor="deposit-amount">{text.depositAmount}</Label>
                    <Input
                      id="deposit-amount"
                      type="number"
                      placeholder="0.00"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      className="mt-1.5"
                    />
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <p>• {text.depositFee}</p>
                    <p>• {text.receiveShares}</p>
                  </div>
                  <Button 
                    className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
                    onClick={handleDeposit}
                    disabled={!depositAmount || parseFloat(depositAmount) <= 0}
                  >
                    {text.depositButton}
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
                  <div>
                    <Label htmlFor="withdraw-amount">{text.withdrawAmount}</Label>
                    <Input
                      id="withdraw-amount"
                      type="number"
                      placeholder="0.00"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      className="mt-1.5"
                    />
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{text.available}</span>
                    <span>{formatNumber(userInfo?.usdValue || 0, { currency: true })}</span>
                  </div>
                  <Button 
                    className="w-full"
                    variant="outline"
                    onClick={handleWithdraw}
                    disabled={!withdrawAmount || parseFloat(withdrawAmount) <= 0}
                  >
                    {text.withdrawButton}
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
