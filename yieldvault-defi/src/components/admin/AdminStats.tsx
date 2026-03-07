'use client';

import { useState, useEffect } from 'react';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { Loader2, Users, DollarSign, TrendingUp, Activity, Wallet, ArrowUpRight, ArrowDownRight, RefreshCw, ExternalLink } from 'lucide-react';

interface OnChainData {
  config: {
    performanceFeeBP: number;
    depositFeeBP: number;
    managementFeeBP: number;
    depositsEnabled: boolean;
    withdrawalsEnabled: boolean;
    harvestEnabled: boolean;
    treasury: string;
  };
  vault: {
    totalAssets: number;
    totalSupply: number;
    lastHarvestTimestamp: string | null;
    totalProfitHarvested: number;
    strategies: Array<{ address: string; allocation: number }>;
  };
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
  const [data, setData] = useState<OnChainData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/admin/onchain', {
        headers: getAuthHeaders(),
      });
      
      const result = await response.json();
      
      if (result.success) {
        setData(result.data);
      } else {
        setError(result.error || 'Erro ao carregar dados do blockchain');
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
      setError('Falha ao conectar com a API');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

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
          onClick={fetchData}
          className="mt-4 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  if (!data) return null;

  const statsCards = [
    {
      title: 'TVL Total',
      value: formatUSD(data.vault.totalAssets),
      subValue: 'Total Value Locked',
      icon: DollarSign,
      color: 'from-green-500 to-emerald-500',
    },
    {
      title: 'Total Shares',
      value: formatNumber(data.vault.totalSupply, 2),
      subValue: 'yvSHARE tokens',
      icon: TrendingUp,
      color: 'from-purple-500 to-pink-500',
    },
    {
      title: 'Lucros Coletados',
      value: formatUSD(data.vault.totalProfitHarvested),
      subValue: 'Total harvestado',
      icon: Activity,
      color: 'from-cyan-500 to-blue-500',
    },
    {
      title: 'Estratégias Ativas',
      value: data.vault.strategies.length.toString(),
      subValue: 'Deployadas',
      icon: Wallet,
      color: 'from-yellow-500 to-orange-500',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Dashboard</h2>
          <p className="text-gray-400 mt-1">Dados lidos do contrato na Polygon Mainnet</p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="px-4 py-2 bg-slate-700/50 hover:bg-slate-700 text-gray-300 rounded-lg transition-colors flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map((stat, index) => (
          <div
            key={index}
            className="bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700 p-6 hover:border-slate-600 transition-colors"
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`p-3 rounded-lg bg-gradient-to-r ${stat.color}`}>
                <stat.icon className="w-5 h-5 text-white" />
              </div>
            </div>
            <h3 className="text-gray-400 text-sm mb-1">{stat.title}</h3>
            <p className="text-2xl font-bold text-white">{stat.value}</p>
            <p className="text-sm text-gray-500 mt-1">{stat.subValue}</p>
          </div>
        ))}
      </div>

      {/* System Status */}
      <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Status do Sistema (On-Chain)</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-slate-700/50 rounded-xl">
            <p className="text-gray-400 text-sm">Depósitos</p>
            <p className={`text-xl font-bold mt-1 ${data.config.depositsEnabled ? 'text-green-400' : 'text-red-400'}`}>
              {data.config.depositsEnabled ? 'Ativo' : 'Inativo'}
            </p>
          </div>
          <div className="p-4 bg-slate-700/50 rounded-xl">
            <p className="text-gray-400 text-sm">Saques</p>
            <p className={`text-xl font-bold mt-1 ${data.config.withdrawalsEnabled ? 'text-green-400' : 'text-red-400'}`}>
              {data.config.withdrawalsEnabled ? 'Ativo' : 'Inativo'}
            </p>
          </div>
          <div className="p-4 bg-slate-700/50 rounded-xl">
            <p className="text-gray-400 text-sm">Harvest</p>
            <p className={`text-xl font-bold mt-1 ${data.config.harvestEnabled ? 'text-green-400' : 'text-red-400'}`}>
              {data.config.harvestEnabled ? 'Ativo' : 'Inativo'}
            </p>
          </div>
          <div className="p-4 bg-slate-700/50 rounded-xl">
            <p className="text-gray-400 text-sm">Taxa Performance</p>
            <p className="text-xl font-bold text-white mt-1">
              {(data.config.performanceFeeBP / 100).toFixed(1)}%
            </p>
          </div>
        </div>
      </div>

      {/* Strategies */}
      <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Estratégias (On-Chain)</h3>
        <div className="space-y-4">
          {data.vault.strategies.map((strategy, index) => (
            <div key={strategy.address} className="flex items-center justify-between p-4 bg-slate-700/50 rounded-xl">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-white font-medium">Estratégia {index + 1}</p>
                  <div className="flex items-center gap-2">
                    <code className="text-gray-400 text-sm">
                      {strategy.address.slice(0, 10)}...{strategy.address.slice(-8)}
                    </code>
                    <a
                      href={`https://polygonscan.com/address/${strategy.address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-500 hover:text-gray-300"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="text-white font-bold">{strategy.allocation}%</p>
                <p className="text-gray-400 text-sm">Alocação</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Contract Links */}
      <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Links dos Contratos</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <a
            href="https://polygonscan.com/address/0x271Ab56dD3C2EE5b8d268aA56c1DB510b1402EcF"
            target="_blank"
            rel="noopener noreferrer"
            className="p-4 bg-slate-700/50 hover:bg-slate-700 rounded-xl text-center transition-colors"
          >
            <span className="text-gray-300 text-sm">Vault</span>
            <ExternalLink className="w-4 h-4 text-gray-500 mx-auto mt-2" />
          </a>
          <a
            href="https://polygonscan.com/address/0xAe4F3AD2e7f4d3DFE18FB0E852e3CEE0bF3F7c13"
            target="_blank"
            rel="noopener noreferrer"
            className="p-4 bg-slate-700/50 hover:bg-slate-700 rounded-xl text-center transition-colors"
          >
            <span className="text-gray-300 text-sm">Config</span>
            <ExternalLink className="w-4 h-4 text-gray-500 mx-auto mt-2" />
          </a>
          <a
            href="https://polygonscan.com/address/0x5c3d1339f822fb1E1Fd9886F52fDfD98CB0B0D2d"
            target="_blank"
            rel="noopener noreferrer"
            className="p-4 bg-slate-700/50 hover:bg-slate-700 rounded-xl text-center transition-colors"
          >
            <span className="text-gray-300 text-sm">Aave Strategy</span>
            <ExternalLink className="w-4 h-4 text-gray-500 mx-auto mt-2" />
          </a>
          <a
            href="https://polygonscan.com/address/0x6894C629655Ef459Af5e779D518Decb11CC81638"
            target="_blank"
            rel="noopener noreferrer"
            className="p-4 bg-slate-700/50 hover:bg-slate-700 rounded-xl text-center transition-colors"
          >
            <span className="text-gray-300 text-sm">QuickSwap Strategy</span>
            <ExternalLink className="w-4 h-4 text-gray-500 mx-auto mt-2" />
          </a>
        </div>
      </div>
    </div>
  );
}
