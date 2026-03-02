'use client';

import React from 'react';
import { ConnectButton as RainbowConnectButton } from '@rainbow-me/rainbowkit';
import { useWallet } from '@/contexts/WalletContext';
import { areContractsDeployed } from '@/lib/contracts';
import { Button } from '@/components/ui/button';
import { Wallet, Loader2, CheckCircle, AlertCircle, AlertTriangle } from 'lucide-react';

export function ConnectButton() {
  const { isConnected, isConnecting, isCorrectChain, isMumbai, switchToMumbai } = useWallet();
  const contractsDeployed = areContractsDeployed();

  return (
    <div className="flex items-center gap-2">
      {/* Show warning if contracts not deployed */}
      {isConnected && !contractsDeployed && (
        <div className="flex items-center gap-1 text-yellow-500 text-sm">
          <AlertTriangle className="h-4 w-4" />
          <span>Contracts not deployed</span>
        </div>
      )}
      
      {/* Show network warning */}
      {isConnected && !isCorrectChain && (
        <Button
          onClick={() => switchToMumbai()}
          variant="destructive"
          size="sm"
          className="text-xs"
        >
          <AlertCircle className="mr-1 h-3 w-3" />
          Switch to Mumbai
        </Button>
      )}

      {/* RainbowKit Connect Button */}
      <RainbowConnectButton.Custom>
        {({
          account,
          chain,
          openAccountModal,
          openChainModal,
          openConnectModal,
          mounted,
        }) => {
          const ready = mounted;
          const connected = isConnected && account;

          return (
            <div
              {...(!ready && {
                'aria-hidden': true,
                style: {
                  opacity: 0,
                  pointerEvents: 'none',
                  userSelect: 'none',
                },
              })}
            >
              {(() => {
                if (!connected) {
                  return (
                    <Button
                      onClick={openConnectModal}
                      disabled={isConnecting}
                      className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-all"
                    >
                      {isConnecting ? (
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
                  );
                }

                if (chain?.unsupported) {
                  return (
                    <Button
                      onClick={openChainModal}
                      variant="destructive"
                      className="font-semibold py-2 px-4 rounded-lg"
                    >
                      <AlertCircle className="mr-2 h-4 w-4" />
                      Wrong Network
                    </Button>
                  );
                }

                return (
                  <div className="flex gap-2">
                    <Button
                      onClick={openChainModal}
                      variant="outline"
                      size="sm"
                      className="border-purple-500/50 hover:bg-purple-500/10"
                    >
                      {isCorrectChain ? (
                        <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                      ) : (
                        <AlertCircle className="mr-2 h-4 w-4 text-yellow-500" />
                      )}
                      {chain?.name || (isMumbai ? 'Mumbai' : 'Unknown')}
                    </Button>
                    <Button
                      onClick={openAccountModal}
                      variant="outline"
                      size="sm"
                      className="border-purple-500/50 hover:bg-purple-500/10"
                    >
                      <Wallet className="mr-2 h-4 w-4" />
                      {account.displayName}
                    </Button>
                  </div>
                );
              })()}
            </div>
          );
        }}
      </RainbowConnectButton.Custom>
    </div>
  );
}
