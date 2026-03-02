'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface WalletContextType {
  address: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  chainId: number | null;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

// Simulated wallet for demo (in production, use wagmi/rainbowkit)
const STORAGE_KEY = 'defi_vault_wallet';

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [chainId, setChainId] = useState<number | null>(null);

  // Load wallet from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const data = JSON.parse(stored);
        setAddress(data.address);
        setChainId(data.chainId || 137); // Default to Polygon
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  const connect = useCallback(async () => {
    setIsConnecting(true);
    
    try {
      // Simulate wallet connection delay
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      // Generate a random address for demo
      // In production, this would use window.ethereum.request
      const randomAddress = '0x' + Array.from({ length: 40 }, () => 
        Math.floor(Math.random() * 16).toString(16)
      ).join('');
      
      const walletData = {
        address: randomAddress,
        chainId: 137, // Polygon
      };
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(walletData));
      setAddress(randomAddress);
      setChainId(137);
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      throw error;
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setAddress(null);
    setChainId(null);
  }, []);

  return (
    <WalletContext.Provider
      value={{
        address,
        isConnected: !!address,
        isConnecting,
        connect,
        disconnect,
        chainId,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}
