// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title IStrategy
 * @dev Interface for yield strategies that can be plugged into the Vault
 * Each strategy implements this interface to interact with different DeFi protocols
 */
interface IStrategy {
    /**
     * @dev Deposit assets into the strategy
     * @param amount Amount of USDT to deposit
     */
    function deposit(uint256 amount) external;

    /**
     * @dev Withdraw assets from the strategy
     * @param amount Amount of USDT to withdraw
     * @return Actual amount withdrawn
     */
    function withdraw(uint256 amount) external returns (uint256);

    /**
     * @dev Harvest rewards and return profit
     * @return profit Amount of USDT profit generated
     */
    function harvest() external returns (uint256 profit);

    /**
     * @dev Get total assets under management by this strategy
     * @return Total USDT value managed by this strategy
     */
    function balanceOf() external view returns (uint256);

    /**
     * @dev Emergency withdraw all assets
     * @return amount Amount withdrawn
     */
    function emergencyWithdraw() external returns (uint256 amount);

    /**
     * @dev Get the vault address
     * @return Vault address
     */
    function vault() external view returns (address);

    /**
     * @dev Get the want token (USDT)
     * @return Want token address
     */
    function want() external view returns (address);

    /**
     * @dev Check strategy health status
     * @return isHealthy Whether the strategy is healthy
     * @return healthFactor Health factor (if applicable)
     */
    function checkHealth() external view returns (bool isHealthy, uint256 healthFactor);

    /**
     * @dev Event emitted on deposit
     */
    event Deposited(uint256 amount);

    /**
     * @dev Event emitted on withdrawal
     */
    event Withdrawn(uint256 amount);

    /**
     * @dev Event emitted on harvest
     */
    event Harvested(uint256 profit, uint256 timestamp);

    /**
     * @dev Event emitted on emergency withdrawal
     */
    event EmergencyWithdrawn(uint256 amount);
}
