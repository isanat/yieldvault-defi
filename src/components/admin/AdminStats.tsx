'use client';

import { useState, useEffect } from 'react';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { Loader2, Users, DollarSign, TrendingUp, Activity, Wallet, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface Stats {
  totalUsers: number;
  totalDeposits: number;
  totalWithdrawals: number;
  totalVolume: number;
  totalHarvests: number;
  totalFeesCollected: number;
  avgDepositSize: number;
  activeUsers24h: number;
}

const formatNumber = (num: number, decimals = 2) => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(decimals) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(decimals) + 'K';
  }
  return num.toFixed(decimals);
};

const formatUSD = (num: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
};

export function AdminStats() {
  const { getAuthHeaders } = useAdminAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin', {
        headers: getAuthHeaders(),
      });
      
      const result = await response.json();
      
      if (result.success) {
        setStats(result.data);
        setError(null);
      } else {
        setError(result.error || 'Failed to fetch stats');
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
      setError('Failed to fetch statistics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-center">
        <p className="text-red-400">{error}</p>
        <button
          onClick={fetchStats}
          className="mt-4 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  if (!stats) return null;

  const statsCards = [
    {
      title: 'Total Usuários',
      value: formatNumber(stats.totalUsers, 0),
      subValue: `${stats.activeUsers24h} ativos 24h`,
      icon: Users,
      color: 'from-blue-500 to-cyan-500',
      trend: 'up' as const,
    },
    {
      title: 'Total Depósitos',
      value: formatUSD(stats.totalDeposits),
      subValue: `Média: ${formatUSD(stats.avgDepositSize)}`,
      icon: ArrowDownRight,
      color: 'from-green-500 to-emerald-500',
      trend: 'up' as const,
    },
    {
      title: 'Total Saques',
      value: formatUSD(stats.totalWithdrawals),
      subValue: 'Total processado',
      icon: ArrowUpRight,
      color: 'from-orange-500 to-amber-500',
      trend: 'down' as const,
    },
    {
      title: 'Volume Total',
      value: formatUSD(stats.totalVolume),
      subValue: 'Depósitos + Saques',
      icon: DollarSign,
      color: 'from-purple-500 to-pink-500',
    },
    {
      title: 'Harvests',
      value: formatUSD(stats.totalHarvests),
      subValue: 'Lucros realizados',
      icon: TrendingUp,
      color: 'from-cyan-500 to-blue-500',
    },
    {
      title: 'Taxas Coletadas',
      value: formatUSD(stats.totalFeesCollected),
      subValue: 'Receita da plataforma',
      icon: Activity,
      color: 'from-yellow-500 to-orange-500',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Dashboard</h2>
        <button
          onClick={fetchStats}
          className="px-4 py-2 bg-slate-700/50 hover:bg-slate-700 text-gray-300 rounded-lg transition-colors flex items-center gap-2"
        >
          <Activity className="w-4 h-4" />
          Atualizar
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {statsCards.map((stat, index) => (
          <div
            key={index}
            className="bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700 p-6 hover:border-slate-600 transition-colors"
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`p-3 rounded-lg bg-gradient-to-r ${stat.color}`}>
                <stat.icon className="w-5 h-5 text-white" />
              </div>
              {stat.trend && (
                <span className={`text-xs px-2 py-1 rounded-full ${
                  stat.trend === 'up' 
                    ? 'bg-green-500/20 text-green-400' 
                    : 'bg-red-500/20 text-red-400'
                }`}>
                  {stat.trend === 'up' ? '↑' : '↓'}
                </span>
              )}
            </div>
            <h3 className="text-gray-400 text-sm mb-1">{stat.title}</h3>
            <p className="text-2xl font-bold text-white">{stat.value}</p>
            <p className="text-sm text-gray-500 mt-1">{stat.subValue}</p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Ações Rápidas</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button className="p-4 bg-slate-700/50 hover:bg-slate-700 rounded-xl text-center transition-colors">
            <Wallet className="w-6 h-6 text-green-400 mx-auto mb-2" />
            <span className="text-gray-300 text-sm">Ver Todos Usuários</span>
          </button>
          <button className="p-4 bg-slate-700/50 hover:bg-slate-700 rounded-xl text-center transition-colors">
            <DollarSign className="w-6 h-6 text-blue-400 mx-auto mb-2" />
            <span className="text-gray-300 text-sm">Ver Transações</span>
          </button>
          <button className="p-4 bg-slate-700/50 hover:bg-slate-700 rounded-xl text-center transition-colors">
            <TrendingUp className="w-6 h-6 text-purple-400 mx-auto mb-2" />
            <span className="text-gray-300 text-sm">Executar Harvest</span>
          </button>
          <button className="p-4 bg-slate-700/50 hover:bg-slate-700 rounded-xl text-center transition-colors">
            <Activity className="w-6 h-6 text-orange-400 mx-auto mb-2" />
            <span className="text-gray-300 text-sm">Ver Relatórios</span>
          </button>
        </div>
      </div>
    </div>
  );
}
