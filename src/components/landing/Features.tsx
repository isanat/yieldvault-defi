'use client'

import React from 'react'
import { RefreshCw, Users, Shield, Zap, PieChart, Clock } from 'lucide-react'

const features = [
  {
    icon: RefreshCw,
    title: 'Auto-Compounding',
    description: 'Yields are automatically harvested and reinvested, maximizing your returns through the power of compound interest.',
    color: 'from-purple-500 to-purple-600',
  },
  {
    icon: Users,
    title: '5-Level Referral System',
    description: 'Earn commissions from your referrals up to 5 levels deep. Level 1: 40%, Level 2: 25%, Level 3: 15%, Level 4: 12%, Level 5: 8%.',
    color: 'from-blue-500 to-cyan-600',
  },
  {
    icon: Shield,
    title: 'Institutional Security',
    description: 'Smart contracts audited by leading security firms. Multi-sig treasury and timelock for all protocol changes.',
    color: 'from-green-500 to-emerald-600',
  },
  {
    icon: Zap,
    title: 'Optimized Strategies',
    description: 'Your funds are automatically allocated across AAVE lending and QuickSwap liquidity pools for maximum yield.',
    color: 'from-amber-500 to-orange-600',
  },
  {
    icon: PieChart,
    title: 'Real-Time Analytics',
    description: 'Track your portfolio performance, earnings, and referral commissions with detailed dashboards and charts.',
    color: 'from-pink-500 to-rose-600',
  },
  {
    icon: Clock,
    title: 'Instant Withdrawals',
    description: 'Withdraw your funds anytime without lock-up periods. Your liquidity, your control.',
    color: 'from-indigo-500 to-violet-600',
  },
]

export function Features() {
  return (
    <section id="features" className="py-20 relative">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/2 left-0 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        {/* Section header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-4">
            <span className="text-sm text-muted-foreground">Why Choose YieldVault</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Powerful Features for{' '}
            <span className="gradient-text">Maximum Yield</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Everything you need to earn passive income in DeFi, simplified into one powerful platform.
          </p>
        </div>

        {/* Features grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className="group glass-card rounded-2xl p-6 hover:glow-sm transition-all duration-300 animate-in"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform`}>
                <feature.icon className="w-7 h-7 text-white" />
              </div>
              
              <h3 className="text-xl font-semibold mb-3">
                {feature.title}
              </h3>
              
              <p className="text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
