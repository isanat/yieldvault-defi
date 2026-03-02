#!/bin/bash

# YieldVault DeFi - Deploy Script for Mumbai Testnet
# ================================================

echo "=============================================="
echo "  YieldVault DeFi - Mumbai Testnet Deploy"
echo "=============================================="
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    bun install
fi

# Check balance
echo "Checking deployer balance..."
DEPLOYER_ADDRESS="0x734eB886DD7313f306128208A19794D597957A50"
echo "Deployer: $DEPLOYER_ADDRESS"
echo ""

# Get balance using ethers
BALANCE=$(bun -e "
const { JsonRpcProvider } = require('ethers');
const provider = new JsonRpcProvider('https://rpc-mumbai.maticvigil.com');
provider.getBalance('$DEPLOYER_ADDRESS').then(b => {
  console.log((Number(b) / 1e18).toFixed(4));
}).catch(() => console.log('0'));
" 2>/dev/null)

echo "Balance: $BALANCE MATIC"
echo ""

if [ "$(echo "$BALANCE < 0.01" | bc -l 2>/dev/null || echo "1")" = "1" ]; then
    echo "⚠️  Insufficient balance! Need at least 0.01 MATIC for deployment."
    echo ""
    echo "Get free Mumbai MATIC from:"
    echo "  - https://faucet.polygon.technology/"
    echo "  - https://mumbai.polygonscan.com/faucet"
    echo "  - https://www.alchemy.com/faucets/polygon-mumbai"
    echo ""
    echo "Send MATIC to: $DEPLOYER_ADDRESS"
    echo ""
    exit 1
fi

echo "✓ Sufficient balance for deployment"
echo ""

# Run deployment
echo "Starting deployment..."
echo ""

cd contracts
bunx hardhat run deploy/00_deploy_all.ts --network mumbai

echo ""
echo "=============================================="
echo "  Deployment Complete!"
echo "=============================================="
