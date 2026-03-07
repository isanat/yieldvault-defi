'use client';

import { useState, useEffect } from 'react';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { Loader2, Save, AlertTriangle, Percent, RefreshCw } from 'lucide-react';

interface FeeConfig {
  performanceFeeBP: number;
  depositFeeBP: number;
  managementFeeBP: number;
}

interface ReferralRates {
  level1: number;
  level2: number;
  level3: number;
  level4: number;
  level5: number;
}

const bpToPercent = (bp: number) => (bp / 100).toFixed(1);
const percentToBp = (percent: number) => Math.round(percent * 100);

export function AdminFees() {
  const { getAuthHeaders } = useAdminAuth();
  const [fees, setFees] = useState<FeeConfig>({
    performanceFeeBP: 2000,
    depositFeeBP: 500,
    managementFeeBP: 200,
  });
  const [referralRates, setReferralRates] = useState<ReferralRates>({
    level1: 40.0,
    level2: 25.0,
    level3: 15.0,
    level4: 12.0,
    level5: 8.0,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const fetchFees = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/admin/onchain', {
        headers: getAuthHeaders(),
      });
      
      const result = await response.json();
      
      if (result.success) {
        const config = result.data.config;
        setFees({
          performanceFeeBP: config.performanceFeeBP,
          depositFeeBP: config.depositFeeBP,
          managementFeeBP: config.managementFeeBP,
        });
        setReferralRates(config.referralRates);
      } else {
        setError(result.error || 'Erro ao carregar taxas do blockchain');
      }
    } catch (err) {
      console.error('Error fetching fees:', err);
      setError('Falha ao conectar com a API');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFees();
  }, []);

  const handleFeeChange = (key: keyof FeeConfig, value: string) => {
    const percent = parseFloat(value) || 0;
    setFees(prev => ({ ...prev, [key]: percentToBp(percent) }));
  };

  const handleReferralChange = (key: keyof ReferralRates, value: string) => {
    const percent = parseFloat(value) || 0;
    setReferralRates(prev => ({ ...prev, [key]: percent }));
  };

  const saveConfig = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(false);

      const response = await fetch('/api/admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          action: 'updateConfig',
          data: {
            fees,
            referralRates: {
              level1: referralRates.level1 * 100,
              level2: referralRates.level2 * 100,
              level3: referralRates.level3 * 100,
              level4: referralRates.level4 * 100,
              level5: referralRates.level5 * 100,
            },
          },
        }),
      });

      const result = await response.json();

      if (result.success) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } else {
        setError(result.error || 'Failed to save configuration');
      }
    } catch (err) {
      console.error('Error saving config:', err);
      setError('Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const totalReferralBP = Object.values(referralRates).reduce((a, b) => a + b, 0);

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
          <h2 className="text-2xl font-bold text-white">Configuração de Taxas</h2>
          <p className="text-gray-400 mt-1">Taxas lidas do contrato Config (Polygon Mainnet)</p>
        </div>
        <button
          onClick={fetchFees}
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

      {success && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
          <span className="text-green-400">Configuração salva com sucesso!</span>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Platform Fees */}
        <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700 p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Percent className="w-5 h-5 text-purple-400" />
            Taxas da Plataforma (On-Chain)
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">
                Taxa de Performance: <span className="text-white font-bold">{bpToPercent(fees.performanceFeeBP)}%</span>
              </label>
              <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-purple-500 rounded-full transition-all"
                  style={{ width: `${parseFloat(bpToPercent(fees.performanceFeeBP)) * 2}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">Lido do contrato: {fees.performanceFeeBP} basis points</p>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">
                Taxa de Depósito: <span className="text-white font-bold">{bpToPercent(fees.depositFeeBP)}%</span>
              </label>
              <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-500 rounded-full transition-all"
                  style={{ width: `${parseFloat(bpToPercent(fees.depositFeeBP)) * 10}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">Lido do contrato: {fees.depositFeeBP} basis points</p>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">
                Taxa de Gestão Anual: <span className="text-white font-bold">{bpToPercent(fees.managementFeeBP)}%</span>
              </label>
              <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-green-500 rounded-full transition-all"
                  style={{ width: `${parseFloat(bpToPercent(fees.managementFeeBP)) * 20}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">Lido do contrato: {fees.managementFeeBP} basis points</p>
            </div>
          </div>
        </div>

        {/* Referral Rates */}
        <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">
            Taxas de Indicação (On-Chain)
          </h3>

          <div className="space-y-3">
            {([1, 2, 3, 4, 5] as const).map((level) => (
              <div key={level} className="flex items-center gap-4">
                <span className="text-gray-400 w-20">Nível {level}</span>
                <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 rounded-full transition-all"
                    style={{ width: `${referralRates[`level${level}` as keyof ReferralRates]}%` }}
                  />
                </div>
                <span className="text-white w-16 text-right font-mono">
                  {referralRates[`level${level}` as keyof ReferralRates].toFixed(1)}%
                </span>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-slate-700">
            <div className="flex justify-between">
              <span className="text-gray-400">Total Distribuído:</span>
              <span className={`font-bold ${totalReferralBP > 100 ? 'text-red-400' : 'text-green-400'}`}>
                {totalReferralBP.toFixed(1)}%
              </span>
            </div>
            {totalReferralBP > 100 && (
              <p className="text-xs text-red-400 mt-1">
                Total excede 100%
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-6">
        <h4 className="text-blue-400 font-medium mb-2">Dados do Blockchain</h4>
        <ul className="text-blue-400/80 text-sm space-y-1">
          <li>As taxas são lidas diretamente do contrato Config na Polygon Mainnet</li>
          <li>Contrato: <code className="bg-slate-700/50 px-2 py-0.5 rounded">0xAe4F3AD2e7f4d3DFE18FB0E852e3CEE0bF3F7c13</code></li>
          <li>Para alterar as taxas on-chain, é necessário enviar uma transação assinada pelo admin</li>
        </ul>
      </div>
    </div>
  );
}
