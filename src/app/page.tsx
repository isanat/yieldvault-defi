'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Wallet,
  TrendingUp,
  Shield,
  Users,
  Clock,
  Zap,
  ArrowRight,
  ChevronLeft,
  Copy,
  Check,
  Layers,
  Target,
  Lock,
  ArrowDownCircle,
  ArrowUpCircle,
  Share2,
  DollarSign,
  BarChart3,
  Gift,
  ExternalLink,
  CheckCircle,
  Globe,
  Coins,
  PieChart,
  Settings,
  ChevronRight,
  ChevronDown,
  AlertTriangle,
  RefreshCw,
  Activity,
  Percent,
  Database,
  Network,
  Link2,
  Info,
  Gauge,
  LineChart,
} from 'lucide-react'
import { toast, Toaster } from 'sonner'
import { useTranslation, languages } from '@/lib/i18n'
import { useWallet } from '@/hooks/useWallet'
import { useProtocolData } from '@/hooks/useProtocol'
import { useUserData } from '@/hooks/useUserData'
import { V3_CONTRACTS, STRATEGY_CONFIG } from '@/lib/blockchain/contracts'

// Animation variants
const slideVariants = {
  enter: { x: '100%', opacity: 0 },
  center: { x: 0, opacity: 1, transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] } },
  exit: { x: '100%', opacity: 0, transition: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] } },
}

const reverseSlideVariants = {
  enter: { x: '-100%', opacity: 0 },
  center: { x: 0, opacity: 1, transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] } },
  exit: { x: '-100%', opacity: 0, transition: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] } },
}

const staggerContainer = {
  animate: { transition: { staggerChildren: 0.08 } },
}

const staggerItem = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
}

// Polygon brand colors
const COLORS = {
  primary: 'purple',
  secondary: 'violet',
  accent: 'fuchsia',
  gradient: 'from-purple-500 via-violet-500 to-fuchsia-500',
  gradientAlt: 'from-purple-400 via-violet-400 to-fuchsia-400',
}

// ============================================
// MAIN APP
// ============================================
export default function YieldVaultApp() {
  const { t, language, setLanguage } = useTranslation()
  const wallet = useWallet()
  const { data: protocolData, isLoading: protocolLoading, refetch: refetchProtocol } = useProtocolData()
  const { data: userData, isLoading: userLoading, refetch: refetchUser } = useUserData(wallet.address)

  const [currentPage, setCurrentPage] = useState<'landing' | 'dashboard'>('landing')
  const [activeNav, setActiveNav] = useState('dashboard')
  const [depositDialog, setDepositDialog] = useState(false)
  const [withdrawDialog, setWithdrawDialog] = useState(false)
  const [referralDialog, setReferralDialog] = useState(false)
  const [amount, setAmount] = useState('')
  const [copied, setCopied] = useState(false)

  const currentLang = languages.find(l => l.code === language)

  const handleCopyReferral = () => {
    if (userData?.referral?.code) {
      navigator.clipboard.writeText(userData.referral.code)
      setCopied(true)
      toast.success(t('dashboard.referral.copied'))
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleConnectWallet = async () => {
    try {
      wallet.connect()
      toast.success(t('wallet.connecting'))
    } catch (error) {
      toast.error(t('wallet.connectError'))
    }
  }

  const handleDisconnectWallet = () => {
    wallet.disconnect()
    setCurrentPage('landing')
    toast.info(t('wallet.disconnected'))
  }

  const handleEnterDashboard = () => {
    if (wallet.isConnected) {
      if (!wallet.isCorrectNetwork) {
        wallet.switchToPolygon()
        toast.warning(t('wallet.switchNetwork'))
      } else {
        setCurrentPage('dashboard')
      }
    } else {
      handleConnectWallet()
    }
  }

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <Toaster position="top-right" />

      <AnimatePresence mode="wait">
        {currentPage === 'landing' ? (
          <LandingPage
            key="landing"
            isConnected={wallet.isConnected}
            address={wallet.address}
            onConnectWallet={handleConnectWallet}
            onDisconnectWallet={handleDisconnectWallet}
            onEnterDashboard={handleEnterDashboard}
            protocolData={protocolData}
            protocolLoading={protocolLoading}
            onRefetch={refetchProtocol}
            t={t}
            language={language}
            setLanguage={setLanguage}
            currentLang={currentLang}
            formatAddress={formatAddress}
            isCorrectNetwork={wallet.isCorrectNetwork}
            onSwitchNetwork={wallet.switchToPolygon}
          />
        ) : (
          <Dashboard
            key="dashboard"
            onBackToLanding={() => setCurrentPage('landing')}
            onDeposit={() => setDepositDialog(true)}
            onWithdraw={() => setWithdrawDialog(true)}
            onReferral={() => setReferralDialog(true)}
            activeNav={activeNav}
            setActiveNav={setActiveNav}
            wallet={wallet}
            userData={userData}
            userLoading={userLoading}
            protocolData={protocolData}
            onRefetchUser={refetchUser}
            t={t}
            language={language}
            setLanguage={setLanguage}
            currentLang={currentLang}
            formatAddress={formatAddress}
          />
        )}
      </AnimatePresence>

      {/* Deposit Dialog */}
      <Dialog open={depositDialog} onOpenChange={setDepositDialog}>
        <DialogContent className="bg-gray-900 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">{t('dashboard.deposit.title')}</DialogTitle>
            <DialogDescription className="text-gray-400">
              {t('dashboard.deposit.description')}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label className="text-gray-300">{t('dashboard.deposit.amount')}</Label>
            <div className="flex gap-2 mt-2">
              <Input
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="bg-gray-800 border-gray-700 text-white"
              />
              <Button variant="outline" className="border-gray-700 text-gray-300">
                USDT
              </Button>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              {t('dashboard.deposit.balance')}: {userData?.balance?.usdtFormatted || '0'} USDT
            </p>
          </div>
          <DialogFooter>
            <Button
              className={`bg-gradient-to-r ${COLORS.gradient} hover:opacity-90`}
              onClick={() => {
                toast.info('Funcionalidade de depósito requer assinatura da carteira')
                setDepositDialog(false)
              }}
            >
              {t('dashboard.deposit.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Withdraw Dialog */}
      <Dialog open={withdrawDialog} onOpenChange={setWithdrawDialog}>
        <DialogContent className="bg-gray-900 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">{t('dashboard.withdraw.title')}</DialogTitle>
            <DialogDescription className="text-gray-400">
              {t('dashboard.withdraw.description')}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label className="text-gray-300">{t('dashboard.withdraw.amount')}</Label>
            <div className="flex gap-2 mt-2">
              <Input
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="bg-gray-800 border-gray-700 text-white"
              />
              <Button variant="outline" className="border-gray-700 text-gray-300">
                USDT
              </Button>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              {t('dashboard.withdraw.available')}: {userData?.vault?.assetsFormatted || '0'} USDT
            </p>
          </div>
          <DialogFooter>
            <Button
              className={`bg-gradient-to-r ${COLORS.gradient} hover:opacity-90`}
              onClick={() => {
                toast.info('Funcionalidade de saque requer assinatura da carteira')
                setWithdrawDialog(false)
              }}
            >
              {t('dashboard.withdraw.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Referral Dialog */}
      <Dialog open={referralDialog} onOpenChange={setReferralDialog}>
        <DialogContent className="bg-gray-900 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">{t('dashboard.referral.title')}</DialogTitle>
            <DialogDescription className="text-gray-400">
              {t('dashboard.referral.description')}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="p-4 bg-gray-800 rounded-lg">
              <p className="text-sm text-gray-400 mb-2">{t('dashboard.referral.yourCode')}</p>
              <div className="flex items-center justify-between">
                <span className="text-xl font-mono text-purple-400">
                  {userData?.referral?.code || 'YV-' + (wallet.address?.slice(2, 8).toUpperCase() || 'XXXXXX')}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleCopyReferral}
                  className="text-gray-400 hover:text-white"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="p-3 bg-gray-800/50 rounded-lg">
                <p className="text-2xl font-bold text-purple-400">{userData?.referral?.directReferrals || 0}</p>
                <p className="text-sm text-gray-500">{t('dashboard.referral.direct')}</p>
              </div>
              <div className="p-3 bg-gray-800/50 rounded-lg">
                <p className="text-2xl font-bold text-fuchsia-400">{userData?.referral?.totalReferrals || 0}</p>
                <p className="text-sm text-gray-500">{t('dashboard.referral.total')}</p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ============================================
// LANDING PAGE COMPONENT
// ============================================
interface LandingPageProps {
  isConnected: boolean
  address: `0x${string}` | undefined
  onConnectWallet: () => void
  onDisconnectWallet: () => void
  onEnterDashboard: () => void
  protocolData: any
  protocolLoading: boolean
  onRefetch: () => void
  t: (key: string) => string
  language: string
  setLanguage: (lang: string) => void
  currentLang: any
  formatAddress: (addr: string) => string
  isCorrectNetwork: boolean
  onSwitchNetwork: () => void
}

function LandingPage({
  isConnected,
  address,
  onConnectWallet,
  onDisconnectWallet,
  onEnterDashboard,
  protocolData,
  protocolLoading,
  onRefetch,
  t,
  language,
  setLanguage,
  currentLang,
  formatAddress,
  isCorrectNetwork,
  onSwitchNetwork,
}: LandingPageProps) {
  const stats = protocolData?.stats || { tvlFormatted: '...', users: 0, avgAPY: '...', totalPaidOut: '...' }
  const fees = protocolData?.fees || { performanceFeeBP: 2000, depositFeeBP: 500, managementFeeBP: 200, withdrawalFeeBP: 0 }
  const strategies = protocolData?.strategies || { 
    aaveLoop: { apy: '8', risk: t('strategies.aave.riskLevel'), expectedApy: '8-15%' }, 
    stableLp: { apy: '15', risk: t('strategies.quickswap.riskLevel'), expectedApy: '12-25%' } 
  }
  const contracts = protocolData?.contracts || {}
  const referralRates = protocolData?.referralRates || [4000, 2500, 1500, 1200, 800]
  const isPaused = protocolData?.status?.isPaused || false

  return (
    <motion.div
      key="landing"
      variants={reverseSlideVariants}
      initial="enter"
      animate="center"
      exit="exit"
      className="min-h-screen bg-gray-950"
      suppressHydrationWarning
    >
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-gray-950/90 backdrop-blur-xl border-b border-gray-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 bg-gradient-to-br ${COLORS.gradient} rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/20`}>
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">YieldVault</h1>
                <p className="text-xs text-gray-500 hidden sm:block">{t('hero.badge')}</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="hidden md:flex items-center gap-6 text-sm" suppressHydrationWarning>
                <a href="#features" className="text-gray-400 hover:text-white transition-colors">{t('nav.features')}</a>
                <a href="#strategies" className="text-gray-400 hover:text-white transition-colors">{t('strategies.title')}</a>
                <a href="#security" className="text-gray-400 hover:text-white transition-colors">{t('nav.security')}</a>
                <a href="#contracts" className="text-gray-400 hover:text-white transition-colors">{t('security.contracts.title')}</a>
              </div>

              {/* Language Selector */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="text-gray-400 hover:text-white gap-2">
                    <span>{currentLang?.flag}</span>
                    <span className="hidden sm:inline">{currentLang?.name}</span>
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-gray-900 border-gray-700">
                  {languages.map((lang) => (
                    <DropdownMenuItem
                      key={lang.code}
                      onClick={() => setLanguage(lang.code)}
                      className={`text-gray-300 hover:text-white hover:bg-gray-800 ${language === lang.code ? 'bg-gray-800' : ''}`}
                    >
                      <span className="mr-2">{lang.flag}</span>
                      {lang.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Refresh Data Button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onRefetch()}
                className="text-gray-400 hover:text-white"
              >
                <RefreshCw className={`w-4 h-4 ${protocolLoading ? 'animate-spin' : ''}`} />
              </Button>

              {/* Wallet Button */}
              {isConnected ? (
                <div className="flex items-center gap-2">
                  {!isCorrectNetwork && (
                    <Button
                      variant="outline"
                      onClick={onSwitchNetwork}
                      className="border-orange-500/50 text-orange-400 hover:bg-orange-500/10"
                    >
                      <AlertTriangle className="w-4 h-4 mr-2" />
                      {t('wallet.switchNetwork')}
                    </Button>
                  )}
                  <Button
                    onClick={onDisconnectWallet}
                    className="border border-purple-500/50 text-purple-400 bg-purple-500/10 hover:bg-purple-500/20"
                  >
                    <Wallet className="w-4 h-4 mr-2" />
                    {formatAddress(address || '')}
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={onConnectWallet}
                  className={`bg-gradient-to-r ${COLORS.gradient} hover:opacity-90 text-white shadow-lg shadow-purple-500/25`}
                >
                  <Wallet className="w-4 h-4 mr-2" />
                  {t('nav.connect')}
                </Button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center pt-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-purple-500/5 via-transparent to-transparent" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl" />

        {/* Protocol Status Badge */}
        {isPaused && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 z-10">
            <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 px-4 py-2">
              <AlertTriangle className="w-4 h-4 mr-2" />
              {t('security.pausable.title')}
            </Badge>
          </div>
        )}

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <motion.div
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className="text-center"
          >
            <motion.div variants={staggerItem} className="flex justify-center mb-8">
              <Badge className={`bg-purple-500/10 text-purple-400 border-purple-500/30 px-4 py-2 text-sm`}>
                <Zap className="w-4 h-4 mr-2" />
                {t('hero.badge')}
              </Badge>
            </motion.div>

            <motion.h1
              variants={staggerItem}
              className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight"
            >
              {t('hero.title1')}
              <br />
              <span className={`bg-gradient-to-r ${COLORS.gradientAlt} bg-clip-text text-transparent`}>
                {t('hero.title2')}
              </span>
            </motion.h1>

            <motion.p
              variants={staggerItem}
              className="text-xl text-gray-400 max-w-3xl mx-auto mb-10 leading-relaxed"
            >
              {t('hero.description')}
            </motion.p>

            <motion.div variants={staggerItem} className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Button
                onClick={onConnectWallet}
                size="lg"
                className={`bg-gradient-to-r ${COLORS.gradient} hover:opacity-90 text-white px-10 py-6 text-lg shadow-xl shadow-purple-500/25`}
              >
                <Wallet className="w-5 h-5 mr-2" />
                {t('hero.connectWallet')}
              </Button>
              <Button
                onClick={onEnterDashboard}
                size="lg"
                disabled={!isConnected}
                variant="outline"
                className="border-gray-700 text-white hover:bg-gray-800 px-10 py-6 text-lg disabled:opacity-50"
              >
                {t('hero.openDashboard')}
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </motion.div>

            {/* Real Stats */}
            <motion.div variants={staggerItem}>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
                <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-4 backdrop-blur-sm">
                  <DollarSign className="w-6 h-6 text-purple-400 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-white">
                    {protocolLoading ? '...' : stats.tvlFormatted}
                  </p>
                  <p className="text-sm text-gray-500">{t('stats.tvl')}</p>
                </div>
                <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-4 backdrop-blur-sm">
                  <Users className="w-6 h-6 text-violet-400 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-white">
                    {protocolLoading ? '...' : stats.users.toLocaleString()}+
                  </p>
                  <p className="text-sm text-gray-500">{t('stats.users')}</p>
                </div>
                <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-4 backdrop-blur-sm">
                  <TrendingUp className="w-6 h-6 text-fuchsia-400 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-white">
                    {protocolLoading ? '...' : stats.avgAPY}%
                  </p>
                  <p className="text-sm text-gray-500">{t('stats.apy')}</p>
                </div>
                <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-4 backdrop-blur-sm">
                  <Coins className="w-6 h-6 text-purple-400 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-white">
                    {protocolLoading ? '...' : stats.totalPaidOut}
                  </p>
                  <p className="text-sm text-gray-500">{t('stats.paidOut')}</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-4 sm:px-6 lg:px-8 bg-gray-900/50">
        <div className="max-w-7xl mx-auto">
          <motion.div
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
          >
            <motion.div variants={staggerItem} className="text-center mb-16">
              <h2 className="text-4xl font-bold text-white mb-4">{t('features.title')}</h2>
              <p className="text-xl text-gray-400 max-w-2xl mx-auto">{t('features.subtitle')}</p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { icon: Layers, title: t('features.erc4626.title'), desc: t('features.erc4626.description'), details: [t('features.erc4626.detail1'), t('features.erc4626.detail2'), t('features.erc4626.detail3')], color: 'purple' },
                { icon: Target, title: t('features.multiStrategy.title'), desc: t('features.multiStrategy.description'), details: [t('features.multiStrategy.detail1'), t('features.multiStrategy.detail2'), t('features.multiStrategy.detail3')], color: 'violet' },
                { icon: Users, title: t('features.referral.title'), desc: t('features.referral.description'), details: [t('features.referral.detail1'), t('features.referral.detail2'), t('features.referral.detail3'), t('features.referral.detail4'), t('features.referral.detail5')], color: 'fuchsia' },
                { icon: Lock, title: t('features.security.title'), desc: t('features.security.description'), details: [t('features.security.detail1'), t('features.security.detail2'), t('features.security.detail3'), t('features.security.detail4')], color: 'purple' },
              ].map((feature, index) => (
                <motion.div key={index} variants={staggerItem}>
                  <Card className="bg-gray-800/30 border-gray-700/50 h-full hover:border-purple-500/30 transition-all duration-300">
                    <CardHeader>
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 bg-${feature.color}-500/10`}>
                        <feature.icon className={`w-7 h-7 text-${feature.color}-400`} />
                      </div>
                      <CardTitle className="text-white text-xl">{feature.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-gray-400 text-base mb-4">{feature.desc}</CardDescription>
                      <ul className="space-y-2">
                        {feature.details.map((detail, i) => (
                          <li key={i} className="flex items-center gap-2 text-sm text-gray-300">
                            <CheckCircle className="w-4 h-4 text-purple-400 flex-shrink-0" />
                            {detail}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Strategies Section - REAL DATA */}
      <section id="strategies" className="py-24 px-4 sm:px-6 lg:px-8 bg-gray-900/50">
        <div className="max-w-7xl mx-auto">
          <motion.div
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
          >
            <motion.div variants={staggerItem} className="text-center mb-16">
              <h2 className="text-4xl font-bold text-white mb-4">{t('strategies.title')}</h2>
              <p className="text-xl text-gray-400 max-w-2xl mx-auto">{t('strategies.subtitle')}</p>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Aave Loop Strategy */}
              <motion.div variants={staggerItem}>
                <Card className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border-blue-500/30 h-full">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-blue-500/20 rounded-2xl flex items-center justify-center">
                          <Globe className="w-8 h-8 text-blue-400" />
                        </div>
                        <div>
                          <CardTitle className="text-white text-xl">{t('strategies.aave.title')}</CardTitle>
                          <Badge className="bg-green-500/20 text-green-400 mt-1">
                            <CheckCircle className="w-3 h-3 mr-1" /> {t('strategies.aave.badge')}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-blue-400">50%</p>
                        <p className="text-xs text-gray-500">{t('strategies.allocation')}</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-400 mb-4">{t('strategies.aave.description')}</p>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="p-3 bg-gray-900/50 rounded-xl">
                        <p className="text-sm text-gray-500">{t('strategies.aave.apy')}</p>
                        <p className="text-xl font-bold text-blue-400">{STRATEGY_CONFIG.aaveLoop.expectedApy}</p>
                      </div>
                      <div className="p-3 bg-gray-900/50 rounded-xl">
                        <p className="text-sm text-gray-500">{t('strategies.aave.risk')}</p>
                        <p className="text-xl font-bold text-yellow-400">{t('strategies.aave.riskLevel')}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">{t('contract.address')}:</span>
                      <div className="flex items-center gap-2">
                        <code className="text-gray-300 text-xs">{V3_CONTRACTS.aaveLoopStrategy.slice(0, 10)}...</code>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-6 w-6 p-0" 
                          onClick={() => window.open(`https://polygonscan.com/address/${V3_CONTRACTS.aaveLoopStrategy}`, '_blank')}
                        >
                          <ExternalLink className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Stable LP Strategy */}
              <motion.div variants={staggerItem}>
                <Card className="bg-gradient-to-br from-fuchsia-500/10 to-purple-500/10 border-fuchsia-500/30 h-full">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-fuchsia-500/20 rounded-2xl flex items-center justify-center">
                          <PieChart className="w-8 h-8 text-fuchsia-400" />
                        </div>
                        <div>
                          <CardTitle className="text-white text-xl">{t('strategies.quickswap.title')}</CardTitle>
                          <Badge className="bg-green-500/20 text-green-400 mt-1">
                            <CheckCircle className="w-3 h-3 mr-1" /> {t('strategies.quickswap.badge')}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-fuchsia-400">50%</p>
                        <p className="text-xs text-gray-500">{t('strategies.allocation')}</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-400 mb-4">{t('strategies.quickswap.description')}</p>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="p-3 bg-gray-900/50 rounded-xl">
                        <p className="text-sm text-gray-500">{t('strategies.aave.apy')}</p>
                        <p className="text-xl font-bold text-fuchsia-400">{STRATEGY_CONFIG.stableLp.expectedApy}</p>
                      </div>
                      <div className="p-3 bg-gray-900/50 rounded-xl">
                        <p className="text-sm text-gray-500">{t('strategies.aave.risk')}</p>
                        <p className="text-xl font-bold text-green-400">{t('strategies.quickswap.riskLevel')}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">{t('contract.address')}:</span>
                      <div className="flex items-center gap-2">
                        <code className="text-gray-300 text-xs">{V3_CONTRACTS.stableLpStrategy.slice(0, 10)}...</code>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-6 w-6 p-0" 
                          onClick={() => window.open(`https://polygonscan.com/address/${V3_CONTRACTS.stableLpStrategy}`, '_blank')}
                        >
                          <ExternalLink className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {/* Strategy Controller Info */}
            <motion.div variants={staggerItem} className="mt-8">
              <Card className="bg-gray-800/30 border-gray-700/50">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center">
                        <Settings className="w-5 h-5 text-purple-400" />
                      </div>
                      <div>
                        <p className="text-white font-medium">{t('contract.strategyController')}</p>
                        <p className="text-xs text-gray-500">{t('strategies.controllerDesc')}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <code className="text-gray-300 text-xs bg-gray-800 px-3 py-1 rounded">{V3_CONTRACTS.strategyController}</code>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="h-8 w-8 p-0" 
                        onClick={() => window.open(`https://polygonscan.com/address/${V3_CONTRACTS.strategyController}`, '_blank')}
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Contracts Section */}
      <section id="contracts" className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
          >
            <motion.div variants={staggerItem} className="text-center mb-16">
              <h2 className="text-4xl font-bold text-white mb-4">{t('security.contracts.title')}</h2>
              <p className="text-xl text-gray-400 max-w-2xl mx-auto">{t('contracts.onPolygon')}</p>
            </motion.div>

            <motion.div variants={staggerItem}>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { name: t('contract.vault'), address: V3_CONTRACTS.vault, icon: Layers, desc: 'ERC-4626 Tokenized Vault' },
                  { name: t('contract.strategyController'), address: V3_CONTRACTS.strategyController, icon: Settings, desc: t('strategies.controllerDesc') },
                  { name: t('contract.aaveStrategy'), address: V3_CONTRACTS.aaveLoopStrategy, icon: Globe, desc: t('strategies.aave.badge') },
                  { name: t('contract.stableLpStrategy'), address: V3_CONTRACTS.stableLpStrategy, icon: PieChart, desc: t('strategies.quickswap.badge') },
                  { name: t('contract.referral'), address: V3_CONTRACTS.referral, icon: Users, desc: t('features.referral.title') },
                  { name: t('contract.feeDistributor'), address: V3_CONTRACTS.feeDistributor, icon: DollarSign, desc: t('fees.title') },
                ].map((contract, index) => (
                  <Card key={index} className="bg-gray-800/30 border-gray-700/50 hover:border-purple-500/30 transition-colors">
                    <CardContent className="pt-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                          <contract.icon className="w-5 h-5 text-purple-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-medium">{contract.name}</p>
                          <p className="text-xs text-gray-500 mb-2">{contract.desc}</p>
                          <div className="flex items-center gap-2">
                            <code className="text-xs text-gray-400 truncate">{contract.address.slice(0, 8)}...{contract.address.slice(-6)}</code>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="h-5 w-5 p-0" 
                              onClick={() => window.open(`https://polygonscan.com/address/${contract.address}`, '_blank')}
                            >
                              <ExternalLink className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Referral System */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-gray-900/50">
        <div className="max-w-7xl mx-auto">
          <motion.div
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
          >
            <motion.div variants={staggerItem} className="text-center mb-16">
              <h2 className="text-4xl font-bold text-white mb-4">{t('referral.title')}</h2>
              <p className="text-xl text-gray-400 max-w-2xl mx-auto">{t('referral.subtitle')}</p>
            </motion.div>

            <motion.div variants={staggerItem}>
              <Card className="bg-gradient-to-r from-purple-500/10 via-violet-500/10 to-fuchsia-500/10 border-purple-500/30 max-w-4xl mx-auto">
                <CardContent className="pt-8">
                  <div className="grid grid-cols-5 gap-4 mb-8">
                    {referralRates.map((rate, index) => (
                      <div key={index} className="text-center">
                        <div className={`w-full aspect-square rounded-2xl flex flex-col items-center justify-center mb-2 ${
                          index === 0 ? 'bg-purple-500/30 border-2 border-purple-400' :
                          index === 1 ? 'bg-purple-500/20 border border-purple-500/50' :
                          'bg-gray-800/50 border border-gray-700'
                        }`}>
                          <span className="text-xs text-gray-400 mb-1">{t('referral.level')} {index + 1}</span>
                          <span className={`text-2xl font-bold ${index === 0 ? 'text-purple-300' : 'text-purple-400'}`}>
                            {rate / 100}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="text-center">
                    <p className="text-gray-400 mb-4">
                      <span className="text-3xl font-bold text-purple-400">100%</span> {t('referral.total')}
                    </p>
                    <p className="text-sm text-gray-500 max-w-xl mx-auto">{t('referral.explanation')}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Fee Structure - Real Fees */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
          >
            <motion.div variants={staggerItem} className="text-center mb-16">
              <h2 className="text-4xl font-bold text-white mb-4">{t('fees.title')}</h2>
              <p className="text-xl text-gray-400 max-w-2xl mx-auto">{t('fees.subtitle')}</p>
            </motion.div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
              {[
                { value: fees.performanceFeeBP / 100, title: t('fees.performance.title'), desc: t('fees.performance.description'), color: 'blue' },
                { value: fees.depositFeeBP / 100, title: t('fees.deposit.title'), desc: t('fees.deposit.description'), color: 'violet' },
                { value: fees.managementFeeBP / 100, title: t('fees.management.title'), desc: t('fees.management.description'), color: 'fuchsia' },
                { value: fees.withdrawalFeeBP / 100, title: t('fees.withdrawal.title'), desc: t('fees.withdrawal.description'), color: 'purple' },
              ].map((fee, index) => (
                <motion.div key={index} variants={staggerItem}>
                  <Card className={`bg-gray-800/50 border-gray-700 text-center h-full ${fee.value === 0 ? 'border-purple-500/30' : ''}`}>
                    <CardContent className="pt-8 pb-6">
                      <p className={`text-4xl font-bold text-${fee.color}-400 mb-2`}>{fee.value}%</p>
                      <p className="text-sm text-gray-400 font-medium">{fee.title}</p>
                      <p className="text-xs text-gray-500 mt-2">{fee.desc}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-gray-900/50 to-gray-950">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl font-bold text-white mb-6">{t('cta.title')}</h2>
            <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto">{t('cta.subtitle')}</p>
            <Button
              onClick={isConnected ? onEnterDashboard : onConnectWallet}
              size="lg"
              className={`bg-gradient-to-r ${COLORS.gradient} hover:opacity-90 text-white px-12 py-6 text-lg shadow-xl shadow-purple-500/25`}
            >
              {isConnected ? (
                <>
                  {t('hero.openDashboard')}
                  <ArrowRight className="w-5 h-5 ml-2" />
                </>
              ) : (
                <>
                  <Wallet className="w-5 h-5 mr-2" />
                  {t('hero.connectWallet')}
                </>
              )}
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 bg-gradient-to-br ${COLORS.gradient} rounded-xl flex items-center justify-center`}>
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-white font-semibold">YieldVault DeFi</p>
                <p className="text-xs text-gray-500">{t('hero.badge')}</p>
              </div>
            </div>

            <div className="flex items-center gap-6 text-sm text-gray-400">
              <a href="#" className="hover:text-white transition-colors">{t('footer.docs')}</a>
              <a href="#" className="hover:text-white transition-colors">{t('footer.github')}</a>
              <a href="#" className="hover:text-white transition-colors">{t('footer.discord')}</a>
              <a href="#" className="hover:text-white transition-colors">{t('footer.twitter')}</a>
            </div>

            <p className="text-sm text-gray-500">© 2025 YieldVault. {t('footer.rights')}</p>
          </div>
        </div>
      </footer>
    </motion.div>
  )
}

// ============================================
// DASHBOARD COMPONENT
// ============================================
interface DashboardProps {
  onBackToLanding: () => void
  onDeposit: () => void
  onWithdraw: () => void
  onReferral: () => void
  activeNav: string
  setActiveNav: (nav: string) => void
  wallet: any
  userData: any
  userLoading: boolean
  protocolData: any
  onRefetchUser: () => void
  t: (key: string) => string
  language: string
  setLanguage: (lang: string) => void
  currentLang: any
  formatAddress: (addr: string) => string
}

function Dashboard({
  onBackToLanding,
  onDeposit,
  onWithdraw,
  onReferral,
  wallet,
  userData,
  userLoading,
  protocolData,
  onRefetchUser,
  t,
  language,
  setLanguage,
  currentLang,
  formatAddress,
}: DashboardProps) {
  const stats = protocolData?.stats || { tvlFormatted: '...', avgAPY: '...', users: 0 }
  const strategies = protocolData?.strategies || {
    aaveLoop: { apy: '8-15', isActive: true, allocation: 5000 },
    stableLp: { apy: '12-25', isActive: true, allocation: 5000 },
  }
  
  const userSummary = userData?.summary || {
    totalDeposited: '0',
    totalWithdrawn: '0',
    currentBalance: '0',
    totalEarnings: '0',
    referralEarnings: '0',
  }

  // Calculate earnings percentage
  const earningsPercent = userSummary.totalDeposited && parseFloat(userSummary.totalDeposited) > 0
    ? ((parseFloat(userSummary.totalEarnings) / parseFloat(userSummary.totalDeposited)) * 100).toFixed(2)
    : '0'

  return (
    <motion.div
      key="dashboard"
      variants={slideVariants}
      initial="enter"
      animate="center"
      exit="exit"
      className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 flex flex-col"
    >
      {/* Compact Header */}
      <header className="sticky top-0 z-50 bg-gray-950/95 backdrop-blur-xl border-b border-purple-500/20">
        <div className="flex items-center justify-between px-4 h-14">
          {/* Left: Back + Logo */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBackToLanding}
              className="text-gray-400 hover:text-white p-2"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 bg-gradient-to-br ${COLORS.gradient} rounded-lg flex items-center justify-center shadow-lg shadow-purple-500/30`}>
                <TrendingUp className="w-4 h-4 text-white" />
              </div>
              <div className="hidden sm:block">
                <span className="text-white font-bold text-sm">YieldVault</span>
                <span className="text-gray-500 text-xs ml-1">V3</span>
              </div>
            </div>
          </div>

          {/* Center: Address */}
          <div className="flex items-center gap-1 bg-gray-800/50 px-3 py-1.5 rounded-full">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs text-gray-400 font-mono">{formatAddress(wallet.address || '')}</span>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onRefetchUser()}
              className="text-gray-400 hover:text-white p-2"
            >
              <RefreshCw className={`w-4 h-4 ${userLoading ? 'animate-spin' : ''}`} />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white p-2">
                  <span className="text-lg">{currentLang?.flag}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-gray-900 border-gray-700">
                {languages.map((lang) => (
                  <DropdownMenuItem
                    key={lang.code}
                    onClick={() => setLanguage(lang.code)}
                    className={`text-gray-300 hover:text-white hover:bg-gray-800 ${language === lang.code ? 'bg-gray-800' : ''}`}
                  >
                    <span className="mr-2">{lang.flag}</span>
                    {lang.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main Content - Scrollable */}
      <main className="flex-1 overflow-y-auto pb-32">
        {/* Hero Balance Card */}
        <div className="px-4 pt-4">
          <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${COLORS.gradient} p-5 shadow-2xl shadow-purple-500/20`}>
            <div className="absolute inset-0 opacity-10">
              <div className="absolute -right-10 -top-10 w-40 h-40 bg-white rounded-full blur-3xl" />
              <div className="absolute -left-10 -bottom-10 w-32 h-32 bg-white rounded-full blur-2xl" />
            </div>

            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <span className="text-white/80 text-sm font-medium">{t('dashboard.stats.balance')}</span>
                <div className="flex items-center gap-1 bg-white/20 px-2 py-1 rounded-full">
                  <Zap className="w-3 h-3 text-yellow-300" />
                  <span className="text-xs text-white font-medium">{stats.avgAPY}% APY</span>
                </div>
              </div>

              <div className="flex items-baseline gap-2 mb-4">
                <span className="text-4xl font-bold text-white tracking-tight">
                  ${userLoading ? '...' : userSummary.currentBalance}
                </span>
                <span className="text-white/70 text-lg">USDT</span>
              </div>

              {/* Mini Stats Row */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white/10 rounded-xl p-3 backdrop-blur-sm">
                  <div className="flex items-center gap-1.5 mb-1">
                    <ArrowDownCircle className="w-3.5 h-3.5 text-white/70" />
                    <span className="text-white/60 text-xs">{t('dashboard.stats.deposited')}</span>
                  </div>
                  <p className="text-white font-semibold text-sm">${userSummary.totalDeposited}</p>
                </div>
                <div className="bg-white/10 rounded-xl p-3 backdrop-blur-sm">
                  <div className="flex items-center gap-1.5 mb-1">
                    <TrendingUp className="w-3.5 h-3.5 text-green-300" />
                    <span className="text-white/60 text-xs">{t('dashboard.stats.earnings')}</span>
                  </div>
                  <p className="text-green-300 font-semibold text-sm">+${userSummary.totalEarnings}</p>
                </div>
                <div className="bg-white/10 rounded-xl p-3 backdrop-blur-sm">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Gift className="w-3.5 h-3.5 text-yellow-300" />
                    <span className="text-white/60 text-xs">{t('dashboard.userInfo.referralEarnings')}</span>
                  </div>
                  <p className="text-yellow-300 font-semibold text-sm">${userSummary.referralEarnings}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Strategy Cards */}
        <div className="px-4 mt-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white font-semibold">{t('strategies.active')}</h3>
            <Badge className="bg-green-500/20 text-green-400 text-xs">
              <Activity className="w-3 h-3 mr-1" /> 2 {t('strategies.activeCount')}
            </Badge>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            {/* Aave Loop */}
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Globe className="w-4 h-4 text-blue-400" />
                <span className="text-white text-sm font-medium">{t('strategies.aave.badge')}</span>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-400 font-bold text-lg">{strategies.aaveLoop?.apyRange || '8-15%'}</p>
                  <p className="text-gray-500 text-xs">APY</p>
                </div>
                <Badge className="bg-blue-500/20 text-blue-300">50%</Badge>
              </div>
            </div>

            {/* Stable LP */}
            <div className="bg-fuchsia-500/10 border border-fuchsia-500/30 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <PieChart className="w-4 h-4 text-fuchsia-400" />
                <span className="text-white text-sm font-medium">{t('strategies.quickswap.badge')}</span>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-fuchsia-400 font-bold text-lg">{strategies.stableLp?.apyRange || '12-25%'}</p>
                  <p className="text-gray-500 text-xs">APY</p>
                </div>
                <Badge className="bg-fuchsia-500/20 text-fuchsia-300">50%</Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="px-4 mt-4">
          <div className="grid grid-cols-2 gap-3">
            {/* Wallet Balance */}
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <Wallet className="w-4 h-4 text-blue-400" />
                </div>
                <span className="text-gray-400 text-xs">{t('dashboard.userInfo.walletBalance')}</span>
              </div>
              <p className="text-white font-bold text-lg">{userData?.balance?.usdtFormatted || '0'} <span className="text-gray-500 text-sm">USDT</span></p>
            </div>

            {/* Vault Shares */}
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                  <Layers className="w-4 h-4 text-purple-400" />
                </div>
                <span className="text-gray-400 text-xs">{t('dashboard.userInfo.vaultShares')}</span>
              </div>
              <p className="text-white font-bold text-lg">{userData?.vault?.sharesFormatted?.slice(0, 8) || '0'} <span className="text-gray-500 text-sm">yvUSDT</span></p>
            </div>
          </div>
        </div>

        {/* Performance Card */}
        <div className="px-4 mt-4">
          <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                  <LineChart className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <p className="text-gray-400 text-xs">{t('dashboard.stats.earnings')}</p>
                  <p className="text-white font-bold text-xl">+{earningsPercent}%</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-gray-400 text-xs">ROI</p>
                <p className="text-green-400 font-bold text-xl">+${userSummary.totalEarnings}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Protocol Info */}
        <div className="px-4 mt-4">
          <div className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 className="w-4 h-4 text-fuchsia-400" />
              <span className="text-gray-400 text-sm font-medium">{t('dashboard.protocol.title')}</span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center">
                <p className="text-white font-bold text-base">{stats.tvlFormatted}</p>
                <p className="text-gray-500 text-xs">{t('dashboard.protocol.tvl')}</p>
              </div>
              <div className="text-center border-x border-gray-700/50">
                <p className="text-white font-bold text-base">{stats.users?.toLocaleString() || 0}+</p>
                <p className="text-gray-500 text-xs">{t('dashboard.protocol.users')}</p>
              </div>
              <div className="text-center">
                <p className="text-purple-400 font-bold text-base">{stats.avgAPY}%</p>
                <p className="text-gray-500 text-xs">{t('dashboard.protocol.avgAPY')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Referral Banner */}
        <div className="px-4 mt-4">
          <button
            onClick={onReferral}
            className="w-full bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/30 rounded-xl p-4 flex items-center justify-between group hover:border-yellow-500/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
                <Gift className="w-5 h-5 text-yellow-400" />
              </div>
              <div className="text-left">
                <p className="text-white font-medium text-sm">{t('dashboard.referral.title')}</p>
                <p className="text-gray-400 text-xs">100% {t('referral.total')}</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-yellow-400 transition-colors" />
          </button>
        </div>
      </main>

      {/* Fixed Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-gray-950/95 backdrop-blur-xl border-t border-gray-800/50">
        <div className="px-4 py-3">
          {/* Primary Actions */}
          <div className="grid grid-cols-2 gap-3 mb-3">
            <Button
              onClick={onDeposit}
              className={`bg-gradient-to-r ${COLORS.gradient} hover:opacity-90 h-14 rounded-xl shadow-lg shadow-purple-500/25 font-semibold text-base`}
            >
              <ArrowDownCircle className="w-5 h-5 mr-2" />
              {t('dashboard.actions.deposit')}
            </Button>
            <Button
              onClick={onWithdraw}
              variant="outline"
              className="border-gray-600 text-white hover:bg-gray-800 h-14 rounded-xl font-semibold text-base"
            >
              <ArrowUpCircle className="w-5 h-5 mr-2" />
              {t('dashboard.actions.withdraw')}
            </Button>
          </div>

          {/* Secondary Actions */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={onReferral}
              variant="ghost"
              className="text-gray-400 hover:text-white hover:bg-gray-800/50 h-11 rounded-xl text-sm"
            >
              <Gift className="w-4 h-4 mr-2" />
              {t('dashboard.actions.referral')}
            </Button>
            <Button
              variant="ghost"
              className="text-gray-400 hover:text-white hover:bg-gray-800/50 h-11 rounded-xl text-sm"
              onClick={() => window.open(`https://polygonscan.com/address/${wallet.address}`, '_blank')}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              {t('dashboard.actions.explorer')}
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
