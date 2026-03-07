'use client';

import { useState, useEffect } from 'react';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { Loader2, Filter, Search, Clock, User, Activity, Settings } from 'lucide-react';

interface AdminLog {
  id: string;
  adminAddress: string;
  action: string;
  details: string;
  timestamp: Date;
}

const SAMPLE_LOGS: AdminLog[] = [
  {
    id: '1',
    adminAddress: '0x013a76C9CfFD56DA842b97bF7AC1Bc3C05269C42',
    action: 'toggleFeature',
    details: '{"feature": "deposits", "enabled": true}',
    timestamp: new Date(Date.now() - 1000 * 60 * 5),
  },
  {
    id: '2',
    adminAddress: '0x013a76C9CfFD56DA842b97bF7AC1Bc3C05269C42',
    action: 'updateConfig',
    details: '{"fees": {"performanceFeeBP": 2000}}',
    timestamp: new Date(Date.now() - 1000 * 60 * 30),
  },
  {
    id: '3',
    adminAddress: '0x013a76C9CfFD56DA842b97bF7AC1Bc3C05269C42',
    action: 'addStrategy',
    details: '{"name": "QuickSwap V3", "address": "0x6894..."}',
    timestamp: new Date(Date.now() - 1000 * 60 * 60),
  },
  {
    id: '4',
    adminAddress: '0x013a76C9CfFD56DA842b97bF7AC1Bc3C05269C42',
    action: 'harvest',
    details: '{"profit": 12500, "strategies": ["aave", "quickswap"]}',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3),
  },
  {
    id: '5',
    adminAddress: '0x013a76C9CfFD56DA842b97bF7AC1Bc3C05269C42',
    action: 'emergencyPause',
    details: '{"reason": "Security review"}',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24),
  },
];

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  toggleFeature: { label: 'Toggle Feature', color: 'text-blue-400 bg-blue-500/20' },
  updateConfig: { label: 'Update Config', color: 'text-purple-400 bg-purple-500/20' },
  addStrategy: { label: 'Add Strategy', color: 'text-green-400 bg-green-500/20' },
  harvest: { label: 'Harvest', color: 'text-yellow-400 bg-yellow-500/20' },
  emergencyPause: { label: 'Emergency Pause', color: 'text-red-400 bg-red-500/20' },
};

const formatTimeAgo = (date: Date) => {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  
  if (seconds < 60) return 'Agora mesmo';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min atrás`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h atrás`;
  return `${Math.floor(seconds / 86400)}d atrás`;
};

export function AdminLogs() {
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');

  useEffect(() => {
    // Simulate fetching logs
    setTimeout(() => {
      setLogs(SAMPLE_LOGS);
      setLoading(false);
    }, 500);
  }, []);

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.adminAddress.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.details.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = actionFilter === 'all' || log.action === actionFilter;
    
    return matchesSearch && matchesFilter;
  });

  const uniqueActions = [...new Set(logs.map(l => l.action))];

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
          <h2 className="text-2xl font-bold text-white">Logs de Atividades</h2>
          <p className="text-gray-400 mt-1">Histórico de ações administrativas</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por ação, endereço ou detalhes..."
            className="w-full bg-slate-800/50 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
          />
        </div>
        
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="bg-slate-800/50 border border-slate-700 rounded-xl pl-10 pr-8 py-3 text-white appearance-none cursor-pointer focus:outline-none focus:border-purple-500"
          >
            <option value="all">Todas ações</option>
            {uniqueActions.map(action => (
              <option key={action} value={action}>
                {ACTION_LABELS[action]?.label || action}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Logs List */}
      <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Data/Hora</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Admin</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Ação</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Detalhes</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => (
                <tr key={log.id} className="border-b border-slate-700/50 hover:bg-slate-700/20 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-gray-300">
                      <Clock className="w-4 h-4 text-gray-500" />
                      {formatTimeAgo(log.timestamp)}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-500" />
                      <span className="text-gray-300 font-mono text-sm">
                        {log.adminAddress.slice(0, 6)}...{log.adminAddress.slice(-4)}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      ACTION_LABELS[log.action]?.color || 'text-gray-400 bg-gray-500/20'
                    }`}>
                      {ACTION_LABELS[log.action]?.label || log.action}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <code className="text-xs text-gray-400 bg-slate-700/50 px-2 py-1 rounded">
                      {log.details.length > 50 ? log.details.slice(0, 50) + '...' : log.details}
                    </code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredLogs.length === 0 && (
          <div className="text-center py-12">
            <Activity className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">Nenhum log encontrado</p>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
          <p className="text-gray-400 text-sm">Total de Logs</p>
          <p className="text-2xl font-bold text-white mt-1">{logs.length}</p>
        </div>
        <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
          <p className="text-gray-400 text-sm">Config Updates</p>
          <p className="text-2xl font-bold text-purple-400 mt-1">
            {logs.filter(l => l.action === 'updateConfig').length}
          </p>
        </div>
        <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
          <p className="text-gray-400 text-sm">Harvests</p>
          <p className="text-2xl font-bold text-yellow-400 mt-1">
            {logs.filter(l => l.action === 'harvest').length}
          </p>
        </div>
        <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
          <p className="text-gray-400 text-sm">Emergências</p>
          <p className="text-2xl font-bold text-red-400 mt-1">
            {logs.filter(l => l.action === 'emergencyPause').length}
          </p>
        </div>
      </div>
    </div>
  );
}
