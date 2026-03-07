'use client';

import { useI18n } from '@/contexts/I18nContext';

export function Strategies() {
  const { t, mounted } = useI18n();

  const text = mounted ? {
    title: t('strategies.title'),
    titleHighlight: t('strategies.titleHighlight'),
    subtitle: t('strategies.subtitle'),
    allocation: t('strategies.allocation'),
    strategies: [
      {
        key: 'aave',
        icon: '🔷',
        name: t('strategies.aave.name'),
        apy: t('strategies.aave.apy'),
        risk: t('strategies.aave.risk'),
        description: t('strategies.aave.description'),
        features: t('strategies.aave.features'),
        riskKey: 'Medium',
        color: 'from-blue-500 to-cyan-500',
      },
      {
        key: 'quickswap',
        icon: '🦄',
        name: t('strategies.quickswap.name'),
        apy: t('strategies.quickswap.apy'),
        risk: t('strategies.quickswap.risk'),
        description: t('strategies.quickswap.description'),
        features: t('strategies.quickswap.features'),
        riskKey: 'MediumHigh',
        color: 'from-pink-500 to-purple-500',
      },
      {
        key: 'stablecoin',
        icon: '💰',
        name: t('strategies.stablecoin.name'),
        apy: t('strategies.stablecoin.apy'),
        risk: t('strategies.stablecoin.risk'),
        description: t('strategies.stablecoin.description'),
        features: t('strategies.stablecoin.features'),
        riskKey: 'Low',
        color: 'from-green-500 to-emerald-500',
      },
    ],
  } : {
    title: 'Yield ',
    titleHighlight: 'Strategies',
    subtitle: 'Your USDT is automatically allocated across multiple strategies for optimal risk-adjusted returns.',
    allocation: 'Default allocation: 40% Aave • 40% QuickSwap • 20% Stablecoin',
    strategies: [
      {
        key: 'aave',
        icon: '🔷',
        name: 'Aave Leveraged Lending',
        apy: '15-20%',
        risk: 'Medium',
        description: 'Supply USDT to Aave with controlled leverage for enhanced yields.',
        features: ['Leveraged yield', 'Health monitoring', 'Auto-rebalance'],
        riskKey: 'Medium',
        color: 'from-blue-500 to-cyan-500',
      },
      {
        key: 'quickswap',
        icon: '🦄',
        name: 'QuickSwap LP',
        apy: '25-35%',
        risk: 'Medium-High',
        description: 'Provide liquidity to USDT/MATIC pools on QuickSwap.',
        features: ['Trading fees', 'LP rewards', 'Auto-compound'],
        riskKey: 'MediumHigh',
        color: 'from-pink-500 to-purple-500',
      },
      {
        key: 'stablecoin',
        icon: '💰',
        name: 'Stablecoin Strategies',
        apy: '10-15%',
        risk: 'Low',
        description: 'Conservative strategies using stable-stable pools.',
        features: ['Low volatility', 'Stable yields', 'Insurance-backed'],
        riskKey: 'Low',
        color: 'from-green-500 to-emerald-500',
      },
    ],
  };

  const getRiskLabel = (riskKey: string) => {
    if (!mounted) {
      return riskKey === 'Low' ? 'Low Risk' : riskKey === 'Medium' ? 'Medium Risk' : 'Medium-High Risk';
    }
    switch (riskKey) {
      case 'Low': return t('strategies.riskLow');
      case 'Medium': return t('strategies.riskMedium');
      case 'MediumHigh': return t('strategies.riskMediumHigh');
      default: return riskKey;
    }
  };

  const getRiskColor = (riskKey: string) => {
    switch (riskKey) {
      case 'Low': return 'bg-green-500/20 text-green-400';
      case 'Medium': return 'bg-yellow-500/20 text-yellow-400';
      case 'MediumHigh': return 'bg-red-500/20 text-red-400';
      default: return 'bg-yellow-500/20 text-yellow-400';
    }
  };

  return (
    <section id="strategies" className="py-20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16" suppressHydrationWarning>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            {text.title}<span className="text-purple-400">{text.titleHighlight}</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            {text.subtitle}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8" suppressHydrationWarning>
          {text.strategies.map((strategy) => (
            <div
              key={strategy.key}
              className="group relative bg-card border border-border rounded-2xl overflow-hidden hover:border-purple-500/50 transition-all duration-300"
            >
              {/* Gradient Top Border */}
              <div className={`h-1 bg-gradient-to-r ${strategy.color}`} />
              
              <div className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="text-4xl">{strategy.icon}</div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-purple-400">{strategy.apy}</div>
                    <div className="text-xs text-muted-foreground">Est. APY</div>
                  </div>
                </div>

                {/* Title & Risk */}
                <h3 className="text-xl font-semibold mb-1">{strategy.name}</h3>
                <div className="flex items-center gap-2 mb-4">
                  <span className={`text-xs px-2 py-1 rounded-full ${getRiskColor(strategy.riskKey)}`}>
                    {getRiskLabel(strategy.riskKey)}
                  </span>
                </div>

                {/* Description */}
                <p className="text-muted-foreground text-sm mb-4">{strategy.description}</p>

                {/* Features */}
                <div className="flex flex-wrap gap-2">
                  {Array.isArray(strategy.features) && strategy.features.map((feature: string, i: number) => (
                    <span key={i} className="text-xs bg-muted px-2 py-1 rounded-full">
                      {feature}
                    </span>
                  ))}
                </div>
              </div>

              {/* Hover Glow */}
              <div className={`absolute inset-0 bg-gradient-to-r ${strategy.color} opacity-0 group-hover:opacity-5 transition-opacity`} />
            </div>
          ))}
        </div>

        {/* Allocation Notice */}
        <div className="mt-12 text-center" suppressHydrationWarning>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted text-sm text-muted-foreground">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {text.allocation}
          </div>
        </div>
      </div>
    </section>
  );
}

export default Strategies;
