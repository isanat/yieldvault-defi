'use client';

import { useState, useEffect } from 'react';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { Loader2, Plus, ExternalLink, TrendingUp, RefreshCw } from 'lucide-react';

interface Strategy {
  address: string;
  allocation: number;
  name: string;
  status: 'active' | 'inactive' | 'pending';
}

// Known strategy names
const STRATEGY_NAMES: Record<string, string> = {
  '0x5c3d1339f822fb1E1Fd9886F52fDfD98CB0B0D2d': 'Aave V3 Strategy',
  '0x6894C629655Ef459Af5e779D518Decb11CC81638': 'QuickSwap V3 Strategy',
};

export function AdminStrategies() {
  const { getAuthHeaders } = useAdminAuth();
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newStrategy, setNewStrategy] = useState({ name: '', address: '', allocation: 0 });
  const [saving, setSaving] = useState(false);

  const fetchStrategies = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/admin/onchain', {
        headers: getAuthHeaders(),
      });
      
      const result = await response.json();
      
      if (result.success) {
        const vaultData = result.data.vault;
        const strategiesData = vaultData.strategies.map((s: { address: string; allocation: number }) => ({
          address: s.address,
          allocation: s.allocation,
          name: STRATEGY_NAMES[s.address.toLowerCase()] || `Strategy ${s.address.slice(0, 8)}...`,
          status: 'active' as const,
        }));
        setStrategies(strategiesData);
      } else {
        setError(result.error || 'Erro ao carregar estratégias do blockchain');
      }
    } catch (err) {
      console.error('Error fetching strategies:', err);
      setError('Falha ao conectar com a API');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStrategies();
  }, []);

  const handleAddStrategy = async () => {
    if (!newStrategy.name || !newStrategy.address) return;

    try {
      setSaving(true);

      const response = await fetch('/api/admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          action: 'addStrategy',
          data: newStrategy,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setStrategies(prev => [...prev, { ...newStrategy, status: 'pending' }]);
        setShowAddModal(false);
        setNewStrategy({ name: '', address: '', allocation: 0 });
      }
    } catch (err) {
      console.error('Error adding strategy:', err);
    } finally {
      setSaving(false);
    }
  };

  const totalAllocation = strategies.reduce((sum, s) => sum + s.allocation, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Estratégias</h2>
          <p className="text-gray-400 mt-1">Dados lidos do contrato Vault na Polygon Mainnet</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchStrategies}
            disabled={loading}
            className="p-2 bg-slate-700/50 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-5 h-5 text-gray-300 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg transition-all"
          >
            <Plus className="w-4 h-4" />
            Adicionar
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400">
          {error}
        </div>
      )}

      {/* Allocation Overview */}
      <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Alocação Total</h3>
          <span className={`text-xl font-bold ${totalAllocation === 100 ? 'text-green-400' : totalAllocation > 100 ? 'text-red-400' : 'text-yellow-400'}`}>
            {totalAllocation}%
          </span>
        </div>
        
        <div className="h-4 bg-slate-700 rounded-full overflow-hidden flex">
          {strategies.map((s, i) => (
            <div
              key={s.address}
              className={`h-full ${i === 0 ? 'bg-purple-500' : i === 1 ? 'bg-blue-500' : 'bg-cyan-500'}`}
              style={{ width: `${s.allocation}%` }}
            />
          ))}
        </div>
        
        <div className="flex flex-wrap gap-4 mt-4">
          {strategies.map((s, i) => (
            <div key={s.address} className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${i === 0 ? 'bg-purple-500' : i === 1 ? 'bg-blue-500' : 'bg-cyan-500'}`} />
              <span className="text-gray-400 text-sm">{s.name}: {s.allocation}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* Strategies List */}
      <div className="space-y-4">
        {strategies.map((strategy) => (
          <div
            key={strategy.address}
            className="bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700 p-6"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">{strategy.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="text-gray-400 text-sm font-mono">
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

              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 text-xs rounded-full ${
                  strategy.status === 'active'
                    ? 'bg-green-500/20 text-green-400'
                    : strategy.status === 'pending'
                    ? 'bg-yellow-500/20 text-yellow-400'
                    : 'bg-red-500/20 text-red-400'
                }`}>
                  {strategy.status === 'active' ? 'Ativo' : strategy.status === 'pending' ? 'Pendente' : 'Inativo'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mt-6">
              <div>
                <p className="text-gray-400 text-sm">Alocação</p>
                <p className="text-xl font-bold text-white">{strategy.allocation}%</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Contrato</p>
                <a 
                  href={`https://polygonscan.com/address/${strategy.address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 flex items-center gap-1"
                >
                  Ver no Polygonscan
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Status</p>
                <p className={`font-medium ${strategy.status === 'active' ? 'text-green-400' : 'text-yellow-400'}`}>
                  {strategy.status === 'active' ? 'Operacional' : 'Pendente'}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Info */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-6">
        <h4 className="text-blue-400 font-medium mb-2">Dados On-Chain</h4>
        <p className="text-blue-400/80 text-sm">
          As estratégias e alocações são lidas diretamente do contrato Vault na Polygon Mainnet.
          Para adicionar novas estratégias, é necessário enviar uma transação assinada pelo admin.
        </p>
      </div>

      {/* Add Strategy Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl p-6 max-w-md w-full border border-slate-700">
            <h3 className="text-xl font-bold text-white mb-4">Adicionar Estratégia</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Nome</label>
                <input
                  type="text"
                  value={newStrategy.name}
                  onChange={(e) => setNewStrategy(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ex: Aave V3 Strategy"
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Endereço do Contrato</label>
                <input
                  type="text"
                  value={newStrategy.address}
                  onChange={(e) => setNewStrategy(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="0x..."
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white font-mono text-sm"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Alocação Inicial (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={newStrategy.allocation}
                  onChange={(e) => setNewStrategy(prev => ({ ...prev, allocation: parseInt(e.target.value) || 0 }))}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddStrategy}
                disabled={saving || !newStrategy.name || !newStrategy.address}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Adicionar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
