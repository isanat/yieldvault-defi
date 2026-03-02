/**
 * Rebalance Bot for YieldVault
 * 
 * Monitors strategy health and performs rebalancing when needed.
 * Specifically watches leveraged Aave positions for health factor.
 */

import { ethers, JsonRpcProvider, Wallet, Contract } from 'ethers';
import cron from 'node-cron';

const CONFIG = {
  rpcUrl: process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com',
  privateKey: process.env.BOT_PRIVATE_KEY || '',
  vaultAddress: process.env.VAULT_ADDRESS || '',
  strategies: (process.env.STRATEGY_ADDRESSES || '').split(',').filter(Boolean),
  checkInterval: process.env.CHECK_INTERVAL || '*/30 * * * *', // Every 30 minutes
  minHealthFactor: parseFloat(process.env.MIN_HEALTH_FACTOR || '1.5'),
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN,
  telegramChatId: process.env.TELEGRAM_CHAT_ID,
};

const STRATEGY_ABI = [
  'function checkHealth() view returns (bool isHealthy, uint256 healthFactor)',
  'function rebalance() external',
  'function vault() view returns (address)',
  'function balanceOf() view returns (uint256)',
];

interface StrategyStatus {
  address: string;
  isHealthy: boolean;
  healthFactor: number;
  balance: bigint;
  needsRebalance: boolean;
}

class RebalanceBot {
  private provider: JsonRpcProvider;
  private wallet: Wallet;

  constructor() {
    this.provider = new JsonRpcProvider(CONFIG.rpcUrl);
    this.wallet = new Wallet(CONFIG.privateKey, this.provider);
    console.log('[RebalanceBot] Initialized');
  }

  start(): void {
    console.log('[RebalanceBot] Starting with schedule:', CONFIG.checkInterval);
    
    cron.schedule(CONFIG.checkInterval, async () => {
      await this.checkAndRebalance();
    });

    // Run on startup
    this.checkAndRebalance().catch(console.error);
  }

  async checkAndRebalance(): Promise<void> {
    console.log('[RebalanceBot] Checking strategies...');

    for (const strategyAddress of CONFIG.strategies) {
      try {
        const status = await this.checkStrategy(strategyAddress);
        
        if (status.needsRebalance) {
          console.log(`[RebalanceBot] Rebalancing ${strategyAddress}...`);
          await this.rebalanceStrategy(strategyAddress);
        }
      } catch (error) {
        console.error(`[RebalanceBot] Error checking ${strategyAddress}:`, error);
      }
    }
  }

  private async checkStrategy(address: string): Promise<StrategyStatus> {
    const strategy = new Contract(address, STRATEGY_ABI, this.provider);
    
    const [isHealthy, healthFactor] = await strategy.checkHealth();
    const balance = await strategy.balanceOf();

    const healthFactorNum = Number(ethers.formatUnits(healthFactor, 18));
    const needsRebalance = !isHealthy || healthFactorNum < CONFIG.minHealthFactor;

    const status: StrategyStatus = {
      address,
      isHealthy,
      healthFactor: healthFactorNum,
      balance,
      needsRebalance,
    };

    console.log(`[RebalanceBot] Strategy ${address}:`, {
      healthy: isHealthy,
      healthFactor: healthFactorNum.toFixed(2),
      needsRebalance,
    });

    return status;
  }

  private async rebalanceStrategy(address: string): Promise<void> {
    const strategy = new Contract(address, STRATEGY_ABI, this.wallet);
    
    const tx = await strategy.rebalance({ gasLimit: 1000000 });
    console.log(`[RebalanceBot] Rebalance tx sent: ${tx.hash}`);
    
    const receipt = await tx.wait();
    console.log(`[RebalanceBot] Rebalance confirmed: ${receipt.blockNumber}`);

    await this.sendNotification(address, tx.hash);
  }

  private async sendNotification(strategy: string, txHash: string): Promise<void> {
    if (!CONFIG.telegramBotToken || !CONFIG.telegramChatId) return;

    try {
      const message = `⚠️ **Strategy Rebalanced**\n\n` +
        `📍 Strategy: \`${strategy}\`\n` +
        `🔗 [View TX](https://polygonscan.com/tx/${txHash})\n` +
        `📅 ${new Date().toISOString()}`;

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
      console.error('[RebalanceBot] Notification failed:', error);
    }
  }
}

export { RebalanceBot };

if (require.main === module) {
  const bot = new RebalanceBot();
  bot.start();
}
