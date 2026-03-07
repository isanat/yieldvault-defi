'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';

const ADMIN_ADDRESSES = [
  '0x013a76c9cffd56da842b97bf7ac1bc3c05269c42', // Owner address
].map(a => a.toLowerCase());

export function useAdminAuth() {
  const { address, isConnected } = useAccount();
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminApiKey, setAdminApiKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check localStorage for API key
    const storedKey = localStorage.getItem('adminApiKey');
    if (storedKey) {
      setAdminApiKey(storedKey);
    }
    
    setIsLoading(false);
  }, []);

  useEffect(() => {
    // Check if address is in admin list
    if (address) {
      setIsAdmin(ADMIN_ADDRESSES.includes(address.toLowerCase()));
    }
  }, [address]);

  const setApiKey = (key: string) => {
    localStorage.setItem('adminApiKey', key);
    setAdminApiKey(key);
    setIsAdmin(true);
  };

  const clearApiKey = () => {
    localStorage.removeItem('adminApiKey');
    setAdminApiKey(null);
    setIsAdmin(false);
  };

  const getAuthHeaders = () => {
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
