import { createPublicClient, http, formatUnits } from 'viem'
import { polygon } from 'viem/chains'

// Contract Addresses
const CONTRACTS = {
  vault: '0x6565D903E231F8B15283d2a33fe736498DC4b7E6' as `0x${string}`,
  config: '0xc7Ab7cE286906B21410201322EdC34faD144a661' as `0x${string}`,
  referral: '0xe09b20b36165fFa9203ca4757bE56562265fD9fd' as `0x${string}`,
  feeDistributor: '0x55D151794bA83cFF8b76452f7A7451f4C4C8cd08' as `0x${string}`,
  localStrategyManager: '0xC12f26E8fC654e49cCe589B37EfEB07c23cbC97b' as `0x${string}`,
  usdt: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F' as `0x${string}`,
  owner: '0xc7284fEc59a599C49889DD8532b4de7Db81b0340' as `0x${string}`,
}

const RPC_URL = 'https://polygon.api.onfinality.io/public'

// Vault ABI - basic ERC4626 + admin
const VAULT_ABI = [
  {
    name: 'asset',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address' }],
  },
  {
    name: 'totalAssets',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'totalSupply',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'paused',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'bool' }],
  },
  {
    name: 'owner',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address' }],
  },
  {
    name: 'config',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address' }],
  },
  {
    name: 'feeDistributor',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address' }],
  },
  {
    name: 'performanceFeeBP',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'depositFeeBP',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'withdrawalFeeBP',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'strategyManager',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address' }],
  },
] as const

// Strategy ABI
const STRATEGY_ABI = [
  {
    name: 'owner',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address' }],
  },
  {
    name: 'vault',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address' }],
  },
  {
    name: 'isActive',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'bool' }],
  },
  {
    name: 'estimatedAPY',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'simulateYieldBPS',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
] as const

// FeeDistributor ABI
const FEE_ABI = [
  {
    name: 'owner',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address' }],
  },
  {
    name: 'vault',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address' }],
  },
  {
    name: 'referral',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address' }],
  },
] as const

// Referral ABI
const REFERRAL_ABI = [
  {
    name: 'owner',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address' }],
  },
  {
    name: 'levelRates',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ type: 'uint256', name: 'level' }],
    outputs: [{ type: 'uint256' }],
  },
] as const

// Config ABI
const CONFIG_ABI = [
  {
    name: 'owner',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address' }],
  },
] as const

async function main() {
  const client = createPublicClient({
    chain: polygon,
    transport: http(RPC_URL),
  })

  console.log('\n========================================')
  console.log('YIELDVAULT V3 - FULL STATUS CHECK')
  console.log('========================================\n')

  // 1. Check Vault
  console.log('📦 YIELDVAULT V3')
  console.log('─'.repeat(40))
  
  try {
    const vaultOwner = await client.readContract({
      address: CONTRACTS.vault,
      abi: VAULT_ABI,
      functionName: 'owner',
    })
    console.log(`Owner: ${vaultOwner} ${vaultOwner.toLowerCase() === CONTRACTS.owner.toLowerCase() ? '✅' : '❌'}`)
  } catch (e: any) { console.log(`Owner: Error - ${e.message}`) }

  try {
    const asset = await client.readContract({
      address: CONTRACTS.vault,
      abi: VAULT_ABI,
      functionName: 'asset',
    })
    console.log(`Asset: ${asset} ${asset.toLowerCase() === CONTRACTS.usdt.toLowerCase() ? '✅ (USDT)' : ''}`)
  } catch (e: any) { console.log(`Asset: Error - ${e.message}`) }

  try {
    const totalAssets = await client.readContract({
      address: CONTRACTS.vault,
      abi: VAULT_ABI,
      functionName: 'totalAssets',
    })
    console.log(`Total Assets: ${formatUnits(totalAssets as bigint, 6)} USDT`)
  } catch (e: any) { console.log(`Total Assets: Error - ${e.message}`) }

  try {
    const totalSupply = await client.readContract({
      address: CONTRACTS.vault,
      abi: VAULT_ABI,
      functionName: 'totalSupply',
    })
    console.log(`Total Shares: ${formatUnits(totalSupply as bigint, 6)} yvUSDT`)
  } catch (e: any) { console.log(`Total Shares: Error - ${e.message}`) }

  try {
    const paused = await client.readContract({
      address: CONTRACTS.vault,
      abi: VAULT_ABI,
      functionName: 'paused',
    })
    console.log(`Paused: ${paused ? '🔴 YES' : '🟢 NO'}`)
  } catch (e: any) { console.log(`Paused: Error - ${e.message}`) }

  try {
    const config = await client.readContract({
      address: CONTRACTS.vault,
      abi: VAULT_ABI,
      functionName: 'config',
    })
    console.log(`Config: ${config} ${config.toLowerCase() === CONTRACTS.config.toLowerCase() ? '✅' : ''}`)
  } catch (e: any) { console.log(`Config: Error - ${e.message}`) }

  try {
    const feeDistributor = await client.readContract({
      address: CONTRACTS.vault,
      abi: VAULT_ABI,
      functionName: 'feeDistributor',
    })
    console.log(`FeeDistributor: ${feeDistributor} ${feeDistributor.toLowerCase() === CONTRACTS.feeDistributor.toLowerCase() ? '✅' : ''}`)
  } catch (e: any) { console.log(`FeeDistributor: Error - ${e.message}`) }

  try {
    const strategyManager = await client.readContract({
      address: CONTRACTS.vault,
      abi: VAULT_ABI,
      functionName: 'strategyManager',
    })
    console.log(`StrategyManager: ${strategyManager}`)
  } catch (e: any) { console.log(`StrategyManager: ⚠️ Function may not exist or not set`) }

  try {
    const perfFee = await client.readContract({
      address: CONTRACTS.vault,
      abi: VAULT_ABI,
      functionName: 'performanceFeeBP',
    })
    console.log(`Performance Fee: ${Number(perfFee) / 100}%`)
  } catch (e: any) { console.log(`Performance Fee: Error - ${e.message}`) }

  try {
    const depositFee = await client.readContract({
      address: CONTRACTS.vault,
      abi: VAULT_ABI,
      functionName: 'depositFeeBP',
    })
    console.log(`Deposit Fee: ${Number(depositFee) / 100}%`)
  } catch (e: any) { console.log(`Deposit Fee: Error - ${e.message}`) }

  try {
    const withdrawalFee = await client.readContract({
      address: CONTRACTS.vault,
      abi: VAULT_ABI,
      functionName: 'withdrawalFeeBP',
    })
    console.log(`Withdrawal Fee: ${Number(withdrawalFee) / 100}%`)
  } catch (e: any) { console.log(`Withdrawal Fee: Error - ${e.message}`) }

  // 2. Check Strategy Manager
  console.log('\n📦 LOCAL STRATEGY MANAGER')
  console.log('─'.repeat(40))
  
  try {
    const stratOwner = await client.readContract({
      address: CONTRACTS.localStrategyManager,
      abi: STRATEGY_ABI,
      functionName: 'owner',
    })
    console.log(`Owner: ${stratOwner} ${stratOwner.toLowerCase() === CONTRACTS.owner.toLowerCase() ? '✅' : ''}`)
  } catch (e: any) { console.log(`Owner: Error - ${e.message}`) }

  try {
    const stratVault = await client.readContract({
      address: CONTRACTS.localStrategyManager,
      abi: STRATEGY_ABI,
      functionName: 'vault',
    })
    console.log(`Vault: ${stratVault} ${stratVault.toLowerCase() === CONTRACTS.vault.toLowerCase() ? '✅' : ''}`)
  } catch (e: any) { console.log(`Vault: Error - ${e.message}`) }

  try {
    const isActive = await client.readContract({
      address: CONTRACTS.localStrategyManager,
      abi: STRATEGY_ABI,
      functionName: 'isActive',
    })
    console.log(`Active: ${isActive ? '🟢 YES' : '🔴 NO'}`)
  } catch (e: any) { console.log(`Active: Error - ${e.message}`) }

  try {
    const estimatedAPY = await client.readContract({
      address: CONTRACTS.localStrategyManager,
      abi: STRATEGY_ABI,
      functionName: 'estimatedAPY',
    })
    console.log(`Estimated APY: ${Number(estimatedAPY) / 100}%`)
  } catch (e: any) { console.log(`Estimated APY: Error - ${e.message}`) }

  try {
    const simulateYield = await client.readContract({
      address: CONTRACTS.localStrategyManager,
      abi: STRATEGY_ABI,
      functionName: 'simulateYieldBPS',
    })
    console.log(`Simulate Yield BPS: ${Number(simulateYield) / 100}%`)
  } catch (e: any) { console.log(`Simulate Yield BPS: Error - ${e.message}`) }

  // 3. Check Fee Distributor
  console.log('\n📦 FEE DISTRIBUTOR')
  console.log('─'.repeat(40))
  
  try {
    const feeOwner = await client.readContract({
      address: CONTRACTS.feeDistributor,
      abi: FEE_ABI,
      functionName: 'owner',
    })
    console.log(`Owner: ${feeOwner} ${feeOwner.toLowerCase() === CONTRACTS.owner.toLowerCase() ? '✅' : ''}`)
  } catch (e: any) { console.log(`Owner: Error - ${e.message}`) }

  try {
    const feeVault = await client.readContract({
      address: CONTRACTS.feeDistributor,
      abi: FEE_ABI,
      functionName: 'vault',
    })
    console.log(`Vault: ${feeVault} ${feeVault.toLowerCase() === CONTRACTS.vault.toLowerCase() ? '✅' : ''}`)
  } catch (e: any) { console.log(`Vault: Error - ${e.message}`) }

  try {
    const feeReferral = await client.readContract({
      address: CONTRACTS.feeDistributor,
      abi: FEE_ABI,
      functionName: 'referral',
    })
    console.log(`Referral: ${feeReferral} ${feeReferral.toLowerCase() === CONTRACTS.referral.toLowerCase() ? '✅' : ''}`)
  } catch (e: any) { console.log(`Referral: Error - ${e.message}`) }

  // 4. Check Referral
  console.log('\n📦 REFERRAL')
  console.log('─'.repeat(40))
  
  try {
    const refOwner = await client.readContract({
      address: CONTRACTS.referral,
      abi: REFERRAL_ABI,
      functionName: 'owner',
    })
    console.log(`Owner: ${refOwner} ${refOwner.toLowerCase() === CONTRACTS.owner.toLowerCase() ? '✅' : ''}`)
  } catch (e: any) { console.log(`Owner: Error - ${e.message}`) }

  console.log('\nReferral Rates:')
  for (let i = 0; i < 5; i++) {
    try {
      const rate = await client.readContract({
        address: CONTRACTS.referral,
        abi: REFERRAL_ABI,
        functionName: 'levelRates',
        args: [BigInt(i)],
      })
      console.log(`  Level ${i + 1}: ${Number(rate) / 100}%`)
    } catch (e: any) {
      console.log(`  Level ${i + 1}: Error`)
      break
    }
  }

  // 5. Check Config
  console.log('\n📦 CONFIG')
  console.log('─'.repeat(40))
  
  try {
    const configOwner = await client.readContract({
      address: CONTRACTS.config,
      abi: CONFIG_ABI,
      functionName: 'owner',
    })
    console.log(`Owner: ${configOwner} ${configOwner.toLowerCase() === CONTRACTS.owner.toLowerCase() ? '✅' : ''}`)
  } catch (e: any) { console.log(`Owner: Error - ${e.message}`) }

  console.log('\n========================================')
  console.log('NEXT STEPS FOR TESTING')
  console.log('========================================')
  console.log('\n1️⃣  CONNECT WALLET')
  console.log('   - Use MetaMask or WalletConnect')
  console.log('   - Switch to Polygon Mainnet')
  console.log('   - Ensure you have USDT and MATIC for gas')
  console.log('\n2️⃣  APPROVE USDT')
  console.log('   - Go to USDT contract on PolygonScan')
  console.log('   - Use approve() function')
  console.log('   - Set spender = vault address')
  console.log('\n3️⃣  DEPOSIT USDT')
  console.log('   - Call deposit() on vault')
  console.log('   - Receive yvUSDT shares')
  console.log('\n4️⃣  CHECK EARNINGS')
  console.log('   - Simulated yield accrues automatically')
  console.log('   - Check balanceOf() over time')
  console.log('\n========================================')
}

main()
