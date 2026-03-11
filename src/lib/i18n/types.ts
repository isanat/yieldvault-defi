// Language codes supported by the app
export type LanguageCode = 'en' | 'pt-BR' | 'es' | 'fr' | 'de';

// Language information
export interface Language {
  code: LanguageCode;
  name: string;
  nativeName: string;
  flag: string;
}

// All available languages
export const LANGUAGES: Language[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
  { code: 'pt-BR', name: 'Portuguese (Brazil)', nativeName: 'Português (Brasil)', flag: '🇧🇷' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
];

// Default language
export const DEFAULT_LANGUAGE: LanguageCode = 'en';

// Storage key for language preference
export const LANGUAGE_STORAGE_KEY = 'yieldvault-language';

// Translation structure
export interface Translations {
  // App metadata
  metadata: {
    title: string;
    description: string;
  };

  // Navigation
  nav: {
    features: string;
    howItWorks: string;
    security: string;
    faq: string;
    connect: string;
    connected: string;
    disconnect: string;
    documentation: string;
    github: string;
    discord: string;
    twitter: string;
  };

  // Hero section
  hero: {
    badge: string;
    titleLine1: string;
    titleLine2: string;
    description: string;
    connectWallet: string;
    openDashboard: string;
    learnMore: string;
  };

  // Stats
  stats: {
    totalValueLocked: string;
    activeUsers: string;
    avgApy: string;
    totalPaidOut: string;
  };

  // Features section
  features: {
    title: string;
    subtitle: string;
    erc4626: {
      title: string;
      description: string;
      details: string[];
    };
    multiStrategy: {
      title: string;
      description: string;
      details: string[];
    };
    referral: {
      title: string;
      description: string;
      details: string[];
    };
    security: {
      title: string;
      description: string;
      details: string[];
    };
  };

  // How it works section
  howItWorks: {
    title: string;
    subtitle: string;
    steps: {
      connect: { title: string; description: string };
      deposit: { title: string; description: string };
      automate: { title: string; description: string };
      earn: { title: string; description: string };
    };
  };

  // Strategies section
  strategies: {
    title: string;
    subtitle: string;
    aave: {
      title: string;
      badge: string;
      description: string;
      estimatedApy: string;
      risk: string;
      riskLevel: string;
    };
    quickswap: {
      title: string;
      badge: string;
      description: string;
      estimatedApy: string;
      risk: string;
      riskLevel: string;
    };
  };

  // Referral section
  referral: {
    title: string;
    subtitle: string;
    level: string;
    distributed: string;
    description: string;
  };

  // Fees section
  fees: {
    title: string;
    subtitle: string;
    performance: {
      label: string;
      description: string;
    };
    deposit: {
      label: string;
      description: string;
    };
    management: {
      label: string;
      description: string;
    };
    withdrawal: {
      label: string;
      description: string;
    };
  };

  // Security section
  securitySection: {
    title: string;
    subtitle: string;
    timelock: {
      title: string;
      description: string;
    };
    roleBased: {
      title: string;
      description: string;
    };
    pausable: {
      title: string;
      description: string;
    };
    verifiedContracts: string;
  };

  // Roadmap section
  roadmap: {
    title: string;
    subtitle: string;
    phases: {
      q1: { title: string; status: string; items: string[] };
      q2: { title: string; status: string; items: string[] };
      q3: { title: string; status: string; items: string[] };
      q4: { title: string; status: string; items: string[] };
    };
  };

  // FAQ section
  faq: {
    title: string;
    subtitle: string;
    questions: {
      whatIs: { question: string; answer: string };
      risks: { question: string; answer: string };
      earnings: { question: string; answer: string };
      referral: { question: string; answer: string };
      withdraw: { question: string; answer: string };
      audited: { question: string; answer: string };
    };
  };

  // CTA section
  cta: {
    title: string;
    subtitle: string;
  };

  // Footer
  footer: {
    rights: string;
  };

  // Dashboard
  dashboard: {
    back: string;
    title: string;
    connected: string;
    welcome: string;
    portfolioSummary: string;
    balance: string;
    deposits: string;
    withdrawals: string;
    earnings: string;
    available: string;
    totalDeposited: string;
    totalWithdrawn: string;
    totalEarned: string;
    deposit: string;
    withdraw: string;
    refer: string;
    referralNetwork: string;
    totalReferrals: string;
    direct: string;
    referralEarnings: string;
    home: string;
    profile: string;
    profileSoon: string;
    landingScreen: string;
  };

  // Modals
  modals: {
    deposit: {
      title: string;
      description: string;
      amountLabel: string;
      depositFee: string;
      cancel: string;
      confirm: string;
    };
    withdraw: {
      title: string;
      description: string;
      amountLabel: string;
      available: string;
      withdrawalFee: string;
      free: string;
      cancel: string;
      confirm: string;
    };
    referralCode: {
      title: string;
      description: string;
      copyCode: string;
      copied: string;
      rewardDistribution: string;
      close: string;
    };
  };

  // Toasts
  toasts: {
    walletConnected: string;
    walletConnectedDesc: string;
    walletDisconnected: string;
    invalidAmount: string;
    depositSent: string;
    depositProcessing: string;
    withdrawSent: string;
    withdrawProcessing: string;
    insufficientBalance: string;
    codeCopied: string;
  };

  // Common
  common: {
    max: string;
    polygonMainnet: string;
    v2System: string;
  };
}

// Translation map type
export type TranslationMap = Record<LanguageCode, Translations>;
