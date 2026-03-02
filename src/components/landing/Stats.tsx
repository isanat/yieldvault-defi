'use client'

import React from 'react'
import { useVault } from '@/hooks/useVault'
import { formatUSD, formatPercent, formatNumber } from '@/lib/utils'
import { TrendingUp, Users, DollarSign, Clock } from 'lucide-react'

export function Stats() {
  const { vaultInfo, isLoading } = useVault()

  const stats = [
    {
      label: 'Total Value Locked',
      value: vaultInfo ? formatUSD(vaultInfo.tvl, 0) : '$5.2M',
      subValue: vaultInfo ? `Share Price: $${vaultInfo.sharePrice.toFixed(4)}` : 'Share Price: $1.0218',
      icon: DollarSign,
      color: 'from-purple-500 to-purple-600',
      textColor: 'text-purple-400',
    },
    {
      label: 'Current APY',
      value: vaultInfo ? formatPercent(vaultInfo.apy) : '23.5%',
      subValue: vaultInfo ? `7d: ${formatPercent(vaultInfo.apy7d)} | 30d: ${formatPercent(vaultInfo.apy30d)}` : '7d: 22.8% | 30d: 24.1%',
      icon: TrendingUp,
      color: 'from-green-500 to-emerald-600',
      textColor: 'text-green-400',
    },
    {
      label: 'Total Users',
      value: vaultInfo ? formatNumber(vaultInfo.totalUsers, 0) : '1,234',
      subValue: 'Active depositors',
      icon: Users,
      color: 'from-blue-500 to-cyan-600',
      textColor: 'text-blue-400',
    },
    {
      label: 'Total Profits',
      value: '$892K',
      subValue: vaultInfo?.lastHarvest ? `Last harvest: ${Math.floor((Date.now() - new Date(vaultInfo.lastHarvest).getTime()) / 60000)}m ago` : 'Last harvest: 1h ago',
      icon: Clock,
      color: 'from-amber-500 to-orange-600',
      textColor: 'text-amber-400',
    },
  ]

  return (
    <section id="stats" className="py-20 relative">
      <div className="container mx-auto px-4">
        {/* Section header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Platform{' '}
            <span className="gradient-text">Statistics</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Real-time metrics from the YieldVault protocol
          </p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, index) => (
            <div
              key={stat.label}
              className="glass-card rounded-2xl p-6 hover:glow-sm transition-all duration-300 animate-in"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center`}>
                  <stat.icon className="w-6 h-6 text-white" />
                </div>
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              </div>
              
              <div className="space-y-1">
                {isLoading ? (
                  <>
                    <div className="h-8 w-24 bg-muted/30 rounded animate-pulse" />
                    <div className="h-4 w-32 bg-muted/20 rounded animate-pulse" />
                  </>
                ) : (
                  <>
                    <div className={`text-2xl md:text-3xl font-bold ${stat.textColor}`}>
                      {stat.value}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {stat.subValue}
                    </div>
                  </>
                )}
              </div>
              
              <div className="mt-4 pt-4 border-t border-border/50">
                <span className="text-sm text-muted-foreground">{stat.label}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
