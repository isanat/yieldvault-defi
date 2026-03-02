'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useWallet } from '@/contexts/WalletContext';
import { useI18n } from '@/contexts/I18nContext';
import { formatAddress } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { LanguageSelector } from '@/components/layout/LanguageSelector';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function Header() {
  const { address, isConnected, isConnecting, connect, disconnect } = useWallet();
  const { t, mounted } = useI18n();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
              <svg
                className="w-5 h-5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
            <span className="font-bold text-xl bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
              YieldVault
            </span>
          </Link>

          {/* Desktop Navigation - suppress hydration for translated content */}
          <nav className="hidden md:flex items-center gap-8" suppressHydrationWarning>
            <a href="#how-it-works" className="text-muted-foreground hover:text-foreground transition-colors">
              {mounted ? t('nav.howItWorks') : 'How It Works'}
            </a>
            <a href="#strategies" className="text-muted-foreground hover:text-foreground transition-colors">
              {mounted ? t('nav.strategies') : 'Strategies'}
            </a>
            <a href="#referral" className="text-muted-foreground hover:text-foreground transition-colors">
              {mounted ? t('nav.referral') : 'Referral Program'}
            </a>
            <a href="#faq" className="text-muted-foreground hover:text-foreground transition-colors">
              {mounted ? t('nav.faq') : 'FAQ'}
            </a>
          </nav>

          {/* Wallet Connection & Language */}
          <div className="flex items-center gap-2">
            <LanguageSelector />
            
            {isConnected && address ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="border-purple-500/50 bg-purple-500/10 hover:bg-purple-500/20"
                  >
                    <div className="w-2 h-2 rounded-full bg-green-500 mr-2" />
                    {formatAddress(address)}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <div className="px-2 py-1.5 text-sm text-muted-foreground" suppressHydrationWarning>
                    {mounted ? t('nav.connectedTo') : 'Connected to Polygon'}
                  </div>
                  <DropdownMenuItem onClick={disconnect} className="text-red-500" suppressHydrationWarning>
                    {mounted ? t('nav.disconnect') : 'Disconnect'}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                onClick={connect}
                disabled={isConnecting}
                className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white"
                suppressHydrationWarning
              >
                {isConnecting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    {mounted ? t('nav.connecting') : 'Connecting...'}
                  </>
                ) : (
                  mounted ? t('nav.connectWallet') : 'Connect Wallet'
                )}
              </Button>
            )}

            {/* Mobile Menu Button */}
            <button
              className="md:hidden p-2"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-border" suppressHydrationWarning>
            <nav className="flex flex-col gap-4">
              <a href="#how-it-works" className="text-muted-foreground hover:text-foreground transition-colors">
                {mounted ? t('nav.howItWorks') : 'How It Works'}
              </a>
              <a href="#strategies" className="text-muted-foreground hover:text-foreground transition-colors">
                {mounted ? t('nav.strategies') : 'Strategies'}
              </a>
              <a href="#referral" className="text-muted-foreground hover:text-foreground transition-colors">
                {mounted ? t('nav.referral') : 'Referral Program'}
              </a>
              <a href="#faq" className="text-muted-foreground hover:text-foreground transition-colors">
                {mounted ? t('nav.faq') : 'FAQ'}
              </a>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}

export default Header;
