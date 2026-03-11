import { createPublicClient, http } from 'viem'
import { polygon } from 'viem/chains'

const client = createPublicClient({
  chain: polygon,
  transport: http('https://polygon-bor.publicnode.com'),
})

const V2_CONTRACTS = {
  vault: '0xFB6fdf95A7bD09e88185fD6125955839F86407d8',
  config: '0xD9CeddA57637e2fDe359Decd8bEF656f289119b6',
  referral: '0xB93c15Fa6D66195AB83e0debEF6F866522ae17C3',
  timelock: '0xC5193F2aE97671A5aaA6B0Ed18cFb02F7861FC4D',
  aaveStrategy: '0xE43D00F9C88D57a3922d1c74ae0cfd7161bc4F44',
  quickswapStrategy: '0x1a0567Ff82Ae268529cF23c0E66391E300ed00B4',
}

async function main() {
  console.log('=== Checking V2 Contracts on Polygon Mainnet ===\n')
  
  for (const [name, address] of Object.entries(V2_CONTRACTS)) {
    const code = await client.getBytecode({ address: address as `0x${string}` })
    const hasCode = code && code !== '0x'
    console.log(`${name}: ${address}`)
    console.log(`  Has code: ${hasCode ? 'YES ✅' : 'NO ❌'}`)
    
    // Try to get transaction count
    try {
      const nonce = await client.getTransactionCount({ address: address as `0x${string}` })
      console.log(`  Nonce: ${nonce}`)
    } catch (e) {
      console.log(`  Nonce: N/A`)
    }
  }
  
  console.log('\n=== Checking USDT Balance in Vault ===')
  // USDT contract on Polygon
  const usdtAddress = '0xc2132D05D31c914a87C6611C10748AEb04B58e8F' as `0x${string}`
  
  // Check USDT balance of vault using erc20 balanceOf
  const balanceOfSelector = '0x70a08231' // balanceOf(address)
  const vaultAddressPadded = V2_CONTRACTS.vault.slice(2).toLowerCase().padEnd(64, '0')
  
  try {
    const result = await client.call({
      to: usdtAddress,
      data: `0x70a08231000000000000000000000000${vaultAddressPadded}`,
    })
    console.log(`USDT Balance raw: ${result}`)
    const balance = BigInt(result)
    console.log(`USDT Balance: ${Number(balance) / 1e6} USDT`)
  } catch (e) {
    console.log(`Error checking USDT balance: ${e}`)
  }
}

main().catch(console.error)
