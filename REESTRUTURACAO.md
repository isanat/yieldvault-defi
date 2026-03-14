# YieldVault DeFi - Guia de Reestruturacao

**Data:** 2026-03-14
**Referencia:** ANALISE-COMPLETA.md
**Objetivo:** Documentar tudo que precisa ser corrigido, criado e reestruturado

---

## VISAO GERAL DA REESTRUTURACAO

O sistema deve funcionar em **dois modos** alternados pelo administrador:

| Modo | Descricao | Fonte do Rendimento |
|------|-----------|---------------------|
| **Interno** | Vault interno com juros configuraveis | Injecao externa (empresa de arbitragem) |
| **Real** | Estrategias DeFi (Aave V3 + QuickSwap V3) | Rendimento on-chain dos protocolos |

O admin alterna entre modos via botao na interface de administracao.

---

## BLOCO 1: CORRECOES NO VAULT INTERNO (LocalStrategyManagerV3)

### 1.1. Taxa de juros deve ser alteravel (NAO constant)

**Problema atual:**
```solidity
// LocalStrategyManagerV3.sol:33
uint256 public constant INTEREST_RATE_BPS = 100; // Nao pode ser alterada!
```

**Correcao necessaria:**
- Remover `constant` de `INTEREST_RATE_BPS`
- Criar funcao `setInterestRate(uint256 _rateBPS) onlyOwner`
- Validar limites (ex: max 500 BPs = 5% ao dia)
- Emitir evento `InterestRateUpdated(uint256 oldRate, uint256 newRate)`

### 1.2. Funcao de injecao de capital

**Problema atual:** Owner envia USDT diretamente ao contrato sem rastreabilidade.

**Necessario criar:**
```
function injectCapital(uint256 _amount) external onlyOwner
  - Transfere USDT do owner para o contrato
  - Registra totalInjected += _amount
  - Emite evento CapitalInjected(owner, amount, timestamp)
  - Permite rastrear quanto foi injetado vs quanto veio de depositos
```

### 1.3. Validacao de solvencia antes de pagar

**Problema atual:** `claimRewards()` nao verifica se ha saldo suficiente.

**Correcao:**
```
- Antes de transferir, verificar: usdt.balanceOf(address(this)) >= rewards
- Se insuficiente, marcar como "pending" e nao falhar silenciosamente
- Ou pagar parcialmente o disponivel e manter o restante como pendente
```

### 1.4. Protecao nas funcoes de saque do owner

**Problema atual:** `sweep()` pode drenar todo o saldo incluindo depositos.

**Correcao:**
```
- sweep() deve respeitar: saldo - totalDeposited (so sacar excedente)
- emergencyWithdraw() deve ter timelock ou multisig
- Criar funcao withdrawExcess() que so saca o que excede os depositos
```

### 1.5. Historico e eventos

**Necessario adicionar eventos:**
- `CapitalInjected(address indexed owner, uint256 amount)`
- `InterestRateUpdated(uint256 oldRate, uint256 newRate)`
- `RewardsAccrued(address indexed user, uint256 amount, uint256 intervals)`
- `ModeChanged(string mode)` (quando alternar entre Interno/Real)

---

## BLOCO 2: CORRECAO DO REFERRAL

### 2.1. Comissao deve ser sobre RENDIMENTO, nao sobre DEPOSITO

**Problema atual:**
```solidity
// LocalStrategyManagerV3.sol:77 (dentro de deposit())
_distributeReferralRewards(msg.sender, amountAfterFee);
// ^^^ Passa o valor do DEPOSITO, nao o rendimento!
```

**Correcao necessaria:**
- REMOVER a chamada de referral de dentro do `deposit()`
- MOVER a distribuicao de referral para dentro do `claimRewards()` ou `_accrueRewards()`
- O calculo deve ser: `referralBonus = rendimento * taxaReferral / 10000`

**Fluxo correto:**
```
1. Investidor acumula rendimento ao longo do tempo
2. Ao fazer claim ou ao accruar:
   - Calcula o rendimento bruto
   - Desconta performance fee
   - Calcula referral bonus SOBRE o rendimento liquido
   - Distribui nos 5 niveis
3. O referral bonus SAI do rendimento, nao do deposito
```

### 2.2. De onde sai o pagamento do referral?

**Opcao A (Recomendada):** O bonus de referral e uma porcentagem do rendimento do investidor. Ex: se rendimento = 100 USDT e referral total = 10%, os referrers recebem 10 USDT e o investidor recebe 90 USDT.

**Opcao B:** O bonus de referral e adicional, pago pela empresa (injecao extra). Nesse caso, a injecao de capital precisa cobrir rendimentos + referral.

**Decisao necessaria do owner:** Qual opcao usar?

### 2.3. Referral no ReferralV3.sol

O contrato ReferralV3 atual so **registra** os rewards na struct `users[referrer].totalRewards` mas **NAO faz transfer** de tokens. O pagamento real deveria:
- Ou transferir USDT diretamente para os referrers
- Ou acumular para claim posterior

---

## BLOCO 3: ESTRATEGIAS REAIS (Aave + QuickSwap)

### 3.1. Corrigir erros de compilacao

**Problema:** Erros de sintaxe em tuplas de retorno Solidity:
- `aavePool.getUserAccountData()` retorna 6 valores
- As desestruturacoes das tuplas tem inconsistencias

**Arquivos afetados:**
- `contracts-v3/contracts/strategies/AaveLoopStrategyV3.sol`
- `contracts-v3/contracts/strategies/StableLpStrategyV3.sol`

### 3.2. Testar em testnet antes do mainnet

- Fazer deploy em Polygon Amoy (testnet)
- Testar deposito, withdraw, harvest, rebalance
- Verificar health factor e limites de alavancagem
- Testar cenarios de estresse (queda de preco, etc.)

### 3.3. Integracao com o toggle Real/Interno

Quando o admin mudar para modo Real:
- O StrategyControllerV3 assume o controle do capital
- O capital e distribuido entre AaveLoop (50%) e StableLP (50%)
- Os rendimentos vem dos protocolos reais
- O referral continua funcionando sobre o rendimento real

---

## BLOCO 4: PAINEL DE ADMINISTRACAO

### 4.1. Interface Admin (nao existe, precisa criar)

**Funcionalidades necessarias:**

#### Toggle de Modo
- Botao "Modo: Interno / Real"
- Ao alternar, chama funcao no contrato para mudar o modo
- Mostra status atual e confirmacao

#### Gestao do Vault Interno
- Visualizar saldo do contrato
- Visualizar total depositado vs total injetado
- Formulario para injetar capital (chama `injectCapital()`)
- Alterar taxa de juros (chama `setInterestRate()`)
- Ver historico de injecoes

#### Gestao das Estrategias Reais
- Ver status de cada estrategia (ativa/pausada, APY, alocacao)
- Alterar alocacao entre estrategias
- Executar harvest manualmente
- Executar rebalance
- Pausar/despausar estrategias

#### Dashboard Admin
- TVL total
- Total de usuarios
- Total de rendimentos pagos
- Total de referral distribuido
- Total injetado (modo interno)
- Saldo disponivel para pagamentos
- Alertas de solvencia

### 4.2. Rota admin protegida

- Criar rota `/admin` protegida por endereco da wallet
- Somente o owner pode acessar
- Verificar `wallet.address === V3_CONTRACTS.owner`

---

## BLOCO 5: CORRECOES NO FRONTEND

### 5.1. Remover dados hardcoded

| Arquivo | Problema | Correcao |
|---------|---------|---------|
| `service.ts:372` | `\|\| 8` fallback APY | Mostrar "N/A" ou "Indisponivel" |
| `service.ts:373` | `\|\| 15` fallback APY | Mostrar "N/A" ou "Indisponivel" |
| `service.ts:384` | `'$180K+'` hardcoded | Calcular real de eventos on-chain |
| `service.ts:177-186` | `getTotalUsers()` sempre 0 | Implementar contagem real |

### 5.2. Implementar deposito/saque funcional

Os dialogs de deposito e saque existem no `page.tsx` mas **nao fazem transacoes**. Necessario:
- Adicionar logica de `approve()` do USDT para o vault
- Adicionar chamada `deposit()` no vault
- Adicionar chamada `withdraw()` no vault
- Tratar erros e mostrar status da transacao
- Atualizar dados apos transacao

### 5.3. Implementar claim de rewards

- Botao "Claim Rewards" quando usuario tem pendingRewards > 0
- Chamar `claimRewards()` no LocalStrategyManagerV3
- Mostrar transacao em andamento e confirmacao

### 5.4. Implementar registro de referral

- Input para codigo de referral
- Chamar `register()` no ReferralV3
- Mostrar codigo proprio apos registro

---

## BLOCO 6: CORRECOES NO CONTRATO VAULT (YieldVaultV3)

### 6.1. Vault nao conecta com estrategias

**Problema:** O vault calcula `totalAssets()` apenas pelo seu proprio saldo:
```solidity
function totalAssets() public view returns (uint256) {
    return usdtAsset.balanceOf(address(this));
}
```

**Correcao:** Quando modo Real, deve incluir assets nas estrategias:
```
totalAssets = saldo proprio + strategyController.totalAssets()
```

### 6.2. Vault nao direciona capital para estrategias

**Problema:** O `deposit()` do vault nao envia capital para o StrategyController.

**Correcao:** Apos deposito, se modo Real:
```
- Enviar capital para StrategyController
- StrategyController distribui entre estrategias ativas
```

### 6.3. Toggle de modo no vault

**Necessario:**
- Variavel `bool public isInternalMode`
- Funcao `setMode(bool _internal) onlyOwner`
- deposit/withdraw se comportam diferente conforme o modo

---

## BLOCO 7: MELHORIAS DE SEGURANCA

### 7.1. Limites e protecoes

- [ ] Limite maximo de deposito por usuario
- [ ] Limite maximo de deposito total (TVL cap)
- [ ] Timelock para alteracoes criticas (taxa de juros, modo, etc.)
- [ ] Pausar/despausar vault e estrategias
- [ ] Verificacao de solvencia antes de cada claim

### 7.2. Auditoria de eventos

Todos os contratos devem emitir eventos completos para:
- Depositos e saques
- Injecoes de capital
- Alteracoes de configuracao
- Pagamentos de referral
- Mudancas de modo
- Harvest e rebalance

---

## BLOCO 8: INFRAESTRUTURA

### 8.1. Banco de dados

O SQLite/Prisma precisa ser expandido para:
- Historico de injecoes de capital
- Cache de dados on-chain (para dashboard rapido)
- Logs de admin
- Configuracoes off-chain

### 8.2. Mini-services (pasta vazia, precisa implementar)

- **Monitor de solvencia:** Verifica se ha saldo suficiente para pagar todos os claims pendentes
- **Monitor de Health Factor:** Para estrategias reais, alerta se HF cair abaixo do minimo
- **Indexador de eventos:** Coleta eventos on-chain para historico

---

## RESUMO: ORDEM DE PRIORIDADE

### Prioridade 1 - Critica (funcionalidade basica)
1. Corrigir referral: comissao sobre RENDIMENTO, nao deposito
2. Tornar taxa de juros alteravel (remover `constant`)
3. Criar funcao de injecao de capital com rastreabilidade
4. Implementar deposito/saque funcional no frontend
5. Criar painel admin com toggle Real/Interno

### Prioridade 2 - Importante (estrategias reais)
6. Corrigir erros de compilacao das estrategias reais
7. Conectar vault com StrategyController
8. Testar estrategias em testnet
9. Implementar claim de rewards no frontend

### Prioridade 3 - Melhoria (robustez)
10. Protecoes de solvencia e limites
11. Remover dados hardcoded do frontend
12. Expandir banco de dados
13. Implementar mini-services de monitoramento
14. Eventos e auditoria completa

### Prioridade 4 - Futuro
15. Testes automatizados
16. Subgraph para indexacao
17. Analytics avancado
18. Internacionalizacao completa
