'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { AdminStats } from '@/components/admin/AdminStats';
import { AdminFeatures } from '@/components/admin/AdminFeatures';
import { AdminStrategies } from '@/components/admin/AdminStrategies';
import { AdminLogs } from '@/components/admin/AdminLogs';
import { AdminFees } from '@/components/admin/AdminFees';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { Loader2, Shield, AlertTriangle, LayoutDashboard, Settings, History, Coins, Layers } from 'lucide-react';

type TabType = 'dashboard' | 'features' | 'fees' | 'strategies' | 'logs';

export default function AdminPage() {
  const { address, isConnected } = useAccount();
  const { isAdmin, isLoading: authLoading, adminApiKey, setApiKey } = useAdminAuth();
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [keyInput, setKeyInput] = useState('');

  // Loading state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-purple-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Verificando permissões...</p>
        </div>
      </div>
    );
  }

  // Not connected
  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900 flex items-center justify-center p-4">
        <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl p-8 max-w-md w-full border border-slate-700 text-center">
          <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Acesso Restrito</h1>
          <p className="text-gray-400 mb-6">Conecte sua carteira para acessar o painel administrativo.</p>
        </div>
      </div>
    );
  }

  // Not admin - show API key input
  if (!isAdmin && !adminApiKey) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900 flex items-center justify-center p-4">
        <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl p-8 max-w-md w-full border border-slate-700">
          <div className="text-center mb-6">
            <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-white mb-2">Autenticação Necessária</h1>
            <p className="text-gray-400">Este endereço não está autorizado. Insira a API Key de administrador.</p>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Admin API Key</label>
              <input
                type="password"
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                placeholder="Digite a API Key"
                className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
              />
            </div>
            
            <button
              onClick={() => setApiKey(keyInput)}
              disabled={!keyInput}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold py-3 rounded-lg transition-all disabled:opacity-50"
            >
              Autenticar
            </button>
          </div>
          
          <p className="mt-4 text-xs text-gray-500 text-center">
            Wallet: {address?.slice(0, 6)}...{address?.slice(-4)}
          </p>
        </div>
      </div>
    );
  }

  // Admin authenticated - show dashboard
  const tabs = [
    { id: 'dashboard' as TabType, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'features' as TabType, label: 'Funcionalidades', icon: Settings },
    { id: 'fees' as TabType, label: 'Taxas', icon: Coins },
    { id: 'strategies' as TabType, label: 'Estratégias', icon: Layers },
    { id: 'logs' as TabType, label: 'Logs', icon: History },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900">
      {/* Header */}
      <header className="bg-slate-800/50 backdrop-blur-xl border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="w-8 h-8 text-purple-500" />
              <div>
                <h1 className="text-xl font-bold text-white">YieldVault Admin</h1>
                <p className="text-sm text-gray-400">Painel de Controle</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="px-3 py-1.5 bg-green-500/20 border border-green-500/30 rounded-lg">
                <span className="text-green-400 text-sm font-medium">Autenticado</span>
              </div>
              <div className="px-3 py-1.5 bg-slate-700/50 rounded-lg">
                <span className="text-gray-300 text-sm font-mono">
                  {address?.slice(0, 6)}...{address?.slice(-4)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar */}
          <nav className="lg:w-64 flex-shrink-0">
            <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700 p-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-purple-600/20 to-blue-600/20 text-white border border-purple-500/30'
                      : 'text-gray-400 hover:bg-slate-700/50 hover:text-white'
                  }`}
                >
                  <tab.icon className="w-5 h-5" />
                  <span className="font-medium">{tab.label}</span>
                </button>
              ))}
            </div>
          </nav>

          {/* Main Content */}
          <main className="flex-1">
            {activeTab === 'dashboard' && <AdminStats />}
            {activeTab === 'features' && <AdminFeatures />}
            {activeTab === 'fees' && <AdminFees />}
            {activeTab === 'strategies' && <AdminStrategies />}
            {activeTab === 'logs' && <AdminLogs />}
          </main>
        </div>
      </div>
    </div>
  );
}
