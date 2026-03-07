'use client';

import { useI18n } from '@/contexts/I18nContext';

export function ReferralProgram() {
  const { t, mounted } = useI18n();

  const levels = [
    { level: 1, rate: 40, color: 'from-purple-500 to-purple-400' },
    { level: 2, rate: 25, color: 'from-purple-400 to-blue-400' },
    { level: 3, rate: 15, color: 'from-blue-400 to-cyan-400' },
    { level: 4, rate: 12, color: 'from-cyan-400 to-teal-400' },
    { level: 5, rate: 8, color: 'from-teal-400 to-green-400' },
  ];

  const text = mounted ? {
    title: t('referral.title'),
    titleHighlight: t('referral.titleHighlight'),
    subtitle: t('referral.subtitle'),
    commissionTitle: t('referral.commissionTitle'),
    commissionNote: t('referral.commissionNote'),
    depositTitle: t('referral.depositTitle'),
    depositDesc: t('referral.depositDesc'),
    depositExample: t('referral.depositExample'),
    yieldTitle: t('referral.yieldTitle'),
    yieldDesc: t('referral.yieldDesc'),
    yieldExample: t('referral.yieldExample'),
    potentialTitle: t('referral.potentialTitle'),
    directReferrals: t('referral.directReferrals'),
    referredVolume: t('referral.referredVolume'),
    potentialCommissions: t('referral.potentialCommissions'),
    example: t('common.example'),
  } : {
    title: '5-Level',
    titleHighlight: 'Referral Program',
    subtitle: 'Earn passive income by referring others. Get commissions on deposits AND on their yield earnings forever.',
    commissionTitle: 'Commission Rates by Level',
    commissionNote: 'Commissions are distributed from the deposit fee (0.5%) and from referred users\' yield earnings',
    depositTitle: 'Deposit Commissions',
    depositDesc: 'Instant commissions when your referrals deposit. Earn from the 0.5% deposit fee distributed across 5 levels.',
    depositExample: 'Level 1: $1,000 deposit → $2 commission',
    yieldTitle: 'Yield Commissions',
    yieldDesc: 'Recurring commissions from your referrals\' yield earnings. Keep earning as long as they stay invested.',
    yieldExample: 'Level 1: $200/year yield → $8/year commission',
    potentialTitle: 'Earning Potential Example',
    directReferrals: 'Direct referrals',
    referredVolume: 'Total referred volume',
    potentialCommissions: 'Potential commissions/yr',
    example: 'Example',
  };

  return (
    <section id="referral" className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16" suppressHydrationWarning>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            {text.title} <span className="text-purple-400">{text.titleHighlight}</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            {text.subtitle}
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          {/* Commission Visualization */}
          <div className="bg-card border border-border rounded-2xl p-8 mb-8" suppressHydrationWarning>
            <h3 className="text-xl font-semibold mb-6 text-center">{text.commissionTitle}</h3>
            
            <div className="space-y-4">
              {levels.map((item) => (
                <div key={item.level} className="flex items-center gap-4">
                  <div className="w-20 text-sm text-muted-foreground">Level {item.level}</div>
                  <div className="flex-1 h-10 bg-muted rounded-lg overflow-hidden relative">
                    <div
                      className={`h-full bg-gradient-to-r ${item.color} flex items-center justify-end pr-4`}
                      style={{ width: `${item.rate * 2}%` }}
                    >
                      <span className="text-white font-semibold">{item.rate}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 text-center text-sm text-muted-foreground">
              {text.commissionNote}
            </div>
          </div>

          {/* Two Types of Commissions */}
          <div className="grid md:grid-cols-2 gap-6" suppressHydrationWarning>
            <div className="bg-card border border-border rounded-2xl p-6">
              <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h4 className="text-lg font-semibold mb-2">{text.depositTitle}</h4>
              <p className="text-muted-foreground text-sm">
                {text.depositDesc}
              </p>
              <div className="mt-4 p-3 bg-muted rounded-lg">
                <div className="text-xs text-muted-foreground">{text.example}</div>
                <div className="text-purple-400 font-semibold">{text.depositExample}</div>
              </div>
            </div>

            <div className="bg-card border border-border rounded-2xl p-6">
              <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <h4 className="text-lg font-semibold mb-2">{text.yieldTitle}</h4>
              <p className="text-muted-foreground text-sm">
                {text.yieldDesc}
              </p>
              <div className="mt-4 p-3 bg-muted rounded-lg">
                <div className="text-xs text-muted-foreground">{text.example}</div>
                <div className="text-blue-400 font-semibold">{text.yieldExample}</div>
              </div>
            </div>
          </div>

          {/* Example Calculation */}
          <div className="mt-8 bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-2xl p-6" suppressHydrationWarning>
            <h4 className="text-lg font-semibold mb-4 text-center">{text.potentialTitle}</h4>
            <div className="grid md:grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-purple-400">10</div>
                <div className="text-sm text-muted-foreground">{text.directReferrals}</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-400">$50K</div>
                <div className="text-sm text-muted-foreground">{text.referredVolume}</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-400">$2,500+/yr</div>
                <div className="text-sm text-muted-foreground">{text.potentialCommissions}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default ReferralProgram;
