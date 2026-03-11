'use client'

import { useAccount, useConnect, useDisconnect, useBalance, useChainId } from 'wagmi'
import { polygon } from 'wagmi/chains'
import { useCallback, useSyncExternalStore } from 'react'

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
  const isMounted = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  // Get MATIC balance
  const { data: balanceData } = useBalance({
    address: account.address,
    chainId: polygon.id,
  })

  // Check if on correct network (Polygon Mainnet = 137)
  const isCorrectNetwork = chainId === polygon.id

  const switchToPolygon = useCallback(async () => {
    if (typeof window !== 'undefined' && window.ethereum) {
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x89' }], // Polygon Mainnet
        })
      } catch (switchError: unknown) {
        const error = switchError as { code?: number }
        // Chain not added to wallet
        if (error.code === 4902) {
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
  }, [])

  const handleConnect = useCallback(() => {
    // Find injected connector (MetaMask, etc.)
    const injected = connectors.find(c => c.id === 'injected' || c.id === 'metaMask')
    if (injected) {
      connect({ connector: injected })
    } else if (connectors.length > 0) {
      connect({ connector: connectors[0] })
    }
  }, [connect, connectors])

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
    }
  }
}

export default useWallet
