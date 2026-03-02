'use client';

import { useI18n } from '@/contexts/I18nContext';

export function Footer() {
  const { t, mounted } = useI18n();

  const text = mounted ? {
    description: t('footer.description'),
    protocol: t('footer.protocol'),
    documentation: t('footer.documentation'),
    smartContracts: t('footer.smartContracts'),
    auditReports: t('footer.auditReports'),
    security: t('footer.security'),
    community: t('footer.community'),
    terms: t('footer.terms'),
    privacy: t('footer.privacy'),
    disclaimer: t('footer.disclaimer'),
    disclaimerText: t('footer.disclaimerText'),
    allRightsReserved: t('common.allRightsReserved'),
  } : {
    description: 'Maximize your USDT yield with automated strategies on Polygon. Secure, transparent, and community-driven.',
    protocol: 'Protocol',
    documentation: 'Documentation',
    smartContracts: 'Smart Contracts',
    auditReports: 'Audit Reports',
    security: 'Security',
    community: 'Community',
    terms: 'Terms',
    privacy: 'Privacy',
    disclaimer: 'Disclaimer',
    disclaimerText: 'DeFi investments carry significant risks including smart contract vulnerabilities, market volatility, and impermanent loss. Past performance does not guarantee future results. Only invest what you can afford to lose. This is not financial advice.',
    allRightsReserved: 'All rights reserved.',
  };

  return (
    <footer className="border-t border-border py-12 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span className="font-bold text-xl">YieldVault</span>
            </div>
            <p className="text-muted-foreground text-sm max-w-sm" suppressHydrationWarning>
              {text.description}
            </p>
          </div>

          {/* Links */}
          <div suppressHydrationWarning>
            <h4 className="font-semibold mb-4">{text.protocol}</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-foreground transition-colors">{text.documentation}</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">{text.smartContracts}</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">{text.auditReports}</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">{text.security}</a></li>
            </ul>
          </div>

          <div suppressHydrationWarning>
            <h4 className="font-semibold mb-4">{text.community}</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-foreground transition-colors">Twitter</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">Discord</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">Telegram</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">GitHub</a></li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4" suppressHydrationWarning>
          <div className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} YieldVault. {text.allRightsReserved}
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <a href="#" className="hover:text-foreground transition-colors">{text.terms}</a>
            <a href="#" className="hover:text-foreground transition-colors">{text.privacy}</a>
            <a href="#" className="hover:text-foreground transition-colors">{text.disclaimer}</a>
          </div>
        </div>

        {/* Risk Disclaimer */}
        <div className="mt-8 p-4 bg-muted rounded-lg" suppressHydrationWarning>
          <p className="text-xs text-muted-foreground text-center">
            <strong>{text.disclaimer}:</strong> {text.disclaimerText}
          </p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
