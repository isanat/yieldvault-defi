'use client'

import { useAccount, useConnect, useDisconnect, useBalance, useChainId, useSwitchChain } from 'wagmi'
import { polygon } from 'wagmi/chains'
import { useCallback, useSyncExternalStore, useEffect } from 'react'

// Simple store for mounted state
let mounted = false
const listeners = new Set<() => void>()

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot() {
  return mounted
}

function getServerSnapshot() {
  return false
}

// Set mounted on client side
if (typeof window !== 'undefined') {
  mounted = true
  listeners.forEach(listener => listener())
}

export interface WalletData {
  address: `0x${string}` | undefined
  isConnected: boolean
  isConnecting: boolean
  isDisconnected: boolean
  chainId: number | undefined
  isCorrectNetwork: boolean
  balance: {
    value: bigint | undefined
    formatted: string
    symbol: string
  }
}

export interface WalletActions {
  connect: () => void
  disconnect: () => void
  switchToPolygon: () => Promise<void>
}

export function useWallet(): WalletData & WalletActions {
  const account = useAccount()
  const { connect, connectors, isPending: isConnecting } = useConnect()
  const { disconnect } = useDisconnect()
  const chainId = useChainId()
  const { switchChain } = useSwitchChain()
  const isMounted = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  // Get MATIC balance
  const { data: balanceData } = useBalance({
    address: account.address,
    chainId: polygon.id,
  })

  // Check if on correct network (Polygon Mainnet = 137)
  const isCorrectNetwork = chainId === polygon.id

  const switchToPolygon = useCallback(async () => {
    try {
      switchChain?.({ chainId: polygon.id })
    } catch (error) {
      console.error('Error switching to Polygon:', error)
      // Fallback to direct ethereum request
      if (typeof window !== 'undefined' && window.ethereum) {
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0x89' }], // Polygon Mainnet
          })
        } catch (switchError: unknown) {
          const err = switchError as { code?: number }
          // Chain not added to wallet
          if (err.code === 4902) {
            try {
              await window.ethereum.request({
                method: 'wallet_addEthereumChain',
                params: [{
                  chainId: '0x89',
                  chainName: 'Polygon Mainnet',
                  nativeCurrency: {
                    name: 'MATIC',
                    symbol: 'MATIC',
                    decimals: 18,
                  },
                  rpcUrls: ['https://polygon-rpc.com'],
                  blockExplorerUrls: ['https://polygonscan.com'],
                }],
              })
            } catch (addError) {
              console.error('Error adding Polygon network:', addError)
            }
          }
        }
      }
    }
  }, [switchChain])

  const handleConnect = useCallback(() => {
    // Check if MetaMask is installed
    if (typeof window !== 'undefined' && !window.ethereum) {
      console.error('No wallet extension found')
      // Open MetaMask download page
      window.open('https://metamask.io/download/', '_blank')
      return
    }

    // Find injected connector (MetaMask, etc.)
    const connector = connectors[0]
    if (connector) {
      connect({ connector })
    }
  }, [connect, connectors])

  // Auto-reconnect on mount
  useEffect(() => {
    if (isMounted && account.connector && !account.isConnected) {
      // Try to reconnect with the last used connector
      const lastConnector = connectors.find(c => c.id === account.connector?.id)
      if (lastConnector) {
        connect({ connector: lastConnector }).catch(() => {
          // Silently fail - user needs to manually connect
        })
      }
    }
  }, [isMounted]) // eslint-disable-line react-hooks/exhaustive-deps

  // Don't render wallet data until mounted (prevents hydration mismatch)
  if (!isMounted) {
    return {
      address: undefined,
      isConnected: false,
      isConnecting: false,
      isDisconnected: true,
      chainId: undefined,
      isCorrectNetwork: false,
      balance: {
        value: undefined,
        formatted: '0',
        symbol: 'MATIC',
      },
      connect: handleConnect,
      disconnect: () => disconnect(),
      switchToPolygon,
    }
  }

  return {
    address: account.address,
    isConnected: account.isConnected,
    isConnecting: isConnecting,
    isDisconnected: account.isDisconnected,
    chainId: account.chainId,
    isCorrectNetwork,
    balance: {
      value: balanceData?.value,
      formatted: balanceData?.formatted || '0',
      symbol: balanceData?.symbol || 'MATIC',
    },
    connect: handleConnect,
    disconnect: () => disconnect(),
    switchToPolygon,
  }
}

// Type declaration for window.ethereum
declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
      isMetaMask?: boolean
    }
  }
}

export default useWallet
