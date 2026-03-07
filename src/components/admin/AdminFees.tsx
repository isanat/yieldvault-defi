'use client';

import { useState } from 'react';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { Loader2, Save, AlertTriangle, Percent } from 'lucide-react';

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

const DEFAULT_FEES: FeeConfig = {
  performanceFeeBP: 2000, // 20%
  depositFeeBP: 500, // 5%
  managementFeeBP: 200, // 2%
};

const DEFAULT_REFERRAL_RATES: ReferralRates = {
  level1: 4000, // 40%
  level2: 2500, // 25%
  level3: 1500, // 15%
  level4: 1200, // 12%
  level5: 800,  // 8%
};

const bpToPercent = (bp: number) => (bp / 100).toFixed(1);
const percentToBp = (percent: number) => Math.round(percent * 100);

export function AdminFees() {
  const { getAuthHeaders } = useAdminAuth();
  const [fees, setFees] = useState<FeeConfig>(DEFAULT_FEES);
  const [referralRates, setReferralRates] = useState<ReferralRates>(DEFAULT_REFERRAL_RATES);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleFeeChange = (key: keyof FeeConfig, value: string) => {
    const percent = parseFloat(value) || 0;
    setFees(prev => ({ ...prev, [key]: percentToBp(percent) }));
  };

  const handleReferralChange = (key: keyof ReferralRates, value: string) => {
    const percent = parseFloat(value) || 0;
    setReferralRates(prev => ({ ...prev, [key]: percentToBp(percent) }));
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
            referralRates,
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Configuração de Taxas</h2>
          <p className="text-gray-400 mt-1">Ajuste as taxas do sistema</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400" />
          <span className="text-red-400">{error}</span>
        </div>
      )}

      {success && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
          <span className="text-green-400">✓ Configuração salva com sucesso!</span>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Platform Fees */}
        <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700 p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Percent className="w-5 h-5 text-purple-400" />
            Taxas da Plataforma
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">
                Taxa de Performance (%) - {bpToPercent(fees.performanceFeeBP)}%
              </label>
              <input
                type="range"
                min="0"
                max="50"
                step="0.5"
                value={parseFloat(bpToPercent(fees.performanceFeeBP))}
                onChange={(e) => handleFeeChange('performanceFeeBP', e.target.value)}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>0%</span>
                <span>50%</span>
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">
                Taxa de Depósito (%) - {bpToPercent(fees.depositFeeBP)}%
              </label>
              <input
                type="range"
                min="0"
                max="10"
                step="0.5"
                value={parseFloat(bpToPercent(fees.depositFeeBP))}
                onChange={(e) => handleFeeChange('depositFeeBP', e.target.value)}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>0%</span>
                <span>10%</span>
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">
                Taxa de Gestão Anual (%) - {bpToPercent(fees.managementFeeBP)}%
              </label>
              <input
                type="range"
                min="0"
                max="5"
                step="0.1"
                value={parseFloat(bpToPercent(fees.managementFeeBP))}
                onChange={(e) => handleFeeChange('managementFeeBP', e.target.value)}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>0%</span>
                <span>5%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Referral Rates */}
        <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">
            Taxas de Indicação (por nível)
          </h3>

          <div className="space-y-3">
            {([1, 2, 3, 4, 5] as const).map((level) => (
              <div key={level} className="flex items-center gap-4">
                <span className="text-gray-400 w-20">Nível {level}</span>
                <input
                  type="range"
                  min="0"
                  max="50"
                  step="1"
                  value={parseFloat(bpToPercent(referralRates[`level${level}` as keyof ReferralRates]))}
                  onChange={(e) => handleReferralChange(`level${level}` as keyof ReferralRates, e.target.value)}
                  className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
                <span className="text-white w-16 text-right font-mono">
                  {bpToPercent(referralRates[`level${level}` as keyof ReferralRates])}%
                </span>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-slate-700">
            <div className="flex justify-between">
              <span className="text-gray-400">Total Distribuído:</span>
              <span className={`font-bold ${totalReferralBP > 10000 ? 'text-red-400' : 'text-green-400'}`}>
                {bpToPercent(totalReferralBP)}%
              </span>
            </div>
            {totalReferralBP > 10000 && (
              <p className="text-xs text-red-400 mt-1">
                ⚠️ Total excede 100%
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={saveConfig}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold rounded-xl transition-all disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Save className="w-5 h-5" />
          )}
          <span>{saving ? 'Salvando...' : 'Salvar Configuração'}</span>
        </button>
      </div>

      {/* Info */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-6">
        <h4 className="text-blue-400 font-medium mb-2">Sobre as Taxas</h4>
        <ul className="text-blue-400/80 text-sm space-y-1">
          <li>• <strong>Performance Fee:</strong> Cobrada sobre os lucros gerados</li>
          <li>• <strong>Deposit Fee:</strong> Cobrada no momento do depósito</li>
          <li>• <strong>Management Fee:</strong> Taxa anual para gestão da vault</li>
          <li>• <strong>Indicações:</strong> Distribuído em 5 níveis de profundidade</li>
        </ul>
      </div>
    </div>
  );
}
