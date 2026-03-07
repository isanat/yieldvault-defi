// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../interfaces/IStrategy.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title AaveV3Strategy
 * @dev Real Aave V3 strategy for Polygon Mainnet
 * Integrates with Aave V3 Pool to generate yield on USDT
 */
contract AaveV3Strategy is IStrategy, AccessControl {
    using SafeERC20 for IERC20;

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant VAULT_ROLE = keccak256("VAULT_ROLE");

    // Aave V3 Pool Addresses Provider on Polygon
    IPoolAddressesProvider public constant ADDRESSES_PROVIDER = 
        IPoolAddressesProvider(0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb);
    
    // Asset (USDT)
    IERC20 public immutable asset;
    
    // Vault address
    address public vault;
    
    // Total deposited tracking
    uint256 public totalDeposited;
    
    // Aave Pool (obtained from AddressesProvider)
    IPool public pool;
    
    // aToken (received when depositing to Aave)
    IERC20 public aToken;

    event Deposited(uint256 amount);
    event Withdrawn(uint256 amount);
    event Harvested(uint256 profit, uint256 timestamp);
    event EmergencyWithdrawn(uint256 amount);

    constructor(address _asset, address _admin) {
        asset = IERC20(_asset);
        
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE, _admin);
        _grantRole(VAULT_ROLE, _admin);

        // Initialize Aave Pool
        address poolAddress = ADDRESSES_PROVIDER.getPool();
        pool = IPool(poolAddress);
        
        // Get aToken address for the asset
        address aTokenAddress = _getATokenAddress(_asset);
        if (aTokenAddress != address(0)) {
            aToken = IERC20(aTokenAddress);
        }
    }

    function setVault(address _vault) external onlyRole(ADMIN_ROLE) {
        vault = _vault;
        _grantRole(VAULT_ROLE, _vault);
    }

    /**
     * @dev Get aToken address for an asset from Aave
     */
    function _getATokenAddress(address _asset) internal view returns (address) {
        try pool.getReserveData(_asset) returns (
            uint256, // unbacked
            uint256, // accruedToTreasuryScaled
            uint256, // totalAToken
            uint256, // totalStableDebt
            uint256, // totalVariableDebt
            uint256, // liquidityRate
            uint256, // currentAverageStableBorrowRate
            uint256, // variableBorrowRate
            uint256, // stableBorrowRate
            uint256, // lastUpdateTimestamp
            uint256, // id
            address aTokenAddress,
            address, // stableDebtTokenAddress
            address, // variableDebtTokenAddress
            address, // interestRateStrategyAddress
            uint128  // accruedToTreasury
        ) {
            return aTokenAddress;
        } catch {
            return address(0);
        }
    }

    /**
     * @dev Deposit assets into Aave V3
     */
    function deposit(uint256 amount) external override returns (uint256) {
        require(amount > 0, "Amount > 0");
        require(address(asset) != address(0), "Asset not set");
        
        // Transfer assets from sender (should be vault)
        asset.safeTransferFrom(msg.sender, address(this), amount);
        
        // Approve Aave Pool to spend assets
        asset.safeIncreaseAllowance(address(pool), amount);
        
        // Deposit to Aave
        try pool.supply(address(asset), amount, address(this), 0) {
            totalDeposited += amount;
            emit Deposited(amount);
            return amount;
        } catch {
            // If Aave deposit fails, keep funds in strategy
            totalDeposited += amount;
            emit Deposited(amount);
            return amount;
        }
    }

    /**
     * @dev Withdraw assets from Aave V3
     */
    function withdraw(uint256 amount) external override returns (uint256) {
        require(amount <= totalDeposited, "Insufficient");
        
        uint256 withdrawn;
        
        // Try to withdraw from Aave
        try pool.withdraw(address(asset), amount, address(this)) returns (uint256 _withdrawn) {
            withdrawn = _withdrawn;
        } catch {
            // If Aave withdraw fails, use local balance if available
            uint256 balance = asset.balanceOf(address(this));
            if (balance >= amount) {
                withdrawn = amount;
            } else {
                withdrawn = balance;
            }
        }
        
        if (withdrawn > 0) {
            asset.safeTransfer(msg.sender, withdrawn);
            totalDeposited -= amount;
        }
        
        emit Withdrawn(withdrawn);
        return withdrawn;
    }

    /**
     * @dev Harvest yield from Aave (accrued interest)
     */
    function harvest() external override returns (uint256 profit) {
        if (address(aToken) == address(0)) {
            profit = 0;
            emit Harvested(profit, block.timestamp);
            return profit;
        }
        
        // Get current balance from aToken (includes accrued interest)
        uint256 aTokenBalance = aToken.balanceOf(address(this));
        
        // Also check direct asset balance
        uint256 directBalance = asset.balanceOf(address(this));
        
        // Calculate profit (aToken balance - deposited + any direct balance)
        if (aTokenBalance > totalDeposited) {
            profit = aTokenBalance - totalDeposited;
        } else if (directBalance > 0 && aTokenBalance == 0) {
            // Case where funds are held locally
            profit = 0;
        }
        
        // Note: In Aave V3, interest accrues automatically to aToken balance
        // To realize profit, we would withdraw the excess
        
        emit Harvested(profit, block.timestamp);
        return profit;
    }

    /**
     * @dev Get current balance (deposited + accrued interest)
     */
    function balanceOf() external view override returns (uint256) {
        uint256 aTokenBalance = 0;
        if (address(aToken) != address(0)) {
            aTokenBalance = aToken.balanceOf(address(this));
        }
        
        uint256 directBalance = asset.balanceOf(address(this));
        
        // Return the larger of aToken balance or total deposited, plus any direct balance
        if (aTokenBalance >= totalDeposited) {
            return aTokenBalance + directBalance;
        }
        return totalDeposited + directBalance;
    }

    /**
     * @dev Emergency withdraw - withdraw all funds from Aave
     */
    function emergencyWithdraw() external override {
        uint256 totalToWithdraw = totalDeposited;
        
        // Try to withdraw from Aave
        if (address(aToken) != address(0) && totalToWithdraw > 0) {
            try pool.withdraw(address(asset), type(uint256).max, address(this)) {
                // Success
            } catch {
                // If Aave withdraw fails, continue with local balance
            }
        }
        
        // Transfer all assets to vault
        uint256 balance = asset.balanceOf(address(this));
        if (balance > 0 && vault != address(0)) {
            asset.safeTransfer(vault, balance);
            totalDeposited = 0;
            emit EmergencyWithdrawn(balance);
        }
    }

    /**
     * @dev Get current APY from Aave for the asset
     */
    function getCurrentAPY() external view returns (uint256) {
        try pool.getReserveData(address(asset)) returns (
            uint256, // unbacked
            uint256, // accruedToTreasuryScaled
            uint256, // totalAToken
            uint256, // totalStableDebt
            uint256, // totalVariableDebt
            uint256 liquidityRate,
            uint256, // currentAverageStableBorrowRate
            uint256, // variableBorrowRate
            uint256, // stableBorrowRate
            uint256, // lastUpdateTimestamp
            uint256, // id
            address, // aTokenAddress
            address, // stableDebtTokenAddress
            address, // variableDebtTokenAddress
            address, // interestRateStrategyAddress
            uint128  // accruedToTreasury
        ) {
            // liquidityRate is in Ray (1e27), convert to APY percentage
            // APY = liquidityRate / 1e27 * 100
            return (liquidityRate * 100) / 1e27;
        } catch {
            return 0;
        }
    }
}

// Aave V3 Interfaces
interface IPoolAddressesProvider {
    function getPool() external view returns (address);
    function getPoolConfigurator() external view returns (address);
}

interface IPool {
    function supply(
        address asset,
        uint256 amount,
        address onBehalfOf,
        uint16 referralCode
    ) external;

    function withdraw(
        address asset,
        uint256 amount,
        address to
    ) external returns (uint256);

    function getReserveData(address asset) external view returns (
        uint256 unbacked,
        uint256 accruedToTreasuryScaled,
        uint256 totalAToken,
        uint256 totalStableDebt,
        uint256 totalVariableDebt,
        uint256 liquidityRate,
        uint256 currentAverageStableBorrowRate,
        uint256 variableBorrowRate,
        uint256 stableBorrowRate,
        uint256 lastUpdateTimestamp,
        uint256 id,
        address aTokenAddress,
        address stableDebtTokenAddress,
        address variableDebtTokenAddress,
        address interestRateStrategyAddress,
        uint128 accruedToTreasury
    );
}
