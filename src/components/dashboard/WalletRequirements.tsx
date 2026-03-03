'use client';

import { useAccount, useBalance } from 'wagmi';
import { formatUnits } from 'viem';
import { AlertTriangle, Wallet, Coins, Fuel } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

// Official USDT on Polygon Mainnet
const USDT_ADDRESS = '0xc2132D05D31c914a87C6611C10748AEb04B58e8F' as `0x${string}`;

interface WalletRequirementsProps {
  onReady?: () => void;
}

export function WalletRequirements({ onReady }: WalletRequirementsProps) {
  const { address, chain } = useAccount();
  
  // Get POL balance
  const { data: polBalance } = useBalance({
    address,
    query: {
      enabled: !!address,
    },
  });
  
  // Get USDT balance
  const { data: usdtBalance } = useBalance({
    address,
    token: USDT_ADDRESS,
    query: {
      enabled: !!address,
    },
  });

  const isPolygon = chain?.id === 137;
  const polAmount = polBalance ? parseFloat(formatUnits(polBalance.value, polBalance.decimals)) : 0;
  const usdtAmount = usdtBalance ? parseFloat(formatUnits(usdtBalance.value, usdtBalance.decimals)) : 0;
  
  const hasMinimumPOL = polAmount >= 0.01; // Minimum 0.01 POL for gas
  const hasUSDT = usdtAmount > 0;
  const isReady = isPolygon && hasMinimumPOL && hasUSDT;

  // Notify parent when ready
  if (isReady && onReady) {
    onReady();
  }

  if (!address) {
    return (
      <Card className="bg-blue-500/10 border-blue-500/30 mb-6">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <Wallet className="w-6 h-6 text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-blue-400 mb-1">Connect Your Wallet</h4>
              <p className="text-sm text-muted-foreground">
                Connect your wallet to start using YieldVault on Polygon Mainnet.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!isPolygon) {
    return (
      <Card className="bg-red-500/10 border-red-500/30 mb-6">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <AlertTriangle className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-red-400 mb-1">Wrong Network</h4>
              <p className="text-sm text-muted-foreground">
                Please switch to <strong>Polygon Mainnet</strong> (Chain ID: 137) to use YieldVault.
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Current: {chain?.name || 'Unknown'} (ID: {chain?.id})
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`mb-6 ${isReady ? 'bg-green-500/10 border-green-500/30' : 'bg-yellow-500/10 border-yellow-500/30'}`}>
      <CardContent className="pt-6">
        <div className="flex items-start gap-4 mb-4">
          {isReady ? (
            <div className="w-6 h-6 text-green-400 flex-shrink-0 mt-0.5">✓</div>
          ) : (
            <AlertTriangle className="w-6 h-6 text-yellow-400 flex-shrink-0 mt-0.5" />
          )}
          <div>
            <h4 className={`font-semibold mb-1 ${isReady ? 'text-green-400' : 'text-yellow-400'}`}>
              {isReady ? 'Wallet Ready!' : 'Requirements to Transact'}
            </h4>
            <p className="text-sm text-muted-foreground">
              {isReady 
                ? 'You have everything needed to deposit and withdraw.'
                : 'Make sure you have POL for gas fees and USDT to deposit.'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 ml-10">
          {/* POL Balance */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-background/50">
            <Fuel className={`w-5 h-5 ${hasMinimumPOL ? 'text-green-400' : 'text-red-400'}`} />
            <div>
              <div className="text-xs text-muted-foreground">POL Balance</div>
              <div className={`font-semibold ${hasMinimumPOL ? 'text-green-400' : 'text-red-400'}`}>
                {polBalance ? polAmount.toFixed(4) : '0.0000'} POL
              </div>
              {!hasMinimumPOL && (
                <div className="text-xs text-red-400">Need ~0.01 POL for gas</div>
              )}
            </div>
          </div>

          {/* USDT Balance */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-background/50">
            <Coins className={`w-5 h-5 ${hasUSDT ? 'text-green-400' : 'text-yellow-400'}`} />
            <div>
              <div className="text-xs text-muted-foreground">USDT Balance</div>
              <div className={`font-semibold ${hasUSDT ? 'text-green-400' : 'text-yellow-400'}`}>
                {usdtBalance ? usdtAmount.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '0.00'} USDT
              </div>
              {!hasUSDT && (
                <div className="text-xs text-yellow-400">Get USDT to deposit</div>
              )}
            </div>
          </div>
        </div>

        {!isReady && (
          <div className="mt-4 ml-10 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <p className="text-xs text-blue-300">
              <strong>💡 Tip:</strong> Get POL from exchanges like Binance, Coinbase, or use a bridge. 
              Get USDT from the same sources or swap POL for USDT on QuickSwap.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
