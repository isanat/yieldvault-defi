// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./BaseStrategy.sol";
import "../interfaces/IAaveV3Pool.sol";
import "../interfaces/IQuickSwapV3.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";

/**
 * @title StableLpStrategyV3
 * @notice Estrategia combinando LP de stablecoins no QuickSwap V3 + lending no Aave
 * @dev Polygon Mainnet
 *
 * RISCO: Medio-Baixo
 * APY esperado: 12-25%
 */
contract StableLpStrategyV3 is BaseStrategy, IERC721Receiver {
    using SafeERC20 for IERC20;

    // ========== Structs ==========
    struct RiskParams {
        uint256 lendingRatio;           // % para Aave (3000 = 30%)
        uint256 maxBorrowRatio;         // Max % de borrow vs colateral
        uint256 compoundThreshold;      // Min amount para compound
        uint256 targetHealthFactor;     // HF alvo no Aave
        uint24 lpFeeTier;               // Fee tier do LP
        int24 lpTickLower;              // Tick inferior
        int24 lpTickUpper;              // Tick superior
    }

    // ========== State ==========
    IAaveV3Pool public immutable aavePool;
    IAaveV3PoolDataProvider public immutable dataProvider;
    IQuickSwapV3PositionManager public immutable positionManager;
    IQuickSwapV3Pool public immutable lpPool;

    IERC20 public immutable token1;     // USDC
    IERC20 public immutable aToken;     // aUSDT

    RiskParams public riskParams;
    uint256 public lpTokenId;
    uint128 public currentLiquidity;

    uint256 public constant RATIO_PRECISION = 10000;
    uint24 public constant STABLE_FEE_TIER = 100;

    // ========== Events ==========
    event LpPositionCreated(uint256 tokenId, uint128 liquidity);
    event LpLiquidityIncreased(uint256 tokenId, uint128 liquidity);
    event FeesCollected(uint256 amount0, uint256 amount1);
    event CompoundExecuted(uint256 rewardsCompounded);

    // ========== Constructor ==========
    constructor(
        address _vault,
        address _want,              // USDT
        address _token1,            // USDC
        address _aavePool,
        address _dataProvider,
        address _aToken,
        address _positionManager,
        address _lpPool,
        address _owner
    ) BaseStrategy("Stable LP + Lending Strategy", _vault, _want, _owner) {
        token1 = IERC20(_token1);
        aavePool = IAaveV3Pool(_aavePool);
        dataProvider = IAaveV3PoolDataProvider(_dataProvider);
        positionManager = IQuickSwapV3PositionManager(_positionManager);
        lpPool = IQuickSwapV3Pool(_lpPool);
        aToken = IERC20(_aToken);

        riskParams = RiskParams({
            lendingRatio: 4000,
            maxBorrowRatio: 6000,
            compoundThreshold: 100 * 1e6, // 100 USDT
            targetHealthFactor: 2.0e18,
            lpFeeTier: STABLE_FEE_TIER,
            lpTickLower: -10,
            lpTickUpper: 10
        });

        wantToken.safeApprove(_aavePool, type(uint256).max);
        token1.safeApprove(_aavePool, type(uint256).max);
        wantToken.safeApprove(_positionManager, type(uint256).max);
        token1.safeApprove(_positionManager, type(uint256).max);
    }

    // ========== View Functions ==========

    function healthFactor() public view returns (uint256) {
        (,,,,, uint256 hf) = aavePool.getUserAccountData(address(this));
        return hf;
    }

    function balanceOfPool() public view override returns (uint256) {
        uint256 aaveBalance = aToken.balanceOf(address(this));

        uint256 lpBalance = 0;
        if (lpTokenId > 0) {
            try positionManager.positions(lpTokenId) returns (
                uint96, // nonce
                address, // operator
                address, // token0
                address, // token1
                uint24, // fee
                int24, // tickLower
                int24, // tickUpper
                uint128 liquidity,
                uint256, // feeGrowthInside0LastX128
                uint256, // feeGrowthInside1LastX128
                uint128, // tokensOwed0
                uint128  // tokensOwed1
            ) {
                // For stablecoins, each unit of liquidity ≈ $1
                lpBalance = uint256(liquidity);
            } catch {}
        }

        return aaveBalance + lpBalance;
    }

    function totalAssets() public view override returns (uint256) {
        return balanceOfPool() + wantToken.balanceOf(address(this));
    }

    function estimatedAPY() external view override returns (uint256) {
        // Aave supply APY
        (,,,, uint256 liquidityRate,,,,,) = dataProvider.getReserveData(address(wantToken));
        uint256 aaveSupplyAPY = liquidityRate / 1e23; // RAY to BP

        // Borrow APY
        (,,,,, uint256 variableBorrowRate,,,,) = dataProvider.getReserveData(address(token1));
        uint256 borrowAPY = variableBorrowRate / 1e23;

        // LP fee APY (estimated for stablecoin pool)
        uint256 lpFeeAPY = 800; // ~8% conservative estimate

        // Weighted APY
        uint256 lendingNetAPY = aaveSupplyAPY > borrowAPY ? aaveSupplyAPY - borrowAPY : 0;

        return (
            (riskParams.lendingRatio * lendingNetAPY) +
            ((RATIO_PRECISION - riskParams.lendingRatio) * lpFeeAPY)
        ) / RATIO_PRECISION;
    }

    // ========== Core Functions ==========

    function _invest(uint256 _amount) internal override {
        uint256 lendingAmount = (_amount * riskParams.lendingRatio) / RATIO_PRECISION;
        uint256 lpAmount = _amount - lendingAmount;

        // 1. Supply to Aave
        if (lendingAmount > 0) {
            aavePool.supply(address(wantToken), lendingAmount, address(this), 0);
        }

        // 2. Borrow token1 for LP
        if (lendingAmount > 0) {
            _borrowForLP();
        }

        // 3. Add to LP
        _addToLP();
    }

    function _borrowForLP() internal {
        (uint256 totalCollateralBase, uint256 totalDebtBase,,,,) = aavePool.getUserAccountData(address(this));

        uint256 maxBorrowBase = (totalCollateralBase * riskParams.maxBorrowRatio) / RATIO_PRECISION;

        if (totalDebtBase >= maxBorrowBase) return;

        uint256 toBorrow = maxBorrowBase - totalDebtBase;

        // Convert from 8 decimals to token decimals (assuming stablecoin)
        uint256 borrowAmount = toBorrow * 1e10;

        if (borrowAmount == 0) return;

        try aavePool.borrow(address(token1), borrowAmount, 2, 0, address(this)) {
            // Verify HF
            (,,,,, uint256 hf) = aavePool.getUserAccountData(address(this));
            if (hf < riskParams.targetHealthFactor) {
                // Repay some
                uint256 repayAmount = borrowAmount / 2;
                token1.safeApprove(address(aavePool), repayAmount);
                aavePool.repay(address(token1), repayAmount, 2, address(this));
            }
        } catch {
            // Continue without leverage
        }
    }

    function _addToLP() internal {
        uint256 amount0 = wantToken.balanceOf(address(this));
        uint256 amount1 = token1.balanceOf(address(this));

        if (amount0 == 0 && amount1 == 0) return;

        // Sort tokens
        address token0Address = address(wantToken) < address(token1) ? address(wantToken) : address(token1);
        uint256 amount0Desired = token0Address == address(wantToken) ? amount0 : amount1;
        uint256 amount1Desired = token0Address == address(wantToken) ? amount1 : amount0;

        if (lpTokenId == 0) {
            _createLpPosition(amount0Desired, amount1Desired);
        } else {
            _increaseLpLiquidity(amount0Desired, amount1Desired);
        }
    }

    function _createLpPosition(uint256 amount0Desired, uint256 amount1Desired) internal {
        address _token0 = address(wantToken) < address(token1) ? address(wantToken) : address(token1);
        address _token1 = address(wantToken) < address(token1) ? address(token1) : address(wantToken);

        try positionManager.mint(
            IQuickSwapV3PositionManager.MintParams({
                token0: _token0,
                token1: _token1,
                fee: riskParams.lpFeeTier,
                tickLower: riskParams.lpTickLower,
                tickUpper: riskParams.lpTickUpper,
                amount0Desired: amount0Desired,
                amount1Desired: amount1Desired,
                amount0Min: 0,
                amount1Min: 0,
                recipient: address(this),
                deadline: block.timestamp + 300
            })
        ) returns (uint256 tokenId, uint128 liquidity, uint256 amount0, uint256 amount1) {
            lpTokenId = tokenId;
            currentLiquidity = liquidity;
            // amount0 and amount1 are actual amounts used
            emit LpPositionCreated(tokenId, liquidity);
        } catch {
            // Keep tokens idle
        }
    }

    function _increaseLpLiquidity(uint256 amount0Desired, uint256 amount1Desired) internal {
        try positionManager.increaseLiquidity(
            IQuickSwapV3PositionManager.IncreaseLiquidityParams({
                tokenId: lpTokenId,
                amount0Desired: amount0Desired,
                amount1Desired: amount1Desired,
                amount0Min: 0,
                amount1Min: 0,
                deadline: block.timestamp + 300
            })
        ) returns (uint128 liquidity, uint256 amount0, uint256 amount1) {
            currentLiquidity = liquidity;
            // amount0 and amount1 are actual amounts added
            emit LpLiquidityIncreased(lpTokenId, liquidity);
        } catch {
            // Continue
        }
    }

    function _divest(uint256 _amount) internal override {
        _collectLpFees();

        uint256 idleBalance = wantToken.balanceOf(address(this));

        if (idleBalance < _amount && lpTokenId > 0) {
            _decreaseLpLiquidity(_amount - idleBalance);
        }

        uint256 stillNeed = _amount - wantToken.balanceOf(address(this));
        if (stillNeed > 0) {
            // Repay debt first
            uint256 debt = token1.balanceOf(address(this));
            if (debt > 0) {
                token1.safeApprove(address(aavePool), debt);
                try aavePool.repay(address(token1), type(uint256).max, 2, address(this)) {} catch {}
            }

            // Withdraw from Aave
            try aavePool.withdraw(address(wantToken), stillNeed, address(this)) {} catch {
                try aavePool.withdraw(address(wantToken), type(uint256).max, address(this)) {} catch {}
            }
        }
    }

    function _collectLpFees() internal returns (uint256 amount0, uint256 amount1) {
        if (lpTokenId == 0) return (0, 0);

        try positionManager.collect(
            IQuickSwapV3PositionManager.CollectParams({
                tokenId: lpTokenId,
                recipient: address(this),
                amount0Max: type(uint128).max,
                amount1Max: type(uint128).max
            })
        ) returns (uint256 _amount0, uint256 _amount1) {
            emit FeesCollected(_amount0, _amount1);
            return (_amount0, _amount1);
        } catch {
            return (0, 0);
        }
    }

    function _decreaseLpLiquidity(uint256 _amountNeeded) internal {
        if (lpTokenId == 0 || currentLiquidity == 0) return;

        uint128 liquidityToDecrease = uint128(_amountNeeded);

        if (liquidityToDecrease > currentLiquidity) {
            liquidityToDecrease = currentLiquidity;
        }

        try positionManager.decreaseLiquidity(
            IQuickSwapV3PositionManager.DecreaseLiquidityParams({
                tokenId: lpTokenId,
                liquidity: liquidityToDecrease,
                amount0Min: 0,
                amount1Min: 0,
                deadline: block.timestamp + 300
            })
        ) {
            currentLiquidity -= liquidityToDecrease;
        } catch {}
    }

    // ========== Harvest & Compound ==========

    function harvest() external override nonReentrant returns (uint256 profit, uint256 loss) {
        _collectLpFees();

        uint256 hf = healthFactor();
        if (hf < riskParams.targetHealthFactor) {
            _rebalanceAave();
        }

        uint256 totalAssetsNow = totalAssets();

        if (totalAssetsNow > totalDebt) {
            profit = totalAssetsNow - totalDebt;
        } else if (totalAssetsNow < totalDebt) {
            loss = totalDebt - totalAssetsNow;
        }

        lastReportTime = block.timestamp;
        emit Harvested(profit, loss);
    }

    function compound() external nonReentrant {
        (uint256 fees0, uint256 fees1) = _collectLpFees();

        uint256 totalFees = fees0 + fees1;

        if (totalFees >= riskParams.compoundThreshold) {
            _addToLP();
            emit CompoundExecuted(totalFees);
        }
    }

    function rebalance() external override {
        uint256 hf = healthFactor();

        if (hf < riskParams.targetHealthFactor) {
            _rebalanceAave();
        }

        if (lpTokenId > 0) {
            _rebalanceLp();
        }
    }

    function _rebalanceAave() internal {
        uint256 hf = healthFactor();

        if (hf < riskParams.targetHealthFactor) {
            uint256 token1Balance = token1.balanceOf(address(this));
            if (token1Balance > 0) {
                token1.safeApprove(address(aavePool), token1Balance);
                try aavePool.repay(address(token1), token1Balance, 2, address(this)) {} catch {}
            }
        }
    }

    function _rebalanceLp() internal {
        (uint160 sqrtPriceX96, int24 tick,,,,,) = lpPool.slot0();

        if (tick < riskParams.lpTickLower || tick > riskParams.lpTickUpper) {
            _collectLpFees();

            if (currentLiquidity > 0) {
                try positionManager.decreaseLiquidity(
                    IQuickSwapV3PositionManager.DecreaseLiquidityParams({
                        tokenId: lpTokenId,
                        liquidity: currentLiquidity,
                        amount0Min: 0,
                        amount1Min: 0,
                        deadline: block.timestamp + 300
                    })
                ) {
                    currentLiquidity = 0;
                    lpTokenId = 0;

                    riskParams.lpTickLower = tick - 10;
                    riskParams.lpTickUpper = tick + 10;

                    _addToLP();
                } catch {}
            }
        }
    }

    // ========== Risk Parameters ==========

    function setRiskParams(bytes calldata _params) external override onlyOwner {
        RiskParams memory newParams = abi.decode(_params, (RiskParams));
        _validateRiskParams(newParams);
        riskParams = newParams;
    }

    function setRiskParamsDirect(
        uint256 _lendingRatio,
        uint256 _maxBorrowRatio,
        uint256 _compoundThreshold,
        uint256 _targetHealthFactor,
        uint24 _lpFeeTier,
        int24 _lpTickLower,
        int24 _lpTickUpper
    ) external onlyOwner {
        RiskParams memory newParams = RiskParams({
            lendingRatio: _lendingRatio,
            maxBorrowRatio: _maxBorrowRatio,
            compoundThreshold: _compoundThreshold,
            targetHealthFactor: _targetHealthFactor,
            lpFeeTier: _lpFeeTier,
            lpTickLower: _lpTickLower,
            lpTickUpper: _lpTickUpper
        });

        _validateRiskParams(newParams);
        riskParams = newParams;
    }

    function _validateRiskParams(RiskParams memory _params) internal pure {
        require(_params.lendingRatio <= RATIO_PRECISION, "Invalid lending ratio");
        require(_params.maxBorrowRatio <= 8000, "Borrow ratio too high");
        require(_params.targetHealthFactor >= 1.3e18, "HF too low");
        require(_params.lpTickLower < _params.lpTickUpper, "Invalid ticks");
    }

    // ========== ERC721 Receiver ==========

    function onERC721Received(
        address,
        address,
        uint256,
        bytes calldata
    ) external pure override returns (bytes4) {
        return this.onERC721Received.selector;
    }

    // ========== Emergency ==========

    function emergencyWithdraw(address _to) external override onlyOwner {
        _pause();

        _collectLpFees();

        if (lpTokenId > 0 && currentLiquidity > 0) {
            try positionManager.decreaseLiquidity(
                IQuickSwapV3PositionManager.DecreaseLiquidityParams({
                    tokenId: lpTokenId,
                    liquidity: currentLiquidity,
                    amount0Min: 0,
                    amount1Min: 0,
                    deadline: block.timestamp + 300
                })
            ) {} catch {}

            try positionManager.burn(lpTokenId) {} catch {}
        }

        uint256 token1Balance = token1.balanceOf(address(this));
        if (token1Balance > 0) {
            token1.safeApprove(address(aavePool), token1Balance);
            try aavePool.repay(address(token1), type(uint256).max, 2, address(this)) {} catch {}
        }

        try aavePool.withdraw(address(wantToken), type(uint256).max, address(this)) {} catch {}

        uint256 wantBalance = wantToken.balanceOf(address(this));
        if (wantBalance > 0) {
            wantToken.safeTransfer(_to, wantBalance);
        }

        uint256 token1Bal = token1.balanceOf(address(this));
        if (token1Bal > 0) {
            token1.safeTransfer(_to, token1Bal);
        }

        lpTokenId = 0;
        currentLiquidity = 0;
    }

    function sweep(address _token) external override onlyOwner {
        require(_token != address(wantToken), "Cannot sweep want");
        require(_token != address(token1), "Cannot sweep token1");

        IERC20 token = IERC20(_token);
        uint256 balance = token.balanceOf(address(this));
        if (balance > 0) {
            token.safeTransfer(owner(), balance);
        }
    }
}
