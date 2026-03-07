'use client'

import React, { useState } from 'react'
import { useWallet } from '@/contexts/WalletContext'
import { useWithdraw, useVault } from '@/hooks/useVault'
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
import { ArrowUpFromLine, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'

interface WithdrawModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function WithdrawModal({ isOpen, onClose, onSuccess }: WithdrawModalProps) {
  const { address } = useWallet()
  const { userVaultInfo } = useVault(address)
  const { withdraw, isWithdrawing } = useWithdraw()
  const [amount, setAmount] = useState('')
  const [error, setError] = useState('')
  const [txHash, setTxHash] = useState('')
  const [isSuccess, setIsSuccess] = useState(false)

  const userShares = userVaultInfo?.shares || 0
  const sharePrice = 1.0218

  const handleAmountChange = (value: string) => {
    const sanitized = value.replace(/[^0-9.]/g, '')
    const parts = sanitized.split('.')
    if (parts.length > 2) return
    setAmount(sanitized)
    setError('')
    setTxHash('')
    setIsSuccess(false)
  }

  const handlePreset = (percentage: number) => {
    const value = (userShares * percentage / 100).toFixed(4)
    setAmount(value)
    setError('')
  }

  const handleWithdraw = async () => {
    const numShares = parseFloat(amount)
    
    if (!numShares || numShares <= 0) {
      setError('Please enter a valid amount')
      return
    }
    
    if (numShares > userShares) {
      setError(`Insufficient shares. You have ${formatNumber(userShares, 4)} shares`)
      return
    }

    setError('')
    const result = await withdraw(numShares)
    
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

  const usdValue = parseFloat(amount) * sharePrice

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="glass-heavy sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowUpFromLine className="w-5 h-5 text-blue-400" />
            Withdraw USDT
          </DialogTitle>
          <DialogDescription>
            Withdraw your shares and receive USDT
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {isSuccess ? (
            <div className="text-center py-6">
              <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-green-500" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Withdrawal Successful!</h3>
              <p className="text-muted-foreground text-sm mb-4">
                You received {formatUSD(usdValue)} for {formatNumber(parseFloat(amount), 4)} shares.
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
              {/* User shares display */}
              <div className="flex items-center justify-between p-3 rounded-lg glass">
                <span className="text-sm text-muted-foreground">Your Shares</span>
                <div className="text-right">
                  <span className="font-semibold">{formatNumber(userShares, 4)}</span>
                  <span className="text-muted-foreground text-sm ml-2">
                    ≈ {formatUSD(userShares * sharePrice)}
                  </span>
                </div>
              </div>

              {/* Amount input */}
              <div className="space-y-2">
                <Label htmlFor="shares">Shares to Withdraw</Label>
                <div className="relative">
                  <Input
                    id="shares"
                    type="text"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => handleAmountChange(e.target.value)}
                    className="pr-20 bg-input/50 border-border text-lg h-12"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                    shares
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

              {/* Estimated USDT */}
              {amount && parseFloat(amount) > 0 && (
                <div className="p-4 rounded-lg glass space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">You will receive</span>
                    <span className="font-semibold text-green-400">{formatUSD(usdValue)} USDT</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Shares burned</span>
                    <span>{formatNumber(parseFloat(amount), 4)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Share price</span>
                    <span>${sharePrice.toFixed(4)}</span>
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

              {/* Withdraw button */}
              <Button
                onClick={handleWithdraw}
                disabled={isWithdrawing || !amount || parseFloat(amount) <= 0 || userShares === 0}
                className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white h-12"
              >
                {isWithdrawing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    Withdraw {amount && parseFloat(amount) > 0 ? formatUSD(usdValue) : ''}
                    <ArrowUpFromLine className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                No withdrawal fees. Transactions are processed instantly.
              </p>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
