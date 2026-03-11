import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Web3Provider } from "@/components/providers/Web3Provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "YieldVault DeFi - Multi-Strategy Yield Optimizer",
  description: "Institutional-grade yield vault with multi-strategy optimization on Polygon. Secure, transparent, and optimized for maximum returns.",
  keywords: ["YieldVault", "DeFi", "Yield", "Polygon", "Aave", "QuickSwap", "ERC4626", "Cryptocurrency"],
  authors: [{ name: "YieldVault Team" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "YieldVault DeFi",
    description: "Multi-Strategy Yield Optimizer on Polygon",
    url: "https://yieldvault.finance",
    siteName: "YieldVault",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "YieldVault DeFi",
    description: "Multi-Strategy Yield Optimizer on Polygon",
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
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <Web3Provider>
          {children}
        </Web3Provider>
        <Toaster />
      </body>
    </html>
  );
}
