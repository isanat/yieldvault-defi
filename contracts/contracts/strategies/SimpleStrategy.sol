// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../interfaces/IStrategy.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title SimpleStrategy
 * @dev Simple yield strategy that holds funds and can be upgraded later
 * This is a placeholder that can be replaced with real Aave/QuickSwap integration
 */
contract SimpleStrategy is IStrategy, AccessControl {
    using SafeERC20 for IERC20;

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant VAULT_ROLE = keccak256("VAULT_ROLE");

    // Asset (USDT)
    IERC20 public immutable asset;

    // Vault address
    address public vault;

    // Total deposited tracking
    uint256 public totalDeposited;

    // Strategy name
    string public name;

    event Deposited(uint256 amount);
    event Withdrawn(uint256 amount);
    event Harvested(uint256 profit, uint256 timestamp);
    event EmergencyWithdrawn(uint256 amount);

    constructor(address _asset, address _admin, string memory _name) {
        asset = IERC20(_asset);
        name = _name;

        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE, _admin);
        _grantRole(VAULT_ROLE, _admin);
    }

    function setVault(address _vault) external onlyRole(ADMIN_ROLE) {
        vault = _vault;
        _grantRole(VAULT_ROLE, _vault);
    }

    /**
     * @dev Deposit assets into strategy
     */
    function deposit(uint256 amount) external override returns (uint256) {
        require(amount > 0, "Amount > 0");

        // Transfer assets from sender (should be vault)
        asset.safeTransferFrom(msg.sender, address(this), amount);

        totalDeposited += amount;
        emit Deposited(amount);
        return amount;
    }

    /**
     * @dev Withdraw assets
     */
    function withdraw(uint256 amount) external override returns (uint256) {
        require(amount <= totalDeposited, "Insufficient");

        uint256 balance = asset.balanceOf(address(this));
        uint256 withdrawn = balance >= amount ? amount : balance;

        if (withdrawn > 0) {
            asset.safeTransfer(msg.sender, withdrawn);
            totalDeposited -= amount;
        }

        emit Withdrawn(withdrawn);
        return withdrawn;
    }

    /**
     * @dev Harvest yield (placeholder - returns 0 for now)
     */
    function harvest() external override returns (uint256 profit) {
        // In a real strategy, this would harvest yield from Aave/QuickSwap
        // For now, it's a placeholder
        profit = 0;
        emit Harvested(profit, block.timestamp);
        return profit;
    }

    /**
     * @dev Get current balance
     */
    function balanceOf() external view override returns (uint256) {
        return asset.balanceOf(address(this));
    }

    /**
     * @dev Emergency withdraw
     */
    function emergencyWithdraw() external override {
        uint256 balance = asset.balanceOf(address(this));
        if (balance > 0 && vault != address(0)) {
            asset.safeTransfer(vault, balance);
            totalDeposited = 0;
            emit EmergencyWithdrawn(balance);
        }
    }

    /**
     * @dev Get current APY (placeholder)
     */
    function getCurrentAPY() external pure returns (uint256) {
        // Return 15% APY as placeholder
        return 15;
    }
}
