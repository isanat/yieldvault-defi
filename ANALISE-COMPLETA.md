# YieldVault DeFi - Documento de Analise Completa

**Data da Analise:** 2026-03-14
**Repositorio:** https://github.com/isanat/yieldvault-defi
**Branch de trabalho:** claude/analyze-yieldvault-defi-UdBtT

---

## 1. O QUE E O PROJETO

YieldVault e uma **plataforma DeFi de otimizacao de rendimento** implantada na **Polygon Mainnet** (Chain ID: 137). O sistema opera em **dois modos** que o administrador pode alternar:

- **Modo Interno (Vault Interno):** O rendimento e gerado por uma empresa de arbitragem externa que injeta USDT periodicamente no vault. O contrato calcula e distribui os juros aos investidores com base em uma taxa configuravel.

- **Modo Real (Estrategias DeFi):** O capital e alocado em protocolos DeFi reais (Aave V3 e QuickSwap V3) para gerar rendimento on-chain.

O projeto usa o padrao **ERC4626** (vault tokenizado) onde usuarios depositam USDT e recebem "shares" (cotas) proporcionais ao valor do vault.

---

## 2. MODELO DE NEGOCIO

### 2.1. Fluxo do Vault Interno
```
Empresa de Arbitragem (off-chain)
        |
        | Lucro gerado por arbitragem
        v
Owner injeta USDT no Vault Interno
        |
        v
LocalStrategyManagerV3 calcula juros por tempo
        |
        v
Investidores fazem claim dos rendimentos
```

- O capital dos investidores fica custodiado no contrato
- Os rendimentos NAO vem dos depositos de outros investidores
- Os rendimentos vem da **injecao externa** feita pelo owner (lucro de arbitragem)
- A taxa de juros (atualmente 1% ao dia) e configuravel pelo owner

### 2.2. Fluxo das Estrategias Reais
```
Investidor deposita USDT
        |
        v
YieldVaultV3 --> StrategyControllerV3
        |                |
        v                v
   AaveLoopV3     StableLpV3
   (Aave V3)     (QuickSwap V3)
        |                |
        v                v
   Rendimento real DeFi
```

### 2.3. Sistema de Referral (MLM 5 Niveis)
O sistema de indicacao distribui comissoes **sobre o RENDIMENTO** dos investidores indicados, NAO sobre o valor depositado.

**PROBLEMA ATUAL:** No codigo atual (`LocalStrategyManagerV3.sol` linha 77), o referral e chamado com `amountAfterFee` (valor do deposito), nao com o rendimento. Isso precisa ser corrigido na reestruturacao.

```
Investidor gera rendimento
        |
        v
Rendimento do investidor e calculado
        |
        v
Comissao de referral e calculada SOBRE O RENDIMENTO
        |
        v
Distribuida nos 5 niveis da cadeia
```

| Nivel | Comissao (sobre o rendimento) |
|-------|-------------------------------|
| Nivel 1 (direto) | 40% |
| Nivel 2 | 25% |
| Nivel 3 | 15% |
| Nivel 4 | 12% |
| Nivel 5 | 8% |
| **Total** | **100% do bonus de referral** |

---

## 3. ARQUITETURA TECNICA

### Stack
- **Frontend:** Next.js 16 + React 19 + TypeScript 5 + Tailwind CSS 4
- **UI:** shadcn/ui (40+ componentes) + Framer Motion + Lucide React
- **Web3:** Wagmi 3.5 + Viem 2.47 (MetaMask)
- **Backend:** API Routes do Next.js (Server-Side)
- **Smart Contracts:** Solidity 0.8.20 (OpenZeppelin)
- **Banco de Dados:** SQLite via Prisma ORM (uso minimo)
- **Blockchain:** Polygon Mainnet

### Banco de Dados
- **Tipo:** SQLite (arquivo `db/custom.db`)
- **ORM:** Prisma
- **Schema:** Apenas 2 modelos basicos (User + Post) - schema padrao do scaffold
- **Uso real:** Minimo. Os dados financeiros (depositos, saques, shares, rewards) ficam **100% on-chain** nos smart contracts
- **Observacao:** O banco de dados provavelmente precisara ser expandido na reestruturacao para armazenar configuracoes do admin, logs de injecao, historico, etc.

---

## 4. CONTRATOS IMPLANTADOS (Polygon Mainnet - Marco 2025)

### Contratos Core

| Contrato | Endereco | Funcao |
|----------|---------|--------|
| **YieldVaultV3** | `0x0E8F1358e12BB30C59124B5c4288F50ddBB75bff` | Vault principal - recebe depositos USDT, emite shares |
| **ConfigV3** | `0xa4A47b3485f6764E3e94562fA4a42DF929a63Be1` | Configuracao centralizada de taxas e enderecos |
| **ReferralV3** | `0x7a572e317621f356aF2d5d651533FB30b51f51f5` | Sistema de indicacao em 5 niveis |
| **FeeDistributorV3** | `0xf1B69c2814E08b587Fa448eCce97aaEc5e8773Fd` | Distribui taxas: 80% tesouraria, 20% owner |
| **LocalStrategyManagerV3** | `0x801E1057BA35FB085021d72570AFf26A23332127` | Vault Interno - estrategia com juros configuraveis |
| **StrategyControllerV3** | `0x1a321f28A6f0851c566589E0303dd883a082A9F6` | Orquestrador multi-estrategia |

### Contratos de Estrategia Real (status: problemas de compilacao)

| Contrato | Endereco | Status |
|----------|---------|--------|
| **AaveLoopStrategyV3** | `0xd8E97004c1E8EfbbFbEd3d234807b000E12ED5B3` | Deployado mas com erros de compilacao (tuplas Solidity) |
| **StableLpStrategyV3** | `0x5dAFd27f43b15f3a0839bEf885edB7709705cd44` | Deployado mas com erros de compilacao (tuplas Solidity) |

### Contratos V2 (Legacy)

| Contrato | Endereco |
|----------|---------|
| Vault V2 | `0xFB6fdf95A7bD09e88185fD6125955839F86407d8` |
| Aave Strategy V2 | `0xE43D00F9C88D57a3922d1c74ae0cfd7161bc4F44` |
| QuickSwap Strategy V2 | `0x1a0567Ff82Ae268529cF23c0E66391E300ed00B4` |

### Owner de todos os contratos
`0x80e65E0B160d752121cc62646dA69808846ED63b`

---

## 5. ANALISE DO VAULT INTERNO (LocalStrategyManagerV3)

### 5.1. Como funciona hoje

O contrato `LocalStrategyManagerV3.sol` gerencia o vault interno:

**Taxa de juros:**
```solidity
// contracts-v3/contracts/LocalStrategyManagerV3.sol (linhas 33-34)
uint256 public constant INTEREST_RATE_BPS = 100; // 1% per day
uint256 public constant COMPOUND_INTERVAL = 1 days;
```

**Calculo de rendimento:**
```solidity
// linhas 115-136
function _accrueRewards(address _user) internal {
    UserInfo storage user = userInfo[_user];
    if (user.deposited > 0 && user.lastDepositTime > 0) {
        uint256 timeElapsed = block.timestamp - user.lastDepositTime;
        if (timeElapsed >= COMPOUND_INTERVAL) {
            uint256 intervals = timeElapsed / COMPOUND_INTERVAL;
            uint256 rewards = (user.deposited * INTEREST_RATE_BPS * intervals) / MAX_BPS;
            uint256 performanceFee = (rewards * performanceFeeBP) / MAX_BPS;
            uint256 netRewards = rewards - performanceFee;
            user.pendingRewards += netRewards;
        }
    }
}
```

**Pagamento de rendimento:**
```solidity
// linhas 99-113
function claimRewards() external {
    _accrueRewards(msg.sender);
    uint256 rewards = user.pendingRewards;
    user.pendingRewards = 0;
    usdt.safeTransfer(msg.sender, rewards); // Paga do saldo do contrato
}
```

**Funcoes de gestao do owner (para injecao de capital e emergencia):**
```solidity
// linhas 171-180
function emergencyWithdraw(uint256 _amount) external onlyOwner {
    usdt.safeTransfer(owner(), _amount);
}
function sweep() external onlyOwner {
    uint256 balance = usdt.balanceOf(address(this));
    if (balance > 0) { usdt.safeTransfer(owner(), balance); }
}
```

### 5.2. Problemas identificados no vault interno

| # | Problema | Detalhe | Impacto |
|---|---------|---------|---------|
| 1 | **Taxa hardcoded como constant** | `INTEREST_RATE_BPS` e `constant`, nao pode ser alterada | Owner nao consegue ajustar a taxa de rendimento |
| 2 | **Referral sobre deposito, nao rendimento** | Linha 77: `_distributeReferralRewards(msg.sender, amountAfterFee)` | Comissao calculada sobre o valor depositado, deveria ser sobre o rendimento |
| 3 | **Sem funcao de injecao explicita** | Owner precisa enviar USDT diretamente para o contrato | Sem rastreabilidade, sem eventos de injecao |
| 4 | **Sem validacao de solvencia** | `claimRewards()` nao verifica se ha saldo suficiente | Pode falhar silenciosamente se nao houver USDT suficiente |
| 5 | **Sem historico de rendimento** | Nao emite evento especifico de accrual | Dificil auditar os calculos de rendimento |
| 6 | **sweep() sem protecao** | Pode drenar fundos dos investidores | Deveria ter limites ou timelock |
| 7 | **Sem toggle Real/Interno** | Nao existe mecanismo para alternar modos | Admin nao pode escolher entre estrategia interna e real |

---

## 6. ANALISE DAS ESTRATEGIAS REAIS

### 6.1. AaveLoopStrategyV3 (Aave V3 Loop)

**Conceito:** Lending com alavancagem (loop) no Aave V3
- Deposita USDT como colateral
- Pega emprestimo e re-deposita (loop ate 4x)
- Lucro = spread entre taxa de supply e borrow
- APY esperado: 8-15%
- Risco: Medio (Health Factor monitorado: 1.4-2.0)

**Status:** Codigo completo mas com erros de compilacao nas tuplas de retorno do `getUserAccountData()`.

### 6.2. StableLpStrategyV3 (QuickSwap V3 + Aave)

**Conceito:** LP de stablecoins + lending
- 40% do capital vai para Aave (supply USDT)
- Pega emprestimo em USDC
- 60% vai para LP USDT/USDC no QuickSwap V3
- Coleta fees do LP + spread do lending
- APY esperado: 12-25%
- Risco: Medio-Baixo

**Status:** Codigo completo mas com erros de compilacao nas tuplas Solidity.

### 6.3. StrategyControllerV3

**Conceito:** Orquestrador que gerencia multiplas estrategias
- Distribui capital entre estrategias ativas conforme alocacao definida
- Suporta harvest (coleta de lucros) e rebalance
- Funciona como intermediario entre o Vault e as estrategias

**Status:** Codigo funcional, deployado.

---

## 7. ESTRUTURA DE TAXAS

| Taxa | Valor | Observacao |
|------|-------|-----------|
| Deposito | 5% (500 BPs) | Cobrada na entrada |
| Performance | 20% (2000 BPs) | Sobre rendimentos gerados |
| Gestao | 2% (200 BPs) | Anual |
| Saque | 0% | Livre |

### Distribuicao das Taxas (FeeDistributorV3)
- **80%** vai para o endereco Treasury
- **20%** vai para o Owner

---

## 8. ANALISE DO FRONTEND

### 8.1. Pagina Principal (src/app/page.tsx)
- UI profissional com tema dark e cores Polygon (purple/violet/fuchsia)
- Animacoes com Framer Motion
- Secoes: Hero, Features, Estrategias, Referral, Taxas, Contratos, Dashboard
- Dialogs de deposito e saque (sem logica write implementada - so UI)
- Dashboard do usuario (shares, depositos, saques, rendimentos, referral)

### 8.2. APIs (src/app/api/)
- `/api/protocol` - Dados do protocolo (TVL, taxas, estrategias, status)
- `/api/user?address=0x...` - Dados do usuario (posicao, saldo, referral)
- `/api` - Health check

### 8.3. Problemas no Frontend

| # | Problema | Arquivo | Detalhe |
|---|---------|---------|---------|
| 1 | **Dados hardcoded como fallback** | service.ts:372-374 | APY com fallback `|| 8` e `|| 15` |
| 2 | **totalPaidOut inventado** | service.ts:384 | Hardcoded `'$180K+'` |
| 3 | **getTotalUsers() sempre retorna 0** | service.ts:177-186 | Nao implementado |
| 4 | **Sem painel admin** | - | Nao existe interface de administracao |
| 5 | **Sem toggle Real/Interno** | - | Nao existe botao para alternar modos |
| 6 | **Deposito/Saque so tem UI** | page.tsx | Dialogs existem mas nao fazem transacoes on-chain |

---

## 9. O QUE ESTA FUNCIONANDO vs O QUE NAO ESTA

### Funcionando:
- [x] Frontend completo com UI profissional
- [x] Conexao de wallet (MetaMask/Polygon)
- [x] APIs de leitura de dados on-chain
- [x] Contratos core deployados (Vault, Config, Referral, FeeDistributor)
- [x] Contrato LocalStrategyManagerV3 (vault interno) deployado
- [x] Sistema de referral ReferralV3 deployado
- [x] StrategyControllerV3 deployado
- [x] Internacionalizacao basica (PT, EN, ES, FR)

### Com Problemas:
- [ ] Estrategias reais (Aave Loop e Stable LP) - erros de compilacao Solidity
- [ ] Frontend usa fallbacks hardcoded quando leitura on-chain falha
- [ ] `totalPaidOut` hardcoded no service.ts
- [ ] `getTotalUsers()` sempre retorna 0
- [ ] Referral calcula comissao sobre deposito em vez de rendimento
- [ ] Taxa de juros e `constant` (nao alteravel)

### Nao Implementado:
- [ ] Painel de Administracao (toggle Real/Interno, gestao de estrategias)
- [ ] Funcao de injecao de capital com rastreabilidade
- [ ] Deposito/Saque funcional no frontend (falta logica write)
- [ ] Mini-services (pasta vazia com .gitkeep)
- [ ] Testes automatizados
- [ ] Subgraph para indexacao de eventos

---

## 10. MAPA DE ARQUIVOS IMPORTANTES

```
yieldvault-defi/
|-- contracts-v3/
|   |-- contracts/
|   |   |-- YieldVaultV3.sol              # Vault principal (ERC4626)
|   |   |-- ConfigV3.sol                  # Configuracao de taxas/enderecos
|   |   |-- ReferralV3.sol                # Sistema MLM 5 niveis
|   |   |-- FeeDistributorV3.sol          # Distribuicao de taxas (80/20)
|   |   |-- LocalStrategyManagerV3.sol    # Vault Interno (juros simulados)
|   |   |-- IReferralV3.sol               # Interface do Referral
|   |   |-- interfaces/
|   |   |   |-- IAaveV3Pool.sol           # Interface Aave V3
|   |   |   |-- IQuickSwapV3.sol          # Interface QuickSwap V3
|   |   |-- strategies/
|   |   |   |-- IStrategy.sol             # Interface padrao das estrategias
|   |   |   |-- BaseStrategy.sol          # Contrato base abstrato
|   |   |   |-- StrategyControllerV3.sol  # Orquestrador multi-estrategia
|   |   |   |-- AaveLoopStrategyV3.sol    # Estrategia Aave (com bugs)
|   |   |   |-- StableLpStrategyV3.sol    # Estrategia QuickSwap (com bugs)
|   |-- deployed-addresses.json           # Enderecos deployados
|   |-- deployed-strategies.json          # Config das estrategias
|
|-- src/
|   |-- app/
|   |   |-- page.tsx                      # Pagina principal (toda a UI)
|   |   |-- layout.tsx                    # Layout root
|   |   |-- api/
|   |   |   |-- protocol/route.ts         # API dados do protocolo
|   |   |   |-- user/route.ts             # API dados do usuario
|   |-- components/
|   |   |-- ui/                           # 40+ componentes shadcn/ui
|   |   |-- providers/Web3Provider.tsx     # Provider Wagmi + TanStack Query
|   |-- hooks/
|   |   |-- useWallet.ts                  # Hook de conexao wallet
|   |   |-- useProtocol.ts                # Hook dados do protocolo
|   |   |-- useUserData.ts                # Hook dados do usuario
|   |-- lib/
|   |   |-- blockchain/
|   |   |   |-- contracts.ts              # Enderecos dos contratos
|   |   |   |-- service.ts                # Funcoes de leitura on-chain
|   |   |   |-- client.ts                 # Viem public client
|   |   |   |-- abis/                     # ABIs dos contratos
|   |   |-- wagmi-config.ts               # Config do Wagmi
|   |   |-- i18n/translations.ts          # Traducoes i18n
|   |   |-- db.ts                         # Prisma client
|
|-- prisma/schema.prisma                  # Schema do banco (SQLite)
|-- db/custom.db                          # Banco SQLite
|-- worklog.md                            # Log de desenvolvimento
```

---

## 11. CONCLUSAO

O YieldVault DeFi e uma plataforma de investimento em USDT na Polygon com dois modos de operacao:

1. **Vault Interno:** Rendimento proveniente de injecao externa (empresa de arbitragem). O contrato `LocalStrategyManagerV3` calcula e distribui os juros. O owner injeta USDT para cobrir os pagamentos.

2. **Estrategias Reais DeFi:** Capital alocado em Aave V3 (lending alavancado) e QuickSwap V3 (LP de stablecoins). Atualmente com bugs de compilacao.

3. **Sistema de Referral MLM:** 5 niveis de comissao que devem incidir sobre o RENDIMENTO (nao sobre o deposito como esta implementado atualmente).

4. **Administracao:** Falta completamente o painel admin com toggle Real/Interno.

O sistema tem uma base solida mas precisa de reestruturacao significativa para funcionar corretamente em ambos os modos.
