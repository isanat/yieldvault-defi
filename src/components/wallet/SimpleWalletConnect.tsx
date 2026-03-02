'use client';

import { useAccount, useBalance, useConnect, useDisconnect, useSwitchChain } from 'wagmi';
import { useEffect, useState } from 'react';
import { formatUnits } from 'viem';

const AMOY_CHAIN_ID = 80002;
const USDT_ADDRESS = '0x1E7C689D2da8DCc87bB4E1E4f8650551bd538719' as `0x${string}`;

const ERC20_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
] as const;

export function SimpleWalletConnect() {
  const { address, isConnected, chain } = useAccount();
  const { connectors, connect, isPending, error } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChainAsync } = useSwitchChain();
  
  // Read USDT balance
  const { data: usdtBalance, refetch: refetchBalance } = useBalance({
    address,
    token: USDT_ADDRESS,
    query: {
      enabled: !!address && isConnected,
    },
  });

  const [showModal, setShowModal] = useState(false);
  const isCorrectChain = chain?.id === AMOY_CHAIN_ID;

  // Debug logging
  useEffect(() => {
    console.log('Wallet State:', { isConnected, address, chainId: chain?.id, isCorrectChain });
    if (error) {
      console.error('Connection error:', error);
    }
  }, [isConnected, address, chain, error]);

  const handleConnect = (connectorId: string) => {
    const connector = connectors.find(c => c.id === connectorId);
    if (connector) {
      connect({ connector });
      setShowModal(false);
    }
  };

  const handleSwitchNetwork = async () => {
    try {
      await switchChainAsync?.({ chainId: AMOY_CHAIN_ID });
    } catch (err) {
      console.error('Failed to switch network:', err);
    }
  };

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  if (!isConnected) {
    return (
      <>
        <button
          onClick={() => setShowModal(true)}
          disabled={isPending}
          className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-all disabled:opacity-50"
        >
          {isPending ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Connecting...
            </span>
          ) : (
            'Connect Wallet'
          )}
        </button>

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowModal(false)}>
            <div className="bg-card border border-border rounded-xl p-6 max-w-sm w-full mx-4" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-bold mb-4">Connect Wallet</h3>
              <div className="space-y-3">
                {connectors.map((connector) => (
                  <button
                    key={connector.id}
                    onClick={() => handleConnect(connector.id)}
                    className="w-full p-3 bg-muted hover:bg-muted/80 rounded-lg text-left transition-colors"
                  >
                    <div className="font-medium">{connector.name}</div>
                    <div className="text-xs text-muted-foreground">{connector.id}</div>
                  </button>
                ))}
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="mt-4 w-full p-2 text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {/* Network warning */}
      {!isCorrectChain && (
        <button
          onClick={handleSwitchNetwork}
          className="text-xs text-yellow-500 bg-yellow-500/10 px-3 py-1.5 rounded-lg hover:bg-yellow-500/20"
        >
          Switch to Amoy
        </button>
      )}

      {/* USDT Balance */}
      {isCorrectChain && usdtBalance && (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20">
          <span className="text-green-400 font-medium">
            {parseFloat(formatUnits(usdtBalance.value, usdtBalance.decimals)).toLocaleString()} USDT
          </span>
        </div>
      )}

      {/* Address */}
      <button
        onClick={() => disconnect()}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
        title="Click to disconnect"
      >
        <div className="w-2 h-2 rounded-full bg-green-500" />
        <span className="font-medium">{formatAddress(address!)}</span>
      </button>
    </div>
  );
}
