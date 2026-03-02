# YieldVault - DeFi Yield Platform

A complete DeFi platform on Polygon with automated yield generation, auto-compounding, and a 5-level referral system.

## 🚀 Features

- **Automated Yield Farming**: Funds are automatically allocated across multiple strategies (Aave, QuickSwap)
- **Auto-Compounding**: Rewards are harvested and reinvested automatically
- **5-Level Referral System**: Earn commissions on deposits and yield earnings from your referral network
- **ERC4626 Vault**: Standard vault implementation with share tokens
- **Real-time Dashboard**: Track your earnings, referrals, and platform metrics

## 📁 Project Structure

```
yieldvault/
├── contracts/           # Smart Contracts (Solidity + Hardhat)
│   ├── core/           # Core contracts (Vault, Config, Referral, FeeDistributor)
│   ├── strategies/     # Yield strategies (Aave, QuickSwap)
│   ├── interfaces/     # Contract interfaces
│   ├── test/           # Test files
│   └── deploy/         # Deployment scripts
├── src/                # Frontend (Next.js 15)
│   ├── app/            # App Router pages and API routes
│   ├── components/     # React components
│   ├── contexts/       # React contexts (Wallet)
│   ├── hooks/          # Custom hooks
│   ├── services/       # Business logic services
│   └── lib/            # Utilities
├── bots/               # Automation bots
│   └── src/
│       ├── harvest-bot.ts
│       └── rebalance-bot.ts
├── prisma/             # Database schema
└── docker-compose.yml  # Infrastructure
```

## 🛠 Tech Stack

### Smart Contracts
- Solidity ^0.8.19
- Hardhat
- OpenZeppelin Contracts 5.0
- ERC4626 Vault Standard

### Backend
- Next.js 15 API Routes
- Prisma ORM
- PostgreSQL
- Redis

### Frontend
- Next.js 15 (App Router)
- TailwindCSS
- shadcn/ui Components
- TypeScript

### Infrastructure
- Docker & Docker Compose
- Polygon Network
- Node-cron for automation

## 📦 Installation

### Prerequisites
- Node.js 20+
- Bun or npm
- Docker & Docker Compose (for full stack)

### 1. Clone and Install

```bash
# Clone the repository
git clone <repository-url>
cd yieldvault

# Install frontend dependencies
bun install

# Install contract dependencies
cd contracts && npm install && cd ..

# Install bot dependencies
cd bots && npm install && cd ..
```

### 2. Configure Environment

Create `.env` file in root:

```env
# Database
DATABASE_URL="postgresql://yieldvault:yieldvault_secret@localhost:5432/yieldvault"

# Blockchain
POLYGON_RPC_URL="https://polygon-rpc.com"
MUMBAI_RPC_URL="https://rpc-mumbai.maticvigil.com"

# Contract Addresses (after deployment)
VAULT_ADDRESS=""
CONFIG_ADDRESS=""
REFERRAL_ADDRESS=""
FEE_DISTRIBUTOR_ADDRESS=""

# Bot Private Keys (DO NOT commit real keys!)
HARVEST_BOT_PRIVATE_KEY=""
REBALANCE_BOT_PRIVATE_KEY=""

# Notifications
TELEGRAM_BOT_TOKEN=""
TELEGRAM_CHAT_ID=""

# Admin
ADMIN_ADDRESSES=""
ADMIN_API_KEY=""
```

### 3. Setup Database

```bash
# Generate Prisma client
bunx prisma generate

# Run migrations
bunx prisma migrate dev

# Open Prisma Studio (optional)
bunx prisma studio
```

## 🔧 Smart Contract Development

### Compile Contracts

```bash
cd contracts
npm run compile
```

### Run Tests

```bash
cd contracts
npm test

# With coverage
npm run test:coverage
```

### Deploy Contracts

```bash
# Deploy to Mumbai testnet
cd contracts
npm run deploy:mumbai

# Deploy to Polygon mainnet
npm run deploy:polygon
```

## 🌐 Running the Application

### Development Mode

```bash
# Start development server
bun run dev
```

The app will be available at http://localhost:3000

## 🌍 Internationalization (i18n)

The platform supports 3 languages:
- 🇺🇸 **English** (en)
- 🇧🇷 **Português** (pt-BR)
- 🇪🇸 **Español** (es)

### Features
- Auto-detect browser language
- Persist language preference in localStorage
- Easy language switching via dropdown

### Usage in Components

```tsx
import { useI18n } from '@/contexts/I18nContext';

function MyComponent() {
  const { t, locale, setLocale } = useI18n();
  
  return (
    <div>
      <h1>{t('hero.title1')}</h1>
      <p>{t('hero.subtitle', { apy: '23.5%' })}</p>
    </div>
  );
}
```

### Adding New Translations

1. Add keys to `/src/i18n/locales/en/common.json`
2. Copy to `pt-BR` and `es` directories
3. Translate the values

### File Structure
```
src/i18n/
├── index.ts           # Core i18n functions
├── locales/
│   ├── en/
│   │   └── common.json
│   ├── pt-BR/
│   │   └── common.json
│   └── es/
│       └── common.json
```

### Production with Docker

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## 📊 API Endpoints

### Vault
- `GET /api/vault` - Get vault information (TVL, APY, stats)
- `GET /api/vault?include=chart,transactions` - Include additional data

### User
- `GET /api/user/[address]` - Get user's vault and referral info

### Referral
- `GET /api/referral?address=0x...` - Get referral statistics
- `GET /api/referral?address=0x...&tree=true` - Include referral tree
- `POST /api/referral` - Register referral or claim commissions

### Admin
- `GET /api/admin` - Get admin dashboard stats
- `POST /api/admin` - Update configuration, toggle features

## 🤖 Bots

### Harvest Bot
Automatically harvests yield from strategies and compounds earnings.

```bash
cd bots
npm run start:harvest
```

Configuration:
- `HARVEST_INTERVAL`: Cron schedule (default: every 6 hours)
- `MAX_GAS_PRICE`: Maximum gas price in Gwei
- `MIN_PROFIT_THRESHOLD`: Minimum profit to justify harvest

### Rebalance Bot
Monitors strategy health and rebalances positions.

```bash
cd bots
npm run start:rebalance
```

Configuration:
- `CHECK_INTERVAL`: Cron schedule (default: every 30 minutes)
- `MIN_HEALTH_FACTOR`: Minimum health factor threshold

## 🔐 Security Considerations

1. **Smart Contract Audits**: Have contracts audited before mainnet deployment
2. **Multisig Admin**: Use a multisig wallet for admin functions
3. **Timelock**: Critical changes require 24h timelock
4. **Private Keys**: Never commit private keys; use environment variables
5. **Rate Limiting**: Implement API rate limiting in production

## 📈 Referral System

The platform features a 5-level unilevel referral system:

| Level | Commission Rate |
|-------|----------------|
| 1     | 40%           |
| 2     | 25%           |
| 3     | 15%           |
| 4     | 12%           |
| 5     | 8%            |

Commissions are earned from:
1. **Deposit Fees**: 5% of deposits distributed to referral network
2. **Yield Earnings**: 10% of referral's yield shared with upline

## 🧪 Testing

### Smart Contract Tests

```bash
cd contracts
npm test
```

### Frontend Tests

```bash
bun test
```

## 📝 License

MIT License

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📞 Support

- Documentation: [docs.yieldvault.io]
- Discord: [discord.gg/yieldvault]
- Twitter: [@yieldvault]

---

⚠️ **Disclaimer**: DeFi investments carry significant risks. Only invest what you can afford to lose. This is not financial advice.
