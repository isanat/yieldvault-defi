'use client'

import React from 'react'
import { useWallet } from '@/contexts/WalletContext'
import { useVault } from '@/hooks/useVault'
import { formatUSD, formatNumber } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Wallet, TrendingUp, DollarSign, Gift, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react'

interface PortfolioCardProps {
  onDeposit: () => void
  onWithdraw: () => void
}

export function PortfolioCard({ onDeposit, onWithdraw }: PortfolioCardProps) {
  const { address, formattedAddress } = useWallet()
  const { userVaultInfo, vaultInfo, isLoading } = useVault(address)

  if (isLoading) {
    return (
      <Card className="glass-card">
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="h-8 w-48 bg-muted/30 rounded animate-pulse" />
            <div className="h-12 w-32 bg-muted/30 rounded animate-pulse" />
            <div className="grid grid-cols-2 gap-4">
              <div className="h-20 bg-muted/30 rounded animate-pulse" />
              <div className="h-20 bg-muted/30 rounded animate-pulse" />
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const stats = [
    {
      label: 'Your Shares',
      value: userVaultInfo ? formatNumber(userVaultInfo.shares, 2) : '0',
      subValue: userVaultInfo ? `≈ ${formatUSD(userVaultInfo.usdValue)}` : '',
      icon: Wallet,
      color: 'text-purple-400',
    },
    {
      label: 'Total Earnings',
      value: userVaultInfo ? formatUSD(userVaultInfo.totalEarnings) : '$0',
      subValue: 'All time',
      icon: TrendingUp,
      color: 'text-green-400',
    },
    {
      label: 'Total Deposited',
      value: userVaultInfo ? formatUSD(userVaultInfo.totalDeposited) : '$0',
      subValue: 'Lifetime deposits',
      icon: DollarSign,
      color: 'text-blue-400',
    },
    {
      label: 'Pending Commissions',
      value: userVaultInfo ? formatUSD(userVaultInfo.pendingCommissions) : '$0',
      subValue: 'Available to claim',
      icon: Gift,
      color: 'text-amber-400',
    },
  ]

  return (
    <Card className="glass-card overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl">Your Portfolio</CardTitle>
          <div className="flex items-center gap-2 px-3 py-1 rounded-full glass">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs text-muted-foreground">{formattedAddress}</span>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-6 pt-2">
        {/* Main balance display */}
        <div className="mb-6">
          <div className="text-sm text-muted-foreground mb-1">Current Value</div>
          <div className="text-4xl font-bold gradient-text mb-2">
            {userVaultInfo ? formatUSD(userVaultInfo.usdValue, 2) : '$0.00'}
          </div>
          {vaultInfo && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Earning</span>
              <span className="text-green-400 font-semibold">{vaultInfo.apy.toFixed(1)}% APY</span>
            </div>
          )}
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {stats.map((stat) => (
            <div key={stat.label} className="p-3 rounded-xl glass hover:bg-accent/20 transition-colors">
              <div className="flex items-center gap-2 mb-1">
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
                <span className="text-xs text-muted-foreground">{stat.label}</span>
              </div>
              <div className="font-semibold">{stat.value}</div>
              {stat.subValue && (
                <div className="text-xs text-muted-foreground">{stat.subValue}</div>
              )}
            </div>
          ))}
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          <Button
            className="flex-1 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white"
            onClick={onDeposit}
          >
            <ArrowDownToLine className="w-4 h-4 mr-2" />
            Deposit
          </Button>
          <Button
            variant="outline"
            className="flex-1 glass hover:bg-accent"
            onClick={onWithdraw}
          >
            <ArrowUpFromLine className="w-4 h-4 mr-2" />
            Withdraw
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
