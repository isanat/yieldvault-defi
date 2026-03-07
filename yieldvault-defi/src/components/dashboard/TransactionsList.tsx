'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { formatUSD, formatRelativeTime, formatAddress } from '@/lib/utils'
import { ArrowDownToLine, ArrowUpFromLine, RefreshCw, Gift, ExternalLink, Clock } from 'lucide-react'

// Generate mock transactions
const generateMockTransactions = () => {
  const types = ['deposit', 'withdraw', 'harvest', 'commission'] as const
  const transactions = []
  
  for (let i = 0; i < 15; i++) {
    const type = types[Math.floor(Math.random() * types.length)]
    transactions.push({
      id: `tx-${i}`,
      txHash: '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
      type,
      amount: Math.random() * 10000 + 100,
      userAddress: '0x' + Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
      timestamp: new Date(Date.now() - Math.random() * 7 * 86400000),
      status: 'confirmed',
    })
  }
  
  return transactions.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
}

const mockTransactions = generateMockTransactions()

const transactionIcons = {
  deposit: ArrowDownToLine,
  withdraw: ArrowUpFromLine,
  harvest: RefreshCw,
  commission: Gift,
}

const transactionColors = {
  deposit: 'text-green-400 bg-green-500/20',
  withdraw: 'text-blue-400 bg-blue-500/20',
  harvest: 'text-purple-400 bg-purple-500/20',
  commission: 'text-amber-400 bg-amber-500/20',
}

const transactionLabels = {
  deposit: 'Deposit',
  withdraw: 'Withdraw',
  harvest: 'Harvest',
  commission: 'Commission',
}

export function TransactionsList() {
  return (
    <Card className="glass-card">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl">Recent Transactions</CardTitle>
          <Badge variant="outline" className="glass">
            <Clock className="w-3 h-3 mr-1" />
            Live
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-3">
            {mockTransactions.map((tx, index) => {
              const Icon = transactionIcons[tx.type]
              const colorClass = transactionColors[tx.type]
              const label = transactionLabels[tx.type]
              
              return (
                <div
                  key={tx.id}
                  className="flex items-center gap-4 p-3 rounded-lg glass hover:bg-accent/20 transition-colors animate-in"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  {/* Icon */}
                  <div className={`w-10 h-10 rounded-lg ${colorClass} flex items-center justify-center flex-shrink-0`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  
                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{label}</span>
                      <span className="text-xs text-muted-foreground">
                        by {formatAddress(tx.userAddress)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span className="text-xs font-mono">
                        {formatAddress(tx.txHash, 6)}
                      </span>
                      <span>•</span>
                      <span>{formatRelativeTime(tx.timestamp)}</span>
                    </div>
                  </div>
                  
                  {/* Amount */}
                  <div className="text-right flex-shrink-0">
                    <div className={`font-semibold ${
                      tx.type === 'deposit' || tx.type === 'commission' 
                        ? 'text-green-400' 
                        : tx.type === 'withdraw' 
                          ? 'text-blue-400' 
                          : 'text-purple-400'
                    }`}>
                      {tx.type === 'withdraw' ? '-' : '+'}{formatUSD(tx.amount)}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <a
                        href={`https://polygonscan.com/tx/${tx.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-foreground transition-colors"
                      >
                        View
                      </a>
                      <ExternalLink className="w-3 h-3" />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </ScrollArea>
        
        {/* View all link */}
        <div className="pt-4 mt-4 border-t border-border/50 text-center">
          <a
            href="#"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            View all transactions →
          </a>
        </div>
      </CardContent>
    </Card>
  )
}
