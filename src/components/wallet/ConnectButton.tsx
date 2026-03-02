'use client';

import React from 'react';
import { ConnectButton as RainbowConnectButton } from '@rainbow-me/rainbowkit';
import { useWallet } from '@/contexts/WalletContext';
import { Button } from '@/components/ui/button';
import { Wallet, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

export function ConnectButton() {
  const { isConnected, isConnecting, isCorrectChain, switchToPolygon } = useWallet();

  return (
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
                    className="border-purple-500/50 hover:bg-purple-500/10"
                  >
                    {isCorrectChain ? (
                      <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                    ) : (
                      <AlertCircle className="mr-2 h-4 w-4 text-yellow-500" />
                    )}
                    {chain?.name || 'Unknown'}
                  </Button>
                  <Button
                    onClick={openAccountModal}
                    variant="outline"
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
  );
}
