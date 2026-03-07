'use client';

import { useState, useEffect } from 'react';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { Loader2, ToggleLeft, ToggleRight, AlertTriangle } from 'lucide-react';

interface Feature {
  name: string;
  enabled: boolean;
  description: string;
}

const DEFAULT_FEATURES: Feature[] = [
  { name: 'deposits', enabled: true, description: 'Permitir que usuários depositem na vault' },
  { name: 'withdrawals', enabled: true, description: 'Permitir que usuários sacuem da vault' },
  { name: 'harvest', enabled: true, description: 'Permitir coleta de rendimentos' },
];

export function AdminFeatures() {
  const { getAuthHeaders } = useAdminAuth();
  const [features, setFeatures] = useState<Feature[]>(DEFAULT_FEATURES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchFeatures();
  }, []);

  const fetchFeatures = async () => {
    try {
      setLoading(true);
      // In production, fetch from API
      // For now, use defaults
      setFeatures(DEFAULT_FEATURES);
    } catch (err) {
      console.error('Error fetching features:', err);
    } finally {
      setLoading(false);
    }
  };

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
        setError(result.error || 'Failed to toggle feature');
      }
    } catch (err) {
      console.error('Error toggling feature:', err);
      setError('Failed to toggle feature');
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
          <p className="text-gray-400 mt-1">Controle as funcionalidades do sistema</p>
        </div>
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
              Desativar funcionalidades pode afetar a experiência dos usuários. 
              Use com cuidado e comunique mudanças importantes com antecedência.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
