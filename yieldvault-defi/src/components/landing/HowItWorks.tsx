'use client';

import { useI18n } from '@/contexts/I18nContext';

export function HowItWorks() {
  const { t, mounted } = useI18n();

  const steps = [
    {
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      ),
      titleKey: 'howItWorks.step1Title',
      descKey: 'howItWorks.step1Desc',
    },
    {
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      titleKey: 'howItWorks.step2Title',
      descKey: 'howItWorks.step2Desc',
    },
    {
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      titleKey: 'howItWorks.step3Title',
      descKey: 'howItWorks.step3Desc',
    },
    {
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
        </svg>
      ),
      titleKey: 'howItWorks.step4Title',
      descKey: 'howItWorks.step4Desc',
    },
  ];

  const text = mounted ? {
    title: t('howItWorks.title'),
    titleHighlight: t('howItWorks.titleHighlight'),
    subtitle: t('howItWorks.subtitle'),
    steps: steps.map(s => ({
      title: t(s.titleKey),
      desc: t(s.descKey),
    })),
  } : {
    title: 'How It',
    titleHighlight: 'Works',
    subtitle: 'Getting started with YieldVault is simple. Deposit your USDT and let our smart contracts do the heavy lifting.',
    steps: [
      { title: 'Connect & Deposit', desc: 'Connect your wallet and deposit USDT. Your funds are immediately deployed into yield-generating strategies.' },
      { title: 'Auto-Compound', desc: 'Our smart contracts automatically harvest rewards and compound them back into your position for maximum yield.' },
      { title: 'Earn & Refer', desc: 'Watch your balance grow. Share your referral link to earn commissions on 5 levels of referrals.' },
      { title: 'Withdraw Anytime', desc: 'Your funds are never locked. Withdraw at any time with no penalties. Full control, always.' },
    ],
  };

  return (
    <section id="how-it-works" className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16" suppressHydrationWarning>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            {text.title} <span className="text-purple-400">{text.titleHighlight}</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            {text.subtitle}
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8" suppressHydrationWarning>
          {text.steps.map((step, index) => (
            <div key={index} className="relative">
              {/* Connector Line */}
              {index < text.steps.length - 1 && (
                <div className="hidden lg:block absolute top-12 left-full w-full h-0.5 bg-gradient-to-r from-purple-500/50 to-transparent" />
              )}
              
              <div className="bg-card border border-border rounded-2xl p-6 hover:border-purple-500/50 transition-colors">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center mb-4 text-purple-400">
                  {steps[index].icon}
                </div>
                <div className="text-sm text-purple-400 font-medium mb-2">Step {index + 1}</div>
                <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                <p className="text-muted-foreground text-sm">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default HowItWorks;
