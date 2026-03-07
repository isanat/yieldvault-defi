'use client';

import { useAccount, useBalance, useConnect, useDisconnect, useSwitchChain } from 'wagmi';
import { useEffect, useState } from 'react';
import { formatUnits } from 'viem';
import { X, Wallet, ChevronRight } from 'lucide-react';

const POLYGON_CHAIN_ID = 137;
const USDT_ADDRESS = '0xc2132D05D31c914a87C6611C10748AEb04B58e8F' as `0x${string}`;

// MetaMask SVG Icon
const MetaMaskIcon = () => (
  <svg width="32" height="32" viewBox="0 0 40 40" fill="none">
    <path d="M36.4 3L22 14l2.7-6.3L36.4 3z" fill="#E2761B" stroke="#E2761B" strokeWidth=".3"/>
    <path d="M3.6 3l14.3 11.1-2.6-6.4L3.6 3z" fill="#E4761B" stroke="#E4761B" strokeWidth=".3"/>
    <path d="M31.5 26.7l-3.8 5.8 8.2 2.3 2.3-8-6.7-.1z" fill="#E4761B" stroke="#E4761B" strokeWidth=".3"/>
    <path d="M1.8 26.8l2.3 8 8.2-2.3-3.8-5.8-6.7.1z" fill="#E4761B" stroke="#E4761B" strokeWidth=".3"/>
    <path d="M11.7 17.7l-2.3 3.4 8.1.4-.3-8.7-5.5 4.9z" fill="#E4761B" stroke="#E4761B" strokeWidth=".3"/>
    <path d="M28.3 17.7l-5.6-5-.2 8.8 8.1-.4-2.3-3.4z" fill="#E4761B" stroke="#E4761B" strokeWidth=".3"/>
    <path d="M12.3 32.5l4.9-2.4-4.2-3.3-.7 5.7z" fill="#E4761B" stroke="#E4761B" strokeWidth=".3"/>
    <path d="M22.8 30.1l4.9 2.4-.7-5.7-4.2 3.3z" fill="#E4761B" stroke="#E4761B" strokeWidth=".3"/>
    <path d="M27.7 32.5l-4.9-2.4.4 3.5 0 1.5 4.5-2.6z" fill="#D7C1B3" stroke="#D7C1B3" strokeWidth=".3"/>
    <path d="M12.3 32.5l4.5 2.6 0-1.5.4-3.5-4.9 2.4z" fill="#D7C1B3" stroke="#D7C1B3" strokeWidth=".3"/>
    <path d="M16.9 24.4l-4.1-1.2 2.9-1.3 1.2 2.5z" fill="#233447" stroke="#233447" strokeWidth=".3"/>
    <path d="M23.1 24.4l1.2-2.5 2.9 1.3-4.1 1.2z" fill="#233447" stroke="#233447" strokeWidth=".3"/>
    <path d="M12.3 32.5l.7-5.8-4.5.1 3.8 5.7z" fill="#CD6116" stroke="#CD6116" strokeWidth=".3"/>
    <path d="M27 26.7l.7 5.8 3.8-5.7-4.5-.1z" fill="#CD6116" stroke="#CD6116" strokeWidth=".3"/>
    <path d="M30.3 21.1l-8.1.4.8 4.2 1.2-2.5 2.9 1.3 3.2-3.4z" fill="#CD6116" stroke="#CD6116" strokeWidth=".3"/>
    <path d="M12.8 24.5l2.9-1.3 1.2 2.5.8-4.2-8.1-.4 3.2 3.4z" fill="#CD6116" stroke="#CD6116" strokeWidth=".3"/>
    <path d="M18.7 21.5l-.8 4.2.6 8.9 0-4.7h5l0 4.7.6-8.9-.8-4.2h-4.6z" fill="#E4751F" stroke="#E4751F" strokeWidth=".3"/>
  </svg>
);

// WalletConnect SVG Icon
const WalletConnectIcon = () => (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
    <rect width="32" height="32" rx="8" fill="#3B99FC"/>
    <path d="M9.5 12.5c3.5-3.5 9.2-3.5 12.7 0l.4.4a.5.5 0 010 .7l-1.5 1.5a.3.3 0 01-.4 0l-.6-.5c-2.4-2.4-6.3-2.4-8.7 0l-.6.6a.3.3 0 01-.4 0l-1.5-1.5a.5.5 0 010-.7l.6-.5zm15.7 3c1.8 1.8 1.8 4.8 0 6.7l-1.6 1.6a.4.4 0 01-.5 0l-1.5-1.5a.4.4 0 010-.5l1.6-1.6c1-1 1-2.5 0-3.5l-1.6-1.6a.4.4 0 010-.5l1.5-1.5a.4.4 0 01.5 0l1.6 1.6zm-6.3 6.2l-1.5 1.5a.4.4 0 01-.5 0l-1.6-1.6c-1-1-1-2.5 0-3.5l1.6-1.6a.4.4 0 01.5 0l1.5 1.5a.4.4 0 010 .5l-1.2 1.2a.2.2 0 000 .2l1.2 1.3a.4.4 0 010 .5zm-6.5-6.2c1.8-1.8 4.8-1.8 6.6 0l.4.4a.5.5 0 010 .7l-1.5 1.5a.3.3 0 01-.4 0l-.5-.5c-1-1-2.5-1-3.5 0l-.5.5a.3.3 0 01-.4 0l-1.5-1.5a.5.5 0 010-.7l.7-.4z" fill="white"/>
  </svg>
);

export function SimpleWalletConnect() {
  const { address, isConnected, chain } = useAccount();
  const { connectors, connect, isPending, error } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChainAsync } = useSwitchChain();
  
  // Read USDT balance
  const { data: usdtBalance, refetch: refetchBalance, isLoading, error: balanceError } = useBalance({
    address,
    token: USDT_ADDRESS,
    query: {
      enabled: !!address && isConnected,
    },
  });

  const [showModal, setShowModal] = useState(false);
  const isCorrectChain = chain?.id === POLYGON_CHAIN_ID;

  // Refetch balance when chain or address changes
  useEffect(() => {
    if (address && isCorrectChain) {
      refetchBalance();
    }
  }, [address, isCorrectChain, refetchBalance]);

  // Debug logging
  useEffect(() => {
    console.log('Wallet State:', { 
      isConnected, 
      address, 
      chainId: chain?.id, 
      isCorrectChain,
      usdtBalance: usdtBalance ? {
        value: usdtBalance.value.toString(),
        decimals: usdtBalance.decimals,
        formatted: formatUnits(usdtBalance.value, usdtBalance.decimals)
      } : null,
      isLoading,
      balanceError
    });
    if (error) {
      console.error('Connection error:', error);
    }
    if (balanceError) {
      console.error('Balance error:', balanceError);
    }
  }, [isConnected, address, chain, error, usdtBalance, isLoading, balanceError]);

  const handleConnect = (connectorId: string) => {
    const connector = connectors.find(c => c.id === connectorId);
    if (connector) {
      connect({ connector });
      setShowModal(false);
    }
  };

  const handleSwitchNetwork = async () => {
    try {
      await switchChainAsync?.({ chainId: POLYGON_CHAIN_ID });
    } catch (err) {
      console.error('Failed to switch network:', err);
    }
  };

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const getConnectorIcon = (connectorId: string) => {
    if (connectorId.includes('metaMask') || connectorId.includes('injected')) {
      return <MetaMaskIcon />;
    }
    if (connectorId.includes('walletConnect')) {
      return <WalletConnectIcon />;
    }
    return <Wallet className="w-8 h-8 text-gray-400" />;
  };

  const getConnectorLabel = (connector: { id: string; name: string }) => {
    if (connector.id.includes('injected') || connector.name === 'Injected') {
      return 'MetaMask';
    }
    return connector.name;
  };

  const getConnectorSublabel = (connectorId: string) => {
    if (connectorId.includes('injected')) {
      return 'Browser Extension';
    }
    if (connectorId.includes('walletConnect')) {
      return 'Mobile Wallet';
    }
    return connectorId;
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

        {/* Modal - Desktop and Mobile */}
        {showModal && (
          <div 
            className="fixed inset-0 flex items-center justify-center z-50 p-4"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.85)' }}
            onClick={() => setShowModal(false)}
          >
            <div 
              className="rounded-2xl p-0 w-full max-w-[400px] overflow-hidden shadow-2xl"
              style={{ backgroundColor: '#0f172a' }}
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-6 relative">
                <h3 className="text-xl font-bold text-white">Connect Wallet</h3>
                <p className="text-purple-100 text-sm mt-1">Choose a wallet to connect to YieldVault</p>
                <button
                  onClick={() => setShowModal(false)}
                  className="absolute right-4 top-4 text-white/70 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Wallet Options */}
              <div className="p-6 space-y-3">
                {connectors.map((connector) => (
                  <button
                    key={connector.id}
                    onClick={() => handleConnect(connector.id)}
                    disabled={isPending}
                    className="w-full flex items-center gap-4 p-4 rounded-xl border transition-all duration-200 group disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ 
                      backgroundColor: 'rgba(30, 41, 59, 0.5)',
                      borderColor: 'rgba(71, 85, 105, 0.5)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(30, 41, 59, 1)';
                      e.currentTarget.style.borderColor = 'rgba(100, 116, 139, 0.5)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(30, 41, 59, 0.5)';
                      e.currentTarget.style.borderColor = 'rgba(71, 85, 105, 0.5)';
                    }}
                  >
                    {getConnectorIcon(connector.id)}
                    <div className="flex-1 text-left">
                      <div className="font-medium text-white">{getConnectorLabel(connector)}</div>
                      <div className="text-xs text-slate-400">{getConnectorSublabel(connector.id)}</div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-white transition-colors" />
                  </button>
                ))}

                {error && (
                  <div className="p-3 rounded-lg text-sm" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.5)', color: '#f87171' }}>
                    {error.message}
                  </div>
                )}

                {/* Help Text */}
                <div className="pt-4 text-center">
                  <p className="text-xs text-slate-500">
                    New to Web3?{' '}
                    <a
                      href="https://metamask.io/download/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-purple-400 hover:text-purple-300 underline"
                    >
                      Install MetaMask
                    </a>
                  </p>
                </div>
              </div>
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
          Switch to Polygon
        </button>
      )}

      {/* USDT Balance - show on Polygon network */}
      {isCorrectChain && (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20">
          {isLoading ? (
            <span className="text-green-400 font-medium">Loading...</span>
          ) : usdtBalance ? (
            <span className="text-green-400 font-medium">
              {parseFloat(formatUnits(usdtBalance.value, usdtBalance.decimals)).toLocaleString()} USDT
            </span>
          ) : (
            <span className="text-green-400 font-medium">0 USDT</span>
          )}
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
