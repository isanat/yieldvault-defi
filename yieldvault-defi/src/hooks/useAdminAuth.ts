'use client';

import { useState, useCallback, useMemo } from 'react';
import { useAccount } from 'wagmi';

// Owner address from deployment - Polygon Mainnet
const OWNER_ADDRESS = '0x013a76C9CfFD56DA842b97bF7AC1Bc3C05269C42'.toLowerCase();

// Helper function to get initial state from localStorage
function getStoredApiKey(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    return localStorage.getItem('adminApiKey');
  } catch (e) {
    console.error('Error reading localStorage:', e);
    return null;
  }
}

export function useAdminAuth() {
  const { address, isConnected } = useAccount();
  
  // Store API key state
  const [adminApiKey, setAdminApiKeyState] = useState<string | null>(getStoredApiKey);

  // Calculate isAdmin directly from state
  const isAdmin = useMemo(() => {
    // If we have a stored API key, we're admin
    if (adminApiKey) {
      return true;
    }
    // If connected address matches owner, we're admin
    if (address && isConnected) {
      const isOwner = address.toLowerCase() === OWNER_ADDRESS;
      console.log('Admin auth check:', {
        connectedAddress: address.toLowerCase(),
        ownerAddress: OWNER_ADDRESS,
        isMatch: isOwner,
      });
      return isOwner;
    }
    return false;
  }, [adminApiKey, address, isConnected]);

  const setApiKey = useCallback((key: string) => {
    try {
      localStorage.setItem('adminApiKey', key);
      setAdminApiKeyState(key);
    } catch (e) {
      console.error('Error saving to localStorage:', e);
    }
  }, []);

  const clearApiKey = useCallback(() => {
    try {
      localStorage.removeItem('adminApiKey');
      setAdminApiKeyState(null);
    } catch (e) {
      console.error('Error clearing localStorage:', e);
    }
  }, []);

  const getAuthHeaders = useCallback((): Record<string, string> => {
    if (adminApiKey) {
      return { Authorization: `Bearer ${adminApiKey}` };
    }
    if (address) {
      return { Authorization: `Bearer ${address}` };
    }
    return {};
  }, [adminApiKey, address]);

  return {
    isAdmin,
    isLoading: false,
    adminApiKey,
    setApiKey,
    clearApiKey,
    getAuthHeaders,
  };
}
