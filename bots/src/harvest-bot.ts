/**
 * Harvest Bot for YieldVault
 * 
 * This bot automatically calls harvest() on the Vault contract
 * to compound yields from all strategies.
 * 
 * Features:
 * - Configurable harvest interval
 * - Gas price optimization
 * - Health checks before harvest
 * - Retry logic on failures
 * - Telegram/Discord notifications
 */

import { ethers, JsonRpcProvider, Wallet, Contract } from 'ethers';
import cron from 'node-cron';

// Configuration
const CONFIG = {
  rpcUrl: process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com',
  privateKey: process.env.BOT_PRIVATE_KEY || '',
  vaultAddress: process.env.VAULT_ADDRESS || '',
  configAddress: process.env.CONFIG_ADDRESS || '',
  harvestInterval: process.env.HARVEST_INTERVAL || '0 */6 * * *', // Every 6 hours
  maxGasPrice: parseFloat(process.env.MAX_GAS_PRICE || '100'), // Gwei
  minProfitThreshold: parseFloat(process.env.MIN_PROFIT_THRESHOLD || '10'), // USD
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN,
  telegramChatId: process.env.TELEGRAM_CHAT_ID,
};

// ABIs
const VAULT_ABI = [
  'function harvest() external',
  'function lastHarvestTimestamp() view returns (uint256)',
  'function totalProfitHarvested() view returns (uint256)',
  'function strategyCount() view returns (uint256)',
];

const CONFIG_ABI = [
  'function harvestEnabled() view returns (bool)',
  'function performanceFeeBP() view returns (uint256)',
];

// Types
interface HarvestResult {
  success: boolean;
  txHash?: string;
  profit?: bigint;
  gasUsed?: bigint;
  error?: string;
}

class HarvestBot {
  private provider: JsonRpcProvider;
  private wallet: Wallet;
  private vault: Contract;
  private config: Contract;
  private isRunning: boolean = false;

  constructor() {
    this.provider = new JsonRpcProvider(CONFIG.rpcUrl);
    this.wallet = new Wallet(CONFIG.privateKey, this.provider);
    
    this.vault = new Contract(
      CONFIG.vaultAddress,
      VAULT_ABI,
      this.wallet
    );

    this.config = new Contract(
      CONFIG.configAddress,
      CONFIG_ABI,
      this.provider
    );

    console.log('[HarvestBot] Initialized with wallet:', this.wallet.address);
  }

  /**
   * Start the bot with cron schedule
   */
  start(): void {
    console.log('[HarvestBot] Starting with schedule:', CONFIG.harvestInterval);
    
    cron.schedule(CONFIG.harvest_INTERVAL || CONFIG.harvestInterval, async () => {
      await this.executeHarvest();
    });

    // Also run on startup
    this.executeHarvest().catch(console.error);
  }

  /**
   * Execute harvest operation
   */
  async executeHarvest(): Promise<HarvestResult> {
    if (this.isRunning) {
      console.log('[HarvestBot] Already running, skipping...');
      return { success: false, error: 'Already running' };
    }

    this.isRunning = true;
    console.log('[HarvestBot] Starting harvest execution...');

    try {
      // Check if harvest is enabled
      const harvestEnabled = await this.config.harvestEnabled();
      if (!harvestEnabled) {
        console.log('[HarvestBot] Harvest is disabled in config');
        return { success: false, error: 'Harvest disabled' };
      }

      // Check gas price
      const gasPrice = (await this.provider.getFeeData()).gasPrice;
      const gasPriceGwei = Number(ethers.formatUnits(gasPrice || 0, 'gwei'));
      
      if (gasPriceGwei > CONFIG.maxGasPrice) {
        console.log(`[HarvestBot] Gas price too high: ${gasPriceGwei} Gwei > ${CONFIG.maxGasPrice} Gwei`);
        return { success: false, error: 'Gas price too high' };
      }

      // Check last harvest time
      const lastHarvest = await this.vault.lastHarvestTimestamp();
      const timeSinceLastHarvest = Date.now() / 1000 - Number(lastHarvest);
      const minInterval = 4 * 60 * 60; // 4 hours minimum
      
      if (timeSinceLastHarvest < minInterval) {
        console.log('[HarvestBot] Too soon since last harvest');
        return { success: false, error: 'Too soon since last harvest' };
      }

      // Execute harvest
      console.log('[HarvestBot] Calling harvest()...');
      
      const tx = await this.vault.harvest({
        gasLimit: 2000000,
        maxFeePerGas: gasPrice,
        maxPriorityFeePerGas: gasPrice ? gasPrice / 2n : 0n,
      });

      console.log('[HarvestBot] Transaction sent:', tx.hash);
      
      const receipt = await tx.wait();
      console.log('[HarvestBot] Transaction confirmed in block:', receipt.blockNumber);

      // Get profit from events
      const profit = this.extractProfitFromReceipt(receipt);

      const result: HarvestResult = {
        success: true,
        txHash: tx.hash,
        profit,
        gasUsed: receipt.gasUsed,
      };

      // Send notification
      await this.sendNotification(result);

      return result;

    } catch (error) {
      console.error('[HarvestBot] Error:', error);
      
      const result: HarvestResult = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };

      await this.sendNotification(result);
      return result;

    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Extract profit from transaction receipt
   */
  private extractProfitFromReceipt(receipt: ethers.TransactionReceipt): bigint {
    // Look for Harvest event
    for (const log of receipt.logs) {
      try {
        // Parse event if it's from vault
        if (log.address.toLowerCase() === CONFIG.vaultAddress.toLowerCase()) {
          // Event signature: Harvest(uint256,uint256,uint256)
          const harvestTopic = ethers.id('Harvest(uint256,uint256,uint256)');
          if (log.topics[0] === harvestTopic) {
            const data = ethers.AbiCoder.defaultAbiCoder().decode(
              ['uint256', 'uint256', 'uint256'],
              log.data
            );
            return data[0]; // totalProfit
          }
        }
      } catch {
        // Continue to next log
      }
    }
    return 0n;
  }

  /**
   * Send notification to Telegram
   */
  private async sendNotification(result: HarvestResult): Promise<void> {
    if (!CONFIG.telegramBotToken || !CONFIG.telegramChatId) {
      return;
    }

    try {
      const emoji = result.success ? '✅' : '❌';
      let message = `${emoji} **Harvest ${result.success ? 'Successful' : 'Failed'}**\n\n`;
      
      if (result.success) {
        message += `💰 Profit: $${ethers.formatUnits(result.profit || 0, 6)}\n`;
        message += `⛽ Gas Used: ${result.gasUsed?.toString()}\n`;
        message += `🔗 [View TX](https://polygonscan.com/tx/${result.txHash})\n`;
      } else {
        message += `❌ Error: ${result.error}\n`;
      }

      message += `\n📅 ${new Date().toISOString()}`;

      await fetch(`https://api.telegram.org/bot${CONFIG.telegramBotToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: CONFIG.telegramChatId,
          text: message,
          parse_mode: 'Markdown',
        }),
      });

    } catch (error) {
      console.error('[HarvestBot] Failed to send notification:', error);
    }
  }

  /**
   * Health check endpoint
   */
  async healthCheck(): Promise<{ healthy: boolean; details: Record<string, unknown> }> {
    try {
      const blockNumber = await this.provider.getBlockNumber();
      const balance = await this.provider.getBalance(this.wallet.address);
      const harvestEnabled = await this.config.harvestEnabled();
      const lastHarvest = await this.vault.lastHarvestTimestamp();

      return {
        healthy: true,
        details: {
          blockNumber,
          walletBalance: ethers.formatEther(balance),
          harvestEnabled,
          lastHarvest: new Date(Number(lastHarvest) * 1000).toISOString(),
        },
      };
    } catch (error) {
      return {
        healthy: false,
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
      };
    }
  }
}

// Export and run
export { HarvestBot };

// Main execution
if (require.main === module) {
  const bot = new HarvestBot();
  bot.start();
  
  // Keep process alive
  process.on('SIGINT', () => {
    console.log('[HarvestBot] Shutting down...');
    process.exit(0);
  });
}
