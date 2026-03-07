'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';

// Owner address from deployment - Polygon Mainnet
const OWNER_ADDRESS = '0x013a76C9CfFD56DA842b97bF7AC1Bc3C05269C42'.toLowerCase();

export function useAdminAuth() {
  const { address, isConnected } = useAccount();
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminApiKey, setAdminApiKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check localStorage for API key
    try {
      const storedKey = localStorage.getItem('adminApiKey');
      if (storedKey) {
        setAdminApiKey(storedKey);
        setIsAdmin(true);
      }
    } catch (e) {
      console.error('Error reading localStorage:', e);
    }
    
    setIsLoading(false);
  }, []);

  useEffect(() => {
    // Check if connected address matches owner
    if (address && isConnected) {
      const isOwner = address.toLowerCase() === OWNER_ADDRESS;
      console.log('Admin auth check:', {
        connectedAddress: address.toLowerCase(),
        ownerAddress: OWNER_ADDRESS,
        isMatch: isOwner,
        hasApiKey: !!adminApiKey
      });
      
      // If no API key set, check address
      if (!adminApiKey) {
        setIsAdmin(isOwner);
      }
    }
  }, [address, isConnected, adminApiKey]);

  const setApiKey = (key: string) => {
    try {
      localStorage.setItem('adminApiKey', key);
      setAdminApiKey(key);
      setIsAdmin(true);
    } catch (e) {
      console.error('Error saving to localStorage:', e);
    }
  };

  const clearApiKey = () => {
    try {
      localStorage.removeItem('adminApiKey');
      setAdminApiKey(null);
      setIsAdmin(false);
    } catch (e) {
      console.error('Error clearing localStorage:', e);
    }
  };

  const getAuthHeaders = (): Record<string, string> => {
    if (adminApiKey) {
      return { Authorization: `Bearer ${adminApiKey}` };
    }
    if (address) {
      return { Authorization: `Bearer ${address}` };
    }
    return {};
  };

  return {
    isAdmin,
    isLoading,
    adminApiKey,
    setApiKey,
    clearApiKey,
    getAuthHeaders,
  };
}
