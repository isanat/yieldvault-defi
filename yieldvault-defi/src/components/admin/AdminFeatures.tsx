'use client';

import { useState, useEffect } from 'react';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { Loader2, ToggleLeft, ToggleRight, AlertTriangle, RefreshCw } from 'lucide-react';

interface Feature {
  name: string;
  enabled: boolean;
  description: string;
  contract: string;
}

export function AdminFeatures() {
  const { getAuthHeaders } = useAdminAuth();
  const [features, setFeatures] = useState<Feature[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchFeatures = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/admin/onchain', {
        headers: getAuthHeaders(),
      });
      
      const result = await response.json();
      
      if (result.success) {
        const config = result.data.config;
        setFeatures([
          { 
            name: 'deposits', 
            enabled: config.depositsEnabled, 
            description: 'Permitir que usuários depositem na vault',
            contract: 'Config.sol'
          },
          { 
            name: 'withdrawals', 
            enabled: config.withdrawalsEnabled, 
            description: 'Permitir que usuários saquem da vault',
            contract: 'Config.sol'
          },
          { 
            name: 'harvest', 
            enabled: config.harvestEnabled, 
            description: 'Permitir coleta de rendimentos das estratégias',
            contract: 'Config.sol'
          },
        ]);
      } else {
        // Fallback to defaults if API fails
        setFeatures([
          { name: 'deposits', enabled: true, description: 'Permitir que usuários depositem na vault', contract: 'Config.sol' },
          { name: 'withdrawals', enabled: true, description: 'Permitir que usuários saquem da vault', contract: 'Config.sol' },
          { name: 'harvest', enabled: true, description: 'Permitir coleta de rendimentos', contract: 'Config.sol' },
        ]);
        setError(result.error || 'Erro ao carregar dados do blockchain');
      }
    } catch (err) {
      console.error('Error fetching features:', err);
      setError('Falha ao conectar com a API');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeatures();
  }, []);

  const toggleFeature = async (featureName: string) => {
    try {
      setSaving(featureName);
      setError(null);

      const feature = features.find(f => f.name === featureName);
      if (!feature) return;

      const response = await fetch('/api/admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          action: 'toggleFeature',
          data: {
            feature: featureName,
            enabled: !feature.enabled,
          },
        }),
      });

      const result = await response.json();

      if (result.success) {
        setFeatures(prev =>
          prev.map(f =>
            f.name === featureName ? { ...f, enabled: !f.enabled } : f
          )
        );
      } else {
        setError(result.error || 'Falha ao atualizar funcionalidade');
      }
    } catch (err) {
      console.error('Error toggling feature:', err);
      setError('Falha ao atualizar funcionalidade');
    } finally {
      setSaving(null);
    }
  };

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
          <h2 className="text-2xl font-bold text-white">Funcionalidades</h2>
          <p className="text-gray-400 mt-1">Controle as funcionalidades do sistema (dados do blockchain)</p>
        </div>
        <button
          onClick={fetchFeatures}
          disabled={loading}
          className="p-2 bg-slate-700/50 hover:bg-slate-700 rounded-lg transition-colors"
        >
          <RefreshCw className={`w-5 h-5 text-gray-300 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400" />
          <span className="text-red-400">{error}</span>
        </div>
      )}

      <div className="space-y-4">
        {features.map((feature) => (
          <div
            key={feature.name}
            className="bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700 p-6"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-semibold text-white capitalize">
                    {feature.name}
                  </h3>
                  <span
                    className={`px-2 py-0.5 text-xs rounded-full ${
                      feature.enabled
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-red-500/20 text-red-400'
                    }`}
                  >
                    {feature.enabled ? 'Ativo' : 'Inativo'}
                  </span>
                  <span className="px-2 py-0.5 text-xs rounded-full bg-slate-700 text-gray-400">
                    {feature.contract}
                  </span>
                </div>
                <p className="text-gray-400 text-sm">{feature.description}</p>
              </div>

              <button
                onClick={() => toggleFeature(feature.name)}
                disabled={saving === feature.name}
                className={`p-2 rounded-lg transition-all ${
                  feature.enabled
                    ? 'text-green-400 hover:bg-green-500/20'
                    : 'text-gray-500 hover:bg-slate-700'
                }`}
              >
                {saving === feature.name ? (
                  <Loader2 className="w-8 h-8 animate-spin" />
                ) : feature.enabled ? (
                  <ToggleRight className="w-8 h-8" />
                ) : (
                  <ToggleLeft className="w-8 h-8" />
                )}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Warning */}
      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-400 mt-0.5" />
          <div>
            <h4 className="text-yellow-400 font-medium mb-1">Atenção</h4>
            <p className="text-yellow-400/80 text-sm">
              Os estados mostrados são lidos diretamente do contrato Config na Polygon Mainnet.
              Para alterar o estado on-chain, é necessário assinar uma transação com a carteira admin.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
