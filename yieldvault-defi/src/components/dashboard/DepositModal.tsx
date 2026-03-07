'use client'

import React, { useState } from 'react'
import { useWallet } from '@/contexts/WalletContext'
import { useDeposit } from '@/hooks/useVault'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatUSD, formatNumber } from '@/lib/utils'
import { ArrowDownToLine, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'

interface DepositModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function DepositModal({ isOpen, onClose, onSuccess }: DepositModalProps) {
  const { address } = useWallet()
  const { deposit, isDepositing } = useDeposit()
  const [amount, setAmount] = useState('')
  const [error, setError] = useState('')
  const [txHash, setTxHash] = useState('')
  const [isSuccess, setIsSuccess] = useState(false)

  const handleAmountChange = (value: string) => {
    // Only allow numbers and decimals
    const sanitized = value.replace(/[^0-9.]/g, '')
    // Prevent multiple decimals
    const parts = sanitized.split('.')
    if (parts.length > 2) return
    setAmount(sanitized)
    setError('')
    setTxHash('')
    setIsSuccess(false)
  }

  const handlePreset = (percentage: number) => {
    // Mock balance for demo
    const mockBalance = 10000
    const value = (mockBalance * percentage / 100).toFixed(2)
    setAmount(value)
    setError('')
  }

  const handleDeposit = async () => {
    const numAmount = parseFloat(amount)
    
    if (!numAmount || numAmount <= 0) {
      setError('Please enter a valid amount')
      return
    }
    
    if (numAmount < 10) {
      setError('Minimum deposit is $10')
      return
    }
    
    if (numAmount > 100000) {
      setError('Maximum single deposit is $100,000')
      return
    }

    setError('')
    const result = await deposit(numAmount)
    
    if (result.success && result.txHash) {
      setTxHash(result.txHash)
      setIsSuccess(true)
      onSuccess?.()
    } else {
      setError(result.error || 'Transaction failed')
    }
  }

  const handleClose = () => {
    setAmount('')
    setError('')
    setTxHash('')
    setIsSuccess(false)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="glass-heavy sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowDownToLine className="w-5 h-5 text-purple-400" />
            Deposit USDT
          </DialogTitle>
          <DialogDescription>
            Deposit USDT to start earning yield
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {isSuccess ? (
            <div className="text-center py-6">
              <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-green-500" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Deposit Successful!</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Your deposit of {formatUSD(parseFloat(amount))} has been confirmed.
              </p>
              {txHash && (
                <div className="p-3 rounded-lg glass text-xs text-muted-foreground">
                  TX: {txHash.slice(0, 10)}...{txHash.slice(-8)}
                </div>
              )}
              <Button
                onClick={handleClose}
                className="mt-6 bg-gradient-to-r from-purple-500 to-blue-500 text-white"
              >
                Done
              </Button>
            </div>
          ) : (
            <>
              {/* Mock balance display */}
              <div className="flex items-center justify-between p-3 rounded-lg glass">
                <span className="text-sm text-muted-foreground">Available Balance</span>
                <span className="font-semibold">10,000.00 USDT</span>
              </div>

              {/* Amount input */}
              <div className="space-y-2">
                <Label htmlFor="amount">Amount to Deposit</Label>
                <div className="relative">
                  <Input
                    id="amount"
                    type="text"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => handleAmountChange(e.target.value)}
                    className="pr-16 bg-input/50 border-border text-lg h-12"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                    USDT
                  </span>
                </div>
                
                {/* Quick amount buttons */}
                <div className="flex gap-2">
                  {[25, 50, 75, 100].map((pct) => (
                    <Button
                      key={pct}
                      variant="outline"
                      size="sm"
                      onClick={() => handlePreset(pct)}
                      className="flex-1 glass text-xs"
                    >
                      {pct}%
                    </Button>
                  ))}
                </div>
              </div>

              {/* Estimated shares */}
              {amount && parseFloat(amount) > 0 && (
                <div className="p-4 rounded-lg glass space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">You will receive</span>
                    <span className="font-semibold">{formatNumber(parseFloat(amount) / 1.0218, 4)} shares</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Share price</span>
                    <span>$1.0218</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Est. daily yield</span>
                    <span className="text-green-400">~{formatUSD(parseFloat(amount) * 0.235 / 365)}</span>
                  </div>
                </div>
              )}

              {/* Error message */}
              {error && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              {/* Deposit button */}
              <Button
                onClick={handleDeposit}
                disabled={isDepositing || !amount || parseFloat(amount) <= 0}
                className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white h-12"
              >
                {isDepositing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    Deposit {amount ? formatUSD(parseFloat(amount)) : ''}
                    <ArrowDownToLine className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                By depositing, you agree to the terms of the protocol
              </p>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
