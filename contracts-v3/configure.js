const { createWalletClient, createPublicClient, http, formatUnits } = require('viem')
const { polygon } = require('viem/chains')
const { privateKeyToAccount } = require('viem/accounts')

// Load private key from environment
const PRIVATE_KEY = process.env.PRIVATE_KEY || '0x7149ca6e12e753d80c712e1e0382fdf7d1d6bb98c8ad9bbea6b87c2bca8d4a86'

// Contract Addresses
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

// Vault ABI - only admin functions we need
const VAULT_ABI = [
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
    name: 'referralSystem',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address' }],
  },
  {
    name: 'localStrategyManager',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address' }],
  },
  {
    name: 'setConfig',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ type: 'address', name: '_config' }],
    outputs: [],
  },
  {
    name: 'setFeeDistributor',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ type: 'address', name: '_feeDistributor' }],
    outputs: [],
  },
  {
    name: 'setReferralSystem',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ type: 'address', name: '_referralSystem' }],
    outputs: [],
  },
  {
    name: 'setLocalStrategyManager',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ type: 'address', name: '_manager' }],
    outputs: [],
  },
]

async function main() {
  console.log('\n========================================')
  console.log('YIELDVAULT V3 - CONFIGURATION SETUP')
  console.log('========================================\n')

  const account = privateKeyToAccount(PRIVATE_KEY)
  console.log(`Deployer: ${account.address}`)
  
  // Check if deployer is the owner
  if (account.address.toLowerCase() !== CONTRACTS.owner.toLowerCase()) {
    console.log(`\n⚠️  WARNING: This private key is not the owner!`)
    console.log(`Expected owner: ${CONTRACTS.owner}`)
    console.log(`Got: ${account.address}`)
    console.log(`\nCannot proceed with configuration.`)
    return
  }

  const client = createPublicClient({
    chain: polygon,
    transport: http(RPC_URL),
  })

  const walletClient = createWalletClient({
    account,
    chain: polygon,
    transport: http(RPC_URL),
  })

  // Check current configuration
  console.log('\n📋 CURRENT CONFIGURATION:')
  console.log('─'.repeat(40))

  let currentConfig
  try {
    currentConfig = await client.readContract({
      address: CONTRACTS.vault,
      abi: VAULT_ABI,
      functionName: 'config',
    })
    console.log(`Config: ${currentConfig}`)
  } catch (e) {
    console.log(`Config: Error reading`)
  }

  let currentFeeDistributor
  try {
    currentFeeDistributor = await client.readContract({
      address: CONTRACTS.vault,
      abi: VAULT_ABI,
      functionName: 'feeDistributor',
    })
    console.log(`FeeDistributor: ${currentFeeDistributor}`)
  } catch (e) {
    console.log(`FeeDistributor: Error reading`)
  }

  let currentReferral
  try {
    currentReferral = await client.readContract({
      address: CONTRACTS.vault,
      abi: VAULT_ABI,
      functionName: 'referralSystem',
    })
    console.log(`ReferralSystem: ${currentReferral}`)
  } catch (e) {
    console.log(`ReferralSystem: Error reading`)
  }

  let currentStrategy
  try {
    currentStrategy = await client.readContract({
      address: CONTRACTS.vault,
      abi: VAULT_ABI,
      functionName: 'localStrategyManager',
    })
    console.log(`LocalStrategyManager: ${currentStrategy}`)
  } catch (e) {
    console.log(`LocalStrategyManager: Error reading`)
  }

  console.log('\n📋 EXPECTED CONFIGURATION:')
  console.log('─'.repeat(40))
  console.log(`Config: ${CONTRACTS.config}`)
  console.log(`FeeDistributor: ${CONTRACTS.feeDistributor}`)
  console.log(`ReferralSystem: ${CONTRACTS.referral}`)
  console.log(`LocalStrategyManager: ${CONTRACTS.localStrategyManager}`)

  // Configuration transactions
  const configs = [
    {
      name: 'Config',
      current: currentConfig,
      expected: CONTRACTS.config,
      setter: 'setConfig',
    },
    {
      name: 'FeeDistributor',
      current: currentFeeDistributor,
      expected: CONTRACTS.feeDistributor,
      setter: 'setFeeDistributor',
    },
    {
      name: 'ReferralSystem',
      current: currentReferral,
      expected: CONTRACTS.referral,
      setter: 'setReferralSystem',
    },
    {
      name: 'LocalStrategyManager',
      current: currentStrategy,
      expected: CONTRACTS.localStrategyManager,
      setter: 'setLocalStrategyManager',
    },
  ]

  console.log('\n🔧 CONFIGURATION TRANSACTIONS:')
  console.log('─'.repeat(40))

  for (const config of configs) {
    if (config.current && config.current.toLowerCase() === config.expected.toLowerCase()) {
      console.log(`${config.name}: ✅ Already configured`)
    } else if (config.current === '0x0000000000000000000000000000000000000000') {
      console.log(`${config.name}: ⚠️  Needs configuration`)
      
      // Send transaction
      console.log(`  Sending ${config.setter}()...`)
      
      try {
        const hash = await walletClient.writeContract({
          address: CONTRACTS.vault,
          abi: VAULT_ABI,
          functionName: config.setter,
          args: [config.expected],
        })
        console.log(`  TX: ${hash}`)
        console.log(`  ✅ ${config.name} configured!`)
      } catch (e) {
        console.log(`  ❌ Error: ${e.message}`)
      }
    } else {
      console.log(`${config.name}: ⚠️  Has different value (${config.current})`)
    }
  }

  console.log('\n========================================')
  console.log('CONFIGURATION COMPLETE')
  console.log('========================================')
}

main().catch(console.error)
