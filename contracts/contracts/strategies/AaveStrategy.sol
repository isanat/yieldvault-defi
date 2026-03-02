// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../interfaces/IStrategy.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title AaveStrategy
 * @dev Simplified Aave strategy for testing
 */
contract AaveStrategy is IStrategy, AccessControl {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant VAULT_ROLE = keccak256("VAULT_ROLE");

    IERC20 public asset;
    address public vault;
    uint256 public totalDeposited;

    event Deposited(uint256 amount);
    event Withdrawn(uint256 amount);
    event Harvested(uint256 profit, uint256 timestamp);
    event EmergencyWithdrawn(uint256 amount);

    constructor(address _asset, address _admin) {
        asset = IERC20(_asset);
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE, _admin);
        _grantRole(VAULT_ROLE, _admin);
    }

    function setVault(address _vault) external onlyRole(ADMIN_ROLE) {
        vault = _vault;
        _grantRole(VAULT_ROLE, _vault);
    }

    function deposit(uint256 amount) external override returns (uint256) {
        require(amount > 0, "Amount > 0");
        
        asset.transferFrom(msg.sender, address(this), amount);
        totalDeposited += amount;
        
        emit Deposited(amount);
        return amount;
    }

    function withdraw(uint256 amount) external override returns (uint256) {
        require(amount <= totalDeposited, "Insufficient");
        
        uint256 withdrawn = amount;
        asset.transfer(msg.sender, withdrawn);
        totalDeposited -= amount;
        
        emit Withdrawn(withdrawn);
        return withdrawn;
    }

    function harvest() external override returns (uint256 profit) {
        // In real implementation, would calculate actual yield
        profit = 0;
        emit Harvested(profit, block.timestamp);
    }

    function balanceOf() external view override returns (uint256) {
        return totalDeposited;
    }

    function emergencyWithdraw() external override {
        uint256 balance = asset.balanceOf(address(this));
        if (balance > 0) {
            asset.transfer(vault, balance);
            totalDeposited = 0;
            emit EmergencyWithdrawn(balance);
        }
    }
}
