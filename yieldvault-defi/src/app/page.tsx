'use client';

// Force dynamic rendering to avoid SSR issues with wallet libraries
export const dynamic = 'force-dynamic';

import { WalletProvider, useWallet } from '@/contexts/WalletContext';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Hero } from '@/components/landing/Hero';
import { HowItWorks } from '@/components/landing/HowItWorks';
import { Strategies } from '@/components/landing/Strategies';
import { ReferralProgram } from '@/components/landing/ReferralProgram';
import { Dashboard } from '@/components/dashboard/Dashboard';

function MainContent() {
  const { isConnected } = useWallet();

  return (
    <main className="min-h-screen bg-background text-foreground">
      <Header />
      
      {/* Landing Page Sections */}
      <Hero />
      <HowItWorks />
      <Strategies />
      <ReferralProgram />
      
      {/* Dashboard - Only shown when wallet connected */}
      {isConnected && <Dashboard />}
      
      <Footer />
    </main>
  );
}

export default function Home() {
  return (
    <WalletProvider>
      <MainContent />
    </WalletProvider>
  );
}
