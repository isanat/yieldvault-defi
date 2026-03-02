'use client';

import React from 'react';
import { useAccount, useConnect, useDisconnect, useSwitchChain } from 'wagmi';
import { areContractsDeployed } from '@/lib/contracts';
import { Button } from '@/components/ui/button';
import { Wallet, Loader2, CheckCircle, AlertCircle, AlertTriangle, LogOut } from 'lucide-react';

const AMOY_CHAIN_ID = 80002;
const POLYGON_CHAIN_ID = 137;

export function ConnectButton() {
  const { address, isConnected, chain } = useAccount();
  const { connectors, connectAsync, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChainAsync } = useSwitchChain();
  const contractsDeployed = areContractsDeployed();

  const isAmoy = chain?.id === AMOY_CHAIN_ID;
  const isPolygon = chain?.id === POLYGON_CHAIN_ID;
  const isCorrectChain = isAmoy || isPolygon;

  const handleConnect = async () => {
    try {
      const connector = connectors.find(c => c.id === 'injected' || c.id === 'io.metamask');
      if (connector) {
        await connectAsync({ connector });
      } else {
        alert('Please install MetaMask to connect your wallet.');
      }
    } catch (error) {
      console.error('Failed to connect:', error);
    }
  };

  const handleSwitchToAmoy = async () => {
    try {
      await switchChainAsync?.({ chainId: AMOY_CHAIN_ID });
    } catch (error) {
      console.error('Failed to switch network:', error);
    }
  };

  // Format address for display
  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <div className="flex items-center gap-2">
      {/* Show warning if contracts not deployed */}
      {isConnected && !contractsDeployed && (
        <div className="flex items-center gap-1 text-yellow-500 text-sm">
          <AlertTriangle className="h-4 w-4" />
          <span className="hidden sm:inline">Contracts not deployed</span>
        </div>
      )}

      {/* Show network warning */}
      {isConnected && !isCorrectChain && (
        <Button
          onClick={handleSwitchToAmoy}
          variant="destructive"
          size="sm"
          className="text-xs"
        >
          <AlertCircle className="mr-1 h-3 w-3" />
          Switch to Amoy
        </Button>
      )}

      {/* Not connected */}
      {!isConnected && (
        <Button
          onClick={handleConnect}
          disabled={isPending}
          className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold"
        >
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Connecting...
            </>
          ) : (
            <>
              <Wallet className="mr-2 h-4 w-4" />
              Connect Wallet
            </>
          )}
        </Button>
      )}

      {/* Connected */}
      {isConnected && address && (
        <div className="flex items-center gap-2">
          {/* Network indicator */}
          <div className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-muted border border-border text-sm">
            {isCorrectChain ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : (
              <AlertCircle className="h-4 w-4 text-yellow-500" />
            )}
            <span className="hidden sm:inline">{isAmoy ? 'Amoy' : isPolygon ? 'Polygon' : chain?.name || 'Unknown'}</span>
          </div>

          {/* Address */}
          <div className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-muted border border-border text-sm">
            <Wallet className="h-4 w-4 text-purple-400" />
            <span>{formatAddress(address)}</span>
          </div>

          {/* Disconnect button */}
          <Button
            onClick={() => disconnect()}
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
