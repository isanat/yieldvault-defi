# YieldVault DeFi - Guia de Reestruturacao

**Data:** 2026-03-14
**Atualizado:** 2026-03-14
**Referencia:** ANALISE-COMPLETA.md
**Objetivo:** Documentar tudo que precisa ser corrigido, criado e reestruturado

---

## REGRAS DE NEGOCIO DEFINIDAS PELO OWNER

Estas sao as regras definitivas que devem guiar toda a reestruturacao:

### R1. Dois Modos de Operacao
O sistema opera em dois modos, alternados pelo admin via painel:
- **Interno:** Rendimento vem de injecao externa (empresa de arbitragem)
- **Real:** Rendimento vem de estrategias DeFi (Aave V3 / QuickSwap V3)

### R2. MLM sobre RENDIMENTO (nao deposito)
O sistema de referral (5 niveis) incide **exclusivamente sobre o rendimento** gerado para o investidor, NUNCA sobre o valor depositado.

### R3. Bonus de Equipe (dois componentes)
O MLM tem dois tipos de bonus:
- **Bonus de Rendimento da Rede:** % sobre o rendimento total gerado pelos investidores da rede (5 niveis abaixo)
- **Bonus de Volume da Rede:** % sobre o volume total depositado pela equipe

### R4. Administracao Total
O admin/owner tem controle total sobre:
- Todos os contratos (pausar, despausar, configurar)
- Taxas de juros e todas as configuracoes
- Banco de dados e carteiras dos usuarios
- Injetar e retirar do vault livremente
- Direcionar valores do vault para estrategias
- Retirar valores das estrategias a qualquer momento

### R5. Fluxo de Capital do Owner
```
Owner --> injectCapital() --> Vault Interno (paga rendimentos)
Owner --> withdrawFromVault() --> Retira do Vault
Owner --> depositToStrategy() --> Envia capital do Vault para estrategia
Owner --> withdrawFromStrategy() --> Retira capital da estrategia de volta ao Vault
```

---

## BLOCO 1: VAULT INTERNO (LocalStrategyManagerV3)

### 1.1. Taxa de juros deve ser ALTERAVEL

**Problema atual:**
```solidity
// LocalStrategyManagerV3.sol:33
uint256 public constant INTEREST_RATE_BPS = 100; // NAO PODE SER ALTERADA!
```

**Correcao:**
- Remover `constant` de `INTEREST_RATE_BPS`
- Remover `constant` de `COMPOUND_INTERVAL` (para poder ajustar periodo)
- Criar funcoes:
  ```solidity
  function setInterestRate(uint256 _rateBPS) external onlyOwner
  function setCompoundInterval(uint256 _interval) external onlyOwner
  ```
- Validar limites razoaveis
- Emitir eventos: `InterestRateUpdated`, `CompoundIntervalUpdated`

### 1.2. Funcao de injecao de capital com rastreabilidade

**O que falta:** Funcao explicita para o owner injetar USDT com registro e eventos.

**Criar:**
```solidity
uint256 public totalInjected;
uint256 public totalOwnerWithdrawn;

event CapitalInjected(address indexed owner, uint256 amount, uint256 totalInjected);
event OwnerWithdrawal(address indexed owner, uint256 amount, uint256 totalOwnerWithdrawn);

function injectCapital(uint256 _amount) external onlyOwner {
    usdt.safeTransferFrom(owner(), address(this), _amount);
    totalInjected += _amount;
    emit CapitalInjected(owner(), _amount, totalInjected);
}

function ownerWithdraw(uint256 _amount) external onlyOwner {
    usdt.safeTransfer(owner(), _amount);
    totalOwnerWithdrawn += _amount;
    emit OwnerWithdrawal(owner(), _amount, totalOwnerWithdrawn);
}
```

### 1.3. Validacao de solvencia

**Problema:** `claimRewards()` nao verifica saldo antes de pagar.

**Correcao:**
```solidity
function claimRewards() external {
    _accrueRewards(msg.sender);
    uint256 rewards = user.pendingRewards;
    require(rewards > 0, "No rewards");
    uint256 available = usdt.balanceOf(address(this));
    require(available >= rewards, "Insufficient vault balance");
    // ... transfer
}
```

### 1.4. Funcoes do owner para direcionar capital

**Criar funcoes para o owner mover capital livremente:**
```solidity
// Envia capital do vault para uma estrategia
function depositToStrategy(address _strategy, uint256 _amount) external onlyOwner

// Retira capital de uma estrategia de volta ao vault
function withdrawFromStrategy(address _strategy, uint256 _amount) external onlyOwner

// Retira todo capital de uma estrategia
function withdrawAllFromStrategy(address _strategy) external onlyOwner
```

### 1.5. Eventos completos

**Adicionar:**
```solidity
event CapitalInjected(address indexed owner, uint256 amount, uint256 totalInjected);
event OwnerWithdrawal(address indexed owner, uint256 amount);
event InterestRateUpdated(uint256 oldRate, uint256 newRate);
event CompoundIntervalUpdated(uint256 oldInterval, uint256 newInterval);
event RewardsAccrued(address indexed user, uint256 grossRewards, uint256 netRewards);
event ModeChanged(bool isInternal);
event CapitalSentToStrategy(address indexed strategy, uint256 amount);
event CapitalReturnedFromStrategy(address indexed strategy, uint256 amount);
```

---

## BLOCO 2: SISTEMA MLM / REFERRAL

### 2.1. Comissao sobre RENDIMENTO (correcao critica)

**Problema atual no LocalStrategyManagerV3.sol:**
```solidity
// LINHA 77 - ERRADO: calcula referral sobre o DEPOSITO
function deposit(uint256 _amount) external {
    // ...
    _distributeReferralRewards(msg.sender, amountAfterFee); // <-- SOBRE DEPOSITO!
}
```

**Correcao:** Mover o calculo de referral para o momento do accrual/claim de rendimento:
```solidity
function _accrueRewards(address _user) internal {
    // ... calcula rendimento ...
    uint256 netRewards = rewards - performanceFee;

    // NOVO: Calcular referral sobre o RENDIMENTO
    uint256 referralBonus = _calculateAndDistributeReferral(_user, netRewards);

    user.pendingRewards += netRewards;
}
```

**Remover** a linha `_distributeReferralRewards(msg.sender, amountAfterFee)` do `deposit()`.

### 2.2. Bonus de Rendimento da Rede (5 niveis)

Quando um investidor gera rendimento, seus indicadores recebem % desse rendimento:

```
Investidor gera 100 USDT de rendimento
    |
    +--> Nivel 1 (indicador direto): 40% do bonus = X USDT
    +--> Nivel 2: 25% do bonus
    +--> Nivel 3: 15% do bonus
    +--> Nivel 4: 12% do bonus
    +--> Nivel 5: 8% do bonus
```

**Taxas atuais (configuraveis pelo admin):**
| Nivel | Rate (BPs) | Porcentagem |
|-------|-----------|-------------|
| 1 | 4000 | 40% |
| 2 | 2500 | 25% |
| 3 | 1500 | 15% |
| 4 | 1200 | 12% |
| 5 | 800 | 8% |

**Importante:** Essas porcentagens sao sobre a **parcela de referral** do rendimento, nao sobre o rendimento inteiro. O admin define qual % do rendimento vai para referral (ex: 10% do rendimento vai para pool de referral, e dentro desse pool, distribui nos 5 niveis).

### 2.3. Bonus de Volume da Rede (NOVO - nao existe no contrato atual)

**Conceito:** O indicador recebe bonus baseado no volume total depositado pela sua equipe.

**Necessario criar no contrato ReferralV3:**
```solidity
struct TeamInfo {
    uint256 totalTeamDeposited;     // Volume total da equipe
    uint256 directTeamDeposited;    // Volume dos diretos
    uint256 teamBonusEarned;        // Total de bonus de volume recebido
}

mapping(address => TeamInfo) public teamInfo;

// Taxas de bonus de volume (configuraveis pelo admin)
uint256 public volumeBonusRateBP; // ex: 50 = 0.5% do volume

function _updateTeamVolume(address _user, uint256 _depositAmount) internal {
    address currentReferrer = users[_user].referrer;
    for (uint256 i = 0; i < MAX_LEVELS; i++) {
        if (currentReferrer == address(0)) break;
        teamInfo[currentReferrer].totalTeamDeposited += _depositAmount;
        if (i == 0) {
            teamInfo[currentReferrer].directTeamDeposited += _depositAmount;
        }
        currentReferrer = users[currentReferrer].referrer;
    }
}
```

### 2.4. Pagamento efetivo dos referrals

**Problema atual:** O `ReferralV3.sol` apenas **registra** rewards na struct mas **NAO transfere** USDT.

**Correcao necessaria:**
O contrato precisa:
1. Receber USDT (do vault/strategy) quando distribuir rewards
2. Acumular rewards clamaveis por referrer
3. Ter funcao `claimReferralRewards()` para referrers sacarem
4. Ou transferir automaticamente

```solidity
// Opcao recomendada: acumular + claim
mapping(address => uint256) public pendingReferralRewards;

function claimReferralRewards() external {
    uint256 amount = pendingReferralRewards[msg.sender];
    require(amount > 0, "No rewards");
    pendingReferralRewards[msg.sender] = 0;
    usdt.safeTransfer(msg.sender, amount);
    emit ReferralRewardsClaimed(msg.sender, amount);
}
```

### 2.5. Admin controla taxas do MLM

O admin deve poder alterar via painel:
- Taxa de cada nivel do referral (5 niveis)
- Taxa de bonus de volume
- Habilitar/desabilitar bonus de volume
- Habilitar/desabilitar referral completamente
- Ver dashboard com total distribuido, top referrers, etc.

---

## BLOCO 3: PAINEL DE ADMINISTRACAO (CRIAR DO ZERO)

### 3.1. Arquitetura

```
/admin                      --> Dashboard principal (protegido por wallet owner)
/admin/vault                --> Gestao do Vault (injetar, retirar, saldo)
/admin/strategies           --> Gestao das Estrategias (ativar, desativar, alocar)
/admin/referral             --> Gestao do MLM (taxas, bonus, dashboard)
/admin/users                --> Gestao de Usuarios (carteiras, depositos, rewards)
/admin/config               --> Configuracoes (taxas, juros, modo, contratos)
/admin/logs                 --> Historico de acoes admin
```

### 3.2. Dashboard Principal (/admin)

**Cards de resumo:**
- TVL Total (saldo no vault + saldo nas estrategias)
- Total de Usuarios Registrados
- Total de Rendimentos Pagos
- Total de Referral Distribuido
- Total Injetado pelo Owner
- Total Retirado pelo Owner
- Saldo Disponivel para Pagamentos
- Modo Atual (Interno / Real)

**Alertas:**
- Solvencia: aviso se saldo < total de claims pendentes
- Health Factor: aviso se HF das estrategias cair
- Estrategia pausada ou com erro

### 3.3. Gestao do Vault (/admin/vault)

**Acoes do admin:**

| Acao | Funcao no Contrato | Descricao |
|------|-------------------|-----------|
| Injetar Capital | `injectCapital(amount)` | Envia USDT do owner para o vault |
| Retirar do Vault | `ownerWithdraw(amount)` | Retira USDT do vault para o owner |
| Ver Saldo | `usdt.balanceOf(vault)` | Saldo atual do vault |
| Ver Total Depositado | `totalDeposited` | Total depositado pelos investidores |
| Ver Total Injetado | `totalInjected` | Total injetado pelo owner |
| Ver Total Retirado | `totalOwnerWithdrawn` | Total retirado pelo owner |
| Alterar Juros | `setInterestRate(rate)` | Muda a taxa de rendimento |
| Pausar Vault | `pause()` | Pausa depositos e saques |
| Despausar Vault | `unpause()` | Retoma operacoes |

**Historico:**
- Tabela com todas as injecoes e retiradas do owner
- Tabela com todos os depositos e saques dos investidores
- Grafico de saldo ao longo do tempo

### 3.4. Gestao de Estrategias (/admin/strategies)

**Toggle Modo:**
- Botao grande "MODO INTERNO / MODO REAL"
- Confirmacao antes de trocar
- Mostra status atual em destaque

**Gestao de cada estrategia:**

| Acao | Funcao | Descricao |
|------|--------|-----------|
| Enviar capital para estrategia | `depositToStrategy(strategy, amount)` | Move USDT do vault para estrategia |
| Retirar da estrategia | `withdrawFromStrategy(strategy, amount)` | Traz USDT da estrategia pro vault |
| Retirar TUDO | `withdrawAllFromStrategy(strategy)` | Emergencia: traz tudo de volta |
| Alterar alocacao | `setAllocation(strategy, %)` | Define % do capital nessa estrategia |
| Ativar/Desativar | `setStrategyActive(strategy, bool)` | Liga/desliga estrategia |
| Harvest | `harvestAll()` | Coleta lucros de todas estrategias |
| Rebalance | `rebalance()` | Reequilibra capital entre estrategias |

**Dashboard por estrategia:**
- Nome e descricao
- Status (ativa/pausada)
- APY atual (real)
- Capital alocado
- Lucro/perda acumulado
- Ultimo harvest
- Health Factor (para Aave)

### 3.5. Gestao do MLM (/admin/referral)

**Configuracoes:**
- Alterar taxa de cada nivel (5 niveis)
- Alterar taxa de bonus de volume
- Habilitar/desabilitar referral
- Habilitar/desabilitar bonus de volume

**Dashboard:**
- Total distribuido em referral
- Total distribuido em bonus de volume
- Top 10 referrers por ganhos
- Top 10 referrers por numero de indicados
- Arvore de referral (visualizacao da rede)

### 3.6. Gestao de Usuarios (/admin/users)

**Visualizacao por usuario:**
- Endereco da carteira
- Saldo depositado
- Rendimento acumulado
- Rendimento sacado
- Referral code
- Quem indicou
- Quantos indicou (diretos e rede)
- Ganhos de referral
- Historico de transacoes

**Acoes admin sobre usuario:**
- Ver detalhes completos
- Exportar dados
- (Futuro: bloquear/desbloquear)

### 3.7. Configuracoes (/admin/config)

**Taxas do Vault:**
| Parametro | Funcao | Limites |
|-----------|--------|---------|
| Taxa de deposito | `setFees(deposit, ...)` | 0-10% |
| Taxa de performance | `setFees(..., perf, ...)` | 0-30% |
| Taxa de gestao | `setFees(..., mgmt, ...)` | 0-5% |
| Taxa de saque | `setFees(..., withdraw)` | 0-5% |
| Taxa de juros (interno) | `setInterestRate(rate)` | Configuravel |
| Intervalo de compound | `setCompoundInterval(secs)` | Configuravel |

**Enderecos:**
- Alterar treasury
- Alterar fee distributor shares (80/20)
- Ver todos os enderecos de contratos

**Modo:**
- Toggle Interno/Real
- Visualizar modo atual

### 3.8. Protecao da Rota Admin

```typescript
// Middleware de protecao
// Somente o owner pode acessar /admin/*
// Verifica: wallet.address.toLowerCase() === V3_CONTRACTS.owner.toLowerCase()
// Se nao for owner: redireciona para / com mensagem de acesso negado
```

---

## BLOCO 4: CORRECOES NOS CONTRATOS

### 4.1. YieldVaultV3 - Conectar com estrategias e owner controls

**Problemas:**
1. `totalAssets()` so conta saldo proprio (nao inclui estrategias)
2. `deposit()` nao direciona capital para estrategias
3. Falta toggle de modo Interno/Real
4. Falta funcoes de movimentacao de capital pelo owner

**Adicionar ao contrato:**
```solidity
bool public isInternalMode = true;
address public strategyController;

// Toggle de modo
function setMode(bool _internal) external onlyOwner {
    isInternalMode = _internal;
    emit ModeChanged(_internal);
}

// totalAssets inclui estrategias quando em modo Real
function totalAssets() public view returns (uint256) {
    uint256 vaultBalance = usdtAsset.balanceOf(address(this));
    if (!isInternalMode && strategyController != address(0)) {
        vaultBalance += IStrategyController(strategyController).totalAssets();
    }
    return vaultBalance;
}

// Owner direciona capital para estrategia
function sendToStrategy(uint256 _amount) external onlyOwner {
    require(strategyController != address(0), "No controller");
    usdtAsset.safeApprove(strategyController, _amount);
    IStrategyController(strategyController).deposit(_amount);
    emit CapitalSentToStrategy(strategyController, _amount);
}

// Owner retira capital da estrategia
function pullFromStrategy(uint256 _amount) external onlyOwner {
    require(strategyController != address(0), "No controller");
    IStrategyController(strategyController).withdraw(_amount);
    emit CapitalReturnedFromStrategy(strategyController, _amount);
}
```

### 4.2. Estrategias Reais - Corrigir compilacao

**AaveLoopStrategyV3.sol:**
- Corrigir desestruturacoes de tuplas do `getUserAccountData()`
- Testar compilacao completa

**StableLpStrategyV3.sol:**
- Corrigir desestruturacoes de tuplas
- Corrigir retornos do `positions()`
- Testar compilacao completa

### 4.3. StrategyControllerV3 - Permitir owner direto

Atualmente o controller so aceita chamadas do `vault` (modifier `onlyVault`).
Precisa aceitar tambem do `owner`:

```solidity
modifier onlyVaultOrOwner() {
    require(msg.sender == vault || msg.sender == owner(), "Not authorized");
    _;
}
```

---

## BLOCO 5: CORRECOES NO FRONTEND

### 5.1. Remover dados hardcoded/fallback

| Arquivo | Problema | Correcao |
|---------|---------|---------|
| `service.ts:372` | `\|\| 8` fallback APY Aave | Mostrar "N/A" se indisponivel |
| `service.ts:373` | `\|\| 15` fallback APY StableLP | Mostrar "N/A" se indisponivel |
| `service.ts:384` | `'$180K+'` totalPaidOut hardcoded | Calcular de `totalRewardsDistributed` on-chain |
| `service.ts:177` | `getTotalUsers()` retorna 0 | Implementar contagem via eventos ou referral |

### 5.2. Implementar transacoes reais no frontend

**Deposito funcional:**
1. Usuario informa valor
2. Frontend chama `usdt.approve(vault, amount)`
3. Frontend chama `vault.deposit(amount, receiver)`
4. Mostra status da transacao (pendente, confirmada, erro)
5. Atualiza dashboard apos confirmacao

**Saque funcional:**
1. Usuario informa quantidade de shares
2. Frontend chama `vault.withdraw(shares, receiver, owner)`
3. Mostra status e atualiza

**Claim de rewards:**
1. Mostra pendingRewards do usuario
2. Botao "Claim" chama `localStrategy.claimRewards()`
3. Atualiza apos confirmacao

**Registro de referral:**
1. Input para codigo de indicacao
2. Chama `referral.register(code)`
3. Mostra codigo proprio apos registro

### 5.3. Dashboard do usuario

- Saldo depositado (USDT)
- Shares no vault
- Rendimento acumulado (pendingRewards)
- Rendimento ja sacado
- Ganhos de referral (bonus rendimento rede + bonus volume)
- Codigo de indicacao
- Numero de indicados (diretos e rede)
- Historico de transacoes

---

## BLOCO 6: BANCO DE DADOS (Prisma/SQLite)

### 6.1. Schema atual (minimo - precisa expandir)

Atual:
- `User` (id, email, name) - nao usado
- `Post` (id, title, content) - nao usado

### 6.2. Schema necessario para admin

```prisma
model AdminLog {
  id        String   @id @default(cuid())
  action    String   // "inject", "withdraw", "setRate", "setMode", etc.
  details   String   // JSON com detalhes da acao
  txHash    String?  // Hash da transacao on-chain (se aplicavel)
  amount    String?  // Valor envolvido
  createdAt DateTime @default(now())
}

model InjectionHistory {
  id        String   @id @default(cuid())
  amount    String   // Valor injetado
  txHash    String   // Hash da transacao
  timestamp DateTime @default(now())
}

model WithdrawalHistory {
  id        String   @id @default(cuid())
  amount    String
  txHash    String
  timestamp DateTime @default(now())
}

model SystemConfig {
  id        String   @id @default(cuid())
  key       String   @unique  // "mode", "interestRate", "compoundInterval", etc.
  value     String
  updatedAt DateTime @updatedAt
}

model UserCache {
  id              String   @id @default(cuid())
  walletAddress   String   @unique
  deposited       String   @default("0")
  withdrawn       String   @default("0")
  pendingRewards  String   @default("0")
  referralCode    String?
  referrerAddress String?
  teamDeposited   String   @default("0")
  referralEarnings String  @default("0")
  lastSynced      DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

---

## BLOCO 7: SEGURANCA

### 7.1. Protecoes obrigatorias

- [ ] Validacao de solvencia antes de cada claim
- [ ] Eventos completos em todas as operacoes admin
- [ ] Rate limiting nas APIs
- [ ] Protecao da rota /admin por wallet address
- [ ] Reentrancy guards em todos os contratos (ja existe em alguns)
- [ ] Pausar vault e estrategias em caso de emergencia

### 7.2. Funcoes do owner devem ser auditaveis

Toda acao do owner deve:
1. Emitir evento on-chain
2. Registrar log no banco de dados
3. Ser visivel no historico do admin

---

## BLOCO 8: INFRAESTRUTURA

### 8.1. Mini-services (pasta vazia, criar)

| Servico | Funcao | Frequencia |
|---------|--------|-----------|
| Monitor de Solvencia | Verifica saldo vs claims pendentes | A cada 5 min |
| Monitor de Health Factor | Verifica HF das estrategias Aave | A cada 5 min |
| Indexador de Eventos | Coleta eventos on-chain para DB | A cada 1 min |
| Sync de Usuarios | Atualiza cache de dados dos usuarios | A cada 10 min |

### 8.2. APIs admin (criar)

```
POST /api/admin/inject          --> Registra injecao de capital
POST /api/admin/withdraw        --> Registra retirada
POST /api/admin/set-rate        --> Altera taxa de juros
POST /api/admin/set-mode        --> Altera modo Interno/Real
POST /api/admin/strategy/deposit --> Envia capital para estrategia
POST /api/admin/strategy/withdraw --> Retira de estrategia
GET  /api/admin/dashboard       --> Dados do dashboard admin
GET  /api/admin/users           --> Lista de usuarios
GET  /api/admin/users/:address  --> Detalhes de um usuario
GET  /api/admin/logs            --> Historico de acoes
GET  /api/admin/referral        --> Dashboard do MLM
POST /api/admin/referral/config --> Configura taxas do MLM
POST /api/admin/config          --> Configuracoes gerais
```

Todas as rotas admin devem verificar que o caller e o owner.

---

## RESUMO: ORDEM DE PRIORIDADE

### Prioridade 1 - CRITICA (sistema nao funciona sem isso)
1. **Referral sobre RENDIMENTO** (nao deposito) + bonus de equipe
2. **Taxa de juros alteravel** (remover `constant`)
3. **Funcao de injecao/retirada** de capital com rastreabilidade
4. **Painel Admin completo** com toggle Real/Interno
5. **Deposito/saque funcional** no frontend
6. **Funcoes de movimentacao de capital** pelo owner (vault <-> estrategias)

### Prioridade 2 - IMPORTANTE (estrategias reais)
7. Corrigir erros de compilacao das estrategias reais (Aave + QuickSwap)
8. Conectar vault com StrategyController bidirecionalmente
9. Testar estrategias em testnet
10. Implementar claim de rewards no frontend

### Prioridade 3 - MELHORIA (robustez)
11. Bonus de volume da rede (novo no contrato)
12. Protecoes de solvencia e limites
13. Expandir banco de dados (Prisma)
14. Remover dados hardcoded do frontend
15. Implementar mini-services de monitoramento
16. Eventos e auditoria completa

### Prioridade 4 - FUTURO
17. Testes automatizados
18. Subgraph para indexacao
19. Analytics avancado
20. Internacionalizacao completa
21. App mobile (PWA)

---

## MAPA DE DEPENDENCIAS

```
[Prioridade 1]
   |
   +--> Contratos: LocalStrategyManagerV3 (taxa alteravel, injecao, referral fix)
   |        |
   |        +--> YieldVaultV3 (toggle modo, funcoes owner)
   |        |
   |        +--> ReferralV3 (bonus rendimento + volume, claim real)
   |
   +--> Frontend: /admin (painel completo)
   |        |
   |        +--> APIs admin (POST endpoints)
   |        |
   |        +--> Banco de dados (Prisma schema expandido)
   |
   +--> Frontend: page.tsx (deposito, saque, claim funcionais)

[Prioridade 2]
   |
   +--> AaveLoopStrategyV3 (fix compilacao)
   |
   +--> StableLpStrategyV3 (fix compilacao)
   |
   +--> StrategyControllerV3 (permitir owner direto)
   |
   +--> Deploy testnet + testes

[Prioridade 3]
   |
   +--> Mini-services (monitoramento)
   |
   +--> Solvencia e seguranca
   |
   +--> Dados reais no frontend (remover hardcoded)
```
