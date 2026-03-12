// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IAaveV3Pool
 * @notice Interface para Aave V3 Pool (Polygon)
 */
interface IAaveV3Pool {
    // ========== Supply ==========
    function supply(
        address asset,
        uint256 amount,
        address onBehalfOf,
        uint16 referralCode
    ) external;

    // ========== Withdraw ==========
    function withdraw(
        address asset,
        uint256 amount,
        address to
    ) external returns (uint256);

    // ========== Borrow ==========
    function borrow(
        address asset,
        uint256 amount,
        uint256 interestRateMode,
        uint16 referralCode,
        address onBehalfOf
    ) external;

    // ========== Repay ==========
    function repay(
        address asset,
        uint256 amount,
        uint256 interestRateMode,
        address onBehalfOf
    ) external returns (uint256);

    // ========== User Account Data ==========
    function getUserAccountData(address user) external view returns (
        uint256 totalCollateralBase,
        uint256 totalDebtBase,
        uint256 availableBorrowsBase,
        uint256 currentLiquidationThreshold,
        uint256 ltv,
        uint256 healthFactor
    );
}

/**
 * @title IAaveV3PoolDataProvider
 * @notice Interface para Aave V3 Pool Data Provider
 */
interface IAaveV3PoolDataProvider {
    function getReserveData(address asset) external view returns (
        uint256 availableLiquidity,
        uint256 totalStableDebt,
        uint256 totalVariableDebt,
        uint256 liquidityRate,
        uint256 variableBorrowRate,
        uint256 stableBorrowRate,
        uint256 averageStableBorrowRate,
        uint256 liquidityIndex,
        uint256 variableBorrowIndex,
        uint40 lastUpdateTimestamp
    );
}
