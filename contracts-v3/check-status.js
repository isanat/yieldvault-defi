const { createPublicClient, http } = require('viem')
const { polygon } = require('viem/chains')

// Contract Addresses - from deploy log
const CONTRACTS = {
  vault: '0x6565D903E231F8B15283d2a33fe736498DC4b7E6',
  config: '0xc7Ab7cE286906B21410201322EdC34faD144a661',
  referral: '0xe09b20b36165fFa9203ca4757bE56562265fD9fd',
  feeDistributor: '0x55D151794bA83cFF8b76452f7A7451f4C4C8cd08',
  localStrategyManager: '0xC12f26E8fC654e49cCe589B37EfEB07c23cbC97b',
  usdt: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
  owner: '0xc7284fEc59a599C49889DD8532b4de7Db81b0340',
}

const RPC_URL = 'https://polygon.api.onfinality.io/public'

// Minimal ABIs
const VAULT_ABI = [
  'function asset() view returns (address)',
  'function totalAssets() view returns (uint256)',
  'function totalSupply() view returns (uint256)',
  'function paused() view returns (bool)',
  'function owner() view returns (address)',
  'function strategyManager() view returns (address)',
  'function feeDistributor() view returns (address)',
  'function config() view returns (address)',
  'function performanceFeeBP() view returns (uint256)',
  'function depositFeeBP() view returns (uint256)',
  'function withdrawalFeeBP() view returns (uint256)',
]

const STRATEGY_ABI = [
  'function owner() view returns (address)',
  'function vault() view returns (address)',
  'function estimatedAPY() view returns (uint256)',
  'function isActive() view returns (bool)',
  'function simulateYieldBPS() view returns (uint256)',
]

const FEE_ABI = [
  'function owner() view returns (address)',
  'function vault() view returns (address)',
  'function referral() view returns (address)',
]

const REFERRAL_ABI = [
  'function owner() view returns (address)',
  'function levelRates(uint256) view returns (uint256)',
]

const CONFIG_ABI = [
  'function owner() view returns (address)',
  'function referralContract() view returns (address)',
]

async function main() {
  const client = createPublicClient({
    chain: polygon,
    transport: http(RPC_URL),
  })

  console.log('\n========================================')
  console.log('YIELDVAULT V3 - STATUS CHECK')
  console.log('========================================\n')

  try {
    // 1. Check Vault
    console.log('📦 YIELDVAULT V3')
    console.log('─'.repeat(40))
    
    const vaultOwner = await client.readContract({
      address: CONTRACTS.vault,
      abi: VAULT_ABI,
      functionName: 'owner',
    })
    console.log(`Owner: ${vaultOwner}`)
    console.log(`Expected: ${CONTRACTS.owner} ${vaultOwner.toLowerCase() === CONTRACTS.owner.toLowerCase() ? '✅' : '❌'}`)

    const asset = await client.readContract({
      address: CONTRACTS.vault,
      abi: VAULT_ABI,
      functionName: 'asset',
    })
    console.log(`Asset: ${asset}`)
    console.log(`Expected USDT: ${CONTRACTS.usdt} ${asset.toLowerCase() === CONTRACTS.usdt.toLowerCase() ? '✅' : '❌'}`)

    const totalAssets = await client.readContract({
      address: CONTRACTS.vault,
      abi: VAULT_ABI,
      functionName: 'totalAssets',
    })
    console.log(`Total Assets: ${(Number(totalAssets) / 1e6).toFixed(2)} USDT`)

    const totalSupply = await client.readContract({
      address: CONTRACTS.vault,
      abi: VAULT_ABI,
      functionName: 'totalSupply',
    })
    console.log(`Total Shares: ${(Number(totalSupply) / 1e6).toFixed(2)} yvUSDT`)

    const paused = await client.readContract({
      address: CONTRACTS.vault,
      abi: VAULT_ABI,
      functionName: 'paused',
    })
    console.log(`Paused: ${paused ? '🔴 YES' : '🟢 NO'}`)

    const strategyManager = await client.readContract({
      address: CONTRACTS.vault,
      abi: VAULT_ABI,
      functionName: 'strategyManager',
    })
    console.log(`Strategy Manager: ${strategyManager}`)
    console.log(`Expected: ${CONTRACTS.localStrategyManager} ${strategyManager.toLowerCase() === CONTRACTS.localStrategyManager.toLowerCase() ? '✅' : '❌'}`)

    const feeDistributor = await client.readContract({
      address: CONTRACTS.vault,
      abi: VAULT_ABI,
      functionName: 'feeDistributor',
    })
    console.log(`Fee Distributor: ${feeDistributor}`)
    console.log(`Expected: ${CONTRACTS.feeDistributor} ${feeDistributor.toLowerCase() === CONTRACTS.feeDistributor.toLowerCase() ? '✅' : '❌'}`)

    const config = await client.readContract({
      address: CONTRACTS.vault,
      abi: VAULT_ABI,
      functionName: 'config',
    })
    console.log(`Config: ${config}`)
    console.log(`Expected: ${CONTRACTS.config} ${config.toLowerCase() === CONTRACTS.config.toLowerCase() ? '✅' : '❌'}`)

    // Fees
    const perfFee = await client.readContract({
      address: CONTRACTS.vault,
      abi: VAULT_ABI,
      functionName: 'performanceFeeBP',
    })
    const depositFee = await client.readContract({
      address: CONTRACTS.vault,
      abi: VAULT_ABI,
      functionName: 'depositFeeBP',
    })
    const withdrawFee = await client.readContract({
      address: CONTRACTS.vault,
      abi: VAULT_ABI,
      functionName: 'withdrawalFeeBP',
    })
    console.log(`\nFees: Performance ${Number(perfFee)/100}%, Deposit ${Number(depositFee)/100}%, Withdrawal ${Number(withdrawFee)/100}%`)

    console.log('\n📦 LOCAL STRATEGY MANAGER')
    console.log('─'.repeat(40))
    
    const stratOwner = await client.readContract({
      address: CONTRACTS.localStrategyManager,
      abi: STRATEGY_ABI,
      functionName: 'owner',
    })
    console.log(`Owner: ${stratOwner}`)
    console.log(`Expected: ${CONTRACTS.owner} ${stratOwner.toLowerCase() === CONTRACTS.owner.toLowerCase() ? '✅' : '❌'}`)

    const stratVault = await client.readContract({
      address: CONTRACTS.localStrategyManager,
      abi: STRATEGY_ABI,
      functionName: 'vault',
    })
    console.log(`Vault: ${stratVault}`)
    console.log(`Expected: ${CONTRACTS.vault} ${stratVault.toLowerCase() === CONTRACTS.vault.toLowerCase() ? '✅' : '❌'}`)

    const estimatedAPY = await client.readContract({
      address: CONTRACTS.localStrategyManager,
      abi: STRATEGY_ABI,
      functionName: 'estimatedAPY',
    })
    console.log(`Estimated APY: ${Number(estimatedAPY) / 100}%`)

    const isActive = await client.readContract({
      address: CONTRACTS.localStrategyManager,
      abi: STRATEGY_ABI,
      functionName: 'isActive',
    })
    console.log(`Active: ${isActive ? '🟢 YES' : '🔴 NO'}`)

    const simulateYield = await client.readContract({
      address: CONTRACTS.localStrategyManager,
      abi: STRATEGY_ABI,
      functionName: 'simulateYieldBPS',
    })
    console.log(`Simulated Yield: ${Number(simulateYield) / 100}%`)

    console.log('\n📦 FEE DISTRIBUTOR')
    console.log('─'.repeat(40))
    
    const feeOwner = await client.readContract({
      address: CONTRACTS.feeDistributor,
      abi: FEE_ABI,
      functionName: 'owner',
    })
    console.log(`Owner: ${feeOwner}`)

    const feeVault = await client.readContract({
      address: CONTRACTS.feeDistributor,
      abi: FEE_ABI,
      functionName: 'vault',
    })
    console.log(`Vault: ${feeVault}`)

    const feeReferral = await client.readContract({
      address: CONTRACTS.feeDistributor,
      abi: FEE_ABI,
      functionName: 'referral',
    })
    console.log(`Referral: ${feeReferral}`)

    console.log('\n📦 REFERRAL')
    console.log('─'.repeat(40))
    
    const refOwner = await client.readContract({
      address: CONTRACTS.referral,
      abi: REFERRAL_ABI,
      functionName: 'owner',
    })
    console.log(`Owner: ${refOwner}`)

    // Check referral rates
    console.log('\nReferral Rates:')
    for (let i = 0; i < 5; i++) {
      const rate = await client.readContract({
        address: CONTRACTS.referral,
        abi: REFERRAL_ABI,
        functionName: 'levelRates',
        args: [BigInt(i)],
      })
      console.log(`  Level ${i + 1}: ${Number(rate) / 100}%`)
    }

    console.log('\n📦 CONFIG')
    console.log('─'.repeat(40))
    
    const configOwner = await client.readContract({
      address: CONTRACTS.config,
      abi: CONFIG_ABI,
      functionName: 'owner',
    })
    console.log(`Owner: ${configOwner}`)

    const referralContract = await client.readContract({
      address: CONTRACTS.config,
      abi: CONFIG_ABI,
      functionName: 'referralContract',
    })
    console.log(`Referral Contract: ${referralContract}`)

    console.log('\n========================================')
    console.log('SUMMARY')
    console.log('========================================')
    
    if (!paused && isActive) {
      console.log('\n✅ READY FOR TESTING!')
      console.log('1. Connect wallet with USDT on Polygon')
      console.log('2. Approve USDT to vault')
      console.log('3. Deposit USDT to receive yvUSDT')
      console.log('4. Check earnings growth over time')
    }
    
    console.log('\n⚠️  ACTIONS NEEDED:')
    if (paused) {
      console.log('- Vault is PAUSED - owner needs to unpause')
    }
    if (!isActive) {
      console.log('- Strategy Manager is INACTIVE - owner needs to activate')
    }

  } catch (error) {
    console.error('Error:', error.message)
    if (error.message.includes('contract not deployed') || error.message.includes('call revert exception')) {
      console.log('\n❌ Contract may not be deployed at this address')
      console.log('Check the deploy log for correct addresses')
    }
  }
}

main()
