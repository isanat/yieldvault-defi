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

export function useReferral(address: string | null) {
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [tree, setTree] = useState<ReferralTreeNode | null>(null);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
      setError(null);
      
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
          setError(statsData.error || 'Failed to load referral stats');
        }
      }

      if (treeRes.ok) {
        const treeData = await treeRes.json();
        if (treeData.success) {
          setTree(treeData.data.tree);
        }
      }

      // Fetch commissions list
      const commissionsRes = await fetch(`/api/referral?address=${address}&commissions=true`);
      if (commissionsRes.ok) {
        const commissionsData = await commissionsRes.json();
        if (commissionsData.success) {
          setCommissions(commissionsData.data.commissions || []);
        }
      }
    } catch (err) {
      console.error('Referral fetch error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const claimCommissions = useCallback(async () => {
    if (!address || claiming) return { success: false, error: 'Cannot claim' };

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
      
      return { success: false, error: result.error };
    } catch (err) {
      console.error('Claim error:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
    } finally {
      setClaiming(false);
    }
  }, [address, claiming, fetchData]);

  const registerReferrer = useCallback(async (referrerAddress: string) => {
    if (!address) return { success: false, error: 'No address connected' };

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
      if (result.success) {
        await fetchData();
      }
      return { success: result.success, error: result.error };
    } catch (err) {
      console.error('Register referrer error:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
    }
  }, [address, fetchData]);

  return {
    stats,
    tree,
    commissions,
    loading,
    error,
    claiming,
    claimCommissions,
    registerReferrer,
    refresh: fetchData,
  };
}

export default useReferral;
