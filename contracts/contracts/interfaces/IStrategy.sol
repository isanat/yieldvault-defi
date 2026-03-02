// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title IStrategy
 * @dev Interface for yield strategies
 */
interface IStrategy {
    function deposit(uint256 amount) external returns (uint256);
    function withdraw(uint256 amount) external returns (uint256);
    function harvest() external returns (uint256 profit);
    function balanceOf() external view returns (uint256);
    function emergencyWithdraw() external;
}
