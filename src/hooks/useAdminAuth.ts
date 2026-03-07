'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';

// Admin addresses - case insensitive comparison
const ADMIN_ADDRESSES = [
  '0x013a76C9CfFD56DA842b97bF7AC1Bc3C05269C42', // Owner address (case preserved)
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
      setIsAdmin(true);
    }
    
    setIsLoading(false);
  }, []);

  useEffect(() => {
    // Check if address is in admin list
    if (address && !adminApiKey) {
      const isAddressAdmin = ADMIN_ADDRESSES.includes(address.toLowerCase());
      console.log('Admin check:', {
        address: address.toLowerCase(),
        adminAddresses: ADMIN_ADDRESSES,
        isAdmin: isAddressAdmin
      });
      setIsAdmin(isAddressAdmin);
    }
  }, [address, adminApiKey]);

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
