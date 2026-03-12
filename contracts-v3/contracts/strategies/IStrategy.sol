// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IStrategy
 * @notice Interface padrao para todas as estrategias do YieldVault
 */
interface IStrategy {
    // ========== View Functions ==========

    function name() external view returns (string memory);
    function vault() external view returns (address);
    function want() external view returns (address);
    function totalAssets() external view returns (uint256);
    function estimatedTotalAssets() external view returns (uint256);
    function estimatedAPY() external view returns (uint256);
    function isActive() external view returns (bool);

    // ========== Strategy Actions ==========

    function deposit(uint256 amount) external;
    function withdraw(uint256 amount) external;
    function harvest() external returns (uint256 profit, uint256 loss);
    function rebalance() external;
    function setRiskParams(bytes calldata params) external;

    // ========== Emergency Functions ==========

    function pause() external;
    function unpause() external;
    function emergencyWithdraw(address to) external;

    // ========== Events ==========

    event Harvested(uint256 profit, uint256 loss);
}
