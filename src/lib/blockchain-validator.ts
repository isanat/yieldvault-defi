import { createPublicClient, http, formatUnits } from 'viem';
import { polygon } from 'viem/chains';

// Contract ABIs for validation
const ERC20_ABI = [
  {
    name: 'transfer',
    type: 'event',
    inputs: [
      { indexed: true, name: 'from', type: 'address' },
      { indexed: true, name: 'to', type: 'address' },
      { name: 'value', type: 'uint256' },
    ],
  },
] as const;

const VAULT_ABI = [
  {
    name: 'Deposit',
    type: 'event',
    inputs: [
      { indexed: true, name: 'sender', type: 'address' },
      { indexed: true, name: 'owner', type: 'address' },
      { indexed: false, name: 'assets', type: 'uint256' },
      { indexed: false, name: 'shares', type: 'uint256' },
    ],
  },
  {
    name: 'Withdraw',
    type: 'event',
    inputs: [
      { indexed: true, name: 'sender', type: 'address' },
      { indexed: true, name: 'receiver', type: 'address' },
      { indexed: true, name: 'owner', type: 'address' },
      { indexed: false, name: 'assets', type: 'uint256' },
      { indexed: false, name: 'shares', type: 'uint256' },
    ],
  },
  {
    name: 'DepositWithReferrer',
    type: 'event',
    inputs: [
      { indexed: true, name: 'sender', type: 'address' },
      { indexed: true, name: 'receiver', type: 'address' },
      { indexed: false, name: 'assets', type: 'uint256' },
      { indexed: false, name: 'shares', type: 'uint256' },
      { indexed: true, name: 'referrer', type: 'address' },
    ],
  },
] as const;

// Polygon RPC endpoints with fallback
const POLYGON_RPCS = [
  process.env.POLYGON_RPC_URL,
  'https://polygon-bor-rpc.publicnode.com',
  'https://polygon.drpc.org',
  'https://polygon-rpc.com',
].filter(Boolean) as string[];

// Get contract addresses from environment
function getContractAddresses() {
  return {
    vault: process.env.NEXT_PUBLIC_VAULT_ADDRESS as `0x${string}` | undefined,
    usdt: process.env.NEXT_PUBLIC_USDT_ADDRESS as `0x${string}` | undefined,
  };
}

// Create a public client with fallback RPCs
function createClient() {
  for (const rpc of POLYGON_RPCS) {
    try {
      return createPublicClient({
        chain: polygon,
        transport: http(rpc, { timeout: 15_000 }),
      });
    } catch (e) {
      console.warn(`Failed to create client with RPC: ${rpc}`);
    }
  }
  // Fallback to default
  return createPublicClient({
    chain: polygon,
    transport: http(),
  });
}

export interface TransactionValidationResult {
  isValid: boolean;
  error?: string;
  data?: {
    type: 'deposit' | 'withdraw';
    from: string;
    to: string;
    amount: bigint;
    shares?: bigint;
    referrer?: string;
    blockNumber?: bigint;
    timestamp?: bigint;
  };
}

/**
 * Validate a transaction on-chain
 * Checks if the transaction exists, is confirmed, and matches expected parameters
 */
export async function validateTransaction(
  txHash: string,
  expectedType: 'deposit' | 'withdraw',
  expectedFrom?: string,
  expectedAmount?: bigint
): Promise<TransactionValidationResult> {
  try {
    const client = createClient();
    const addresses = getContractAddresses();

    // Get transaction receipt
    const receipt = await client.getTransactionReceipt({
      hash: txHash as `0x${string}`,
    });

    if (!receipt) {
      return { isValid: false, error: 'Transaction not found' };
    }

    if (receipt.status !== 'success') {
      return { isValid: false, error: 'Transaction failed' };
    }

    // Validate from address if provided
    const tx = await client.getTransaction({
      hash: txHash as `0x${string}`,
    });

    if (!tx) {
      return { isValid: false, error: 'Transaction data not found' };
    }

    if (expectedFrom && tx.from.toLowerCase() !== expectedFrom.toLowerCase()) {
      return { 
        isValid: false, 
        error: `Transaction sender mismatch. Expected: ${expectedFrom}, Got: ${tx.from}` 
      };
    }

    // Get block for timestamp
    const block = await client.getBlock({ blockNumber: receipt.blockNumber });

    // Parse events based on transaction type
    if (expectedType === 'deposit' && addresses.vault) {
      // Check for Deposit or DepositWithReferrer event
      const depositLogs = receipt.logs.filter((log) => 
        log.address.toLowerCase() === addresses.vault!.toLowerCase()
      );

      if (depositLogs.length === 0) {
        return { isValid: false, error: 'No deposit event found in transaction' };
      }

      // Try to decode the deposit event
      try {
        for (const log of depositLogs) {
          try {
            const decoded = client.parseAbiItem({
              abi: VAULT_ABI,
              name: 'DepositWithReferrer',
            });
            
            // Check if this is a DepositWithReferrer event
            if (log.topics.length >= 3) {
              const sender = `0x${log.topics[1]?.slice(26)}`;
              const receiver = `0x${log.topics[2]?.slice(26)}`;
              
              // Parse assets and shares from data
              const data = log.data;
              const assets = BigInt(data.slice(0, 66));
              const shares = BigInt(`0x${data.slice(66, 130)}`);
              const referrer = log.topics[3] ? `0x${log.topics[3].slice(26)}` : undefined;

              // Validate amount if expected
              if (expectedAmount && assets !== expectedAmount) {
                continue; // Try next log
              }

              return {
                isValid: true,
                data: {
                  type: 'deposit',
                  from: sender,
                  to: receiver,
                  amount: assets,
                  shares,
                  referrer,
                  blockNumber: receipt.blockNumber,
                  timestamp: block.timestamp,
                },
              };
            }
          } catch {
            continue;
          }
        }

        // Fallback: try standard Deposit event
        for (const log of depositLogs) {
          try {
            if (log.topics.length >= 3) {
              const sender = `0x${log.topics[1]?.slice(26)}`;
              const owner = `0x${log.topics[2]?.slice(26)}`;
              
              const data = log.data;
              const assets = BigInt(data.slice(0, 66));
              const shares = BigInt(`0x${data.slice(66, 130)}`);

              if (expectedAmount && assets !== expectedAmount) {
                continue;
              }

              return {
                isValid: true,
                data: {
                  type: 'deposit',
                  from: sender,
                  to: owner,
                  amount: assets,
                  shares,
                  blockNumber: receipt.blockNumber,
                  timestamp: block.timestamp,
                },
              };
            }
          } catch {
            continue;
          }
        }
      } catch (e) {
        console.error('Error parsing deposit event:', e);
      }

      return { isValid: false, error: 'Could not decode deposit event' };
    }

    if (expectedType === 'withdraw' && addresses.vault) {
      const withdrawLogs = receipt.logs.filter((log) => 
        log.address.toLowerCase() === addresses.vault!.toLowerCase()
      );

      if (withdrawLogs.length === 0) {
        return { isValid: false, error: 'No withdraw event found in transaction' };
      }

      try {
        for (const log of withdrawLogs) {
          if (log.topics.length >= 4) {
            const sender = `0x${log.topics[1]?.slice(26)}`;
            const receiver = `0x${log.topics[2]?.slice(26)}`;
            const owner = `0x${log.topics[3]?.slice(26)}`;
            
            const data = log.data;
            const assets = BigInt(data.slice(0, 66));
            const shares = BigInt(`0x${data.slice(66, 130)}`);

            return {
              isValid: true,
              data: {
                type: 'withdraw',
                from: owner,
                to: receiver,
                amount: assets,
                shares,
                blockNumber: receipt.blockNumber,
                timestamp: block.timestamp,
              },
            };
          }
        }
      } catch (e) {
        console.error('Error parsing withdraw event:', e);
      }

      return { isValid: false, error: 'Could not decode withdraw event' };
    }

    return { isValid: false, error: 'Invalid transaction type or missing contract address' };
  } catch (error) {
    console.error('Transaction validation error:', error);
    return { 
      isValid: false, 
      error: error instanceof Error ? error.message : 'Unknown validation error' 
    };
  }
}

/**
 * Check if an address has approved USDT spending for the vault
 */
export async function checkUSDTAllowance(
  owner: string,
  spender: string
): Promise<bigint> {
  try {
    const client = createClient();
    const addresses = getContractAddresses();

    if (!addresses.usdt) {
      throw new Error('USDT address not configured');
    }

    const allowance = await client.readContract({
      address: addresses.usdt,
      abi: [
        {
          name: 'allowance',
          type: 'function',
          stateMutability: 'view',
          inputs: [
            { name: 'owner', type: 'address' },
            { name: 'spender', type: 'address' },
          ],
          outputs: [{ type: 'uint256' }],
        },
      ],
      functionName: 'allowance',
      args: [owner as `0x${string}`, spender as `0x${string}`],
    });

    return allowance as bigint;
  } catch (error) {
    console.error('Error checking allowance:', error);
    return 0n;
  }
}

/**
 * Get USDT balance of an address
 */
export async function getUSDTBalance(address: string): Promise<bigint> {
  try {
    const client = createClient();
    const addresses = getContractAddresses();

    if (!addresses.usdt) {
      throw new Error('USDT address not configured');
    }

    const balance = await client.readContract({
      address: addresses.usdt,
      abi: [
        {
          name: 'balanceOf',
          type: 'function',
          stateMutability: 'view',
          inputs: [{ name: 'account', type: 'address' }],
          outputs: [{ type: 'uint256' }],
        },
      ],
      functionName: 'balanceOf',
      args: [address as `0x${string}`],
    });

    return balance as bigint;
  } catch (error) {
    console.error('Error getting USDT balance:', error);
    return 0n;
  }
}

/**
 * Get vault share balance for an address
 */
export async function getVaultShareBalance(address: string): Promise<bigint> {
  try {
    const client = createClient();
    const addresses = getContractAddresses();

    if (!addresses.vault) {
      throw new Error('Vault address not configured');
    }

    const balance = await client.readContract({
      address: addresses.vault,
      abi: [
        {
          name: 'balanceOf',
          type: 'function',
          stateMutability: 'view',
          inputs: [{ name: 'account', type: 'address' }],
          outputs: [{ type: 'uint256' }],
        },
      ],
      functionName: 'balanceOf',
      args: [address as `0x${string}`],
    });

    return balance as bigint;
  } catch (error) {
    console.error('Error getting vault share balance:', error);
    return 0n;
  }
}

/**
 * Get total assets in the vault
 */
export async function getVaultTotalAssets(): Promise<bigint> {
  try {
    const client = createClient();
    const addresses = getContractAddresses();

    if (!addresses.vault) {
      throw new Error('Vault address not configured');
    }

    const totalAssets = await client.readContract({
      address: addresses.vault,
      abi: [
        {
          name: 'totalAssets',
          type: 'function',
          stateMutability: 'view',
          inputs: [],
          outputs: [{ type: 'uint256' }],
        },
      ],
      functionName: 'totalAssets',
    });

    return totalAssets as bigint;
  } catch (error) {
    console.error('Error getting vault total assets:', error);
    return 0n;
  }
}

/**
 * Simple rate limiter using in-memory cache
 * In production, use Redis or similar
 */
const rateLimitCache = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(
  identifier: string,
  maxRequests: number = 10,
  windowMs: number = 60_000
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const record = rateLimitCache.get(identifier);

  if (!record || now > record.resetTime) {
    // Create new record
    rateLimitCache.set(identifier, {
      count: 1,
      resetTime: now + windowMs,
    });
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetTime: now + windowMs,
    };
  }

  if (record.count >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: record.resetTime,
    };
  }

  // Increment count
  record.count++;
  rateLimitCache.set(identifier, record);

  return {
    allowed: true,
    remaining: maxRequests - record.count,
    resetTime: record.resetTime,
  };
}
