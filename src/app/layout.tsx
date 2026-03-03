import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { WalletProvider } from "@/contexts/WalletContext";
import { I18nProvider } from "@/contexts/I18nContext";
import { Web3Provider } from "@/providers/Web3Provider";

// Force dynamic rendering to avoid SSR issues with wallet libraries
export const dynamic = 'force-dynamic';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "YieldVault - Maximize Your DeFi Returns",
  description: "A professional DeFi yield vault with auto-compounding strategies and a 5-level referral system. Earn up to 23.5% APY on Polygon.",
  keywords: ["DeFi", "Yield", "Vault", "Polygon", "USDT", "Staking", "Passive Income", "Referral"],
  authors: [{ name: "YieldVault Team" }],
  icons: {
    icon: "/logo.svg",
  },
  openGraph: {
    title: "YieldVault - Maximize Your DeFi Returns",
    description: "Professional DeFi yield vault with auto-compounding and referral rewards",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "YieldVault - Maximize Your DeFi Returns",
    description: "Professional DeFi yield vault with auto-compounding and referral rewards",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground min-h-screen`}
      >
        <Web3Provider>
          <I18nProvider>
            <WalletProvider>
              {children}
              <Toaster />
            </WalletProvider>
          </I18nProvider>
        </Web3Provider>
      </body>
    </html>
  );
}
