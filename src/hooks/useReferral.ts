'use client';

import { useState, useEffect, useCallback } from 'react';

interface ReferralStats {
  totalReferrals: number;
  activeReferrals: number;
  totalReferredVolume: number;
  totalCommissions: number;
  pendingCommissions: number;
  levelBreakdown: LevelStats[];
}

interface LevelStats {
  level: number;
  count: number;
  volume: number;
  activeCount: number;
  commissionRate: number;
}

interface ReferralTreeNode {
  address: string;
  level: number;
  totalDeposited: number;
  totalCommissions: number;
  joinedAt: string;
  children: ReferralTreeNode[];
}

interface Commission {
  id: string;
  level: number;
  commissionType: string;
  amount: number;
  status: string;
  timestamp: string;
}

// Mock data generator
function generateMockStats(): ReferralStats {
  return {
    totalReferrals: 47,
    activeReferrals: 32,
    totalReferredVolume: 125000,
    totalCommissions: 2450.75,
    pendingCommissions: 325.50,
    levelBreakdown: [
      { level: 1, count: 12, volume: 45000, activeCount: 9, commissionRate: 40 },
      { level: 2, count: 15, volume: 38000, activeCount: 10, commissionRate: 25 },
      { level: 3, count: 8, volume: 22000, activeCount: 6, commissionRate: 15 },
      { level: 4, count: 7, volume: 12000, activeCount: 4, commissionRate: 12 },
      { level: 5, count: 5, volume: 8000, activeCount: 3, commissionRate: 8 },
    ],
  };
}

function generateMockTree(): ReferralTreeNode {
  return {
    address: '0x1234567890abcdef1234567890abcdef12345678',
    level: 0,
    totalDeposited: 5000,
    totalCommissions: 2450.75,
    joinedAt: new Date(Date.now() - 30 * 86400000).toISOString(),
    children: [
      {
        address: '0xabcdef1234567890abcdef1234567890abcdef12',
        level: 1,
        totalDeposited: 3500,
        totalCommissions: 450.20,
        joinedAt: new Date(Date.now() - 25 * 86400000).toISOString(),
        children: [
          {
            address: '0x1111111111111111111111111111111111111111',
            level: 2,
            totalDeposited: 2000,
            totalCommissions: 125.50,
            joinedAt: new Date(Date.now() - 20 * 86400000).toISOString(),
            children: [],
          },
        ],
      },
      {
        address: '0x2222222222222222222222222222222222222222',
        level: 1,
        totalDeposited: 2500,
        totalCommissions: 320.80,
        joinedAt: new Date(Date.now() - 22 * 86400000).toISOString(),
        children: [],
      },
      {
        address: '0x3333333333333333333333333333333333333333',
        level: 1,
        totalDeposited: 1800,
        totalCommissions: 195.30,
        joinedAt: new Date(Date.now() - 18 * 86400000).toISOString(),
        children: [],
      },
    ],
  };
}

export function useReferral(address: string | null) {
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [tree, setTree] = useState<ReferralTreeNode | null>(null);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);

  const fetchData = useCallback(async () => {
    if (!address) {
      setStats(null);
      setTree(null);
      setCommissions([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Fetch from API
      const [statsRes, treeRes] = await Promise.all([
        fetch(`/api/referral?address=${address}`),
        fetch(`/api/referral?address=${address}&tree=true&depth=3`),
      ]);

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        if (statsData.success) {
          setStats(statsData.data.stats);
        } else {
          setStats(generateMockStats());
        }
      } else {
        setStats(generateMockStats());
      }

      if (treeRes.ok) {
        const treeData = await treeRes.json();
        if (treeData.success) {
          setTree(treeData.data.tree);
        } else {
          setTree(generateMockTree());
        }
      } else {
        setTree(generateMockTree());
      }

      // Mock commissions
      setCommissions([
        {
          id: '1',
          level: 1,
          commissionType: 'deposit',
          amount: 25.50,
          status: 'pending',
          timestamp: new Date(Date.now() - 86400000).toISOString(),
        },
        {
          id: '2',
          level: 2,
          commissionType: 'interest',
          amount: 12.75,
          status: 'claimed',
          timestamp: new Date(Date.now() - 2 * 86400000).toISOString(),
        },
      ]);
    } catch (err) {
      console.error('Referral fetch error:', err);
      setStats(generateMockStats());
      setTree(generateMockTree());
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const claimCommissions = useCallback(async () => {
    if (!address || claiming) return { success: false };

    setClaiming(true);
    try {
      const response = await fetch('/api/referral', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'claim',
          userAddress: address,
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        // Refresh data
        await fetchData();
        return { success: true, amount: result.data.amount };
      }
      
      return { success: false };
    } catch (err) {
      console.error('Claim error:', err);
      return { success: false };
    } finally {
      setClaiming(false);
    }
  }, [address, claiming, fetchData]);

  const registerReferrer = useCallback(async (referrerAddress: string) => {
    if (!address) return { success: false };

    try {
      const response = await fetch('/api/referral', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'register',
          userAddress: address,
          referrerAddress,
        }),
      });

      const result = await response.json();
      return { success: result.success };
    } catch (err) {
      console.error('Register referrer error:', err);
      return { success: false };
    }
  }, [address]);

  return {
    stats,
    tree,
    commissions,
    loading,
    claiming,
    claimCommissions,
    registerReferrer,
    refresh: fetchData,
  };
}

export default useReferral;
