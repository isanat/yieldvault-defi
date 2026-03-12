// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./BaseStrategy.sol";
import "../interfaces/IAaveV3Pool.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title AaveLoopStrategyV3
 * @notice Estrategia de lending com alavancagem (loop) no Aave V3
 * @dev Polygon Mainnet
 *
 * RISCO: Medio
 * APY esperado: 8-15%
 */
contract AaveLoopStrategyV3 is BaseStrategy {
    using SafeERC20 for IERC20;

    // ========== Structs ==========
    struct RiskParams {
        uint256 targetHealthFactor;    // 1.6e18 - 2.5e18
        uint256 minHealthFactor;       // 1.3e18 - 1.5e18
        uint256 maxLeverage;           // 10000 = 1x, 40000 = 4x
        uint256 maxLoopIterations;     // Max 10
    }

    // ========== State ==========
    IAaveV3Pool public immutable aavePool;
    IAaveV3PoolDataProvider public immutable dataProvider;
    IERC20 public immutable borrowAsset;
    IERC20 public immutable aToken;

    RiskParams public riskParams;
    uint256 public currentLeverage;
    uint256 public constant LEVERAGE_PRECISION = 10000;

    // ========== Events ==========
    event LeverageIncreased(uint256 newLeverage, uint256 iterations);
    event LeverageDecreased(uint256 newLeverage);
    event RiskParamsUpdated(RiskParams params);
    event LoopExecuted(uint256 collateral, uint256 debt, uint256 hf);

    // ========== Constructor ==========
    constructor(
        address _vault,
        address _want,
        address _borrowAsset,
        address _aavePool,
        address _dataProvider,
        address _aToken,
        address _owner
    ) BaseStrategy("Aave V3 Loop Strategy", _vault, _want, _owner) {
        borrowAsset = IERC20(_borrowAsset);
        aavePool = IAaveV3Pool(_aavePool);
        dataProvider = IAaveV3PoolDataProvider(_dataProvider);
        aToken = IERC20(_aToken);

        riskParams = RiskParams({
            targetHealthFactor: 1.8e18,
            minHealthFactor: 1.4e18,
            maxLeverage: 40000,
            maxLoopIterations: 10
        });

        wantToken.safeApprove(_aavePool, type(uint256).max);
        borrowAsset.safeApprove(_aavePool, type(uint256).max);
    }

    // ========== View Functions ==========

    function healthFactor() public view returns (uint256) {
        (,,,,, uint256 hf) = aavePool.getUserAccountData(address(this));
        return hf;
    }

    function getAavePosition() external view returns (
        uint256 totalCollateralBase,
        uint256 totalDebtBase,
        uint256 availableBorrowsBase,
        uint256 hf
    ) {
        (totalCollateralBase, totalDebtBase, availableBorrowsBase,,, hf) = 
            aavePool.getUserAccountData(address(this));
    }

    function balanceOfPool() public view override returns (uint256) {
        uint256 aTokenBalance = aToken.balanceOf(address(this));
        uint256 borrowBalance = borrowAsset.balanceOf(address(this));
        uint256 wantBalance = wantToken.balanceOf(address(this));

        // Net position in wantToken
        // Note: This is simplified. Real calculation needs price oracle
        return aTokenBalance + wantBalance - borrowBalance;
    }

    function totalAssets() public view override returns (uint256) {
        return balanceOfPool() + wantToken.balanceOf(address(this));
    }

    function estimatedAPY() external view override returns (uint256) {
        (
            uint256 availableLiquidity,
            uint256 totalStableDebt,
            uint256 totalVariableDebt,
            uint256 liquidityRate,
            uint256 variableBorrowRate,,,,,
        ) = dataProvider.getReserveData(address(wantToken));

        // Convert RAY (27 decimals) to basis points
        uint256 supplyAPY = liquidityRate / 1e23;
        uint256 borrowAPY = variableBorrowRate / 1e23;

        uint256 leverage = currentLeverage > 0 ? currentLeverage : LEVERAGE_PRECISION;

        if (leverage > LEVERAGE_PRECISION && supplyAPY > borrowAPY) {
            uint256 leverageMultiplier = leverage / LEVERAGE_PRECISION;
            uint256 spread = supplyAPY - borrowAPY;
            return supplyAPY + (leverageMultiplier - 1) * spread;
        }

        return supplyAPY;
    }

    function getCurrentLeverage() public view returns (uint256) {
        (
            uint256 totalCollateralBase,
            uint256 totalDebtBase,
            ,,,
        ) = aavePool.getUserAccountData(address(this));

        if (totalCollateralBase == 0) return LEVERAGE_PRECISION;
        if (totalDebtBase == 0) return LEVERAGE_PRECISION;

        uint256 equity = totalCollateralBase > totalDebtBase 
            ? totalCollateralBase - totalDebtBase 
            : 0;

        if (equity == 0) return type(uint256).max;

        return (totalCollateralBase * LEVERAGE_PRECISION) / equity;
    }

    // ========== Core Functions ==========

    function _invest(uint256 _amount) internal override {
        // Supply to Aave
        aavePool.supply(address(wantToken), _amount, address(this), 0);

        // Execute leverage loop
        uint256 iterations = _executeLoop();
        currentLeverage = getCurrentLeverage();

        emit LeverageIncreased(currentLeverage, iterations);
    }

    function _divest(uint256 _amount) internal override {
        uint256 hf = healthFactor();

        if (hf < riskParams.minHealthFactor) {
            _deleverageToSafeHF();
        }

        uint256 idleBalance = wantToken.balanceOf(address(this));

        if (idleBalance < _amount) {
            uint256 needFromAave = _amount - idleBalance;

            (, uint256 totalDebtBase,,,,) = aavePool.getUserAccountData(address(this));

            if (totalDebtBase > 0) {
                _repayForWithdraw(needFromAave);
            }

            aavePool.withdraw(address(wantToken), needFromAave, address(this));
        }

        currentLeverage = getCurrentLeverage();
    }

    function _executeLoop() internal returns (uint256 iterations) {
        uint256 maxIterations = riskParams.maxLoopIterations;

        for (uint256 i = 0; i < maxIterations; i++) {
            uint256 _currentLeverage = getCurrentLeverage();
            if (_currentLeverage >= riskParams.maxLeverage) break;

            uint256 hf = healthFactor();
            if (hf < riskParams.targetHealthFactor) break;

            (
                uint256 totalCollateralBase,
                uint256 totalDebtBase,
                uint256 availableBorrowsBase,
                ,,
            ) = aavePool.getUserAccountData(address(this));

            if (availableBorrowsBase == 0) break;

            // Calculate safe borrow amount
            uint256 safeBorrowBase = (totalCollateralBase * riskParams.targetHealthFactor / 1e18) - totalDebtBase;
            if (safeBorrowBase > availableBorrowsBase) {
                safeBorrowBase = availableBorrowsBase;
            }

            if (safeBorrowBase == 0) break;

            // Convert to borrow asset amount (simplified - assumes 1:1 for stablecoins)
            uint256 borrowAmount = safeBorrowBase * 1e10; // 8 decimals to 18

            // Limit for max leverage
            uint256 maxBorrowForLeverage = _calculateMaxBorrowForLeverage(
                totalCollateralBase,
                totalDebtBase,
                riskParams.maxLeverage
            );

            if (borrowAmount > maxBorrowForLeverage) {
                borrowAmount = maxBorrowForLeverage;
            }

            if (borrowAmount == 0) break;

            try aavePool.borrow(
                address(borrowAsset),
                borrowAmount,
                2, // Variable rate
                0,
                address(this)
            ) {
                // Supply borrowed asset
                if (address(borrowAsset) == address(wantToken)) {
                    aavePool.supply(address(wantToken), borrowAmount, address(this), 0);
                } else {
                    aavePool.supply(address(borrowAsset), borrowAmount, address(this), 0);
                }

                iterations++;

                emit LoopExecuted(totalCollateralBase, totalDebtBase + safeBorrowBase, healthFactor());
            } catch {
                break;
            }
        }

        currentLeverage = getCurrentLeverage();
    }

    function _calculateMaxBorrowForLeverage(
        uint256 collateral,
        uint256 debt,
        uint256 maxLev
    ) internal pure returns (uint256) {
        uint256 maxDebtForLeverage = (collateral * (maxLev - LEVERAGE_PRECISION)) / maxLev;
        if (debt >= maxDebtForLeverage) return 0;
        return maxDebtForLeverage - debt;
    }

    function _deleverageToSafeHF() internal {
        uint256 hf = healthFactor();

        while (hf < riskParams.targetHealthFactor) {
            uint256 borrowBalance = borrowAsset.balanceOf(address(this));

            if (borrowBalance == 0) {
                // Try to withdraw borrow asset from Aave
                try aavePool.withdraw(address(borrowAsset), type(uint256).max, address(this)) {
                    borrowBalance = borrowAsset.balanceOf(address(this));
                } catch {
                    break;
                }
            }

            if (borrowBalance == 0) break;

            try aavePool.repay(
                address(borrowAsset),
                borrowBalance,
                2,
                address(this)
            ) {
                hf = healthFactor();
            } catch {
                break;
            }
        }
    }

    function _repayForWithdraw(uint256 _amountNeeded) internal {
        uint256 borrowBalance = borrowAsset.balanceOf(address(this));

        if (borrowBalance > 0) {
            aavePool.repay(address(borrowAsset), borrowBalance, 2, address(this));
        }

        // If still need more, withdraw from aToken position
        uint256 aTokenBalance = aToken.balanceOf(address(this));
        if (aTokenBalance > 0 && address(borrowAsset) != address(wantToken)) {
            // Cross-asset: need to swap or handle differently
        }
    }

    // ========== Harvest & Rebalance ==========

    function harvest() external override nonReentrant returns (uint256 profit, uint256 loss) {
        uint256 hf = healthFactor();

        if (hf < riskParams.minHealthFactor) {
            _deleverageToSafeHF();
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

    function rebalance() external override {
        uint256 hf = healthFactor();
        uint256 _currentLeverage = getCurrentLeverage();

        if (hf < riskParams.minHealthFactor) {
            _deleverageToSafeHF();
            currentLeverage = getCurrentLeverage();
        } else if (hf > riskParams.targetHealthFactor * 110 / 100) {
            uint256 iterations = _executeLoop();
            if (iterations > 0) {
                currentLeverage = getCurrentLeverage();
            }
        }
    }

    // ========== Risk Parameters ==========

    function setRiskParams(bytes calldata _params) external override onlyOwner {
        RiskParams memory newParams = abi.decode(_params, (RiskParams));

        require(newParams.targetHealthFactor >= 1.5e18, "Target HF too low");
        require(newParams.targetHealthFactor <= 3e18, "Target HF too high");
        require(newParams.minHealthFactor >= 1.2e18, "Min HF too low");
        require(newParams.minHealthFactor < newParams.targetHealthFactor, "Min < target");
        require(newParams.maxLeverage >= LEVERAGE_PRECISION, "Leverage too low");
        require(newParams.maxLeverage <= 50000, "Leverage too high");
        require(newParams.maxLoopIterations > 0 && newParams.maxLoopIterations <= 20, "Invalid iterations");

        riskParams = newParams;
        emit RiskParamsUpdated(newParams);
    }

    function setRiskParamsDirect(
        uint256 _targetHealthFactor,
        uint256 _minHealthFactor,
        uint256 _maxLeverage,
        uint256 _maxLoopIterations
    ) external onlyOwner {
        riskParams = RiskParams({
            targetHealthFactor: _targetHealthFactor,
            minHealthFactor: _minHealthFactor,
            maxLeverage: _maxLeverage,
            maxLoopIterations: _maxLoopIterations
        });
        emit RiskParamsUpdated(riskParams);
    }

    // ========== Emergency ==========

    function emergencyWithdraw(address _to) external override onlyOwner {
        _pause();

        (, uint256 totalDebtBase,,,,) = aavePool.getUserAccountData(address(this));

        // Deleverage completely
        while (totalDebtBase > 0) {
            uint256 borrowBalance = borrowAsset.balanceOf(address(this));

            if (borrowBalance > 0) {
                try aavePool.repay(address(borrowAsset), type(uint256).max, 2, address(this)) {} catch {}
            }

            (, uint256 currentDebt,,,,) = aavePool.getUserAccountData(address(this));
            if (currentDebt > 0 && borrowBalance == 0) {
                try aavePool.withdraw(address(borrowAsset), type(uint256).max, address(this)) {} catch {}
                uint256 newBorrowBalance = borrowAsset.balanceOf(address(this));
                if (newBorrowBalance > 0) {
                    try aavePool.repay(address(borrowAsset), newBorrowBalance, 2, address(this)) {} catch {}
                }
            }

            (, uint256 newTotalDebt,,,,) = aavePool.getUserAccountData(address(this));
            if (newTotalDebt >= totalDebtBase) break;
            totalDebtBase = newTotalDebt;
        }

        // Withdraw all collateral
        try aavePool.withdraw(address(wantToken), type(uint256).max, address(this)) {} catch {}

        uint256 wantBalance = wantToken.balanceOf(address(this));
        if (wantBalance > 0) {
            wantToken.safeTransfer(_to, wantBalance);
        }

        uint256 borrowBalance = borrowAsset.balanceOf(address(this));
        if (borrowBalance > 0) {
            borrowAsset.safeTransfer(_to, borrowBalance);
        }

        currentLeverage = LEVERAGE_PRECISION;
    }

    function sweep(address _token) external override onlyOwner {
        require(_token != address(wantToken), "Cannot sweep want");
        require(_token != address(borrowAsset), "Cannot sweep borrow");
        require(_token != address(aToken), "Cannot sweep aToken");

        IERC20 token = IERC20(_token);
        uint256 balance = token.balanceOf(address(this));
        if (balance > 0) {
            token.safeTransfer(owner(), balance);
        }
    }
}
