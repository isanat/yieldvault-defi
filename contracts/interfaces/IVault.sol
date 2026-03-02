// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title IVault
 * @dev Interface for the main Vault contract (ERC4626 compatible)
 */
interface IVault {
    /**
     * @dev Deposit assets into the vault
     * @param assets Amount of USDT to deposit
     * @param receiver Address to receive the shares
     * @param referrer Address of the referrer (optional, address(0) if none)
     * @return shares Amount of shares minted
     */
    function deposit(uint256 assets, address receiver, address referrer) external returns (uint256 shares);

    /**
     * @dev Withdraw assets from the vault
     * @param assets Amount of USDT to withdraw
     * @param receiver Address to receive the assets
     * @param owner Address of the share owner
     * @return shares Amount of shares burned
     */
    function withdraw(uint256 assets, address receiver, address owner) external returns (uint256 shares);

    /**
     * @dev Redeem shares for assets
     * @param shares Amount of shares to redeem
     * @param receiver Address to receive the assets
     * @param owner Address of the share owner
     * @return assets Amount of USDT returned
     */
    function redeem(uint256 shares, address receiver, address owner) external returns (uint256 assets);

    /**
     * @dev Harvest profits from all strategies
     * Can only be called by strategist role
     */
    function harvest() external;

    /**
     * @dev Rebalance strategies according to new allocations
     * @param newAllocations New allocation percentages (sum must equal 10000 = 100%)
     */
    function rebalanceStrategies(uint256[] calldata newAllocations) external;

    /**
     * @dev Add a new strategy
     * @param strategy Address of the strategy contract
     * @param allocation Initial allocation percentage
     */
    function addStrategy(address strategy, uint256 allocation) external;

    /**
     * @dev Remove a strategy
     * @param strategyIndex Index of the strategy to remove
     */
    function removeStrategy(uint256 strategyIndex) external;

    /**
     * @dev Get total assets managed by the vault
     * @return Total USDT value in the vault
     */
    function totalAssets() external view returns (uint256);

    /**
     * @dev Convert assets to shares
     * @param assets Amount of assets
     * @return shares Amount of shares
     */
    function convertToShares(uint256 assets) external view returns (uint256);

    /**
     * @dev Convert shares to assets
     * @param shares Amount of shares
     * @return assets Amount of assets
     */
    function convertToAssets(uint256 shares) external view returns (uint256);

    /**
     * @dev Get user's referrer address
     * @param user User address
     * @return Referrer address (address(0) if none)
     */
    function getReferrer(address user) external view returns (address);

    /**
     * @dev Events
     */
    event Deposit(address indexed sender, address indexed owner, uint256 assets, uint256 shares, address referrer);
    event Withdraw(address indexed sender, address indexed receiver, address indexed owner, uint256 assets, uint256 shares);
    event Harvest(uint256 totalProfit, uint256 performanceFee, uint256 timestamp);
    event StrategyAdded(address indexed strategy, uint256 allocation);
    event StrategyRemoved(address indexed strategy);
    event Rebalanced(uint256[] allocations);
}
