'use client';

import { useVault } from '@/hooks/useVault';
import { useAccount, useConnect } from 'wagmi';
import { useI18n } from '@/contexts/I18nContext';
import { formatNumber, formatAPY } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { SimpleWalletConnect } from '@/components/wallet/SimpleWalletConnect';

export function Hero() {
  const { vaultInfo, loading } = useVault();
  const { isConnected } = useAccount();
  const { t, mounted } = useI18n();

  // Default English text for SSR
  const heroText = mounted ? {
    badge: t('hero.badge'),
    title1: t('hero.title1'),
    title2: t('hero.title2'),
    subtitle: t('hero.subtitle', { apy: '23.5%' }),
    tvl: t('hero.tvl'),
    tvlSub: t('hero.tvlSub'),
    currentApy: t('hero.currentApy'),
    currentApySub: t('hero.currentApySub'),
    totalUsers: t('hero.totalUsers'),
    totalUsersSub: t('hero.totalUsersSub'),
    sharePrice: t('hero.sharePrice'),
    sharePriceSub: t('hero.sharePriceSub'),
    viewDashboard: t('hero.viewDashboard'),
    startEarning: t('hero.startEarning'),
    learnMore: t('hero.learnMore'),
    audited: t('hero.audited'),
    poweredBy: t('hero.poweredBy'),
    lowGas: t('hero.lowGas'),
  } : {
    badge: 'Live on Polygon Network',
    title1: 'Maximize Your',
    title2: 'USDT Yield',
    subtitle: 'Automated yield farming with Aave, QuickSwap, and more. Earn up to 23.5% APY with auto-compounding and a 5-level referral program.',
    tvl: 'Total Value Locked',
    tvlSub: 'in USDT',
    currentApy: 'Current APY',
    currentApySub: 'estimated yearly',
    totalUsers: 'Total Users',
    totalUsersSub: 'active depositors',
    sharePrice: 'Share Price',
    sharePriceSub: 'per yvSHARE',
    viewDashboard: 'View Dashboard',
    startEarning: 'Connect Wallet & Start',
    learnMore: 'Learn More',
    audited: 'Audited Smart Contracts',
    poweredBy: 'Powered by Aave & QuickSwap',
    lowGas: 'Low Gas Fees on Polygon',
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center pt-16 overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/20 via-background to-background" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse delay-1000" />
      
      {/* Grid Pattern */}
      <div 
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `linear-gradient(to right, rgb(139, 92, 246, 0.1) 1px, transparent 1px),
                           linear-gradient(to bottom, rgb(139, 92, 246, 0.1) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }}
      />

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/20 mb-8">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
            </span>
            <span className="text-sm text-purple-300">{heroText.badge}</span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight" suppressHydrationWarning>
            <span className="bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
              {heroText.title1}
            </span>
            <br />
            <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
              {heroText.title2}
            </span>
          </h1>

          {/* Subheadline */}
          <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto" suppressHydrationWarning>
            {heroText.subtitle}
          </p>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
            <StatCard
              label={heroText.tvl}
              value={loading ? '...' : formatNumber(vaultInfo?.tvl || 0, { currency: true, compact: true })}
              subValue={heroText.tvlSub}
            />
            <StatCard
              label={heroText.currentApy}
              value={loading ? '...' : formatAPY(vaultInfo?.apy || 0)}
              subValue={heroText.currentApySub}
              highlight
            />
            <StatCard
              label={heroText.totalUsers}
              value={loading ? '...' : formatNumber(vaultInfo?.totalUsers || 0, { compact: true })}
              subValue={heroText.totalUsersSub}
            />
            <StatCard
              label={heroText.sharePrice}
              value={loading ? '...' : `$${vaultInfo?.sharePrice?.toFixed(4) || '1.0000'}`}
              subValue={heroText.sharePriceSub}
            />
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center" suppressHydrationWarning>
            {isConnected ? (
              <Button
                size="lg"
                className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white text-lg px-8 py-6"
                onClick={() => document.getElementById('dashboard')?.scrollIntoView({ behavior: 'smooth' })}
              >
                {heroText.viewDashboard}
                <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Button>
            ) : (
              <div className="scale-110 origin-center">
                <SimpleWalletConnect />
              </div>
            )}
            <Button
              size="lg"
              variant="outline"
              className="border-purple-500/50 text-purple-300 hover:bg-purple-500/10 text-lg px-8 py-6"
            >
              {heroText.learnMore}
            </Button>
          </div>

          {/* Trust Badges */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-muted-foreground" suppressHydrationWarning>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span className="text-sm">{heroText.audited}</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span className="text-sm">{heroText.poweredBy}</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span className="text-sm">{heroText.lowGas}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <svg className="w-6 h-6 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      </div>
    </section>
  );
}

function StatCard({ label, value, subValue, highlight = false }: {
  label: string;
  value: string;
  subValue: string;
  highlight?: boolean;
}) {
  return (
    <Card className={`p-4 bg-card/50 backdrop-blur-sm border-border/50 ${highlight ? 'border-purple-500/50 bg-purple-500/5' : ''}`}>
      <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">{label}</div>
      <div className={`text-xl md:text-2xl font-bold ${highlight ? 'text-purple-400' : 'text-foreground'}`}>
        {value}
      </div>
      <div className="text-xs text-muted-foreground">{subValue}</div>
    </Card>
  );
}

export default Hero;
