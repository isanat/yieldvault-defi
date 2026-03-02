'use client'

import React, { useState } from 'react'
import { useVault } from '@/hooks/useVault'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from 'recharts'
import { TrendingUp } from 'lucide-react'
import { formatUSD } from '@/lib/utils'

const chartConfig = {
  sharePrice: {
    label: 'Share Price',
    color: 'hsl(var(--chart-1))',
  },
} satisfies ChartConfig

const timeframes = [
  { label: '7D', days: 7 },
  { label: '30D', days: 30 },
  { label: '90D', days: 90 },
]

export function PerformanceChart() {
  const { chartData, isLoading } = useVault()
  const [selectedTimeframe, setSelectedTimeframe] = useState(30)

  // Process chart data
  const processedData = React.useMemo(() => {
    if (!chartData?.sharePrice) return []
    
    const data = chartData.sharePrice
      .filter((_, index) => {
        // Filter based on selected timeframe
        const totalPoints = chartData.sharePrice.length
        const startIdx = Math.max(0, totalPoints - selectedTimeframe)
        return index >= startIdx
      })
      .map((point) => ({
        date: new Date(point.timestamp * 1000).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        }),
        sharePrice: point.value,
        fullDate: new Date(point.timestamp * 1000).toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        }),
      }))
    
    return data
  }, [chartData, selectedTimeframe])

  // Calculate price change
  const priceChange = React.useMemo(() => {
    if (processedData.length < 2) return { value: 0, percent: 0 }
    const first = processedData[0].sharePrice
    const last = processedData[processedData.length - 1].sharePrice
    const change = last - first
    const percent = (change / first) * 100
    return { value: change, percent }
  }, [processedData])

  const currentPrice = processedData[processedData.length - 1]?.sharePrice || 1.0218

  if (isLoading) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-xl">Share Price Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center">
            <div className="animate-pulse text-muted-foreground">Loading chart...</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="glass-card">
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="text-xl">Share Price Performance</CardTitle>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-2xl font-bold">${currentPrice.toFixed(4)}</span>
              <span className={`flex items-center gap-1 text-sm px-2 py-0.5 rounded-full ${
                priceChange.percent >= 0 
                  ? 'bg-green-500/20 text-green-400' 
                  : 'bg-red-500/20 text-red-400'
              }`}>
                <TrendingUp className="w-3 h-3" />
                {priceChange.percent >= 0 ? '+' : ''}{priceChange.percent.toFixed(2)}%
              </span>
            </div>
          </div>
          
          {/* Timeframe selector */}
          <div className="flex gap-1 p-1 rounded-lg glass">
            {timeframes.map((tf) => (
              <Button
                key={tf.days}
                variant="ghost"
                size="sm"
                onClick={() => setSelectedTimeframe(tf.days)}
                className={`px-3 h-8 ${
                  selectedTimeframe === tf.days
                    ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {tf.label}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <AreaChart data={processedData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="sharePriceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              domain={['auto', 'auto']}
              tickFormatter={(value) => `$${value.toFixed(3)}`}
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value) => [`$${Number(value).toFixed(4)}`, 'Share Price']}
                  labelFormatter={(label, payload) => {
                    const data = payload?.[0]?.payload
                    return data?.fullDate || label
                  }}
                />
              }
            />
            <Area
              type="monotone"
              dataKey="sharePrice"
              stroke="hsl(var(--chart-1))"
              strokeWidth={2}
              fill="url(#sharePriceGradient)"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
