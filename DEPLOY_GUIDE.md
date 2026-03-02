# YieldVault DeFi - Deploy & Setup Guide

## 🚀 Quick Start

### 1. Obter MATIC de Teste (NECESSÁRIO)

**Carteira de Deploy:** `0x734eB886DD7313f306128208A19794D597957A50`

Obtenha MATIC grátis nos faucets:
- https://faucet.polygon.technology/ (selecione **Mumbai**)
- https://mumbai.polygonscan.com/faucet
- https://www.alchemy.com/faucets/polygon-mumbai

### 2. Deploy dos Smart Contracts

```bash
# Torne o script executável
chmod +x deploy-mumbai.sh

# Execute o deploy
./deploy-mumbai.sh
```

Ou manualmente:
```bash
cd contracts
bunx hardhat run deploy/00_deploy_all.ts --network mumbai
```

### 3. Configurar WalletConnect

1. Acesse https://cloud.reown.com/
2. Crie uma conta gratuita
3. Crie um novo projeto do tipo "App"
4. Copie o Project ID
5. Adicione ao `.env`:
   ```
   NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=seu_project_id_aqui
   ```

### 4. Executar Localmente

```bash
bun install
bun run dev
```

## 📋 Configuração Atual

| Parâmetro | Valor |
|-----------|-------|
| **Rede** | Mumbai Testnet (Chain ID: 80001) |
| **USDT** | `0x701cb85ef71F42C2ce4839f16EdBAB1bB72E51bd` |
| **Owner** | `0x642dA0e0C51e02d4Fe7C4b557C49F9D1111cF903` |
| **Deployer** | `0x734eB886DD7313f306128208A19794D597957A50` |
| **Database** | Neon PostgreSQL |

## 🔗 Links Úteis

- [Mumbai Explorer](https://mumbai.polygonscan.com/)
- [Polygon Faucet](https://faucet.polygon.technology/)
- [WalletConnect Cloud](https://cloud.reown.com/)

## 📝 Após o Deploy

Os endereços dos contratos serão salvos automaticamente no `.env`. 

Os contratos terão:
- **Owner:** `0x642dA0e0C51e02d4Fe7C4b557C49F9D1111cF903`
- **Treasury:** `0x642dA0e0C51e02d4Fe7C4b557C49F9D1111cF903`
- **USDT:** `0x701cb85ef71F42C2ce4839f16EdBAB1bB72E51bd`

## ⚠️ Importante

- Mantenha a private key do deployer segura
- Para produção, use uma multisig como owner
- Sempre verifique os contratos no Polygonscan
